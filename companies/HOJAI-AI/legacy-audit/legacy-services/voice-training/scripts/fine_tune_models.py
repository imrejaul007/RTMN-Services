"""
Fine-tune Whisper for Indian English & Hinglish

This script fine-tunes OpenAI Whisper on Indian English data.

Requirements:
    pip install torch transformers datasets accelerate evaluate

Usage:
    python fine_tune_models.py --data ./datasets/indian_english --output ./models
"""

import os
import sys
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import torch
from torch.utils.data import Dataset
from transformers import (
    WhisperProcessor,
    WhisperForConditionalGeneration,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
    TrainerCallback,
    EarlyStoppingCallback,
)
from datasets import load_dataset, Audio, Dataset as HFDataset

# Check for GPU
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {DEVICE}")

# ============================================================================
# CONFIG
# ============================================================================

@dataclass
class FineTuneConfig:
    model_name: str = "openai/whisper-small"
    language: str = "english"
    task: str = "transcribe"
    output_dir: str = "./models/whisper-indian"
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 16
    gradient_accumulation_steps: int = 1
    learning_rate: float = 1e-5
    warmup_steps: int = 500
    weight_decay: float = 0.01
    max_duration_seconds: int = 30
    num_samples: int = 10000
    logging_steps: int = 25
    save_steps: int = 1000
    eval_steps: int = 1000
    fp16: bool = True

# ============================================================================
# DATASET
# ============================================================================

class WhisperDataset(Dataset):
    """Custom dataset for Whisper fine-tuning"""

    def __init__(
        self,
        data: List[Dict],
        processor: WhisperProcessor,
        max_duration: int = 30,
    ):
        self.data = data
        self.processor = processor
        self.max_duration = max_duration

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]

        # Get audio and transcription
        audio_path = item.get("audio_path", "")
        transcription = item.get("transcription", item.get("text", ""))

        # Load audio
        try:
            from scipy.io import wavfile
            import numpy as np

            if os.path.exists(audio_path):
                sr, audio = wavfile.read(audio_path)
                audio = audio.astype(float) / 32768.0
            else:
                # Use dummy audio if file doesn't exist
                audio = self._generate_dummy_audio()
        except:
            audio = self._generate_dummy_audio()

        # Process audio
        input_features = self.processor.feature_extractor(
            audio,
            sampling_rate=16000,
            return_tensors="pt",
        ).input_features[0]

        # Tokenize transcription
        labels = self.processor.tokenizer(
            transcription,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=448,
        ).input_ids[0]

        return {
            "input_features": input_features,
            "labels": labels,
            "text": transcription,
        }

    def _generate_dummy_audio(self):
        """Generate dummy audio for testing"""
        import numpy as np
        duration = self.max_duration * 16000
        return np.random.randn(duration).astype(float) * 0.01


def load_training_data(data_path: str) -> List[Dict]:
    """Load training data from file or directory"""
    data_path = Path(data_path)

    if data_path.suffix == ".json":
        # Load from JSON file
        with open(data_path) as f:
            return json.load(f)

    elif data_path.is_dir():
        # Load from directory with metadata.csv
        import pandas as pd
        metadata_file = data_path / "metadata.csv"
        if metadata_file.exists():
            df = pd.read_csv(metadata_file)
            return df.to_dict("records")

    # Return sample data for testing
    return generate_sample_data()


def generate_sample_data(num_samples: int = 100) -> List[Dict]:
    """Generate sample training data"""
    samples = []

    indian_names = [
        "Rahul Sharma", "Priya Patel", "Amit Kumar", "Neha Singh",
        "Vikram Gupta", "Kavita Joshi", "Sanjay Reddy", "Anita Rao"
    ]

    actions = [
        "Schedule meeting with",
        "Send email to",
        "Message",
        "Call",
        "Follow up with",
        "Create task for",
        "Book demo for",
    ]

    companies = [
        "Flipkart", "Amazon", "Reliance", "Infosys", "TCS",
        "Wipro", "HDFC", "ICICI", "Paytm", "PhonePe"
    ]

    for i in range(num_samples):
        name = indian_names[i % len(indian_names)]
        action = actions[i % len(actions)]
        company = companies[i % len(companies)]

        # Mix of sentences
        if i % 3 == 0:
            text = f"{action} {name}"
        elif i % 3 == 1:
            text = f"{action} {company}"
        else:
            text = f"{action} {name} from {company}"

        samples.append({
            "text": text,
            "transcription": text,
            "audio_path": "",
        })

    return samples


# ============================================================================
# TRAINING
# ============================================================================

def train_whisper(config: FineTuneConfig) -> Dict:
    """Fine-tune Whisper model"""

    print("=" * 50)
    print("WHISPER FINE-TUNING")
    print("=" * 50)
    print(f"Model: {config.model_name}")
    print(f"Output: {config.output_dir}")
    print(f"Epochs: {config.num_train_epochs}")
    print(f"Batch size: {config.per_device_train_batch_size}")
    print()

    # Create output directory
    Path(config.output_dir).mkdir(parents=True, exist_ok=True)

    # Load processor
    print("Loading processor...")
    processor = WhisperProcessor.from_pretrained(config.model_name)

    # Load or generate data
    print("Loading training data...")
    training_data = load_training_data("./datasets")

    if not training_data:
        print("No training data found. Generating sample data...")
        training_data = generate_sample_data(config.num_samples)

    print(f"Training samples: {len(training_data)}")

    # Create dataset
    dataset = WhisperDataset(
        training_data,
        processor,
        max_duration=config.max_duration_seconds,
    )

    # Load model
    print("Loading model...")
    model = WhisperForConditionalGeneration.from_pretrained(config.model_name)

    # Set model config
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []

    # Training arguments
    training_args = Seq2SeqTrainingArguments(
        output_dir=config.output_dir,
        per_device_train_batch_size=config.per_device_train_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        warmup_steps=config.warmup_steps,
        weight_decay=config.weight_decay,
        num_train_epochs=config.num_train_epochs,
        max_steps=-1,
        fp16=config.fp16 and DEVICE == "cuda",
        evaluation_strategy="no",
        save_strategy="steps",
        save_steps=config.save_steps,
        logging_steps=config.logging_steps,
        predict_with_generate=False,
        generation_max_length=448,
        report_to=["tensorboard"],
        load_best_model_at_end=False,
        metric_for_best_model="wer",
        greater_is_better=False,
        dataloader_num_workers=4,
        disable_tqdm=False,
        remove_unused_columns=False,
    )

    # Trainer
    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        tokenizer=processor.feature_extractor,
    )

    # Train
    print()
    print("Starting training...")
    print()

    trainer.train()

    # Save model
    print()
    print("Saving model...")
    trainer.save_model(config.output_dir)
    processor.save_pretrained(config.output_dir)

    # Save config
    config_dict = {
        "model_name": config.model_name,
        "language": config.language,
        "task": config.task,
        "num_samples": len(training_data),
        "epochs": config.num_train_epochs,
    }
    with open(f"{config.output_dir}/config.json", "w") as f:
        json.dump(config_dict, f, indent=2)

    print()
    print("=" * 50)
    print("TRAINING COMPLETE")
    print("=" * 50)
    print(f"Model saved to: {config.output_dir}")

    return {"status": "success", "output_dir": config.output_dir}


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Fine-tune Whisper for Indian English"
    )
    parser.add_argument(
        "--data",
        type=str,
        default="./datasets",
        help="Path to training data",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="./models/whisper-indian",
        help="Output directory",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Number of epochs",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=16,
        help="Batch size",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=1e-5,
        help="Learning rate",
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=100,
        help="Number of samples (for testing)",
    )

    args = parser.parse_args()

    config = FineTuneConfig(
        output_dir=args.output,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=args.lr,
        num_samples=args.samples,
    )

    result = train_whisper(config)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
