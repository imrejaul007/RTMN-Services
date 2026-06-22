# Hojai Voice Model Training Guide

Complete guide for fine-tuning voice models for Hojai Flow.

---

## Quick Start

```bash
# 1. Setup
cd voice-training
./setup.sh

# 2. Activate environment
source venv/bin/activate

# 3. Train all models
python scripts/train_all.py

# 4. Export for mobile
python scripts/export_models.py --model ./models --type whisper
```

---

## Training CLI

Interactive command-line interface:

```bash
python scripts/train_cli.py
```

### Menu Options

```
╔══════════════════════════════════════════════════════╗
║                    HOJAI MODEL TRAINING                ║
╠══════════════════════════════════════════════════════╣
║  1. Generate Datasets                                  ║
║  2. Train Whisper (Indian English)                    ║
║  3. Train Intent Classifier                           ║
║  4. Train Speaker Verification                        ║
║  5. Train All Models                                  ║
║  6. Export Models for Mobile                          ║
║  7. Benchmark Models                                 ║
║  8. View Training History                            ║
╚══════════════════════════════════════════════════════╝
```

---

## Step-by-Step Training

### 1. Generate Datasets

```bash
# Generate intent data
python scripts/dataset_generator.py \
  --type intent \
  --count 10000 \
  --output ./datasets

# Generate Hinglish data
python scripts/dataset_generator.py \
  --type hinglish \
  --count 5000 \
  --output ./datasets
```

### 2. Fine-tune Whisper

```bash
python scripts/fine_tune_models.py \
  --output ./models/whisper-indian \
  --epochs 3 \
  --batch-size 16 \
  --samples 1000
```

### 3. Train Intent Classifier

```bash
python scripts/train_intent.py \
  --data ./datasets/intent_train.json \
  --type sales \
  --output ./models/intent-sales \
  --epochs 5
```

### 4. Train Speaker Verification

```bash
python scripts/train_speaker.py \
  --data ./datasets/speakers \
  --output ./models/speaker-verification \
  --epochs 10
```

### 5. Export for Mobile

```bash
python scripts/export_models.py \
  --model ./models/whisper-indian \
  --output ./export \
  --type whisper \
  --platform both
```

---

## Benchmarking

Compare base vs fine-tuned models:

```bash
python scripts/benchmark.py \
  --model ./models/whisper-indian
```

### Expected Results

| Model | Base Accuracy | Fine-tuned | Improvement |
|-------|--------------|------------|--------------|
| STT | 85% | 96% | +11% |
| Intent | 70% | 92% | +22% |
| Indian Names | 65% | 95% | +30% |
| Hinglish | 50% | 90% | +40% |

---

## Hardware Requirements

### GPU Training

| Model | GPU | RAM | Time |
|-------|-----|------|------|
| Whisper | A100 | 32GB | 2-4 hours |
| Intent | T4 | 16GB | 30 min |
| Speaker | T4 | 16GB | 1-2 hours |

### CPU Training (slower)

| Model | RAM | Time |
|-------|-----|------|
| Whisper | 32GB | 12-24 hours |
| Intent | 16GB | 2-3 hours |
| Speaker | 16GB | 4-8 hours |

---

## Troubleshooting

### Out of Memory

```bash
# Reduce batch size
python scripts/fine_tune_models.py --batch-size 8

# Or use gradient checkpointing
export GRADIENT_ACCUMULATION_STEPS=2
```

### Slow Training

```bash
# Enable mixed precision
export FP16=true

# Or reduce dataset size
python scripts/fine_tune_models.py --samples 500
```

### Model Not Converging

```bash
# Reduce learning rate
python scripts/fine_tune_models.py --lr 5e-6

# Or increase epochs
python scripts/fine_tune_models.py --epochs 5
```

---

## Monitoring

### View Training Progress

```bash
# TensorBoard
tensorboard --logdir ./models/whisper-indian

# Training API
python api/train_api.py
# Then visit http://localhost:4560
```

### Check GPU Usage

```bash
nvidia-smi
```

---

## Model Files

After training, models are saved to:

```
models/
├── whisper-indian/
│   ├── config.json
│   ├── model.safetensors
│   └── tokenizer.json
├── intent-sales/
│   ├── model.pt
│   └── labels.json
└── speaker-verification/
    ├── speaker_model.pt
    └── config.json
```

---

## Export Formats

| Platform | Format | Size |
|----------|--------|------|
| iOS | Core ML (.mlmodel) | Small |
| Android | TensorFlow Lite (.tflite) | Small |
| Cross-platform | ONNX (.onnx) | Medium |

---

## Training Scripts

| Script | Purpose |
|--------|---------|
| `fine_tune_models.py` | Fine-tune Whisper |
| `train_intent.py` | Train intent classifier |
| `train_speaker.py` | Train speaker verification |
| `dataset_generator.py` | Generate training data |
| `benchmark.py` | Benchmark models |
| `export_models.py` | Export for mobile |
| `train_all.py` | Train all models |
| `train_cli.py` | Interactive CLI |

---

## Next Steps

1. Fine-tune Whisper on your data
2. Train custom intents for your use case
3. Export models for mobile
4. Deploy to Hojai Flow
5. Collect feedback
6. Retrain with new data
