# Cloud Training Guide

## Google Colab (Free GPU)

### 1. Open Google Colab

Go to https://colab.research.google.com

### 2. Mount Drive

```python
from google.colab import drive
drive.mount('/content/drive')
```

### 3. Install Dependencies

```python
!pip install torch transformers datasets accelerate scipy
```

### 4. Clone Repository

```python
!git clone https://github.com/your-repo/hojai-flow.git
%cd hojai-flow/voice-training
```

### 5. Generate Data

```python
!python scripts/dataset_generator.py --type intent --count 10000 --output ./datasets
```

### 6. Fine-tune Whisper

```python
# Enable GPU
import torch
print(f"GPU: {torch.cuda.get_device_name(0)}")

# Train
!python scripts/fine_tune_models.py \
  --output /content/drive/MyDrive/models/whisper-indian \
  --epochs 3 \
  --batch-size 8
```

### 7. Download Model

```python
from google.colab import files
!zip -r whisper-indian.zip /content/drive/MyDrive/models/whisper-indian
files.download('whisper-indian.zip')
```

---

## Replicate.co (Easiest)

### Setup

```bash
# Install
pip install replicate

# Set API key
export REPLICATE_API_TOKEN=your_token
```

### Train

```python
import replicate

# Fine-tune Whisper
training = replicate.trainings.create(
    version="...",
    input={
        "train_data": "./datasets",
        "num_epochs": 3,
        "batch_size": 16,
    }
)

# Check status
print(training.status())
```

---

## Hugging Face AutoTrain

### Setup

```bash
pip install autotrain-advanced
```

### Train

```bash
autotrain llm \
  --trainer sft \
  --model openai/whisper-small \
  --project-name hojai-whisper \
  --data-path ./datasets \
  --epochs 3 \
  --batch-size 16 \
  --lr 1e-5
```

---

## Modal (Serverless GPU)

```python
import modal

stub = modal.Stub("whisper-training")

@stub.function(gpu="A100")
def train():
    import torch
    from transformers import WhisperForConditionalGeneration

    model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-small")
    # Fine-tune here...

modal.run(train)
```

---

## Free GPU Options

| Provider | GPU | Hours |
|----------|-----|-------|
| Google Colab | T4 | Unlimited |
| Kaggle | T4 | 30/week |
| Gradient | Free tier | 6 hrs |
| SageMaker Studio Lab | V100 | Unlimited |

---

## Recommended Setup

For best results, use:

1. **Google Colab Pro** ($10/month)
   - A100 GPU
   - 100 compute units/month

2. **Replicate** (pay per minute)
   - No setup
   - Scales automatically

3. **Hugging Face Endpoints**
   - Managed infrastructure
   - Easy deployment
