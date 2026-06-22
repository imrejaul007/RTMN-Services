#!/usr/bin/env python3
"""
Train All Models - One command to train everything

Trains:
1. Whisper (Indian English)
2. Intent (Sales)
3. Intent (Support)
4. Speaker Verification

Usage:
    python train_all.py --data ./datasets --output ./models
"""

import os
import sys
import json
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import time

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log(status, message):
    """Print colored log message"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    color = {
        'START': Colors.CYAN,
        'OK': Colors.GREEN,
        'FAIL': Colors.RED,
        'SKIP': Colors.YELLOW,
        'INFO': Colors.BLUE,
    }.get(status, Colors.ENDC)

    print(f"{color}[{timestamp}] [{status}] {message}{Colors.ENDC}")

def run_command(cmd, cwd=None):
    """Run shell command and return result"""
    result = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout, result.stderr

# ============================================================================
# TRAINING JOBS
# ============================================================================

TRAINING_JOBS = {
    "whisper_indian": {
        "name": "Whisper Indian English",
        "script": "scripts/fine_tune_models.py",
        "args": [
            "--output", "./models/whisper-indian",
            "--epochs", "3",
            "--batch-size", "16",
            "--samples", "1000",
        ],
        "model_type": "whisper",
    },
    "intent_sales": {
        "name": "Intent Sales",
        "script": "scripts/train_intent.py",
        "args": [
            "--data", "./datasets/intent_train.json",
            "--output", "./models/intent-sales",
            "--type", "sales",
            "--epochs", "5",
            "--batch-size", "16",
        ],
        "model_type": "intent",
    },
    "intent_support": {
        "name": "Intent Support",
        "script": "scripts/train_intent.py",
        "args": [
            "--data", "./datasets/intent_train.json",
            "--output", "./models/intent-support",
            "--type", "support",
            "--epochs", "5",
            "--batch-size", "16",
        ],
        "model_type": "intent",
    },
    "speaker": {
        "name": "Speaker Verification",
        "script": "scripts/train_speaker.py",
        "args": [
            "--data", "./datasets/speakers",
            "--output", "./models/speaker-verification",
            "--epochs", "10",
            "--batch-size", "32",
        ],
        "model_type": "speaker",
    },
}

# ============================================================================
# MAIN
# ============================================================================

def train_all(data_dir, output_dir, skip_existing=True):
    """Train all models"""

    print()
    log("START", "=" * 50)
    log("START", "HOJAI VOICE MODEL TRAINING")
    log("START", "=" * 50)
    print()

    # Create directories
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    Path(data_dir).mkdir(parents=True, exist_ok=True)

    # Check GPU
    _, stdout, _ = run_command("nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo 'CPU'")
    gpu_name = stdout.strip() or "CPU"
    log("INFO", f"GPU: {gpu_name}")

    # Check CUDA
    has_cuda = "cuda" in subprocess.run(
        "python3 -c 'import torch; print(torch.cuda.is_available())'",
        shell=True,
        capture_output=True,
    ).stdout.lower()
    log("INFO", f"CUDA: {'Available' if has_cuda else 'Not available'}")

    print()

    results = {}

    # Train each model
    for job_id, job in TRAINING_JOBS.items():
        model_path = Path(output_dir) / job_id.replace("_", "-")

        # Check if already trained
        if skip_existing and model_path.exists():
            config_file = model_path / "config.json"
            if config_file.exists():
                log("SKIP", f"{job['name']} - Already trained")
                results[job_id] = {"status": "skipped"}
                continue

        log("START", f"Training: {job['name']}")
        print()

        start_time = time.time()

        # Build command
        cmd = f"python3 {job['script']} " + " ".join(job['args'])

        # Run training
        returncode, stdout, stderr = run_command(cmd, cwd=".")

        elapsed = time.time() - start_time

        if returncode == 0:
            log("OK", f"{job['name']} - Done ({elapsed:.0f}s)")
            results[job_id] = {
                "status": "success",
                "elapsed": elapsed,
            }
        else:
            log("FAIL", f"{job['name']} - Failed")
            if stderr:
                print(f"Error: {stderr[:500]}")
            results[job_id] = {
                "status": "failed",
                "elapsed": elapsed,
                "error": stderr[:500],
            }

        print()

    # Summary
    print()
    log("START", "=" * 50)
    log("START", "TRAINING COMPLETE")
    log("START", "=" * 50)
    print()

    success = sum(1 for r in results.values() if r["status"] == "success")
    skipped = sum(1 for r in results.values() if r["status"] == "skipped")
    failed = sum(1 for r in results.values() if r["status"] == "failed")

    for job_id, result in results.items():
        job = TRAINING_JOBS[job_id]
        status_icon = {
            "success": "✅",
            "skipped": "⏭️",
            "failed": "❌",
        }.get(result["status"], "❓")

        elapsed = result.get("elapsed", 0)
        print(f"  {status_icon} {job['name']} - {result['status']}" +
              (f" ({elapsed:.0f}s)" if elapsed else ""))

    print()
    print(f"Success: {success} | Skipped: {skipped} | Failed: {failed}")

    # Save results
    results_file = Path(output_dir) / "training_results.json"
    with open(results_file, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "gpu": gpu_name,
            "cuda": has_cuda,
            "results": results,
        }, f, indent=2)

    print()
    print(f"Results saved to: {results_file}")

    return results

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train all Hojai models")
    parser.add_argument(
        "--data",
        type=str,
        default="./datasets",
        help="Data directory",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="./models",
        help="Output directory",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force retrain even if model exists",
    )

    args = parser.parse_args()

    train_all(
        data_dir=args.data,
        output_dir=args.output,
        skip_existing=not args.force,
    )
