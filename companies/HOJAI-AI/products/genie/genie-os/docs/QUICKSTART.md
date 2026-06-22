# Quickstart — 5 minutes from zero to running

## Prerequisites

- **Node.js 20+** ([download](https://nodejs.org))
- **MongoDB 7+** running on `localhost:27017`
  - macOS: `brew install mongodb-community && brew services start mongodb-community`
  - Docker: `docker run -d --name hojai-mongo -p 27017:27017 mongo:7.0`
- **A terminal** that can run `npm install`

## Step 1: Verify the location

The project lives at:

```
/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie/genie-os/
```

This is **inside** the RTMN monorepo, inside the HOJAI-AI company folder, alongside the 23 specialized Genie services.

## Step 2: Install dependencies

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie/genie-os
npm install
```

This installs all dependencies for foundation, runtime, products, and frontend in one shot (it's a workspaces monorepo).

## Step 3: Start everything

```bash
npm run start:all
```

You should see:

```
🚀 Starting HOJAI AI brain (genie-os)...

Owns: AI Runtime (3) + Clients (3) + Web (1) = 7 services
Foundation services are started separately via companies/HOJAI-AI/start-all.sh

  ✅ genie           :7100  healthy
  ✅ sutar           :7200  healthy
  ✅ agentos         :7300  healthy
  ✅ do-client       :8090  healthy
  ✅ nexha-client    :8190  healthy
  ✅ salar-client    :8290  healthy
  ✅ web             :3000  healthy

🎉 genie-os started!
```

> **Note (2026-06-21):** The 7 foundation services (corpid, twinos, memoryos, goalos, policyos, skillos, flowos) were moved to `_deprecated-foundation/`. Their canonical implementations live in `companies/HOJAI-AI/platform/*` and are managed by `companies/HOJAI-AI/start-all.sh`. See `docs/FOUNDATION-AUDIT-2026-06-21.md` (referenced from the deprecation NOTICE.md files in `_deprecated-foundation/`).

Wait ~10 seconds for everything to come up.

## Step 4: Verify health

```bash
npm run health
```

You should see all 7 genie-os services with ✅ green checks.

## Step 4b: Verify routing end-to-end

```bash
# Make sure external repos are running first (see Step 5 below)
npm run test:routing
```

Expected output: `📊 7/7 routing checks passed`. This verifies the web → thin client → external repo chain works for DO, Nexha, Salar, and Genie.

## Step 5: Open the web super-app

```bash
open http://localhost:3000
```

You'll see a 5-tab UI: **Home, DO, Nexha, Salar, Genie**.

> **Note:** The DO, Nexha, and Salar tabs will show graceful errors until you start those external repos. See "Going further" below.

## Going further: start the external repos

The genie-os thin clients (ports 8090, 8190, 8290) forward to external repos that you need to start in their own terminals.

### Start DO app (consumer commerce)

```bash
# Terminal 2
cd /Users/rejaulkarim/Documents/RTMN/companies/do-app
npm install
npm run dev:backend
# → DO backend on port 3001
```

### Start Nexha (B2B commerce)

```bash
# Terminal 3
cd /Users/rejaulkarim/Documents/RTMN/companies/Nexha/commerce-identity
npm install
npm run dev
# → Nexha commerce-identity on port 8000
```

### Start Salar (AI marketplace)

```bash
# Terminal 4
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/salar
npm install
npm start
# → Salar on port 8200
```

Now the web UI will show real data from all three backends.

## Optional: start the 23 specialized Genie services

The runtime/genie in this repo (port 7100) can delegate to specialized Genie services that live in the parent folder. To enable delegation, start them in separate terminals:

```bash
# Terminal 5
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie/genie-gateway
npm install && npm start
# → genie-gateway on port 4701

# Terminal 6
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie/genie-shopping-agent
npm install && npm start
# → on port 4728

# ... (21 more)
```

You can start as many or as few as you want. The more you start, the smarter the runtime/genie becomes.

## Run the end-to-end demo

```bash
npm run demo
```

This walks through the whole ecosystem: signs up a user, creates a wallet, uses the Genie agent, browses the marketplace, checks B2B companies, etc.

## Run all tests

```bash
# Stop the running services first (tests need to bind to the same ports)
npm run stop:all
sleep 2

# Run all 6 test suites (foundation tests moved to platform/)
npm run test

# Restart the services
npm run start:all
```

Expected output: `📊 6/6 test suites passed`

## Common issues

### "EADDRINUSE :::7001"
Port 7001 is already in use. Run `npm run stop:all` first.

### "MongoDB connection failed"
Make sure MongoDB is running: `docker ps` or `brew services list`. Then restart.

### "Cannot POST /auth/signup" on the web UI
The web → client → external repo chain is misconfigured. Check that the external repos are actually running on the ports listed in `.env`.

### Tests pass but the web UI shows errors
The web UI is working — it just can't reach the external repos. Start them in their own terminals.

## What to do next

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
- Read [INTEGRATION.md](INTEGRATION.md) to see how the parts connect
- Read [SERVICES.md](SERVICES.md) to see every service in detail
- Read [DEVELOPMENT.md](DEVELOPMENT.md) when you're ready to add features
