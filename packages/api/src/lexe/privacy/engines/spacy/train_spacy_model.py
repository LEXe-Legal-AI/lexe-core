#!/usr/bin/env python3
"""
Train spaCy NER model for Italian legal documents.

This script fine-tunes a spaCy model on Italian legal domain data to improve
entity recognition for:
- PERSON, ORG, CF, PIVA, EMAIL, PHONE, ADDRESS, LEGAL_REF

Usage:
    # Basic training (30 iterations)
    python train_spacy_model.py

    # Custom configuration
    python train_spacy_model.py --n-iter 50 --dropout 0.4 --learning-rate 0.002

    # Load and evaluate existing model
    python train_spacy_model.py --evaluate-only --model-dir models/spacy_legal_ner

Arguments:
    --base-model: Base spaCy model (default: it_core_news_lg)
    --output-dir: Output directory for trained model (default: models/spacy_legal_ner)
    --n-iter: Number of training iterations (default: 30)
    --dropout: Dropout rate (default: 0.3)
    --batch-size: Initial batch size (default: 8)
    --learning-rate: Learning rate (default: 0.001)
    --evaluate-only: Only evaluate existing model, don't train
    --model-dir: Model directory for evaluation
    --save-plot: Save training plot to file

Output:
    - Trained model in output_dir/
    - Training history JSON
    - Training config JSON
    - Training plot (optional)

Example:
    # Train with custom parameters
    python train_spacy_model.py \\
        --n-iter 50 \\
        --dropout 0.35 \\
        --learning-rate 0.0015 \\
        --save-plot

    # Evaluate existing model
    python train_spacy_model.py \\
        --evaluate-only \\
        --model-dir models/spacy_legal_ner
"""

import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from llsearch.privacy.engines.spacy.ner_model import (
    SpacyNERTrainer,
    plot_training_history
)
from llsearch.privacy.engines.spacy.training_data import (
    TRAIN_DATA_FULL,
    TEST_DATA,
    print_dataset_info
)


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description='Train spaCy NER model for Italian legal documents',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic training
  python train_spacy_model.py

  # Custom parameters
  python train_spacy_model.py --n-iter 50 --dropout 0.4 --learning-rate 0.002

  # Evaluate existing model
  python train_spacy_model.py --evaluate-only --model-dir models/spacy_legal_ner
        """
    )

    parser.add_argument(
        '--base-model',
        type=str,
        default='it_core_news_lg',
        help='Base spaCy model to fine-tune (default: it_core_news_lg)'
    )

    parser.add_argument(
        '--output-dir',
        type=str,
        default='models/spacy_legal_ner',
        help='Output directory for trained model (default: models/spacy_legal_ner)'
    )

    parser.add_argument(
        '--n-iter',
        type=int,
        default=30,
        help='Number of training iterations (default: 30)'
    )

    parser.add_argument(
        '--dropout',
        type=float,
        default=0.3,
        help='Dropout rate for regularization (default: 0.3)'
    )

    parser.add_argument(
        '--batch-size',
        type=int,
        default=8,
        help='Initial batch size (default: 8, will compound to 32)'
    )

    parser.add_argument(
        '--learning-rate',
        type=float,
        default=0.001,
        help='Learning rate for optimizer (default: 0.001)'
    )

    parser.add_argument(
        '--evaluate-only',
        action='store_true',
        help='Only evaluate existing model, don\'t train'
    )

    parser.add_argument(
        '--model-dir',
        type=str,
        help='Model directory for evaluation (used with --evaluate-only)'
    )

    parser.add_argument(
        '--save-plot',
        action='store_true',
        help='Save training plot to file'
    )

    parser.add_argument(
        '--no-verbose',
        action='store_true',
        help='Disable verbose output'
    )

    return parser.parse_args()


def train_model(args):
    """
    Train spaCy NER model.

    Args:
        args: Parsed command-line arguments
    """
    verbose = not args.no_verbose

    # Print dataset info
    if verbose:
        print_dataset_info()
        print()

    # Initialize trainer
    if verbose:
        print("Initializing trainer...")
        print(f"  Base model: {args.base_model}")
        print(f"  Output directory: {args.output_dir}")
        print(f"  Iterations: {args.n_iter}")
        print(f"  Dropout: {args.dropout}")
        print(f"  Batch size: {args.batch_size}")
        print(f"  Learning rate: {args.learning_rate}")
        print()

    trainer = SpacyNERTrainer(
        base_model=args.base_model,
        output_dir=args.output_dir,
        n_iter=args.n_iter,
        dropout=args.dropout,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
    )

    # Train
    try:
        if verbose:
            print(f"Training on {len(TRAIN_DATA_FULL)} examples...")
            print(f"Test set: {len(TEST_DATA)} examples")
            print()

        history = trainer.train(
            train_data=TRAIN_DATA_FULL,
            test_data=TEST_DATA,
            verbose=verbose
        )

        # Final evaluation
        if verbose:
            print("\n" + "=" * 70)
            print("FINAL EVALUATION")
            print("=" * 70)

        results = trainer.evaluate(TEST_DATA, verbose=verbose)

        # Check if target achieved
        if results['f1'] >= 0.85:
            if verbose:
                print("\n✅ SUCCESS: Target F1-score (>0.85) achieved!")
        else:
            if verbose:
                print(f"\n⚠️  WARNING: Target F1-score (>0.85) not reached.")
                print(f"   Current F1: {results['f1']:.3f}")
                print("\n   Recommendations:")
                print("   - Increase --n-iter (try 50 or 100)")
                print("   - Add more training data")
                print("   - Adjust --learning-rate or --dropout")
                print("   - Review training data quality")

        # Save model
        if verbose:
            print("\nSaving model...")

        trainer.save_model()

        # Save training plot
        if args.save_plot:
            if verbose:
                print("\nGenerating training plot...")

            output_path = Path(args.output_dir) / "training_plot.png"
            try:
                plot_training_history(history, output_path=output_path)
            except ImportError:
                print("⚠️  matplotlib not installed. Skipping plot.")
                print("   Install with: pip install matplotlib")
            except Exception as e:
                print(f"⚠️  Could not create plot: {e}")

        # Print summary
        if verbose:
            print("\n" + "=" * 70)
            print("TRAINING COMPLETE")
            print("=" * 70)
            print(f"\n📂 Model saved to: {args.output_dir}")
            print(f"\n📊 Final metrics:")
            print(f"   - Precision: {results['precision']:.3f}")
            print(f"   - Recall:    {results['recall']:.3f}")
            print(f"   - F1-score:  {results['f1']:.3f}")
            print("\n🚀 You can now use the fine-tuned model:")
            print(f"   from llsearch.privacy.engines.spacy import SpacyEngine")
            print(f"   engine = SpacyEngine(model_name='{args.output_dir}')")
            print()

        return 0

    except Exception as e:
        print(f"\n❌ ERROR during training: {e}")
        import traceback
        traceback.print_exc()
        return 1


def evaluate_model(args):
    """
    Evaluate existing model.

    Args:
        args: Parsed command-line arguments
    """
    verbose = not args.no_verbose

    if not args.model_dir:
        print("❌ ERROR: --model-dir required for evaluation")
        return 1

    model_path = Path(args.model_dir)
    if not model_path.exists():
        print(f"❌ ERROR: Model directory not found: {model_path}")
        return 1

    # Initialize trainer
    if verbose:
        print(f"Loading model from: {model_path}")
        print()

    trainer = SpacyNERTrainer()

    try:
        # Load model
        trainer.load_finetuned_model(model_path)

        # Evaluate
        if verbose:
            print("\n" + "=" * 70)
            print("EVALUATION")
            print("=" * 70)

        results = trainer.evaluate(TEST_DATA, verbose=verbose)

        # Print summary
        if verbose:
            print("\n" + "=" * 70)
            print("EVALUATION COMPLETE")
            print("=" * 70)
            print(f"\n📊 Metrics:")
            print(f"   - Precision: {results['precision']:.3f}")
            print(f"   - Recall:    {results['recall']:.3f}")
            print(f"   - F1-score:  {results['f1']:.3f}")

            if results['f1'] >= 0.85:
                print("\n✅ Model meets target F1-score (>0.85)")
            else:
                print(f"\n⚠️  Model below target F1-score (>0.85)")

            print()

        return 0

    except Exception as e:
        print(f"\n❌ ERROR during evaluation: {e}")
        import traceback
        traceback.print_exc()
        return 1


def main():
    """Main entry point."""
    args = parse_args()

    print("=" * 70)
    print("spaCy NER Trainer - Italian Legal Documents")
    print("=" * 70)
    print()

    # Check if base model is installed (if training)
    if not args.evaluate_only:
        try:
            import spacy
            spacy.load(args.base_model)
        except OSError:
            print(f"❌ ERROR: Base model '{args.base_model}' not found.")
            print(f"\nInstall with:")
            print(f"  python -m spacy download {args.base_model}")
            print()
            return 1

    # Train or evaluate
    if args.evaluate_only:
        return evaluate_model(args)
    else:
        return train_model(args)


if __name__ == "__main__":
    sys.exit(main())
