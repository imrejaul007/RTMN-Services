# RTMN Git Context

## Structure
```
RTMN/
├── .git/                    # RTMN git repo
├── companies/
│   ├── HOJAI-AI/         # git@github.com:imrejaul007/hojai-ai.git (SUBMODULE)
│   ├── Nexha/             # git@github.com:imrejaul007/NeXha.git
│   ├── LawGens/           # git@github.com:imrejaul007/LawGens.git
│   └── RTNM-Digital/      # git@github.com:imrejaul007/RTNM-Digital.git
```

## Each company is a SEPARATE git repo (submodule)
- HOJAI-AI = standalone company repo
- Nexha = standalone company repo
- RTNM-Digital = standalone company repo

## Workflow

### Push HOJAI-AI changes:
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
git add . && git commit -m "message" && git push origin main
```

### Update RTMN to point to new HOJAI-AI commit:
```bash
cd /Users/rejaulkarim/Documents/RTMN
git add companies/HOJAI-AI && git commit -m "HOJAI: update submodule" && git push origin docs/genie-phase-a-complete
```

## Current Submodule Status
- HOJAI-AI: `3546fd729` (40 phases complete)
- Nexha: `475a02164` 
- LawGens: `e4bd6c6dd`
- RTNM-Digital: `a71ed5f7d`

## RTMN Branches
- `docs/genie-phase-a-complete` = main documentation branch
- `main` = production
