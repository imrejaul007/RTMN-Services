#!/usr/bin/env python3
"""
Quick Train - Train all models immediately

This script generates data and trains simple models.
Works without GPU but faster with GPU.
"""

import json
import os
from pathlib import Path
from collections import Counter

# ============================================================================
# CONFIG
# ============================================================================

INDIAN_FIRST_NAMES = [
    "Rahul", "Priya", "Amit", "Neha", "Vikram", "Kavita", "Sanjay", "Anita",
    "Deepak", "Meena", "Ramesh", "Geeta", "Anil", "Sunita", "Rajesh", "Asha",
    "Vikas", "Pooja", "Ajay", "Ritu", "Vijay", "Nikita", "Suresh", "Lata",
    "Akash", "Kiran", "Mahesh", "Rita", "Gaurav", "Nisha"
]

INDIAN_LAST_NAMES = [
    "Sharma", "Kumar", "Singh", "Gupta", "Patel", "Joshi", "Mishra", "Pandey",
    "Reddy", "Rao", "Naidu", "Iyer", "Menon", "Khan", "Ali", "Sheikh"
]

COMPANIES = [
    "Flipkart", "Amazon", "Reliance", "Infosys", "TCS", "Wipro", "HDFC",
    "ICICI", "Paytm", "PhonePe", "Ola", "Uber", "Zomato", "Swiggy"
]

INTENT_PATTERNS = {
    "action": {
        "keywords": ["schedule", "send", "create", "book", "message", "email", "call", "remind"],
        "subtypes": {
            "schedule": ["meeting", "call", "demo", "appointment", "interview"],
            "send": ["email", "message", "whatsapp", "report", "proposal"],
            "create": ["task", "project", "event", "list", "note"],
            "book": ["flight", "hotel", "cab", "table", "appointment"],
        }
    },
    "agent": {
        "keywords": ["follow", "up", "check", "in", "reach"],
        "subtypes": {
            "follow_up": ["customer", "client", "lead", "prospect"],
            "check_in": ["status", "update", "progress"],
        }
    },
    "query": {
        "keywords": ["what", "where", "when", "who", "why", "how", "find", "search", "check"],
        "subtypes": {
            "search": ["policy", "status", "contact", "information"],
            "info": ["details", "about", "regarding"],
        }
    },
    "dictation": {
        "keywords": ["draft", "write", "compose", "type", "create"],
        "subtypes": {
            "compose": ["email", "message", "letter", "note"],
            "edit": ["rewrite", "update", "modify"],
        }
    },
    "multi_agent": {
        "keywords": ["analyze", "review", "report", "summary", "generate"],
        "subtypes": {
            "analyze": ["data", "report", "performance", "sales"],
            "review": ["pending", "approvals", "requests"],
        }
    }
}

HINGLISH_PHRASES = [
    ("Bhai, meeting hai kal", "Meeting tomorrow"),
    ("Email bhejo Rahul ko", "Send email to Rahul"),
    ("Call karo Priya ko", "Call Priya"),
    ("Message bhejo WhatsApp pe", "Send WhatsApp message"),
    ("Schedule karo call", "Schedule a call"),
    ("Follow up karo client se", "Follow up with client"),
    ("Invoice bhejo company ko", "Send invoice to company"),
    ("Reminder set karo", "Set reminder"),
    ("Task create karo", "Create task"),
    ("Report banao monthly", "Generate monthly report"),
    ("Meeting schedule karo Friday", "Schedule meeting for Friday"),
    ("Proposal bhejo new client ko", "Send proposal to new client"),
    ("Status check karo", "Check status"),
    ("Payment receive karo", "Receive payment"),
    ("Team ko notify karo", "Notify team"),
]

# ============================================================================
# DATA GENERATION
# ============================================================================

def generate_name():
    return f"{random.choice(INDIAN_FIRST_NAMES)} {random.choice(INDIAN_LAST_NAMES)}"

def generate_company():
    return random.choice(COMPANIES)

def generate_intent_data(count=1000):
    """Generate intent classification data"""
    import random
    data = []

    for _ in range(count):
        intent_type = random.choice(list(INTENT_PATTERNS.keys()))
        intent_info = INTENT_PATTERNS[intent_type]

        keyword = random.choice(intent_info["keywords"])
        subtype = random.choice(list(intent_info["subtypes"].keys()))

        name = generate_name()
        company = generate_company()

        templates = [
            f"{keyword.capitalize()} {subtype} with {name}",
            f"{keyword.capitalize()} {random.choice(intent_info['subtypes'][subtype])} for {company}",
            f"{keyword.capitalize()} {keyword} {name}",
            f"{keyword.capitalize()} {random.choice(intent_info['subtypes'][subtype]} {company}",
        ]

        text = random.choice(templates)
        data.append({
            "text": text,
            "intent": intent_type,
            "subtype": subtype
        })

    return data

def generate_hinglish_data():
    """Generate Hinglish speech data"""
    data = []

    for hinglish, english in HINGLISH_PHRASES:
        data.append({
            "hinglish": hinglish,
            "english": english,
            "confidence": 0.9 + random.random() * 0.1
        })

    return data

# ============================================================================
# SIMPLE MODEL TRAINING
# ============================================================================

class IntentModel:
    """Simple word-based intent classifier"""

    def __init__(self):
        self.vocab = {}
        self.intent_counts = Counter()

    def train(self, data):
        """Train on data"""
        for item in data:
            text = item["text"].lower()
            intent = item["intent"]

            words = text.split()
            for word in words:
                if word not in self.vocab:
                    self.vocab[word] = Counter()
                self.vocab[word][intent] += 1

            self.intent_counts[intent] += 1

    def predict(self, text):
        """Predict intent"""
        text = text.lower()
        words = text.split()

        intent_scores = Counter()

        for word in words:
            if word in self.vocab:
                for intent, count in self.vocab[word].items():
                    intent_scores[intent] += count

        if intent_scores:
            predicted = intent_scores.most_common(1)[0][0]
            confidence = intent_scores.most_common(1)[0][1] / sum(intent_scores.values())
        else:
            predicted = "query"
            confidence = 0.5

        return {"intent": predicted, "confidence": confidence}

    def evaluate(self, data):
        """Evaluate accuracy"""
        correct = 0
        for item in data:
            prediction = self.predict(item["text"])
            if prediction["intent"] == item["intent"]:
                correct += 1
        return correct / len(data) * 100

    def save(self, path):
        """Save model"""
        with open(path, 'w') as f:
            json.dump({
                "vocab": {k: dict(v) for k, v in self.vocab.items()},
                "intent_counts": dict(self.intent_counts)
            }, f, indent=2)

        print(f"✅ Model saved to: {path}")

# ============================================================================
# MAIN
# ============================================================================

def main():
    import random
    random.seed(42)

    print("=" * 60)
    print("HOJAI VOICE MODEL TRAINING")
    print("=" * 60)
    print()

    # Generate training data
    print("📊 Generating training data...")
    train_data = generate_intent_data(1000)
    test_data = generate_intent_data(100)
    hinglish_data = generate_hinglish_data()

    print(f"   - Intent samples: {len(train_data)}")
    print(f"   - Test samples: {len(test_data)}")
    print(f"   - Hinglish samples: {len(hinglish_data)}")

    # Save data
    os.makedirs("./datasets", exist_ok=True)
    with open("./datasets/intent_train.json", 'w') as f:
        json.dump(train_data, f, indent=2)
    with open("./datasets/hinglish_train.json", 'w') as f:
        json.dump(hinglish_data, f, indent=2)
    print("   ✅ Data saved to ./datasets/")

    # Train model
    print()
    print("🧠 Training intent classifier...")
    model = IntentModel()
    model.train(train_data)

    train_acc = model.evaluate(train_data)
    test_acc = model.evaluate(test_data)

    print(f"   - Training accuracy: {train_acc:.1f}%")
    print(f"   - Test accuracy: {test_acc:.1f}%")

    # Save model
    os.makedirs("./models", exist_ok=True)
    model.save("./models/intent-classifier.json")

    # Results
    print()
    print("=" * 60)
    print("✅ TRAINING COMPLETE")
    print("=" * 60)
    print()
    print("Results:")
    print(f"   - Intent Accuracy: {test_acc:.1f}%")
    print(f"   - Hinglish Samples: {len(hinglish_data)}")
    print()
    print("Files:")
    print(f"   - Dataset: ./datasets/intent_train.json")
    print(f"   - Model: ./models/intent-classifier.json")
    print()

    # Test predictions
    print("Sample predictions:")
    test_texts = [
        "Schedule meeting with Rahul",
        "Send email to Priya",
        "Follow up with customer",
        "What is the policy?",
        "Draft email to client"
    ]

    for text in test_texts:
        pred = model.predict(text)
        print(f"   '{text}' → {pred['intent']} ({pred['confidence']:.1f})")

if __name__ == "__main__":
    main()
