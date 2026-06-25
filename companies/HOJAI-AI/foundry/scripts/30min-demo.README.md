# HOJAI 30-Minute Killer Demo

> **The single command that turns a blank laptop into a working AI-native business.**

## What it does

This script walks a non-technical founder through:

1. **Scaffold** — generates a complete AI-native business (backend + frontend + SUTAR agents + `hojai.ai.md`) in 30 seconds
2. **Install** — runs `npm install` (2-3 minutes)
3. **Seed** — populates the business with realistic sample data (30 seconds)
4. **Build** — compiles all 4 SUTAR agents (Sales, Procurement, Finance, Support)
5. **Start backend** — Express server on port 4001
6. **Start frontend** — Static site on port 3000
7. **Exercise** — calls all 4 SUTAR agents via real HTTP requests to prove they work
8. **Verify** — health checks + summary

**Total time: ~5 minutes when services are warm. ~30 minutes from a blank laptop.**

## Run it

```bash
# Default — creates a B2B marketplace starter
bash scripts/30min-demo.sh

# Customize
TEMPLATE=marketplace \
COMPANY="My Etsy Clone" \
COMPANY_DESC="Handmade goods marketplace" \
REGION=us-east \
LANG=en \
bash scripts/30min-demo.sh

# Other templates
TEMPLATE=b2b bash scripts/30min-demo.sh       # B2B procurement platform
TEMPLATE=hotel bash scripts/30min-demo.sh    # Hotel management
TEMPLATE=restaurant bash scripts/30min-demo.sh # Restaurant OS
TEMPLATE=logistics bash scripts/30min-demo.sh # Logistics platform
```

## What you get at the end

- A working business at **http://localhost:3000**
- API at **http://localhost:4001/api**
- 4 SUTAR agents ready (Sales, Procurement, Finance, Support)
- Sample data: products, RFQs, suppliers, invoices, support tickets
- Logs in `~/.hojai-demo/.hojai-logs/`
- Source in `~/.hojai-demo/<company-name>/`

## The 4 SUTAR agents

| Agent | Endpoint | What it does |
|---|---|---|
| **Sales** | `POST /api/sales/rfq` | Responds to incoming buyer requests for quote |
| **Procurement** | `POST /api/procurement/search` | Searches supplier catalog for best fit |
| **Finance** | `POST /api/finance/invoice` | Generates invoice + calculates tax/duties |
| **Support** | `POST /api/support/ticket` | Classifies ticket + drafts response |

## Requirements

- Node.js >= 18
- npm
- `@hojai/cli` installed (`npm i -g @hojai/cli`) OR a local Foundry checkout

## Customizing for your audience

The script uses environment variables so you can pre-set demo parameters:

```bash
# Demo with a specific company + region
COMPANY="Maya Collective" \
COMPANY_DESC="Handmade fashion from India" \
REGION=ap-south-1 \
LANG=hi \
bash scripts/30min-demo.sh
```

After running, point your audience at `http://localhost:3000` and walk them through:
1. The homepage (shows seeded products)
2. Submit an RFQ as a buyer → Sales agent responds
3. Approve the quote → Procurement finds a supplier
4. Generate an invoice → Finance handles tax/duties
5. Open a support ticket → Support drafts a response

That's a 5-minute investor demo that proves the entire stack works.

## After the demo

The script doesn't tear down the services — you can keep using them. To stop:

```bash
pkill -f 'node.*acme-marketplace'   # or whatever your company name is
```

To deploy to production:

```bash
cd ~/.hojai-demo/<company-name>
npx hojai deploy --mode=remote
```

To add more agents:

```bash
npx hojai add agent CustomerSuccess
# edit apps/backend/src/agents/customer-success/
# restart backend
```

## Why this matters

The spec calls HOJAI Foundry the "30-minute startup engine" — this script makes that promise real and measurable. A non-technical founder with a blank laptop can have a working AI-native business in 30 minutes, with:

- Backend serving real APIs
- Frontend showing real UI
- 4 AI agents ready to handle real queries
- Sample data to demonstrate to investors

Compare to:
- **Shopify**: hours to set up a store
- **Bubble**: hours to build something
- **Custom SaaS**: days or weeks
- **HOJAI**: 30 minutes

## Tests

The demo script is verified by running it against the foundry starter templates. To verify the demo shell script logic without running the full demo:

```bash
bash -n scripts/30min-demo.sh    # syntax check
shellcheck scripts/30min-demo.sh  # lint (if shellcheck installed)
```

## Related files

- `scripts/generate-starters.mjs` — bulk-generates all 9 starter templates
- `scripts/smoke-deploy.sh` — smoke test for `npx hojai deploy`
- `starters/marketplace/` — default template used by the demo
- `packages/create-hojai/` — the `npx hojai create` CLI that the demo invokes
