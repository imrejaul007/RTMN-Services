#!/usr/bin/env python3
"""
Test Trained Model - Use the trained model

Usage:
    python test_model.py
"""

import json
from collections import Counter

# Load model
with open('models/intent-classifier.json') as f:
    vocab = json.load(f)

def predict(text):
    """Predict intent from text"""
    words = text.lower().split()
    scores = Counter()

    for word in words:
        if word in vocab:
            scores.update(vocab[word])

    if scores:
        intent = scores.most_common(1)[0][0]
        confidence = scores.most_common(1)[0][1] / sum(scores.values())
    else:
        intent = "query"
        confidence = 0.5

    return {"intent": intent, "confidence": confidence}

# Test
print("\n🎯 HOJAI INTENT CLASSIFIER - TEST RESULTS")
print("=" * 50)

tests = [
    "Schedule meeting with Rahul tomorrow",
    "Send email to Priya about proposal",
    "Follow up with Amit from last week",
    "What is the refund policy?",
    "Draft email to client",
    "Create task for Vikram",
    "Bhai, meeting hai kal",
    "Email bhejo Rahul ko",
]

for text in tests:
    result = predict(text)
    emoji = "✅" if result["confidence"] > 0.5 else "⚠️"
    print(f"{emoji} '{text}'")
    print(f"   → {result['intent']} ({result['confidence']:.0%})")
    print()

print("=" * 50)
