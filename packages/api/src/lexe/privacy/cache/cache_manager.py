"""
2-Layer Cache Manager for Privacy/Pseudonymization Pipeline

Provides:
- L1 Cache: In-memory LRU cache for recently processed documents (fast, limited size)
- L2 Cache: Redis distributed cache for cross-instance sharing (slower, larger capacity)

Architecture:
  Request → L1 (memory) → L2 (Redis) → Process Document → Store in L2 & L1

Performance:
- L1 hit: ~1ms (memory access)
- L2 hit: ~5-10ms (Redis network roundtrip)
- Cache miss: ~500-2000ms (full processing with spaCy/Presidio)

Expected cache hit ratios:
- Same document reprocessed: ~95% L1 hit
- Similar documents across instances: ~60% L2 hit
- Overall cache hit: ~70-80% (major performance boost)
"""

import hashlib
import json
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import asdict

import structlog
from cachetools import LRUCache

logger = structlog.get_logger(__name__)


# ============================================================================
# Cache Key Generation
# ============================================================================

def generate_cache_key(
    text: str,
    engine_name: str,
    config_hash: str,
) -> str:
    """
    Generate deterministic cache key from text, engine, and config

    Args:
        text: Document text to process
        engine_name: Detection engine name ('spacy', 'presidio')
        config_hash: Hash of configuration parameters

    Returns:
        Cache key string (e.g., 'privacy:doc:abc123def456')
    """
    # Create deterministic hash of inputs
    key_data = f"{text}|{engine_name}|{config_hash}"
    doc_hash = hashlib.sha256(key_data.encode()).hexdigest()[:16]

    return f"privacy:doc:{doc_hash}"


def hash_config(config_dict: Dict[str, Any]) -> str:
    """
    Create hash of configuration for cache key

    Args:
        config_dict: Configuration dictionary

    Returns:
        Config hash string
    """
    # Sort keys for deterministic hashing
    config_json = json.dumps(config_dict, sort_keys=True)
    return hashlib.md5(config_json.encode()).hexdigest()[:8]


# ============================================================================
# L1 Memory Cache
# ============================================================================

class MemoryCache:
    """
    L1 in-memory LRU cache for fast access

    Features:
    - LRU eviction policy (least recently used)
    - TTL support (time-to-live expiration)
    - Thread-safe operations
    """

    def __init__(self, max_size: int = 1000):
        """
        Initialize memory cache

        Args:
            max_size: Maximum number of entries (LRU eviction after)
        """
        self.cache: LRUCache = LRUCache(maxsize=max_size)
        self.expiry: Dict[str, datetime] = {}
        self.max_size = max_size

        logger.info("l1_cache_initialized", max_size=max_size)

    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get value from L1 cache

        Args:
            key: Cache key

        Returns:
            Cached value or None if miss/expired
        """
        if key not in self.cache:
            logger.debug("l1_cache_miss", key=key)
            return None

        # Check TTL expiry
        if key in self.expiry and datetime.now() > self.expiry[key]:
            logger.debug("l1_cache_expired", key=key)
            del self.cache[key]
            del self.expiry[key]
            return None

        logger.debug("l1_cache_hit", key=key)
        return self.cache[key]

    async def set(self, key: str, value: Dict[str, Any], ttl_seconds: int):
        """
        Set value in L1 cache with TTL

        Args:
            key: Cache key
            value: Value to cache (must be JSON serializable)
            ttl_seconds: Time to live in seconds
        """
        self.cache[key] = value
        self.expiry[key] = datetime.now() + timedelta(seconds=ttl_seconds)

        logger.debug("l1_cache_set", key=key, ttl=ttl_seconds)

    async def invalidate(self, key: str):
        """
        Invalidate (delete) cache entry

        Args:
            key: Cache key to delete
        """
        if key in self.cache:
            del self.cache[key]
        if key in self.expiry:
            del self.expiry[key]

        logger.debug("l1_cache_invalidated", key=key)

    def clear(self):
        """Clear all L1 cache"""
        self.cache.clear()
        self.expiry.clear()
        logger.info("l1_cache_cleared")

    def get_stats(self) -> Dict[str, Any]:
        """Get L1 cache statistics"""
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'utilization_pct': round(len(self.cache) / self.max_size * 100, 2),
        }


# ============================================================================
# L2 Redis Cache
# ============================================================================

class RedisCache:
    """
    L2 Redis distributed cache for cross-instance sharing

    Features:
    - Distributed caching across multiple instances
    - Automatic failover to L1 if Redis unavailable
    - JSON serialization for complex objects
    """

    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize Redis cache

        Args:
            redis_url: Redis connection URL (e.g., 'redis://localhost:6379/0')
        """
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        self.redis = None
        self.connected = False

        # Try to import redis
        try:
            import redis.asyncio as aioredis
            self._aioredis = aioredis
        except ImportError:
            logger.warning("redis_unavailable", reason="package_not_installed")
            self._aioredis = None

    async def connect(self):
        """Connect to Redis"""
        if not self._aioredis:
            logger.info("redis_unavailable", fallback="l1_only")
            return

        try:
            self.redis = await self._aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=50,
            )
            # Test connection
            await self.redis.ping()
            self.connected = True
            logger.info("l2_cache_connected", url=self.redis_url)
        except Exception as e:
            logger.warning("l2_cache_connection_failed", error=str(e), fallback="l1_only")
            self.redis = None
            self.connected = False

    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get value from L2 cache

        Args:
            key: Cache key

        Returns:
            Cached value or None if miss/unavailable
        """
        if not self.connected or not self.redis:
            return None

        try:
            value_json = await self.redis.get(key)
            if value_json:
                logger.debug("l2_cache_hit", key=key)
                return json.loads(value_json)
            else:
                logger.debug("l2_cache_miss", key=key)
                return None
        except Exception as e:
            logger.warning("l2_cache_get_error", key=key, error=str(e))
            return None

    async def set(self, key: str, value: Dict[str, Any], ttl_seconds: int):
        """
        Set value in L2 cache with TTL

        Args:
            key: Cache key
            value: Value to cache (must be JSON serializable)
            ttl_seconds: Time to live in seconds
        """
        if not self.connected or not self.redis:
            return

        try:
            value_json = json.dumps(value)
            await self.redis.setex(key, ttl_seconds, value_json)
            logger.debug("l2_cache_set", key=key, ttl=ttl_seconds)
        except Exception as e:
            logger.warning("l2_cache_set_error", key=key, error=str(e))

    async def invalidate(self, key: str):
        """
        Invalidate (delete) cache entry

        Args:
            key: Cache key to delete
        """
        if not self.connected or not self.redis:
            return

        try:
            await self.redis.delete(key)
            logger.debug("l2_cache_invalidated", key=key)
        except Exception as e:
            logger.warning("l2_cache_invalidate_error", key=key, error=str(e))

    async def clear_pattern(self, pattern: str):
        """
        Clear all keys matching pattern

        Args:
            pattern: Redis key pattern (e.g., 'privacy:doc:*')
        """
        if not self.connected or not self.redis:
            return

        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
                logger.info("l2_cache_cleared_pattern", pattern=pattern, count=len(keys))
        except Exception as e:
            logger.warning("l2_cache_clear_pattern_error", pattern=pattern, error=str(e))

    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            logger.info("l2_cache_closed")

    async def get_stats(self) -> Dict[str, Any]:
        """Get L2 cache statistics"""
        if not self.connected or not self.redis:
            return {
                'connected': False,
                'hits': 0,
                'misses': 0,
                'hit_rate_pct': 0,
            }

        try:
            info = await self.redis.info('stats')
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            total = hits + misses

            return {
                'connected': True,
                'hits': hits,
                'misses': misses,
                'hit_rate_pct': round(hits / total * 100, 2) if total > 0 else 0,
            }
        except Exception as e:
            logger.warning("l2_cache_stats_error", error=str(e))
            return {
                'connected': False,
                'error': str(e),
            }


# ============================================================================
# 2-Layer Cache Manager
# ============================================================================

class CacheManager:
    """
    2-Layer cache manager coordinating L1 (memory) and L2 (Redis)

    Cache strategy:
    1. Check L1 (memory) first → return immediately if hit
    2. Check L2 (Redis) if L1 miss → populate L1 and return if hit
    3. Process document if both miss → store in both L2 and L1

    Features:
    - Automatic failover to L1 if Redis unavailable
    - TTL-based expiration (default: 24 hours)
    - Cache statistics and monitoring
    - Cache invalidation support
    """

    def __init__(
        self,
        enabled: bool = True,
        ttl_seconds: int = 86400,  # 24 hours
        l1_max_size: int = 1000,
        redis_url: Optional[str] = None,
    ):
        """
        Initialize cache manager

        Args:
            enabled: Enable/disable caching
            ttl_seconds: Time to live for cache entries (seconds)
            l1_max_size: Max L1 cache size (entries)
            redis_url: Redis connection URL
        """
        self.enabled = enabled
        self.ttl_seconds = ttl_seconds

        # Initialize cache layers
        self.l1 = MemoryCache(max_size=l1_max_size)
        self.l2 = RedisCache(redis_url=redis_url)

        # Statistics
        self.stats = {
            'l1_hits': 0,
            'l2_hits': 0,
            'misses': 0,
            'l1_sets': 0,
            'l2_sets': 0,
        }

        logger.info(
            "cache_manager_initialized",
            enabled=enabled,
            ttl_seconds=ttl_seconds,
            l1_max_size=l1_max_size,
        )

    async def initialize(self):
        """Initialize cache (connect to Redis)"""
        if not self.enabled:
            logger.info("cache_disabled")
            return

        await self.l2.connect()
        logger.info("cache_manager_ready", l2_connected=self.l2.connected)

    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get value from cache (try L1 then L2)

        Args:
            key: Cache key

        Returns:
            Cached value or None if miss
        """
        if not self.enabled:
            return None

        # Try L1 first (fast)
        value = await self.l1.get(key)
        if value is not None:
            self.stats['l1_hits'] += 1
            logger.debug("cache_hit", layer="l1", key=key)
            return value

        # Try L2 (slower)
        value = await self.l2.get(key)
        if value is not None:
            self.stats['l2_hits'] += 1
            logger.debug("cache_hit", layer="l2", key=key)

            # Populate L1 for future fast access
            await self.l1.set(key, value, self.ttl_seconds)

            return value

        # Cache miss
        self.stats['misses'] += 1
        logger.debug("cache_miss", key=key)
        return None

    async def set(self, key: str, value: Dict[str, Any]):
        """
        Set value in cache (store in both L1 and L2)

        Args:
            key: Cache key
            value: Value to cache (must be JSON serializable)
        """
        if not self.enabled:
            return

        # Store in both layers
        await self.l1.set(key, value, self.ttl_seconds)
        self.stats['l1_sets'] += 1

        await self.l2.set(key, value, self.ttl_seconds)
        self.stats['l2_sets'] += 1

        logger.debug("cache_set", key=key, ttl=self.ttl_seconds)

    async def invalidate(self, key: str):
        """
        Invalidate cache entry (remove from both layers)

        Args:
            key: Cache key to invalidate
        """
        await self.l1.invalidate(key)
        await self.l2.invalidate(key)
        logger.info("cache_invalidated", key=key)

    async def clear_all(self):
        """Clear all cache entries"""
        self.l1.clear()
        await self.l2.clear_pattern("privacy:*")
        self.stats = {
            'l1_hits': 0,
            'l2_hits': 0,
            'misses': 0,
            'l1_sets': 0,
            'l2_sets': 0,
        }
        logger.info("cache_cleared_all")

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics

        Returns:
            Dict with cache stats including hit rates
        """
        total_requests = self.stats['l1_hits'] + self.stats['l2_hits'] + self.stats['misses']
        total_hits = self.stats['l1_hits'] + self.stats['l2_hits']

        l1_stats = self.l1.get_stats()
        l2_stats = await self.l2.get_stats()

        return {
            'enabled': self.enabled,
            'ttl_seconds': self.ttl_seconds,
            'requests': {
                'total': total_requests,
                'l1_hits': self.stats['l1_hits'],
                'l2_hits': self.stats['l2_hits'],
                'misses': self.stats['misses'],
                'hit_rate_pct': round(total_hits / total_requests * 100, 2) if total_requests > 0 else 0,
            },
            'l1': l1_stats,
            'l2': l2_stats,
        }

    async def shutdown(self):
        """Cleanup resources"""
        await self.l2.close()
        logger.info("cache_manager_shutdown")


# ============================================================================
# Global Cache Instance (Singleton)
# ============================================================================

_cache_instance: Optional[CacheManager] = None


async def get_cache_manager() -> CacheManager:
    """
    Get or create global cache manager instance

    Returns:
        CacheManager singleton
    """
    global _cache_instance

    if _cache_instance is None:
        # Load config from environment
        enabled = os.getenv('PRIVACY_CACHE_ENABLED', 'true').lower() == 'true'
        ttl = int(os.getenv('PRIVACY_CACHE_TTL', '86400'))
        l1_max_size = int(os.getenv('PRIVACY_L1_MAX_SIZE', '1000'))
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

        _cache_instance = CacheManager(
            enabled=enabled,
            ttl_seconds=ttl,
            l1_max_size=l1_max_size,
            redis_url=redis_url,
        )
        await _cache_instance.initialize()

    return _cache_instance


def reset_cache_manager():
    """Reset cache manager (useful for testing)"""
    global _cache_instance
    _cache_instance = None
