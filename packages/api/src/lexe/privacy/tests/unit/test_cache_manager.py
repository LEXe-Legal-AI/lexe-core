"""
Unit tests for 2-layer cache manager

Tests:
- L1 (memory) cache hit/miss
- L2 (Redis) cache hit/miss
- Cache key generation
- TTL expiration
- Cache invalidation
- Serialization/deserialization
- Fallback behavior (Redis unavailable)
- Statistics tracking
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch

from ...cache.cache_manager import (
    CacheManager,
    MemoryCache,
    RedisCache,
    generate_cache_key,
    hash_config,
    get_cache_manager,
    reset_cache_manager,
)


@pytest.fixture(scope="session", autouse=True)
def clear_redis_session():
    """Clear Redis at the start of the test session"""
    try:
        import redis
        client = redis.Redis.from_url('redis://localhost:6379/0', decode_responses=True)
        client.flushdb()
        client.close()
    except:
        pass  # Redis not available, skip
    yield


class TestCacheKeyGeneration:
    """Test cache key generation utilities"""

    def test_generate_cache_key_deterministic(self):
        """Cache key should be deterministic for same inputs"""
        text = "Test document content"
        engine = "presidio"
        config_hash = "abc123"

        key1 = generate_cache_key(text, engine, config_hash)
        key2 = generate_cache_key(text, engine, config_hash)

        assert key1 == key2
        assert key1.startswith("privacy:doc:")
        assert len(key1) == 28  # "privacy:doc:" + 16 hex chars

    def test_generate_cache_key_different_text(self):
        """Different text should generate different keys"""
        engine = "presidio"
        config_hash = "abc123"

        key1 = generate_cache_key("Text 1", engine, config_hash)
        key2 = generate_cache_key("Text 2", engine, config_hash)

        assert key1 != key2

    def test_generate_cache_key_different_engine(self):
        """Different engine should generate different keys"""
        text = "Test document"
        config_hash = "abc123"

        key1 = generate_cache_key(text, "presidio", config_hash)
        key2 = generate_cache_key(text, "spacy", config_hash)

        assert key1 != key2

    def test_generate_cache_key_different_config(self):
        """Different config should generate different keys"""
        text = "Test document"
        engine = "presidio"

        key1 = generate_cache_key(text, engine, "abc123")
        key2 = generate_cache_key(text, engine, "def456")

        assert key1 != key2

    def test_hash_config_deterministic(self):
        """Config hash should be deterministic"""
        config = {
            'engine': 'presidio',
            'threshold': 0.7,
            'filters': ['normalize', 'validate'],
        }

        hash1 = hash_config(config)
        hash2 = hash_config(config)

        assert hash1 == hash2
        assert len(hash1) == 8  # MD5 truncated to 8 chars

    def test_hash_config_order_independent(self):
        """Config hash should be same regardless of key order"""
        config1 = {'a': 1, 'b': 2, 'c': 3}
        config2 = {'c': 3, 'a': 1, 'b': 2}

        hash1 = hash_config(config1)
        hash2 = hash_config(config2)

        assert hash1 == hash2


class TestMemoryCache:
    """Test L1 in-memory LRU cache"""

    @pytest.mark.asyncio
    async def test_memory_cache_set_get(self):
        """Test basic set and get operations"""
        cache = MemoryCache(max_size=10)

        await cache.set("key1", {"value": "test"}, ttl_seconds=60)
        result = await cache.get("key1")

        assert result == {"value": "test"}

    @pytest.mark.asyncio
    async def test_memory_cache_miss(self):
        """Test cache miss returns None"""
        cache = MemoryCache(max_size=10)

        result = await cache.get("nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_memory_cache_ttl_expiration(self):
        """Test TTL expiration"""
        cache = MemoryCache(max_size=10)

        # Set with 1-second TTL
        await cache.set("key1", {"value": "test"}, ttl_seconds=1)

        # Should be available immediately
        result = await cache.get("key1")
        assert result == {"value": "test"}

        # Wait for expiration
        await asyncio.sleep(1.1)

        # Should be expired
        result = await cache.get("key1")
        assert result is None

    @pytest.mark.asyncio
    async def test_memory_cache_lru_eviction(self):
        """Test LRU eviction when max size reached"""
        cache = MemoryCache(max_size=3)

        # Fill cache
        await cache.set("key1", {"value": "1"}, ttl_seconds=60)
        await cache.set("key2", {"value": "2"}, ttl_seconds=60)
        await cache.set("key3", {"value": "3"}, ttl_seconds=60)

        # Access key1 to make it recently used
        await cache.get("key1")

        # Add new entry (should evict least recently used: key2)
        await cache.set("key4", {"value": "4"}, ttl_seconds=60)

        # key2 should be evicted
        assert await cache.get("key2") is None

        # Others should remain
        assert await cache.get("key1") is not None
        assert await cache.get("key3") is not None
        assert await cache.get("key4") is not None

    @pytest.mark.asyncio
    async def test_memory_cache_invalidate(self):
        """Test cache invalidation"""
        cache = MemoryCache(max_size=10)

        await cache.set("key1", {"value": "test"}, ttl_seconds=60)
        await cache.invalidate("key1")

        result = await cache.get("key1")
        assert result is None

    @pytest.mark.asyncio
    async def test_memory_cache_clear(self):
        """Test clearing all cache"""
        cache = MemoryCache(max_size=10)

        await cache.set("key1", {"value": "1"}, ttl_seconds=60)
        await cache.set("key2", {"value": "2"}, ttl_seconds=60)

        cache.clear()

        assert await cache.get("key1") is None
        assert await cache.get("key2") is None

    def test_memory_cache_stats(self):
        """Test cache statistics"""
        cache = MemoryCache(max_size=100)

        stats = cache.get_stats()

        assert stats['size'] == 0
        assert stats['max_size'] == 100
        assert stats['utilization_pct'] == 0.0


class TestRedisCache:
    """Test L2 Redis distributed cache"""

    @pytest.mark.asyncio
    async def test_redis_cache_unavailable(self):
        """Test graceful handling when Redis unavailable"""
        cache = RedisCache(redis_url="redis://invalid:9999")

        await cache.connect()

        assert not cache.connected
        assert cache.redis is None

        # Should not crash on operations
        result = await cache.get("key1")
        assert result is None

        await cache.set("key1", {"value": "test"}, ttl_seconds=60)
        await cache.invalidate("key1")

    @pytest.mark.asyncio
    async def test_redis_cache_module_not_installed(self):
        """Test handling when redis module not available"""
        cache = RedisCache()
        cache._aioredis = None  # Simulate module not installed
        await cache.connect()

        assert not cache.connected

    @pytest.mark.asyncio
    async def test_redis_cache_set_get(self):
        """Test Redis set and get operations"""
        # Mock Redis client
        mock_client = AsyncMock()
        mock_client.ping = AsyncMock(return_value=True)
        mock_client.get = AsyncMock(return_value='{"value": "test"}')
        mock_client.setex = AsyncMock(return_value=True)

        # Mock from_url as async function
        async def mock_from_url(*args, **kwargs):
            return mock_client

        with patch('redis.asyncio.from_url', side_effect=mock_from_url):
            cache = RedisCache()
            await cache.connect()

            assert cache.connected

            # Test set
            await cache.set("key1", {"value": "test"}, ttl_seconds=60)
            mock_client.setex.assert_called_once()

            # Test get
            result = await cache.get("key1")
            assert result == {"value": "test"}

    @pytest.mark.asyncio
    async def test_redis_cache_error_handling(self):
        """Test error handling in Redis operations"""
        # Mock Redis client that raises errors
        mock_client = AsyncMock()
        mock_client.ping = AsyncMock(return_value=True)
        mock_client.get = AsyncMock(side_effect=Exception("Redis error"))
        mock_client.setex = AsyncMock(side_effect=Exception("Redis error"))

        # Mock from_url as async function
        async def mock_from_url(*args, **kwargs):
            return mock_client

        with patch('redis.asyncio.from_url', side_effect=mock_from_url):
            cache = RedisCache()
            await cache.connect()

            # Should handle errors gracefully
            result = await cache.get("key1")
            assert result is None

            await cache.set("key1", {"value": "test"}, ttl_seconds=60)  # Should not crash

    @pytest.mark.asyncio
    async def test_redis_cache_stats(self):
        """Test Redis cache statistics"""
        # Mock Redis client
        mock_client = AsyncMock()
        mock_client.ping = AsyncMock(return_value=True)
        mock_client.info = AsyncMock(return_value={
            'keyspace_hits': 100,
            'keyspace_misses': 20,
        })

        # Mock from_url as async function
        async def mock_from_url(*args, **kwargs):
            return mock_client

        with patch('redis.asyncio.from_url', side_effect=mock_from_url):
            cache = RedisCache()
            await cache.connect()

            stats = await cache.get_stats()

            assert stats['connected'] is True
            assert stats['hits'] == 100
            assert stats['misses'] == 20
            assert stats['hit_rate_pct'] == 83.33


class TestCacheManager:
    """Test 2-layer cache manager"""

    @pytest.mark.asyncio
    async def test_cache_manager_initialization(self):
        """Test cache manager initialization"""
        manager = CacheManager(
            enabled=True,
            ttl_seconds=3600,
            l1_max_size=500,
        )

        await manager.initialize()

        assert manager.enabled is True
        assert manager.ttl_seconds == 3600
        assert manager.l1.max_size == 500

    @pytest.mark.asyncio
    async def test_cache_manager_disabled(self):
        """Test cache manager when disabled"""
        manager = CacheManager(enabled=False)

        await manager.initialize()

        result = await manager.get("key1")
        assert result is None

        await manager.set("key1", {"value": "test"})
        result = await manager.get("key1")
        assert result is None  # Still None because caching disabled

    @pytest.mark.asyncio
    async def test_cache_manager_l1_hit(self):
        """Test L1 cache hit"""
        manager = CacheManager(enabled=True, ttl_seconds=60)
        await manager.initialize()

        # Store in cache
        await manager.set("key1", {"value": "test"})

        # Should hit L1
        result = await manager.get("key1")

        assert result == {"value": "test"}
        assert manager.stats['l1_hits'] == 1
        assert manager.stats['l2_hits'] == 0
        assert manager.stats['misses'] == 0

    @pytest.mark.asyncio
    async def test_cache_manager_l2_hit(self):
        """Test L2 cache hit (L1 miss, L2 hit)"""
        manager = CacheManager(enabled=True, ttl_seconds=60)
        await manager.initialize()

        # Manually set in L2 only
        await manager.l2.set("key1", {"value": "test"}, ttl_seconds=60)

        # Should miss L1, hit L2, then populate L1
        result = await manager.get("key1")

        assert result == {"value": "test"}
        assert manager.stats['l1_hits'] == 0
        assert manager.stats['l2_hits'] == 1
        assert manager.stats['misses'] == 0

        # Next access should hit L1
        result = await manager.get("key1")
        assert manager.stats['l1_hits'] == 1

    @pytest.mark.asyncio
    async def test_cache_manager_miss(self):
        """Test cache miss (both L1 and L2 miss)"""
        manager = CacheManager(enabled=True)
        await manager.initialize()

        result = await manager.get("nonexistent")

        assert result is None
        assert manager.stats['l1_hits'] == 0
        assert manager.stats['l2_hits'] == 0
        assert manager.stats['misses'] == 1

    @pytest.mark.asyncio
    async def test_cache_manager_invalidate(self):
        """Test cache invalidation across both layers"""
        manager = CacheManager(enabled=True)
        await manager.initialize()

        # Store in cache (both layers)
        await manager.set("key1", {"value": "test"})

        # Verify it's there
        result = await manager.get("key1")
        assert result is not None

        # Invalidate
        await manager.invalidate("key1")

        # Should be gone from both layers
        result = await manager.get("key1")
        assert result is None

    @pytest.mark.asyncio
    async def test_cache_manager_clear_all(self):
        """Test clearing all cache"""
        manager = CacheManager(enabled=True)
        await manager.initialize()

        # Clear any existing data first
        try:
            import redis
            client = redis.Redis.from_url('redis://localhost:6379/0', decode_responses=True)
            client.flushdb()
            client.close()
        except:
            pass

        # Store multiple entries with privacy: prefix (matching clear_pattern)
        await manager.set("privacy:key1", {"value": "1"})
        await manager.set("privacy:key2", {"value": "2"})
        await manager.set("privacy:key3", {"value": "3"})

        # Clear all
        await manager.clear_all()

        # All should be gone
        assert await manager.get("privacy:key1") is None
        assert await manager.get("privacy:key2") is None
        assert await manager.get("privacy:key3") is None

        # Stats should be reset
        assert manager.stats['l1_hits'] == 0
        assert manager.stats['l2_hits'] == 0
        assert manager.stats['misses'] == 3  # 3 misses from checking cleared keys

    @pytest.mark.asyncio
    async def test_cache_manager_stats(self):
        """Test cache statistics"""
        manager = CacheManager(enabled=True, ttl_seconds=3600, l1_max_size=100)
        await manager.initialize()

        # Clear any existing data first
        try:
            import redis
            client = redis.Redis.from_url('redis://localhost:6379/0', decode_responses=True)
            client.flushdb()
            client.close()
        except:
            pass

        # Perform some operations
        await manager.set("key1", {"value": "1"})
        await manager.set("key2", {"value": "2"})

        await manager.get("key1")  # L1 hit
        await manager.get("key2")  # L1 hit
        await manager.get("key3")  # Miss

        stats = await manager.get_stats()

        assert stats['enabled'] is True
        assert stats['ttl_seconds'] == 3600
        assert stats['requests']['total'] == 3
        assert stats['requests']['l1_hits'] == 2
        assert stats['requests']['l2_hits'] == 0
        assert stats['requests']['misses'] == 1
        assert stats['requests']['hit_rate_pct'] == 66.67

        assert 'l1' in stats
        assert stats['l1']['max_size'] == 100

    @pytest.mark.asyncio
    async def test_cache_manager_shutdown(self):
        """Test cache manager shutdown"""
        manager = CacheManager(enabled=True)
        await manager.initialize()

        # Should not raise errors
        await manager.shutdown()


class TestCacheManagerSingleton:
    """Test global cache manager singleton"""

    @pytest.mark.asyncio
    async def test_get_cache_manager_singleton(self):
        """Test that get_cache_manager returns singleton"""
        reset_cache_manager()  # Reset first

        manager1 = await get_cache_manager()
        manager2 = await get_cache_manager()

        assert manager1 is manager2

    @pytest.mark.asyncio
    async def test_reset_cache_manager(self):
        """Test resetting cache manager"""
        reset_cache_manager()

        manager1 = await get_cache_manager()
        reset_cache_manager()
        manager2 = await get_cache_manager()

        assert manager1 is not manager2

    @pytest.mark.asyncio
    async def test_cache_manager_env_config(self):
        """Test cache manager loads config from environment"""
        with patch.dict('os.environ', {
            'PRIVACY_CACHE_ENABLED': 'true',
            'PRIVACY_CACHE_TTL': '7200',
            'PRIVACY_L1_MAX_SIZE': '500',
            'REDIS_URL': 'redis://test:6379',
        }):
            reset_cache_manager()
            manager = await get_cache_manager()

            assert manager.enabled is True
            assert manager.ttl_seconds == 7200
            assert manager.l1.max_size == 500


class TestCacheIntegration:
    """Integration tests for cache manager"""

    @pytest.mark.asyncio
    async def test_cache_workflow_l1_hit(self):
        """Test full workflow with L1 cache hit"""
        manager = CacheManager(enabled=True, ttl_seconds=60)
        await manager.initialize()

        # Clear any existing data first
        try:
            import redis
            client = redis.Redis.from_url('redis://localhost:6379/0', decode_responses=True)
            client.flushdb()
            client.close()
        except:
            pass

        # First access (miss)
        result = await manager.get("key1")
        assert result is None
        assert manager.stats['misses'] == 1

        # Store result
        await manager.set("key1", {"entities": 5, "text": "anonymized"})

        # Second access (L1 hit)
        result = await manager.get("key1")
        assert result == {"entities": 5, "text": "anonymized"}
        assert manager.stats['l1_hits'] == 1

        await manager.shutdown()

    @pytest.mark.asyncio
    async def test_cache_workflow_redis_fallback(self):
        """Test fallback to L1 when Redis unavailable"""
        manager = CacheManager(
            enabled=True,
            ttl_seconds=60,
            redis_url="redis://invalid:9999"
        )
        await manager.initialize()

        # Redis should be unavailable
        assert not manager.l2.connected

        # But L1 should still work
        await manager.set("key1", {"value": "test"})
        result = await manager.get("key1")

        assert result == {"value": "test"}
        assert manager.stats['l1_hits'] == 1

        await manager.shutdown()

    @pytest.mark.asyncio
    async def test_cache_performance_improvement(self):
        """Test that cache improves performance"""
        manager = CacheManager(enabled=True, ttl_seconds=60)
        await manager.initialize()

        # Simulate expensive operation
        async def expensive_operation():
            await asyncio.sleep(0.1)  # 100ms
            return {"result": "expensive"}

        # First call (miss, expensive)
        import time
        start = time.time()
        result = await manager.get("key1")
        if result is None:
            result = await expensive_operation()
            await manager.set("key1", result)
        first_duration = time.time() - start

        # Second call (hit, fast)
        start = time.time()
        result = await manager.get("key1")
        second_duration = time.time() - start

        # Cache hit should be significantly faster
        assert second_duration < first_duration * 0.5  # At least 50% faster
        assert manager.stats['l1_hits'] == 1

        await manager.shutdown()
