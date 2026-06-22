"""
Training Data Generator

Generates synthetic training data for:
- Intent classification
- Named Entity Recognition
- Indian English speech

Usage:
    python dataset_generator.py --type intent --count 10000 --output ./datasets/intent
"""

import os
import argparse
import json
import random
from pathlib import Path
from typing import List, Dict
from dataclasses import dataclass, asdict

# ============================================================================
# CONFIG
# ============================================================================

@dataclass
class DatasetConfig:
    output_dir: str = "./datasets"
    count: int = 10000
    split_ratio: float = 0.8

# ============================================================================
# INDIAN NAME GENERATOR
# ============================================================================

INDIAN_FIRST_NAMES = [
    "Rahul", "Priya", "Amit", "Neha", "Vikram", "Priyanka", "Arun", "Sunita",
    "Raj", "Kavita", "Sanjay", "Anita", "Deepak", "Meena", "Ramesh", "Geeta",
    "Anil", "Sunita", "Rajesh", "Asha", "Vikas", "Pooja", "Ajay", "Ritu",
    "Vijay", "Nikita", "Suresh", "Lata", "Akash", "Kiran", "Mahesh", "Rita",
    "Gaurav", "Nisha", "Puneet", "Sonia", "Vivek", "Richa", "Ankur", "Shweta",
    "Rohit", "Komal", "Manish", "Sonali", "Kapil", "Divya", "Abhishek", "Manisha",
    "Suresh", "Venkat", "Srinivas", "Prakash", "Chandrashekar",
    "Imran", "Akhtar", "Rashid", "Firoz", "Javed", "Irfan", "Shahid",
]

INDIAN_LAST_NAMES = [
    "Sharma", "Kumar", "Singh", "Gupta", "Agarwal", "Jain", "Mehta", "Patel",
    "Joshi", "Mishra", "Pandey", "Tripathi", "Tiwari", "Dubey", "Verma", "Rawat",
    "Singh", "Thakur", "Chaudhary", "Prasad", "Dwivedi", "Trivedi",
    "Rao", "Naidu", "Reddy", "Iyer", "Menon", "Nair", "Pillai", "Shetty", "Bhat",
    "Khan", "Ansari", "Sheikh", "Pathan", "Uddin", "Hussain", "Ali", "Mirza",
]

COMPANIES = [
    "Flipkart", "Amazon", "Myntra", "Paytm", "PhonePe", "Google Pay",
    "Reliance", "Tata", "Infosys", "Wipro", "TCS", "HDFC", "ICICI",
    "Swiggy", "Zomato", "Ola", "Uber", "OYO", "Cred",
    "Razorpay", "Freshworks", "Zoho", "InMobi", "Dream11", "CoinDCX", "Groww",
]

PRODUCTS = [
    "Premium Plan", "Basic Plan", "Enterprise", "Pro Version", "Starter Pack",
    "Gold Membership", "Silver Plan", "Bronze Package", "VIP Access", "Trial",
]

# ============================================================================
# INTENT TEMPLATES
# ============================================================================

INTENT_TEMPLATES = {
    "dictation": {
        "compose": [
            "Write email to {person}",
            "Draft message for {person}",
            "Compose email to {company}",
            "Write a message about {product}",
            "Draft quick reply to {person}",
        ],
        "edit": [
            "Rewrite this message",
            "Make this email more professional",
            "Simplify this text",
            "Shorten this message",
        ],
        "format": [
            "Format this as a formal email",
            "Make this bullet points",
            "Convert to SMS format",
        ],
    },
    "query": {
        "search": [
            "What is the refund policy?",
            "Where is the order?",
            "How do I track shipment?",
            "What are the charges?",
            "When will it arrive?",
        ],
        "lookup": [
            "Find Rahul's contact",
            "Look up the meeting notes",
            "Get customer details",
            "Search for pending orders",
        ],
        "info": [
            "Tell me about {company}",
            "What is {product}?",
            "Give me details of order #{number}",
            "Show me the report",
        ],
    },
    "action": {
        "schedule": [
            "Schedule meeting with {person}",
            "Book demo for tomorrow",
            "Set reminder for {time}",
            "Create calendar event next week",
            "Arrange call with {person}",
        ],
        "send": [
            "Send message to {person}",
            "Email Rahul the report",
            "WhatsApp {person} about this",
            "Message the team",
            "Send invoice to {company}",
        ],
        "create": [
            "Create task for {person}",
            "Make a follow-up note",
            "Add this to my calendar",
            "Generate report for {company}",
            "Start new project",
        ],
        "book": [
            "Book flight for {person}",
            "Reserve table for 2",
            "Schedule demo with {company}",
            "Book meeting room",
        ],
    },
    "workflow": {
        "automate": [
            "Automate this follow-up",
            "Set up recurring reminder",
            "Create auto-reply for emails",
            "Setup daily report generation",
        ],
        "trigger": [
            "Run the onboarding workflow",
            "Trigger notification to team",
            "Start approval process",
            "Execute campaign workflow",
        ],
    },
    "agent": {
        "outreach": [
            "Follow up with {person}",
            "Reach out to inactive customers",
            "Contact leads from last week",
            "Check in with {person} about proposal",
        ],
        "check_in": [
            "Check in with {company}",
            "Follow up on pending response",
            "Get status update from {person}",
            "Verify with {company} about order",
        ],
    },
    "multi_agent": {
        "review": [
            "Review all pending approvals",
            "Analyze this month's sales",
            "Check team performance",
            "Audit recent transactions",
        ],
        "report": [
            "Generate weekly report",
            "Create sales summary",
            "Make summary of customer feedback",
            "Compile monthly metrics",
        ],
    },
}

# ============================================================================
# GENERATORS
# ============================================================================

class DataGenerator:
    def __init__(self, config: DatasetConfig):
        self.config = config

    def generate_name(self) -> str:
        """Generate Indian name"""
        first = random.choice(INDIAN_FIRST_NAMES)
        last = random.choice(INDIAN_LAST_NAMES)
        return f"{first} {last}"

    def generate_company(self) -> str:
        """Generate company name"""
        return random.choice(COMPANIES)

    def generate_product(self) -> str:
        """Generate product name"""
        return random.choice(PRODUCTS)

    def generate_number(self) -> str:
        """Generate random number"""
        return str(random.randint(1000, 9999))

    def generate_time(self) -> str:
        """Generate time reference"""
        times = ["tomorrow", "next week", "Monday", "Friday", "next month", "today", "this evening"]
        return random.choice(times)

    def generate_intent_data(self, count: int = 1000) -> List[Dict]:
        """Generate intent classification data"""
        data = []

        for _ in range(count):
            # Pick intent and subtype
            intent = random.choice(list(INTENT_TEMPLATES.keys()))
            subtype = random.choice(list(INTENT_TEMPLATES[intent].keys()))
            templates = INTENT_TEMPLATES[intent][subtype]

            # Generate text with replacements
            text = random.choice(templates)
            text = text.replace("{person}", self.generate_name())
            text = text.replace("{company}", self.generate_company())
            text = text.replace("{product}", self.generate_product())
            text = text.replace("{number}", self.generate_number())
            text = text.replace("{time}", self.generate_time())

            data.append({
                "text": text,
                "intent": intent,
                "subtype": subtype,
                "entities": self.extract_entities(text),
            })

        return data

    def extract_entities(self, text: str) -> List[Dict]:
        """Extract entities from text"""
        entities = []

        # Extract person names
        for first in INDIAN_FIRST_NAMES:
            for last in INDIAN_LAST_NAMES:
                name = f"{first} {last}"
                if name in text:
                    entities.append({"text": name, "type": "person"})

        # Extract companies
        for company in COMPANIES:
            if company.lower() in text.lower():
                entities.append({"text": company, "type": "company"})

        return entities

    def generate_hinglish_data(self, count: int = 1000) -> List[Dict]:
        """Generate Hinglish speech recognition data"""
        HINGLISH_TEMPLATES = [
            ("Bhai, {person} ko message bhejo", "Brother, send message to {person}"),
            ("Kal meeting hai {person} ke saath", "Meeting with {person} tomorrow"),
            ("Email karo {company} ko", "Email to {company}"),
            ("Schedule karo call {time}", "Schedule call {time}"),
            ("Invoice bhejo {company} ko", "Send invoice to {company}"),
            ("Reminder set karo {time}", "Set reminder {time}"),
            ("Follow up karo {person} ke saath", "Follow up with {person}"),
            ("Message bhejo {person} ko WhatsApp pe", "Send WhatsApp message to {person}"),
            ("Report banao is month ka", "Generate this month's report"),
            ("Meeting schedule karo {time}", "Schedule meeting {time}"),
        ]

        data = []
        for _ in range(count):
            hinglish, english = random.choice(HINGLISH_TEMPLATES)
            hinglish = hinglish.replace("{person}", self.generate_name())
            hinglish = hinglish.replace("{company}", self.generate_company())
            hinglish = hinglish.replace("{time}", self.generate_time())

            data.append({
                "audio_text": hinglish,
                "transcription": english,
                "language": "hinglish",
                "accent": "indian",
            })

        return data

    def save_dataset(self, data: List[Dict], filename: str):
        """Save dataset to file"""
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)

        filepath = Path(self.config.output_dir) / filename
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"Saved {len(data)} samples to {filepath}")

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Generate Training Data")
    parser.add_argument("--type", type=str, required=True,
                       choices=["intent", "hinglish", "ner"],
                       help="Dataset type")
    parser.add_argument("--count", type=int, default=10000,
                       help="Number of samples")
    parser.add_argument("--output", type=str, default="./datasets",
                       help="Output directory")

    args = parser.parse_args()

    config = DatasetConfig(
        output_dir=args.output,
        count=args.count,
    )

    generator = DataGenerator(config)

    if args.type == "intent":
        print(f"Generating {args.count} intent samples...")
        data = generator.generate_intent_data(args.count)
        generator.save_dataset(data, "intent_train.json")

    elif args.type == "hinglish":
        print(f"Generating {args.count} Hinglish samples...")
        data = generator.generate_hinglish_data(args.count)
        generator.save_dataset(data, "hinglish_train.json")

    elif args.type == "ner":
        print(f"Generating {args.count} NER samples...")
        data = generator.generate_intent_data(args.count)  # Reuse for now
        generator.save_dataset(data, "ner_train.json")

    print("Done!")

if __name__ == "__main__":
    main()
