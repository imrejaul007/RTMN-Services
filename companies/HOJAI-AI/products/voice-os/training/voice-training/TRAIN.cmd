#!/bin/bash
# Hojai Voice Training - Run this file

echo "🚀 HOJAI VOICE MODEL TRAINING"
echo "================================"

cd "$(dirname "$0")"

echo ""
echo "📊 Generating training data..."
python3 -c "
import json, random
random.seed(42)

NAMES = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Neha Singh', 'Vikram Gupta']
COMPANIES = ['Flipkart', 'Amazon', 'Reliance', 'Infosys', 'TCS']
INTENTS = ['action', 'query', 'agent', 'dictation']
KEYWORDS = {
    'action': ['schedule', 'send', 'create', 'book', 'message'],
    'query': ['what', 'where', 'find', 'search'],
    'agent': ['follow', 'up', 'check'],
    'dictation': ['draft', 'write', 'compose']
}

data = []
for i in range(500):
    intent = random.choice(INTENTS)
    keyword = random.choice(KEYWORDS[intent])
    name = random.choice(NAMES)
    company = random.choice(COMPANIES)
    text = f'{keyword.capitalize()} {keyword} with {name}'
    data.append({'text': text, 'intent': intent})

with open('datasets/intent_train.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f'✅ Generated {len(data)} samples')
"

echo ""
echo "🧠 Training model..."
python3 -c "
import json
from collections import Counter

with open('datasets/intent_train.json') as f:
    data = json.load(f)

vocab = {}
for item in data:
    for word in item['text'].lower().split():
        if word not in vocab:
            vocab[word] = Counter()
        vocab[word][item['intent']] += 1

correct = 0
for item in data:
    text = item['text'].lower()
    scores = Counter()
    for word in text.split():
        if word in vocab:
            scores.update(vocab[word])
    if scores:
        pred = scores.most_common(1)[0][0]
        if pred == item['intent']:
            correct += 1

accuracy = correct / len(data) * 100
print(f'✅ Training complete!')
print(f'📊 Accuracy: {accuracy:.1f}%')
print(f'📁 Model saved to: models/intent-classifier.json')

with open('models/intent-classifier.json', 'w') as f:
    json.dump({k: dict(v) for k, v in vocab.items()}, f, indent=2)
"

echo ""
echo "✅ TRAINING COMPLETE!"
echo ""
echo "📁 Files created:"
echo "   - datasets/intent_train.json"
echo "   - models/intent-classifier.json"
echo ""
echo "🎯 Model ready for deployment!"
