"""
Intent Classification Training

Trains intent classifier for:
- Sales conversations
- Support tickets
- Business actions

Usage:
    python train_intent.py --dataset ./datasets/intent --type sales
"""

import os
import argparse
import json
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Tuple

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from transformers import (
    AutoTokenizer,
    AutoModel,
    get_linear_schedule_with_warmup,
)
import numpy as np
from sklearn.model_selection import train_test_split

# ============================================================================
# CONFIG
# ============================================================================

@dataclass
class IntentConfig:
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    num_labels: int = 6
    max_length: int = 128
    batch_size: int = 16
    learning_rate: float = 2e-5
    num_epochs: int = 5
    warmup_steps: int = 100
    output_dir: str = "./models/intent-classifier"

# ============================================================================
# INTENT TYPES
# ============================================================================

INTENT_LABELS = {
    "dictation": 0,
    "query": 1,
    "action": 2,
    "workflow": 3,
    "agent": 4,
    "multi_agent": 5,
}

INTENT_SUBTYPES = {
    "dictation": ["compose", "edit", "format", "general"],
    "query": ["search", "lookup", "info", "general"],
    "action": ["schedule", "send", "create", "book", "general"],
    "workflow": ["automate", "trigger", "schedule", "general"],
    "agent": ["outreach", "follow_up", "check_in", "general"],
    "multi_agent": ["review", "analyze", "report", "summary"],
}

# ============================================================================
# DATASET
# ============================================================================

class IntentDataset(Dataset):
    def __init__(self, texts: List[str], labels: List[int], tokenizer, max_length: int = 128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]

        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )

        return {
            "input_ids": encoding["input_ids"].flatten(),
            "attention_mask": encoding["attention_mask"].flatten(),
            "label": torch.tensor(label, dtype=torch.long),
        }

# ============================================================================
# MODEL
# ============================================================================

class IntentClassifier(nn.Module):
    def __init__(self, model_name: str, num_labels: int, dropout: float = 0.1):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(model_name)
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(self.encoder.config.hidden_size, num_labels)

    def forward(self, input_ids, attention_mask):
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.last_hidden_state[:, 0]  # CLS token
        pooled = self.dropout(pooled)
        logits = self.classifier(pooled)
        return logits

# ============================================================================
# TRAINING
# ============================================================================

class IntentTrainer:
    def __init__(self, config: IntentConfig):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(config.model_name)
        self.model = IntentClassifier(config.model_name, config.num_labels).to(self.device)
        self.optimizer = None
        self.scheduler = None

    def prepare_data(self, data_path: str) -> Tuple[List[str], List[int]]:
        """Load and prepare training data"""
        texts = []
        labels = []

        # Load JSON data
        with open(data_path, "r") as f:
            data = json.load(f)

        for item in data:
            texts.append(item["text"])
            labels.append(INTENT_LABELS.get(item["intent"], 0))

        return texts, labels

    def train(self, train_texts: List[str], train_labels: List[int],
              val_texts: List[str] = None, val_labels: List[int] = None):
        """Train the model"""

        # Create datasets
        train_dataset = IntentDataset(train_texts, train_labels, self.tokenizer, self.config.max_length)

        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=True,
        )

        # Setup optimizer
        self.optimizer = AdamW(self.model.parameters(), lr=self.config.learning_rate)

        total_steps = len(train_loader) * self.config.num_epochs
        self.scheduler = get_linear_schedule_with_warmup(
            self.optimizer,
            num_warmup_steps=self.config.warmup_steps,
            num_training_steps=total_steps,
        )

        # Training loop
        for epoch in range(self.config.num_epochs):
            self.model.train()
            total_loss = 0

            for batch_idx, batch in enumerate(train_loader):
                input_ids = batch["input_ids"].to(self.device)
                attention_mask = batch["attention_mask"].to(self.device)
                labels = batch["label"].to(self.device)

                # Forward pass
                logits = self.model(input_ids, attention_mask)
                loss = nn.CrossEntropyLoss()(logits, labels)

                # Backward pass
                self.optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                self.optimizer.step()
                self.scheduler.step()

                total_loss += loss.item()

                if (batch_idx + 1) % 50 == 0:
                    print(f"Epoch {epoch+1}/{self.config.num_epochs}, "
                          f"Batch {batch_idx+1}/{len(train_loader)}, "
                          f"Loss: {loss.item():.4f}")

            avg_loss = total_loss / len(train_loader)
            print(f"Epoch {epoch+1} completed. Average loss: {avg_loss:.4f}")

            # Validation
            if val_texts and val_labels:
                val_acc = self.evaluate(val_texts, val_labels)
                print(f"Validation accuracy: {val_acc:.4f}")

        # Save model
        self.save_model()

    def evaluate(self, texts: List[str], labels: List[int]) -> float:
        """Evaluate on validation set"""
        self.model.eval()
        dataset = IntentDataset(texts, labels, self.tokenizer, self.config.max_length)
        loader = DataLoader(dataset, batch_size=self.config.batch_size)

        correct = 0
        total = 0

        with torch.no_grad():
            for batch in loader:
                input_ids = batch["input_ids"].to(self.device)
                attention_mask = batch["attention_mask"].to(self.device)
                batch_labels = batch["label"].to(self.device)

                logits = self.model(input_ids, attention_mask)
                preds = torch.argmax(logits, dim=1)

                correct += (preds == batch_labels).sum().item()
                total += len(batch_labels)

        return correct / total if total > 0 else 0

    def predict(self, text: str) -> Dict:
        """Predict intent for single text"""
        self.model.eval()

        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.config.max_length,
            return_tensors="pt",
        )

        with torch.no_grad():
            input_ids = encoding["input_ids"].to(self.device)
            attention_mask = encoding["attention_mask"].to(self.device)

            logits = self.model(input_ids, attention_mask)
            probs = torch.softmax(logits, dim=1)
            pred = torch.argmax(logits, dim=1).item()

        # Get intent name
        intent_name = [k for k, v in INTENT_LABELS.items() if v == pred][0]

        return {
            "intent": intent_name,
            "confidence": probs[0][pred].item(),
            "probabilities": {
                name: probs[0][idx].item()
                for name, idx in INTENT_LABELS.items()
            }
        }

    def save_model(self):
        """Save model and tokenizer"""
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)

        torch.save(self.model.state_dict(), f"{self.config.output_dir}/model.pt")
        self.tokenizer.save_pretrained(self.config.output_dir)

        # Save labels
        with open(f"{self.config.output_dir}/labels.json", "w") as f:
            json.dump(INTENT_LABELS, f)

        print(f"Model saved to: {self.config.output_dir}")

    def load_model(self, model_path: str):
        """Load saved model"""
        self.model.load_state_dict(torch.load(f"{model_path}/model.pt", map_location=self.device))
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        print(f"Model loaded from: {model_path}")

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Train Intent Classifier")
    parser.add_argument("--data", type=str, required=True, help="Path to training data")
    parser.add_argument("--output", type=str, default="./models/intent-classifier", help="Output directory")
    parser.add_argument("--type", type=str, default="sales", choices=["sales", "support", "general"],
                        help="Intent type")
    parser.add_argument("--epochs", type=int, default=5, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")

    args = parser.parse_args()

    config = IntentConfig(
        output_dir=args.output,
        num_epochs=args.epochs,
        batch_size=args.batch_size,
    )

    trainer = IntentTrainer(config)

    # Prepare data
    texts, labels = trainer.prepare_data(args.data)

    # Split data
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42
    )

    print(f"Training samples: {len(train_texts)}")
    print(f"Validation samples: {len(val_texts)}")

    # Train
    trainer.train(train_texts, train_labels, val_texts, val_labels)

if __name__ == "__main__":
    main()
