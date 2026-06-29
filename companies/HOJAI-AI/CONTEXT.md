# HOJAI-AI Git Context

## Structure
- HOJAI-AI is a **standalone git repo** at `git@github.com:imrejaul007/hojai-ai.git`
- Locally inside RTMN at: `companies/HOJAI-AI/`
- RTMN has it as a submodule pointing to HOJAI-AI main branch

## Git Workflow

### Step 1: Push to HOJAI-AI (standalone repo)
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
git add .
git commit -m "message"
git push origin main  # or feat/killer-30min-demo
```

### Step 2: Update RTMN submodule ref
```bash
cd /Users/rejaulkarim/Documents/RTMN
git add companies/HOJAI-AI
git commit -m "HOJAI AI: submodule update"
git push origin docs/genie-phase-a-complete
```

## Key Reminders
- HOJAI-AI is NOT part of RTMN git history — it's a separate company
- RTMN only tracks the submodule pointer (commit hash)
- Always push to HOJAI-AI first, then update RTMN
- Local HOJAI-AI path: `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/`
- Remote: `git@github.com:imrejaul007/hojai-ai.git`

## Current Status (June 28, 2026)
- HOJAI-AI main: `3546fd729` (40 phases complete)
- RTMN docs/genie-phase-a-complete: points to HOJAI-AI @ `3546fd729`
