#!/bin/bash
# Setup Voice Training Environment

set -e

echo "=========================================="
echo "Hojai Voice Training Setup"
echo "=========================================="

# Check Python version
echo ""
echo "Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "Python 3 not found. Please install Python 3.8+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "Found: $PYTHON_VERSION"

# Check pip
echo ""
echo "Checking pip..."
if ! command -v pip3 &> /dev/null; then
    echo "pip3 not found. Installing pip..."
    python3 -m ensurepip --upgrade
fi

# Create virtual environment
echo ""
echo "Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo ""
echo "Installing requirements..."
pip install -r requirements.txt

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To activate the environment:"
echo "  source venv/bin/activate"
echo ""
echo "To start training:"
echo "  python scripts/fine_tune_models.py"
echo ""
