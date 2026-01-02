"""
spaCy NER model fine-tuning for Italian legal documents.

This module provides utilities to fine-tune a spaCy NER model on Italian
legal domain data, improving entity recognition for:
- PERSON, ORG, CF, PIVA, EMAIL, PHONE, ADDRESS, LEGAL_REF

The fine-tuning process:
1. Load base model (it_core_news_lg)
2. Update NER pipeline with legal domain examples
3. Train for N iterations with dropout
4. Evaluate on test set
5. Save fine-tuned model

Usage:
    from llsearch.privacy.engines.spacy.ner_model import SpacyNERTrainer

    trainer = SpacyNERTrainer(
        base_model='it_core_news_lg',
        output_dir='models/spacy_legal_ner',
        n_iter=30
    )

    # Train model
    metrics = trainer.train(train_data, test_data)

    # Evaluate
    results = trainer.evaluate(test_data)
    print(f"F1-score: {results['f1']:.3f}")
"""

import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import random
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import json


class SpacyNERTrainer:
    """
    Fine-tune spaCy NER model for Italian legal documents.

    This class handles the complete training pipeline:
    - Model initialization
    - Training loop with mini-batches
    - Evaluation metrics (precision, recall, F1)
    - Model saving and loading

    Args:
        base_model: Base spaCy model to fine-tune (default: 'it_core_news_lg')
        output_dir: Directory to save fine-tuned model
        n_iter: Number of training iterations (default: 30)
        dropout: Dropout rate for regularization (default: 0.3)
        batch_size: Initial batch size (default: 8, will compound)
        learning_rate: Learning rate for optimizer (default: 0.001)

    Example:
        trainer = SpacyNERTrainer(
            base_model='it_core_news_lg',
            output_dir='models/spacy_legal_ner',
            n_iter=30,
            dropout=0.3
        )

        # Train
        metrics = trainer.train(train_data, test_data)

        # Save
        trainer.save_model()
    """

    def __init__(
        self,
        base_model: str = 'it_core_news_lg',
        output_dir: str = 'models/spacy_legal_ner',
        n_iter: int = 30,
        dropout: float = 0.3,
        batch_size: int = 8,
        learning_rate: float = 0.001,
    ):
        """Initialize trainer."""
        self.base_model = base_model
        self.output_dir = Path(output_dir)
        self.n_iter = n_iter
        self.dropout = dropout
        self.batch_size = batch_size
        self.learning_rate = learning_rate

        self.nlp = None
        self.training_history = []

    def load_model(self):
        """
        Load base spaCy model for fine-tuning.

        Loads the base Italian model and ensures NER component is present.
        If model doesn't exist, raises error with installation instructions.
        """
        print(f"Loading base model: {self.base_model}")

        try:
            self.nlp = spacy.load(self.base_model)
        except OSError:
            raise RuntimeError(
                f"Model '{self.base_model}' not found. Install with:\n"
                f"python -m spacy download {self.base_model}"
            )

        # Ensure NER component exists
        if 'ner' not in self.nlp.pipe_names:
            raise ValueError(f"Model '{self.base_model}' does not have NER component")

        print(f"Base model loaded. Pipeline: {self.nlp.pipe_names}")

    def prepare_training_data(
        self,
        data: List[Tuple[str, Dict]]
    ) -> List[Example]:
        """
        Convert training data to spaCy Example objects.

        Args:
            data: List of (text, annotations) tuples where annotations
                  have format: {"entities": [(start, end, label), ...]}

        Returns:
            List of spaCy Example objects ready for training
        """
        examples = []

        for text, annotations in data:
            # Create Doc from text
            doc = self.nlp.make_doc(text)

            # Create Example with gold-standard annotations
            example = Example.from_dict(doc, annotations)
            examples.append(example)

        return examples

    def train(
        self,
        train_data: List[Tuple[str, Dict]],
        test_data: Optional[List[Tuple[str, Dict]]] = None,
        verbose: bool = True
    ) -> Dict[str, List]:
        """
        Train spaCy NER model on legal documents.

        Training process:
        1. Load base model
        2. Prepare training examples
        3. Get NER component and optimizer
        4. Train for n_iter iterations with:
           - Mini-batch training
           - Compounding batch size (8 → 32)
           - Dropout regularization
           - Shuffling between iterations
        5. Evaluate on test set after each iteration

        Args:
            train_data: Training examples (text, annotations)
            test_data: Optional test set for evaluation during training
            verbose: Print progress information

        Returns:
            Dictionary with training history:
                - 'losses': List of loss values per iteration
                - 'f1_scores': List of F1 scores (if test_data provided)
                - 'precision': List of precision scores
                - 'recall': List of recall scores
        """
        # Load model
        if self.nlp is None:
            self.load_model()

        # Prepare training examples
        if verbose:
            print(f"\nPreparing {len(train_data)} training examples...")

        train_examples = self.prepare_training_data(train_data)

        # Get NER component
        ner = self.nlp.get_pipe('ner')

        # Add all entity labels to NER
        for _, annotations in train_data:
            for _, _, label in annotations["entities"]:
                ner.add_label(label)

        if verbose:
            print(f"Entity labels: {ner.labels}")

        # Get optimizer
        optimizer = self.nlp.resume_training()

        # Set learning rate
        optimizer.learn_rate = self.learning_rate

        # Initialize training history
        history = {
            'losses': [],
            'f1_scores': [],
            'precision': [],
            'recall': [],
        }

        # Training loop
        if verbose:
            print(f"\nTraining for {self.n_iter} iterations...")
            print("=" * 70)

        for iteration in range(self.n_iter):
            # Shuffle training data
            random.shuffle(train_examples)

            losses = {}

            # Mini-batch training with compounding batch size
            batches = minibatch(
                train_examples,
                size=compounding(self.batch_size, 32.0, 1.001)
            )

            for batch in batches:
                # Update model with batch
                self.nlp.update(
                    batch,
                    drop=self.dropout,
                    losses=losses,
                    sgd=optimizer
                )

            # Record loss
            history['losses'].append(losses.get('ner', 0.0))

            # Evaluate on test set
            if test_data:
                eval_results = self.evaluate(test_data, verbose=False)
                history['f1_scores'].append(eval_results['f1'])
                history['precision'].append(eval_results['precision'])
                history['recall'].append(eval_results['recall'])

                if verbose:
                    print(
                        f"Iteration {iteration + 1}/{self.n_iter} | "
                        f"Loss: {losses.get('ner', 0.0):.4f} | "
                        f"F1: {eval_results['f1']:.3f} | "
                        f"P: {eval_results['precision']:.3f} | "
                        f"R: {eval_results['recall']:.3f}"
                    )
            else:
                if verbose:
                    print(
                        f"Iteration {iteration + 1}/{self.n_iter} | "
                        f"Loss: {losses.get('ner', 0.0):.4f}"
                    )

        if verbose:
            print("=" * 70)
            print("Training complete!")

            if test_data:
                final_f1 = history['f1_scores'][-1]
                print(f"\nFinal F1-score: {final_f1:.3f}")

                if final_f1 >= 0.85:
                    print("✅ Target F1-score (>0.85) achieved!")
                else:
                    print(f"⚠️  Target F1-score (>0.85) not reached. Consider:")
                    print("   - Increasing n_iter")
                    print("   - Adding more training data")
                    print("   - Adjusting learning_rate or dropout")

        # Store training history
        self.training_history = history

        return history

    def evaluate(
        self,
        test_data: List[Tuple[str, Dict]],
        verbose: bool = True
    ) -> Dict[str, float]:
        """
        Evaluate model on test set.

        Calculates entity-level metrics:
        - Precision: TP / (TP + FP)
        - Recall: TP / (TP + FN)
        - F1-score: 2 * (P * R) / (P + R)

        Args:
            test_data: Test examples (text, annotations)
            verbose: Print detailed results

        Returns:
            Dictionary with metrics:
                - 'precision': Entity-level precision
                - 'recall': Entity-level recall
                - 'f1': F1-score
                - 'tp': True positives count
                - 'fp': False positives count
                - 'fn': False negatives count
        """
        if self.nlp is None:
            raise ValueError("Model not loaded. Call load_model() first.")

        # Prepare test examples
        test_examples = self.prepare_training_data(test_data)

        # Use spaCy's scorer
        scorer = self.nlp.evaluate(test_examples)

        # Extract NER metrics
        ner_scores = scorer.get('ents_per_type', {})

        # Calculate overall metrics
        precision = scorer.get('ents_p', 0.0)
        recall = scorer.get('ents_r', 0.0)
        f1 = scorer.get('ents_f', 0.0)

        results = {
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'per_type': ner_scores,
        }

        if verbose:
            print("\n" + "=" * 70)
            print("Evaluation Results")
            print("=" * 70)
            print(f"Precision: {precision:.3f}")
            print(f"Recall:    {recall:.3f}")
            print(f"F1-score:  {f1:.3f}")

            print("\nPer-entity type:")
            for entity_type, scores in ner_scores.items():
                type_p = scores.get('p', 0.0)
                type_r = scores.get('r', 0.0)
                type_f = scores.get('f', 0.0)
                print(f"  {entity_type:12s} | P: {type_p:.3f} | R: {type_r:.3f} | F1: {type_f:.3f}")

            print("=" * 70)

        return results

    def save_model(self, output_dir: Optional[Path] = None):
        """
        Save fine-tuned model to disk.

        Args:
            output_dir: Directory to save model (default: self.output_dir)
        """
        if self.nlp is None:
            raise ValueError("No model to save. Train model first.")

        save_path = output_dir or self.output_dir
        save_path.mkdir(parents=True, exist_ok=True)

        # Save model
        self.nlp.to_disk(save_path)

        # Save training history
        history_path = save_path / "training_history.json"
        with open(history_path, 'w', encoding='utf-8') as f:
            json.dump(self.training_history, f, indent=2, ensure_ascii=False)

        # Save config
        config = {
            'base_model': self.base_model,
            'n_iter': self.n_iter,
            'dropout': self.dropout,
            'batch_size': self.batch_size,
            'learning_rate': self.learning_rate,
            'labels': list(self.nlp.get_pipe('ner').labels),
        }

        config_path = save_path / "training_config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Model saved to: {save_path}")
        print(f"   - Model: {save_path / 'config.cfg'}")
        print(f"   - History: {history_path}")
        print(f"   - Config: {config_path}")

    def load_finetuned_model(self, model_dir: Path):
        """
        Load a previously fine-tuned model.

        Args:
            model_dir: Directory containing saved model
        """
        model_path = Path(model_dir)

        if not model_path.exists():
            raise FileNotFoundError(f"Model directory not found: {model_path}")

        print(f"Loading fine-tuned model from: {model_path}")
        self.nlp = spacy.load(model_path)

        # Load training history if available
        history_path = model_path / "training_history.json"
        if history_path.exists():
            with open(history_path, 'r', encoding='utf-8') as f:
                self.training_history = json.load(f)

        print(f"Model loaded. Pipeline: {self.nlp.pipe_names}")


def plot_training_history(history: Dict[str, List], output_path: Optional[Path] = None):
    """
    Plot training metrics over iterations.

    Args:
        history: Training history from trainer.train()
        output_path: Optional path to save plot image

    Requires matplotlib to be installed.
    """
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed. Install with: pip install matplotlib")
        return

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Plot loss
    ax1.plot(history['losses'], label='NER Loss', linewidth=2)
    ax1.set_xlabel('Iteration')
    ax1.set_ylabel('Loss')
    ax1.set_title('Training Loss')
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Plot metrics
    if history['f1_scores']:
        iterations = range(len(history['f1_scores']))
        ax2.plot(iterations, history['precision'], label='Precision', linewidth=2)
        ax2.plot(iterations, history['recall'], label='Recall', linewidth=2)
        ax2.plot(iterations, history['f1_scores'], label='F1-score', linewidth=2, linestyle='--')

        # Target line
        ax2.axhline(y=0.85, color='green', linestyle=':', label='Target (0.85)', alpha=0.7)

        ax2.set_xlabel('Iteration')
        ax2.set_ylabel('Score')
        ax2.set_title('Evaluation Metrics')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        ax2.set_ylim([0, 1.05])

    plt.tight_layout()

    if output_path:
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"Plot saved to: {output_path}")
    else:
        plt.show()


if __name__ == "__main__":
    # Example usage
    from .training_data import TRAIN_DATA_FULL, TEST_DATA

    print("spaCy NER Trainer - Italian Legal Documents")
    print("=" * 70)

    # Initialize trainer
    trainer = SpacyNERTrainer(
        base_model='it_core_news_lg',
        output_dir='models/spacy_legal_ner',
        n_iter=30,
        dropout=0.3,
        batch_size=8,
        learning_rate=0.001,
    )

    # Train
    print("\nStarting training...")
    history = trainer.train(
        train_data=TRAIN_DATA_FULL,
        test_data=TEST_DATA,
        verbose=True
    )

    # Final evaluation
    print("\nFinal evaluation on test set:")
    results = trainer.evaluate(TEST_DATA, verbose=True)

    # Save model
    trainer.save_model()

    # Plot training history (if matplotlib available)
    try:
        plot_training_history(
            history,
            output_path=Path('models/spacy_legal_ner/training_plot.png')
        )
    except Exception as e:
        print(f"Could not create training plot: {e}")
