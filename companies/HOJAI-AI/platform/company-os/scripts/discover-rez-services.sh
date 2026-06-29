#!/bin/bash
# REZ Service Discovery Script
# Scans REZ-Merchant for available services

set -e

REZ_MERCHANT_DIR="/Users/rejaulkarim/Documents/RTMN/companies/REZ-Merchant"
OUTPUT_FILE="${1:-rez-services-discovered.json}"

echo "Discovering REZ-Merchant services..."
echo ""

# Initialize counters
declare -A industry_counts
total=0

# Create JSON output
echo "{" > "$OUTPUT_FILE"
echo '  "discovered_at": "'$(date -Iseconds)'",' >> "$OUTPUT_FILE"
echo '  "services": [' >> "$OUTPUT_FILE"

first=true

# Scan directories
for dir in "$REZ_MERCHANT_DIR"/*/; do
  name=$(basename "$dir")

  # Skip non-service directories
  [[ "$name" == node_modules ]] && continue
  [[ "$name" == docs ]] && continue
  [[ "$name" == 0 ]] && continue

  # Check if it's a service (has src, package.json, etc.)
  if [[ -f "$dir/package.json" ]] || [[ -d "$dir/src" ]]; then
    ((total++))

    # Categorize by industry
    case "${name,,}" in
      *restaurant*|*menu*|*order*|*kds*|*kitchen*|*pos*|*waiter*|*table*)
        industry="restaurant"
        ;;
      *beauty*|*spa*|*salon*|*stylist*)
        industry="beauty"
        ;;
      *hotel*|*pms*|*housekeep*|*booking*)
        industry="hotel"
        ;;
      *retail*|*store*|*shop*)
        industry="retail"
        ;;
      *health*|*medical*|*doctor*|*clinic*|*patient*|*pharma*)
        industry="healthcare"
        ;;
      *education*|*learning*|*school*|*student*)
        industry="education"
        ;;
      *realestate*|*property*)
        industry="realestate"
        ;;
      *manufacturing*|*mfg*|*production*)
        industry="manufacturing"
        ;;
      *logistics*|*delivery*|*shipping*)
        industry="logistics"
        ;;
      *automotive*|*car*|*vehicle*)
        industry="automotive"
        ;;
      *fitness*|*gym*|*healthclub*)
        industry="fitness"
        ;;
      *laundry*|*dryclean*)
        industry="laundry"
        ;;
      *)
        industry="other"
        ;;
    esac

    # Count
    ((industry_counts[$industry]++))

    # Get description from package.json
    description="No description"
    if [[ -f "$dir/package.json" ]]; then
      description=$(grep -o '"description": "[^"]*"' "$dir/package.json" 2>/dev/null | head -1 | sed 's/"description": "//;s/"$//' || echo "No description")
    fi

    # Get port if available
    port=""
    if [[ -f "$dir/package.json" ]]; then
      port=$(grep -o '"port": [0-9]*' "$dir/package.json" 2>/dev/null | head -1 | grep -o '[0-9]*' || echo "")
    fi

    # Add to JSON
    if [[ "$first" == true ]]; then
      first=false
    else
      echo "," >> "$OUTPUT_FILE"
    fi

    cat >> "$OUTPUT_FILE" <<EOF
    {
      "name": "$name",
      "industry": "$industry",
      "description": "$description",
      "path": "$dir",
      "port": ${port:-null}
    }
EOF

    # Print summary
    printf "  %-40s %s\n" "$name" "($industry)"
  fi
done

echo "" >> "$OUTPUT_FILE"
echo "  ]," >> "$OUTPUT_FILE"

# Add summary
echo '  "summary": {' >> "$OUTPUT_FILE"
echo "    \"total_services\": $total," >> "$OUTPUT_FILE"
echo '    "by_industry": {' >> "$OUTPUT_FILE"

first_industry=true
for industry in "${!industry_counts[@]}"; do
  count=${industry_counts[$industry]}
  if [[ "$first_industry" == true ]]; then
    first_industry=false
  else
    echo "," >> "$OUTPUT_FILE"
  fi
  printf '      "%s": %d' "$industry" "$count" >> "$OUTPUT_FILE"
done

echo "" >> "$OUTPUT_FILE"
echo "    }" >> "$OUTPUT_FILE"
echo "  }" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  REZ-Merchant Services Discovery Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Total services found: $total"
echo ""
echo "By Industry:"
for industry in "${!industry_counts[@]}"; do
  count=${industry_counts[$industry]}
  printf "  %-15s %d services\n" "$industry:" "$count"
done | sort -t: -k2 -rn
echo ""
echo "Output saved to: $OUTPUT_FILE"
echo ""
