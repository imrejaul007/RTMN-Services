"""
Model Evaluation Script

Evaluates trained models on test datasets:
- Whisper (WER, CER)
- Intent (Accuracy, F1)
- Speaker (EER, AUC)

Usage:
    python evaluate_models.py --model ./models/whisper-indian --test ./datasets/test
"""

import os
import argparse
import json
import time
from pathlib import Path
from typing import List, Dict, Tuple
from dataclasses import dataclass

import torch
import numpy as np
from scipy.optimize import brentq
from scipy.interpolate import interp1d
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.model_selection import train_test_split

# ============================================================================
# CONFIG
# ============================================================================

@dataclass
class EvalConfig:
    model_path: str
    test_data: str
    batch_size: int = 32
    device: str = "cuda" if torch.cuda.is_available() else "cpu"

# ============================================================================
# WHISPER EVALUATION
# ============================================================================

def compute_wer(reference: str, hypothesis: str) -> float:
    """
    Compute Word Error Rate (WER)
    """
    ref_words = reference.lower().split()
    hyp_words = hypothesis.lower().split()

    # Simple edit distance
    d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]

    for i in range(len(ref_words) + 1):
        d[i][0] = i
    for j in range(len(hyp_words) + 1):
        d[0][j] = j

    for i in range(1, len(ref_words) + 1):
        for j in range(1, len(hyp_words) + 1):
            if ref_words[i - 1] == hyp_words[j - 1]:
                d[i][j] = d[i - 1][j - 1]
            else:
                substitution = d[i - 1][j - 1] + 1
                insertion = d[i][j - 1] + 1
                deletion = d[i - 1][j] + 1
                d[i][j] = min(substitution, insertion, deletion)

    wer = d[len(ref_words)][len(hyp_words)] / len(ref_words) if len(ref_words) > 0 else 0
    return wer

def compute_cer(reference: str, hypothesis: str) -> float:
    """
    Compute Character Error Rate (CER)
    """
    ref_chars = list(reference.lower())
    hyp_chars = list(hypothesis.lower())

    d = [[0] * (len(hyp_chars) + 1) for _ in range(len(ref_chars) + 1)]

    for i in range(len(ref_chars) + 1):
        d[i][0] = i
    for j in range(len(hyp_chars) + 1):
        d[0][j] = j

    for i in range(1, len(ref_chars) + 1):
        for j in range(1, len(hyp_chars) + 1):
            if ref_chars[i - 1] == hyp_chars[j - 1]:
                d[i][j] = d[i - 1][j - 1]
            else:
                d[i][j] = min(
                    d[i - 1][j - 1] + 1,
                    d[i][j - 1] + 1,
                    d[i - 1][j] + 1,
                )

    cer = d[len(ref_chars)][len(hyp_chars)] / len(ref_chars) if len(ref_chars) > 0 else 0
    return cer

def evaluate_whisper(model_path: str, test_data: List[Dict]) -> Dict:
    """
    Evaluate Whisper model
    """
    print(f"Evaluating Whisper model: {model_path}")

    # Load model (pseudo-code - implement with transformers)
    # model = WhisperForConditionalGeneration.from_pretrained(model_path)

    results = {
        "wer": [],
        "cer": [],
        "latency": [],
    }

    for item in test_data:
        reference = item["text"]
        # hypothesis = model.transcribe(item["audio"])  # Pseudo-code

        # Mock hypothesis for testing
        hypothesis = reference  # Replace with actual transcription

        # Compute metrics
        wer = compute_wer(reference, hypothesis)
        cer = compute_cer(reference, hypothesis)

        results["wer"].append(wer)
        results["cer"].append(cer)

    # Compute aggregate metrics
    metrics = {
        "wer_mean": np.mean(results["wer"]),
        "wer_std": np.std(results["wer"]),
        "cer_mean": np.mean(results["cer"]),
        "cer_std": np.std(results["cer"]),
        "accuracy": 1 - np.mean(results["wer"]),  # WER to accuracy
        "num_samples": len(test_data),
    }

    print(f"  WER: {metrics['wer_mean']:.4f} ± {metrics['wer_std']:.4f}")
    print(f"  CER: {metrics['cer_mean']:.4f} ± {metrics['cer_std']:.4f}")
    print(f"  Accuracy: {metrics['accuracy']:.4f}")

    return metrics

# ============================================================================
# INTENT EVALUATION
# ============================================================================

def evaluate_intent(model_path: str, test_data: List[Dict]) -> Dict:
    """
    Evaluate Intent Classification model
    """
    print(f"Evaluating Intent model: {model_path}")

    # Load model (pseudo-code)
    # model = IntentClassifier.load(model_path)

    y_true = []
    y_pred = []

    for item in test_data:
        true_label = item["intent"]
        # pred_label = model.predict(item["text"])  # Pseudo-code

        # Mock prediction for testing
        pred_label = true_label  # Replace with actual prediction

        y_true.append(true_label)
        y_pred.append(pred_label)

    # Compute metrics
    accuracy = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted"
    )
    cm = confusion_matrix(y_true, y_pred)

    metrics = {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "confusion_matrix": cm.tolist(),
        "num_samples": len(test_data),
    }

    print(f"  Accuracy: {accuracy:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall: {recall:.4f}")
    print(f"  F1: {f1:.4f}")

    return metrics

# ============================================================================
# SPEAKER EVALUATION
# ============================================================================

def compute_eer(scores: np.ndarray, labels: np.ndarray) -> Tuple[float, float]:
    """
    Compute Equal Error Rate (EER)
    """
    # Sort by score
    sorted_indices = np.argsort(scores)
    scores = scores[sorted_indices]
    labels = labels[sorted_indices]

    # Compute FAR and FRR
    total_positives = np.sum(labels == 1)
    total_negatives = np.sum(labels == 0)

    far = []
    frr = []

    for threshold in scores:
        far.append(np.sum((scores > threshold) & (labels == 0)) / total_negatives)
        frr.append(np.sum((scores <= threshold) & (labels == 1)) / total_positives)

    far = np.array(far)
    frr = np.array(frr)

    # Find EER
    try:
        eer = brentq(lambda x: interp1d(far - frr)(x), 0, 1)
    except:
        eer = 0.5

    # Find threshold at EER
    threshold_idx = np.argmin(np.abs(far - frr))
    threshold = scores[threshold_idx]

    return eer, threshold

def evaluate_speaker(model_path: str, test_pairs: List[Dict]) -> Dict:
    """
    Evaluate Speaker Verification model
    """
    print(f"Evaluating Speaker model: {model_path}")

    scores = []
    labels = []

    for pair in test_pairs:
        # similarity = model.verify(pair["audio1"], pair["audio2"])  # Pseudo-code

        # Mock for testing
        similarity = 0.5 if pair["same_speaker"] else 0.3
        same_speaker = 1 if pair["same_speaker"] else 0

        scores.append(similarity)
        labels.append(same_speaker)

    scores = np.array(scores)
    labels = np.array(labels)

    # Compute EER
    eer, threshold = compute_eer(scores, labels)

    # Compute accuracy at threshold
    predictions = (scores >= threshold).astype(int)
    accuracy = np.mean(predictions == labels)

    metrics = {
        "eer": eer,
        "threshold": threshold,
        "accuracy": accuracy,
        "num_pairs": len(test_pairs),
    }

    print(f"  EER: {eer:.4f}")
    print(f"  Threshold: {threshold:.4f}")
    print(f"  Accuracy: {accuracy:.4f}")

    return metrics

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Evaluate Trained Models")
    parser.add_argument("--model", type=str, required=True, help="Path to model")
    parser.add_argument("--test", type=str, required=True, help="Path to test data")
    parser.add_argument("--type", type=str, required=True,
                       choices=["whisper", "intent", "speaker"],
                       help="Model type")
    parser.add_argument("--output", type=str, default="./evaluation_results.json",
                       help="Output file")

    args = parser.parse_args()

    # Load test data
    with open(args.test, "r") as f:
        test_data = json.load(f)

    # Evaluate based on type
    if args.type == "whisper":
        metrics = evaluate_whisper(args.model, test_data)
    elif args.type == "intent":
        metrics = evaluate_intent(args.model, test_data)
    elif args.type == "speaker":
        metrics = evaluate_speaker(args.model, test_data)

    # Save results
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nResults saved to: {output_path}")

if __name__ == "__main__":
    main()
