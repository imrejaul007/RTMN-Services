# Cloud Training Options

## Free GPU Training

### Google Colab (Recommended)

1. Open [HOJAI_Training.ipynb](notebooks/HOJAI_Training.ipynb)
2. Upload to Google Colab
3. Select Runtime > Change runtime type > GPU (T4 or A100)
4. Run cells

```python
# Mount Drive
from google.colab import drive
drive.mount('/content/drive')

# Install
!pip install torch transformers datasets accelerate

# Train
!python scripts/fine_tune_models.py --output ./models/whisper-indian --epochs 3
```

### Kaggle

1. Create notebook on kaggle.com
2. Enable GPU (P100 or T4)
3. Upload training scripts
4. Train for 30 hours/week free

---

## Cloud Services

### Replicate (Easiest)

```bash
export REPLICATE_API_TOKEN=sk-cp-c7be905de78a468f83a500ee4e7feab8
python scripts/cloud_training.py --provider replicate --model whisper --data ./datasets
```

### Hugging Face AutoTrain

```bash
pip install autotrain-advanced
autotrain llm --trainer sft --model openai/whisper-small --project-name hojai-whisper
```

### Modal (Cheapest)

```bash
pip install modal
modal run train_whisper
```

---

## Your API Key

To train on Replicate:

```bash
# Set API key
export REPLICATE_API_TOKEN=sk-cp-c7be905de78a468f83a500ee4e7feab8

# Train Whisper
python scripts/cloud_training.py \
  --provider replicate \
  --api-key $REPLICATE_API_TOKEN \
  --model whisper \
  --data ./datasets
```

---

## Training Time Estimates

| Provider | GPU | Time |
|----------|-----|------|
| Colab (Free) | T4 | 2-4 hours |
| Colab Pro | A100 | 30-60 min |
| Replicate | A100 | 15-30 min |
| Modal | A100 | 15-30 min |

---

## Next Steps

1. Generate datasets locally
2. Upload to cloud storage (GCS/S3)
3. Train on cloud GPU
4. Download trained models
5. Deploy to Hojai Flow
