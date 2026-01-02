"""
Privacy Cache Module

Provides 2-layer caching system for privacy/pseudonymization pipeline:
- L1: In-memory LRU cache (fast, limited size)
- L2: Redis distributed cache (slower, larger capacity)

Exports:
    CacheManager: Main cache manager class
    get_cache_manager: Get singleton cache instance
    reset_cache_manager: Reset cache (for testing)
    generate_cache_key: Generate deterministic cache key
    hash_config: Hash configuration for cache key
"""

from .cache_manager import (
    CacheManager,
    get_cache_manager,
    reset_cache_manager,
    generate_cache_key,
    hash_config,
    MemoryCache,
    RedisCache,
)

__all__ = [
    'CacheManager',
    'get_cache_manager',
    'reset_cache_manager',
    'generate_cache_key',
    'hash_config',
    'MemoryCache',
    'RedisCache',
]
