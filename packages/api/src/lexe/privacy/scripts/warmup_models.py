#!/usr/bin/env python3
"""
Model warmup script for LEXePro privacy module.

This script preloads all configured NLP models at application startup
to eliminate cold start delays. Provides a CLI interface with progress
tracking and timing information.

Usage:
    # Warmup all models
    python -m llsearch.privacy.scripts.warmup_models

    # From Docker entrypoint
    python -m llsearch.privacy.scripts.warmup_models --timeout 120

    # Skip warmup (dry run)
    python -m llsearch.privacy.scripts.warmup_models --dry-run

Example output:
    LEXePro Model Warmup
    ====================

    Loading models...
    ✓ spacy:it_core_news_lg (2.34s)
    ✓ presidio_analyzer:it_core_news_lg (1.89s)
    ✓ presidio_anonymizer:replace (0.05s)

    Warmup completed in 4.28s
    3 models loaded successfully
"""

import sys
import time
import argparse
import logging
from typing import Dict

from llsearch.privacy.engines.model_manager import ModelManager
from llsearch.privacy.config import get_privacy_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def print_header():
    """Print script header."""
    print("\nLEXePro Model Warmup")
    print("=" * 50)
    print()


def print_progress(model_key: str, load_time: float, success: bool = True):
    """
    Print progress for single model load.

    Args:
        model_key: Model identifier
        load_time: Time taken to load (seconds)
        success: Whether load was successful
    """
    status = "✓" if success else "✗"
    if success:
        print(f"  {status} {model_key} ({load_time:.2f}s)")
    else:
        print(f"  {status} {model_key} (FAILED)")


def print_summary(load_times: Dict[str, float], total_time: float):
    """
    Print summary statistics.

    Args:
        load_times: Dict mapping model keys to load times
        total_time: Total warmup time (seconds)
    """
    successful = [k for k, v in load_times.items() if v >= 0]
    failed = [k for k, v in load_times.items() if v < 0]

    print()
    print(f"Warmup completed in {total_time:.2f}s")
    print(f"{len(successful)} models loaded successfully")

    if failed:
        print(f"{len(failed)} models failed:")
        for model_key in failed:
            print(f"  - {model_key}")


def warmup_models(timeout: int = 120, verbose: bool = False) -> int:
    """
    Warmup all configured models.

    Args:
        timeout: Maximum time to wait for warmup (seconds)
        verbose: Enable verbose logging

    Returns:
        Exit code (0 = success, 1 = failure)
    """
    # Configure logging level
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    print_header()

    # Get configuration
    config = get_privacy_config()

    # Check if warmup is enabled
    if not config.model.preload_enabled:
        logger.info("Model preloading is disabled (MODEL_PRELOAD_ENABLED=false)")
        print("Model preloading is disabled. Set MODEL_PRELOAD_ENABLED=true to enable.")
        return 0

    # Get model manager
    manager = ModelManager.get_instance(
        max_memory_mb=config.model.max_memory_mb,
        enable_cache=config.model.enable_cache
    )

    print("Loading models...")
    start_time = time.time()

    try:
        # Warmup all models
        load_times = manager.warmup_all_models()

        # Check for timeout
        elapsed = time.time() - start_time
        if elapsed > timeout:
            logger.warning(f"Warmup exceeded timeout ({timeout}s)")
            print(f"\nWARNING: Warmup exceeded timeout ({timeout}s)")

        # Print progress for each model
        for model_key, load_time in load_times.items():
            success = load_time >= 0
            print_progress(model_key, load_time if success else 0, success)

        # Print summary
        print_summary(load_times, elapsed)

        # Check for failures
        failed_models = [k for k, v in load_times.items() if v < 0]
        if failed_models:
            logger.error(f"Failed to load {len(failed_models)} models")
            return 1

        logger.info("Model warmup completed successfully")
        return 0

    except KeyboardInterrupt:
        print("\n\nWarmup interrupted by user")
        logger.warning("Warmup interrupted by user")
        return 130  # Standard exit code for SIGINT

    except Exception as e:
        print(f"\n\nERROR: Warmup failed: {e}")
        logger.exception("Warmup failed with exception")
        return 1


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Preload NLP models for LEXePro privacy module",
        epilog="Example: python -m llsearch.privacy.scripts.warmup_models --timeout 120"
    )

    parser.add_argument(
        '--timeout',
        type=int,
        default=120,
        help='Maximum time to wait for warmup in seconds (default: 120)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be loaded without actually loading models'
    )

    args = parser.parse_args()

    # Dry run mode
    if args.dry_run:
        print_header()
        print("DRY RUN MODE - No models will be loaded\n")

        config = get_privacy_config()

        print("Configuration:")
        print(f"  Preload enabled: {config.model.preload_enabled}")
        print(f"  Max memory: {config.model.max_memory_mb}MB")
        print(f"  Cache enabled: {config.model.enable_cache}")
        print(f"  Timeout: {args.timeout}s")
        print()

        if config.spacy.enabled:
            print(f"  • spacy:{config.spacy.model_name}")

        if config.presidio.enabled:
            print(f"  • presidio_analyzer:{config.spacy.model_name}")
            print(f"  • presidio_anonymizer:{config.replacement.default_strategy}")

        print()
        return 0

    # Run warmup
    exit_code = warmup_models(timeout=args.timeout, verbose=args.verbose)
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
