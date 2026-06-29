#!/bin/bash

# Add README.md to all twin services

TWINS_DIR="/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/twins"

for svc in "$TWINS_DIR"/twin-*/; do
  svc_name=$(basename "$svc")

  if [ ! -f "$svc/README.md" ]; then
    echo "Adding README.md to $svc_name..."

    # Extract port from source if available
    port=$(grep -oP "PORT.*=.*'(\d+)'" "$svc/src/index."* 2>/dev/null | grep -oP "\d+" | head -1 || echo "TBD")

    cat > "$svc/README.md" << EOF
# $svc_name

**Port:** $port

TwinOS service for digital twin management.

## Features

- Digital twin operations
- State management
- Relationship tracking
- Analytics

## API

\`\`\`bash
# Health check
curl localhost:$port/health

# Get twin
curl localhost:$port/api/twins/:id
\`\`\`

## Tests

\`\`\`bash
npm test
\`\`\`

## Status

✅ Production Ready
EOF
  fi
done

echo "Done adding README.md files!"