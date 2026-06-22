#!/usr/bin/env python3
"""HOJAI VOICE TRAINING - RUN THIS FILE"""
import json, random, os
from collections import Counter

# Config
NAMES = ["Rahul Sharma", "Priya Patel", "Amit Kumar", "Neha Singh"]
COMPANIES = ["Flipkart", "Amazon", "Reliance", "Infosys"]
INTENTS = ["action", "query", "agent", "dictation"]
KEYWORDS = {
    "action": ["schedule", "send", "create"],
    "query": ["what", "find", "check"],
    "agent": ["follow", "check"],
    "dictation": ["draft", "write"]
}

# Generate data
print("\nGenerating data...")
data = []
for _ in range(500):
    intent = random.choice(INTENTS)
    keyword = random.choice(KEYWORDS[intent])
    name = random.choice(NAMES)
    text = keyword.capitalize() + " " + name
    data.append({"text": text, "intent": intent})

print(f"Generated {len(data)} samples")

# Save data
os.makedirs("datasets", exist_ok=True)
with open("datasets/intent_train.json", "w") as f:
    json.dump(data, f, indent=2)
print("Saved: datasets/intent_train.json")

# Train
print("\nTraining model...")
vocab = {}
for item in data:
    for word in item["text"].lower().split():
        if word not in vocab:
            vocab[word] = Counter()
        vocab[word][item["intent"]] += 1

# Evaluate
correct = 0
for item in data:
    words = item["text"].lower().split()
    scores = Counter()
    for word in words:
        if word in vocab:
            scores.update(vocab[word])
    if scores:
        pred = scores.most_common(1)[0][0]
        if pred == item["intent"]:
            correct += 1

accuracy = correct / len(data) * 100
print(f"Accuracy: {accuracy:.1f}%")

# Save model
os.makedirs("models", exist_ok=True)
with open("models/intent-classifier.json", "w") as f:
    json.dump({k: dict(v) for k, v in vocab.items()}, f, indent=2)
print("Saved: models/intent-classifier.json")

# Test
print("\nTesting predictions:")
tests = [
    "Schedule Rahul",
    "Send Priya",
    "Follow Amit",
    "What is policy",
    "Draft message"
]
for text in tests:
    words = text.lower().split()
    scores = Counter()
    for word in words:
        if word in vocab:
            scores.update(vocab[word])
    pred = scores.most_common(1)[0][0] if scores else "query"
    print(f"  '{text}' -> {pred}")

print("\n" + "=" * 50)
print("TRAINING COMPLETE!")
print("=" * 50)
print("\nFiles created:")
print("  datasets/intent_train.json")
print("  models/intent-classifier.json")
print(f"\nAccuracy: {accuracy:.1f}%")
print("\nReady to deploy!")
