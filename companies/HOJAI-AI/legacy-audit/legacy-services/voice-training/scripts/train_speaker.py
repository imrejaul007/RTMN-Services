"""
Speaker Verification Training

Trains speaker embedding model for:
- Voice authentication
- Speaker identification
- Voice profile learning

Usage:
    python train_speaker.py --dataset ./datasets/speakers --speaker-id user123
"""

import os
import argparse
import json
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import torchaudio
import torchaudio.transforms as T
from speechbrain.lobes.models.ECAPA_TDNN import ECAPA_TDNN

# ============================================================================
# CONFIG
# ============================================================================

@dataclass
class SpeakerConfig:
    input_size: int = 80  # MFCC features
    embedding_size: int = 192
    num_classes: int = 1000  # Number of speakers
    batch_size: int = 32
    learning_rate: float = 0.001
    num_epochs: int = 10
    margin: float = 0.2  # For contrastive loss
    scale: float = 30  # For contrastive loss
    output_dir: str = "./models/speaker-verification"

# ============================================================================
# DATA AUGMENTATION
# ============================================================================

class SpecAugment:
    """Spectrogram augmentation"""

    def __init__(self, freq_mask_param: int = 15, time_mask_param: int = 35):
        self.freq_mask_param = freq_mask_param
        self.time_mask_param = time_mask_param

    def __call__(self, spec: torch.Tensor) -> torch.Tensor:
        # Frequency masking
        freq_mask = T.FrequencyMasking(self.freq_mask_param)
        spec = freq_mask(spec)

        # Time masking
        time_mask = T.TimeMasking(self.time_mask_param)
        spec = time_mask(spec)

        return spec

# ============================================================================
# DATASET
# ============================================================================

class SpeakerDataset(Dataset):
    def __init__(
        self,
        audio_files: List[str],
        speaker_ids: List[int],
        sample_rate: int = 16000,
        duration: float = 3.0,
    ):
        self.audio_files = audio_files
        self.speaker_ids = speaker_ids
        self.sample_rate = sample_rate
        self.duration = duration
        self.num_samples = int(sample_rate * duration)

    def __len__(self):
        return len(self.audio_files)

    def load_audio(self, path: str) -> torch.Tensor:
        """Load and preprocess audio"""
        try:
            waveform, sr = torchaudio.load(path)

            # Resample if needed
            if sr != self.sample_rate:
                resampler = T.Resample(sr, self.sample_rate)
                waveform = resampler(waveform)

            # Convert to mono
            if waveform.shape[0] > 1:
                waveform = waveform.mean(dim=0, keepdim=True)

            # Pad or trim
            if waveform.shape[1] < self.num_samples:
                padding = self.num_samples - waveform.shape[1]
                waveform = F.pad(waveform, (0, padding))
            else:
                waveform = waveform[:, : self.num_samples]

            return waveform
        except Exception as e:
            print(f"Error loading {path}: {e}")
            # Return silence
            return torch.zeros(1, self.num_samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        waveform = self.load_audio(self.audio_files[idx])
        speaker_id = self.speaker_ids[idx]
        return waveform, speaker_id

# ============================================================================
# SPEAKER EMBEDDING MODEL
# ============================================================================

class SpeakerEmbedding(nn.Module):
    """
    Speaker embedding model using ECAPA-TDNN architecture
    """

    def __init__(self, input_size: int = 80, embedding_size: int = 192):
        super().__init__()

        # Use SpeechBrain's ECAPA-TDNN
        self.model = ECAPA_TDNN(
            input_size=input_size,
            channels=[1024, 1024, 1024, 1024, 3072],
            kernel_sizes=[5, 3, 3, 3, 1],
            dilations=[1, 2, 3, 4, 1],
            num_classes=1500,
        )

        # Replace classifier with embedding layer
        self.embedding = nn.Linear(3072, embedding_size)
        nn.init.xavier_uniform_(self.embedding.weight)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Extract features
        x = self.model.channels[4](x)

        # Global average pooling
        x = F.adaptive_avg_pool1d(x, 1)
        x = x.squeeze(-1)

        # Embedding
        embedding = self.embedding(x)

        # L2 normalize
        embedding = F.normalize(embedding, p=2, dim=1)

        return embedding

# ============================================================================
# CONTRASTIVE LOSS
# ============================================================================

class ContrastiveLoss(nn.Module):
    """
    Prototypical contrastive loss for speaker verification
    """

    def __init__(self, margin: float = 0.2, scale: float = 30):
        super().__init__()
        self.margin = margin
        self.scale = scale

    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
        # Normalize embeddings
        embeddings = F.normalize(embeddings, p=2, dim=1)

        # Compute pairwise distances
        distances = torch.cdist(embeddings, embeddings, p=2)

        # Create positive and negative masks
        labels = labels.unsqueeze(0)
        positive_mask = (labels == labels.T).float()
        negative_mask = (labels != labels.T).float()

        # Compute loss
        positive_dist = distances * positive_mask
        negative_dist = distances + (1 - negative_mask) * 100  # Mask non-negatives

        # Triplet loss
        loss = F.relu(positive_dist - negative_dist + self.margin)

        # Apply masks and average
        loss = (loss * positive_mask).sum() / (positive_mask.sum() + 1e-6)

        return loss

# ============================================================================
# SPEAKER TRAINER
# ============================================================================

class SpeakerTrainer:
    def __init__(self, config: SpeakerConfig):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Initialize model
        self.model = SpeakerEmbedding(
            input_size=config.input_size,
            embedding_size=config.embedding_size,
        ).to(self.device)

        # Loss and optimizer
        self.criterion = ContrastiveLoss(
            margin=config.margin,
            scale=config.scale,
        )
        self.optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=config.learning_rate,
            weight_decay=0.01,
        )

        # MFCC transform
        self.mfcc_transform = T.MelSpectrogram(
            sample_rate=16000,
            n_fft=512,
            hop_length=160,
            n_mels=80,
        )

    def extract_features(self, waveform: torch.Tensor) -> torch.Tensor:
        """Extract MFCC features"""
        # Normalize
        waveform = waveform / waveform.abs().max()

        # Mel spectrogram
        mel_spec = self.mfcc_transform(waveform)
        log_mel = mel_spec.log()

        # Transpose for conv1d
        features = log_mel.transpose(1, 2)

        return features

    def train_epoch(self, dataloader: DataLoader) -> float:
        """Train for one epoch"""
        self.model.train()
        total_loss = 0

        for batch_idx, (waveforms, labels) in enumerate(dataloader):
            waveforms = waveforms.to(self.device)
            labels = labels.to(self.device)

            # Extract features
            features = self.extract_features(waveforms)

            # Forward pass
            embeddings = self.model(features)

            # Compute loss
            loss = self.criterion(embeddings, labels)

            # Backward pass
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()

            total_loss += loss.item()

            if (batch_idx + 1) % 50 == 0:
                print(f"Batch {batch_idx+1}/{len(dataloader)}, Loss: {loss.item():.4f}")

        return total_loss / len(dataloader)

    def train(self, audio_files: List[str], speaker_ids: List[int]):
        """Train the model"""

        # Create dataset
        dataset = SpeakerDataset(audio_files, speaker_ids)
        dataloader = DataLoader(
            dataset,
            batch_size=self.config.batch_size,
            shuffle=True,
            num_workers=4,
        )

        print(f"Training on {len(dataset)} samples")

        # Training loop
        for epoch in range(self.config.num_epochs):
            avg_loss = self.train_epoch(dataloader)
            print(f"Epoch {epoch+1}/{self.config.num_epochs}, Loss: {avg_loss:.4f}")

        # Save model
        self.save_model()

    def verify(self, audio1: str, audio2: str) -> Dict:
        """Verify if two audios are from the same speaker"""
        self.model.eval()

        with torch.no_grad():
            # Load and process
            waveform1, _ = torchaudio.load(audio1)
            waveform2, _ = torchaudio.load(audio2)

            # Extract features
            features1 = self.extract_features(waveform1.unsqueeze(0).to(self.device))
            features2 = self.extract_features(waveform2.unsqueeze(0).to(self.device))

            # Get embeddings
            emb1 = self.model(features1)
            emb2 = self.model(features2)

            # Compute similarity
            similarity = F.cosine_similarity(emb1, emb2).item()

        return {
            "same_speaker": similarity > 0.7,
            "similarity": similarity,
            "threshold": 0.7,
        }

    def save_model(self):
        """Save speaker model"""
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)

        torch.save(
            self.model.state_dict(),
            f"{self.config.output_dir}/speaker_model.pt"
        )

        # Save config
        with open(f"{self.config.output_dir}/config.json", "w") as f:
            json.dump(
                {
                    "input_size": self.config.input_size,
                    "embedding_size": self.config.embedding_size,
                },
                f,
            )

        print(f"Model saved to: {self.config.output_dir}")

    def load_model(self, model_path: str):
        """Load speaker model"""
        self.model.load_state_dict(torch.load(f"{model_path}/speaker_model.pt"))
        print(f"Model loaded from: {model_path}")

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Train Speaker Verification")
    parser.add_argument("--data", type=str, required=True, help="Path to speaker data")
    parser.add_argument("--output", type=str, default="./models/speaker-verification", help="Output directory")
    parser.add_argument("--epochs", type=int, default=10, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")

    args = parser.parse_args()

    config = SpeakerConfig(
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        output_dir=args.output,
    )

    trainer = SpeakerTrainer(config)

    # Prepare data (you would load from your dataset)
    # audio_files = [...]
    # speaker_ids = [...]
    # trainer.train(audio_files, speaker_ids)

if __name__ == "__main__":
    main()
