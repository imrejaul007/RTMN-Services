#!/usr/bin/env python3
"""
Training CLI - Interactive training interface

Features:
- Interactive menu
- Real-time progress
- Model management
- Training history

Usage:
    python train_cli.py
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime

# ============================================================================
# COLORS
# ============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def c(text, color):
    return f"{color}{text}{Colors.END}"

# ============================================================================
# MENU
# ============================================================================

MENU = """
╔══════════════════════════════════════════════════════════════╗
║                    HOJAI MODEL TRAINING                ║
╠══════════════════════════════════════════════════════════════╣
║  1. Generate Datasets                                  ║
║  2. Train Whisper (Indian English)                    ║
║  3. Train Intent Classifier                           ║
║  4. Train Speaker Verification                        ║
║  5. Train All Models                                  ║
║  6. Export Models for Mobile                          ║
║  7. Benchmark Models                                 ║
║  8. View Training History                            ║
║  0. Exit                                             ║
╚══════════════════════════════════════════════════════════════╝
"""

DATASET_MENU = """
╔══════════════════════════════════════════════════════════════╗
║                    GENERATE DATASETS                    ║
╠══════════════════════════════════════════════════════════════╣
║  1. Intent Classification (10,000 samples)           ║
║  2. Hinglish Speech (5,000 samples)                   ║
║  3. Indian Names Dataset                             ║
║  4. All Datasets                                    ║
╚══════════════════════════════════════════════════════════════╝
"""

# ============================================================================
# UTILITIES
# ============================================================================

def clear():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header(text):
    print()
    print(c(f"═══ {text} ═══", Colors.CYAN))
    print()

def run_command(cmd, cwd=None, show_output=True):
    """Run command and show output"""
    print(c(f"Running: {cmd}", Colors.YELLOW))
    print()

    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd or ".",
        capture_output=True,
        text=True,
    )

    if show_output:
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(c(result.stderr, Colors.RED))

    return result.returncode == 0

def get_training_history():
    """Get training history from files"""
    history = []

    models_dir = Path("./models")
    if not models_dir.exists():
        return history

    for model_dir in models_dir.iterdir():
        if not model_dir.is_dir():
            continue

        config_file = model_dir / "config.json"
        if not config_file.exists():
            continue

        with open(config_file) as f:
            config = json.load(f)

        history.append({
            "name": model_dir.name,
            "config": config,
            "path": str(model_dir),
        })

    return sorted(history, key=lambda x: x["config"].get("trained_at", ""), reverse=True)

# ============================================================================
# ACTIONS
# ============================================================================

def generate_datasets():
    """Generate training datasets"""
    clear()
    print_header("GENERATE DATASETS")

    print(DATASET_MENU)
    choice = input(c("Select option: ", Colors.GREEN))

    if choice == "1":
        print_header("Generating Intent Dataset")
        run_command(
            "python scripts/dataset_generator.py --type intent --count 10000 --output ./datasets"
        )

    elif choice == "2":
        print_header("Generating Hinglish Dataset")
        run_command(
            "python scripts/dataset_generator.py --type hinglish --count 5000 --output ./datasets"
        )

    elif choice == "3":
        print_header("Generating Indian Names Dataset")
        run_command(
            "python scripts/dataset_generator.py --type ner --count 10000 --output ./datasets"
        )

    elif choice == "4":
        print_header("Generating All Datasets")
        run_command(
            "python scripts/dataset_generator.py --type intent --count 10000 --output ./datasets"
        )
        run_command(
            "python scripts/dataset_generator.py --type hinglish --count 5000 --output ./datasets"
        )
        run_command(
            "python scripts/dataset_generator.py --type ner --count 10000 --output ./datasets"
        )

    input(c("\nPress Enter to continue...", Colors.YELLOW))

def train_whisper():
    """Train Whisper model"""
    clear()
    print_header("TRAIN WHISPER (Indian English)")

    epochs = input(c("Epochs [3]: ", Colors.GREEN)) or "3"
    batch_size = input(c("Batch size [16]: ", Colors.GREEN)) or "16"
    samples = input(c("Samples [1000]: ", Colors.GREEN)) or "1000"

    cmd = (
        f"python scripts/fine_tune_models.py "
        f"--output ./models/whisper-indian "
        f"--epochs {epochs} "
        f"--batch-size {batch_size} "
        f"--samples {samples}"
    )

    run_command(cmd)

    input(c("\nPress Enter to continue...", Colors.YELLOW))

def train_intent():
    """Train Intent model"""
    clear()
    print_header("TRAIN INTENT CLASSIFIER")

    intent_type = input(c("Type [sales]: ", Colors.GREEN)) or "sales"
    epochs = input(c("Epochs [5]: ", Colors.GREEN)) or "5"
    batch_size = input(c("Batch size [16]: ", Colors.GREEN)) or "16"

    cmd = (
        f"python scripts/train_intent.py "
        f"--data ./datasets/intent_train.json "
        f"--type {intent_type} "
        f"--output ./models/intent-{intent_type} "
        f"--epochs {epochs} "
        f"--batch-size {batch_size}"
    )

    run_command(cmd)

    input(c("\nPress Enter to continue...", Colors.YELLOW))

def train_speaker():
    """Train Speaker model"""
    clear()
    print_header("TRAIN SPEAKER VERIFICATION")

    epochs = input(c("Epochs [10]: ", Colors.GREEN)) or "10"
    batch_size = input(c("Batch size [32]: ", Colors.GREEN)) or "32"

    cmd = (
        f"python scripts/train_speaker.py "
        f"--output ./models/speaker-verification "
        f"--epochs {epochs} "
        f"--batch-size {batch_size}"
    )

    run_command(cmd)

    input(c("\nPress Enter to continue...", Colors.YELLOW))

def train_all():
    """Train all models"""
    clear()
    print_header("TRAIN ALL MODELS")

    run_command("python scripts/train_all.py")

    input(c("\nPress Enter to continue...", Colors.YELLOW))

def export_models():
    """Export models for mobile"""
    clear()
    print_header("EXPORT MODELS FOR MOBILE")

    print("Available models:")
    history = get_training_history()
    for i, model in enumerate(history, 1):
        print(f"  {i}. {model['name']}")

    print()
    model_num = input(c("Select model number: ", Colors.GREEN))

    try:
        model = history[int(model_num) - 1]
        model_type = "whisper" if "whisper" in model["name"] else "intent"

        cmd = (
            f"python scripts/export_models.py "
            f"--model {model['path']} "
            f"--output ./export/{model['name']} "
            f"--type {model_type} "
            f"--platform both"
        )

        run_command(cmd)
    except (ValueError, IndexError):
        print(c("Invalid selection", Colors.RED))

    input(c("\nPress Enter to continue...", Colors.YELLOW))

def benchmark_models():
    """Benchmark models"""
    clear()
    print_header("BENCHMARK MODELS")

    run_command("python scripts/benchmark.py --model ./models/whisper-indian")

    input(c("\nPress Enter to continue...", Colors.YELLOW))

def view_history():
    """View training history"""
    clear()
    print_header("TRAINING HISTORY")

    history = get_training_history()

    if not history:
        print(c("No trained models found", Colors.YELLOW))
        input(c("\nPress Enter to continue...", Colors.YELLOW))
        return

    for model in history:
        print(f"📦 {c(model['name'], Colors.BOLD)}")
        print(f"   Type: {model['config'].get('type', 'unknown')}")
        print(f"   Trained: {model['config'].get('trained_at', 'unknown')}")
        print(f"   Accuracy: {model['config'].get('accuracy', 'N/A')}")
        print()

    input(c("\nPress Enter to continue...", Colors.YELLOW))

# ============================================================================
# MAIN
# ============================================================================

def main():
    while True:
        clear()
        print(MENU)

        choice = input(c("Select option: ", Colors.GREEN))

        if choice == "1":
            generate_datasets()
        elif choice == "2":
            train_whisper()
        elif choice == "3":
            train_intent()
        elif choice == "4":
            train_speaker()
        elif choice == "5":
            train_all()
        elif choice == "6":
            export_models()
        elif choice == "7":
            benchmark_models()
        elif choice == "8":
            view_history()
        elif choice == "0":
            print(c("\nGoodbye!", Colors.CYAN))
            break
        else:
            print(c("\nInvalid option", Colors.RED))
            input(c("Press Enter to continue...", Colors.YELLOW))

if __name__ == "__main__":
    main()
