"""
Whisper Fine-tuning for Indian English & Hinglish

Trains Whisper model on:
- Indian English speech
- Hindi-English code-switching
- Regional accents

Usage:
    python train_whisper_indian.py --dataset ./datasets/indian_english
"""

import os
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional

import torch
from torch.utils.data import DataLoader
from transformers import (
    WhisperProcessor,
    WhisperForConditionalGeneration,
    WhisperFeatureExtractor,
    WhisperTokenizer,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
    TrainerCallback,
)
from datasets import load_dataset, Audio

# ============================================================================
# CONFIG
# ============================================================================

@dataclass
class IndianWhisperConfig:
    model_name: str = "openai/whisper-small"
    language: str = "english"
    task: str = "transcribe"
    max_duration: int = 30  # seconds
    num_samples: int = 10000
    batch_size: int = 8
    learning_rate: float = 1e-5
    num_epochs: int = 3
    warmup_steps: int = 500
    output_dir: str = "./models/whisper-indian-english"
    fp16: bool = True
    gradient_checkpointing: bool = True

# ============================================================================
# DATASET PREPARATION
# ============================================================================

class IndianEnglishDataset:
    """
    Dataset for Indian English and Hinglish speech
    """

    def __init__(self, dataset_path: str, split: str = "train"):
        self.dataset_path = Path(dataset_path)
        self.split = split

    def prepare_dataset(self, audio_files: List[str], transcriptions: List[str]):
        """
        Prepare dataset from audio files and transcriptions

        Expected format:
        - audio_files: List of paths to audio files (.mp3, .wav, .m4a)
        - transcriptions: List of transcription texts
        """
        data = {
            "audio": audio_files,
            "sentence": transcriptions,
            "audio_file_path": audio_files,
        }

        dataset = load_dataset("audiofolder", data=data, split="train")

        # Resample to 16kHz
        dataset = dataset.cast_column("audio", Audio(sampling_rate=16000))

        return dataset

    @staticmethod
    def prepare_from_directory(directory: str):
        """
        Prepare dataset from directory structure:
        directory/
            audio/
                file1.mp3
                file2.wav
            metadata.csv
        """
        import pandas as pd

        metadata_path = Path(directory) / "metadata.csv"
        audio_dir = Path(directory) / "audio"

        df = pd.read_csv(metadata_path)

        audio_files = [str(audio_dir / f) for f in df["audio_file"]]
        transcriptions = df["transcription"].tolist()

        return IndianEnglishDataset.prepare_dataset(audio_files, transcriptions)

# ============================================================================
# DATA COLLATOR
# ============================================================================

def prepare_dataset(batch, processor, feature_extractor, tokenizer):
    """
    Process batch for training
    """
    # Load and resample audio
    batch["audio"] = batch["audio"].map(
        lambda x: x["array"],
        desc="Resampling audio",
    )

    # Compute log-mel input features
    inputs = feature_extractor(
        batch["audio"],
        sampling_rate=feature_extractor.sampling_rate,
        padding="max_length",
        max_length=3000,  # 30 seconds at 16kHz
        truncation=True,
        return_tensors="pt",
    )

    # Tokenize transcriptions
    labels = tokenizer(
        batch["sentence"],
        padding="max_length",
        max_length=448,
        truncation=True,
        return_tensors="pt",
    )

    batch["input_features"] = inputs.input_features[0]
    batch["labels"] = labels.input_ids[0]

    return batch

# ============================================================================
# TRAINING
# ============================================================================

def train_whisper_indian(config: IndianWhisperConfig):
    """
    Train Whisper model for Indian English
    """
    print(f"Loading Whisper model: {config.model_name}")

    # Load processor
    processor = WhisperProcessor.from_pretrained(
        config.model_name,
        language=config.language,
        task=config.task,
    )
    feature_extractor = processor.feature_extractor
    tokenizer = processor.tokenizer

    # Load model
    model = WhisperForConditionalGeneration.from_pretrained(config.model_name)

    # Configure for Indian English
    model.generation_config.language = config.language
    model.generation_config.task = config.task
    model.generation_config.forced_decoder_ids = None

    # Training arguments
    training_args = Seq2SeqTrainingArguments(
        output_dir=config.output_dir,
        per_device_train_batch_size=config.batch_size,
        gradient_accumulation_steps=2,
        learning_rate=config.learning_rate,
        warmup_steps=config.warmup_steps,
        num_train_epochs=config.num_epochs,
        fp16=config.fp16,
        gradient_checkpointing=config.gradient_checkpointing,
        evaluation_strategy="no",
        save_strategy="epoch",
        save_total_limit=2,
        logging_steps=100,
        logging_first_step=True,
        report_to=["tensorboard"],
        predict_with_generate=True,
        generate_max_length=448,
        max_steps=-1,
    )

    # Trainer
    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=None,  # Add your dataset here
        tokenizer=processor,
        data_collator=lambda x: x,
    )

    print("Starting training...")
    trainer.train()

    # Save model
    model.save_pretrained(config.output_dir)
    processor.save_pretrained(config.output_dir)

    print(f"Model saved to: {config.output_dir}")

    return model

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Train Whisper for Indian English")
    parser.add_argument("--dataset", type=str, required=True, help="Path to dataset")
    parser.add_argument("--output", type=str, default="./models/whisper-indian", help="Output directory")
    parser.add_argument("--epochs", type=int, default=3, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-5, help="Learning rate")

    args = parser.parse_args()

    config = IndianWhisperConfig(
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        output_dir=args.output,
    )

    train_whisper_indian(config)

if __name__ == "__main__":
    main()
