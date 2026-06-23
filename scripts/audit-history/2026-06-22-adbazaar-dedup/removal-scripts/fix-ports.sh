#!/bin/bash
# Update each service's default PORT in src/config/env.ts to the canonical port.
declare -A PORTS=(
  [agent-identity]=5511
  [agent-wallet]=5512
  [agent-card]=5513
  [allowance-engine]=5514
  [spending-policy]=5515
  [approval-engine]=5516
  [finance-memory]=5517
  [vendor-twin]=5518
  [expense-twin]=5519
  [subscription-adapter]=5520
  [treasury-adapter]=5521
  [procurement-adapter]=5522
  [negotiation-agent]=5523
  [nexha-settlement]=5524
  [gateway]=5510
)
for svc in "${!PORTS[@]}"; do
  new_port="${PORTS[$svc]}"
  file="$svc/src/config/env.ts"
  if [[ ! -f "$file" ]]; then
    echo "MISSING: $file"
    continue
  fi
  old_port=$(grep -oE "default\([0-9]+\)" "$file" | head -1 | grep -oE "[0-9]+")
  if [[ "$old_port" == "$new_port" ]]; then
    echo "$svc: already $new_port"
    continue
  fi
  sed -i '' "s/PORT: z.coerce.number().int().positive().default($old_port)/PORT: z.coerce.number().int().positive().default($new_port)/" "$file"
  echo "$svc: $old_port -> $new_port"
done
