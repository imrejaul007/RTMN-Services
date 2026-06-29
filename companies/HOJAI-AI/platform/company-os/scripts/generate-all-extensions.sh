#!/bin/bash
# Generate All Industry Extensions
# Creates all 26 industry extensions from template

set -e

TEMPLATE="restaurant"
OUTPUT_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/company-os/industry-extensions"

INDUSTRIES=(
  "restaurant"
  "beauty"
  "hotel"
  "retail"
  "healthcare"
  "education"
  "realestate"
  "manufacturing"
  "fitness"
  "legal"
  "construction"
  "automotive"
  "logistics"
  "fashion"
  "sports"
  "entertainment"
  "travel"
  "government"
  "agriculture"
  "nonprofit"
  "professional"
  "home_services"
  "gaming"
  "media"
  "events"
  "exhibitions"
)

# Create directory structure
for industry in "${INDUSTRIES[@]}"; do
  echo "Creating $industry..."
  mkdir -p "$OUTPUT_DIR/$industry/src/{modules,tests}"
done

echo "Done creating directories"
