# Git Workflow

## Branch Naming

### Branch Types
- `main` - Production ready code
- `develop` - Development branch
- `feat/*` - Feature branches (e.g., `feat/emotion-os`)
- `fix/*` - Bug fixes (e.g., `fix/cache-bug`)
- `docs/*` - Documentation only

### Current Branches

| Repo | Branch | Use For |
|------|--------|---------|
| RTMN-Services | `main` | Production code |
| HOJAI-AI | `main` | Production code |
| Nexha | `main` | Production code |

## Pushing Changes

### Always use `main` branch for production code

```bash
# 1. Always work in main branch for HOJAI-AI
cd /RTMN/companies/HOJAI-AI
git checkout main
git add -A
git commit -m "feat: Add EmotionOS services"
git push origin main

# 2. Then update RTMN submodule
cd /RTMN
git checkout main
git add companies/HOJAI-AI
git commit -m "chore: Update HOJAI-AI submodule"
git push origin main
```

## Rules

1. **NEVER** push to random branch names like `feat/killer-30min-demo`
2. **ALWAYS** use `main` for completed production code
3. **Create** `develop` if you need staging before main
4. **HOJAI-AI is separate repo** - push there first, then update RTMN submodule
