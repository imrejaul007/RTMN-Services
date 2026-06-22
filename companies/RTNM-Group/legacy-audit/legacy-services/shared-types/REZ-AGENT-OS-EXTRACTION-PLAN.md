# ReZ Agent OS - Repository Extraction Plan

## Overview

Extract ReZ Agent OS into a standalone repository for independent versioning, external distribution, and clear ownership.

**Target Repository:** `git@github.com:imrejaul007/rez-agent-os.git`

## Why Separate Repository?

### Business Benefits
1. **Independent Release Cycle** - Ship AI updates daily/weekly without coordinating with other apps
2. **Clear Ownership** - AI team owns the roadmap, no cross-team dependencies
3. **Monetization Path** - Tier 1 (basic) free, Tier 2 (advanced) paid
4. **External Distribution** - Other businesses can integrate via npm
5. **Investor Metrics** - Clear AI usage and ROI tracking

### Technical Benefits
1. **Smaller Clone Size** - External users don't need full ReZ ecosystem
2. **Independent CI/CD** - Faster builds, targeted testing
3. **Versioning Control** - Semantic versioning for AI breaking changes
4. **Open Source Ready** - Can open source core features later

## Package Structure

```
rez-agent-os/
├── packages/
│ ├── agent-core/          # AI brain, tools, memory, events
│ ├── agent-rn/            # React Native chat UI components
│ └── agent-web/           # Web chat components
├── apps/
│ └── agent-dashboard/     # Analytics & monitoring dashboard
├── docs/
│ └── API.md              # API documentation
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── package.json           # Workspace root
```

## Packages

### @rez/agent-core
**Purpose:** Core AI brain - Anthropic integration, tools, memory, orchestration

**Dependencies:**
- `anthropic` (AI provider)
- `axios` (API calls)
- `socket.io` (real-time)
- `supabase-js` (memory)
- `redis` (caching)

**Exports:**
- `createAIChatService()` - Main service factory
- `AIChatHandler` - Message handler
- `ALL_REZ_TOOLS` - 14 base tools
- `ORCHESTRATION_TOOLS` - 5 orchestration tools
- `MemoryService` - Shared memory
- `EventTriggerManager` - Proactive triggers
- `AgentAnalytics` - Metrics
- `ABTesting` - Experiments
- `ErrorTracker` - Monitoring

### @rez/agent-rn
**Purpose:** React Native chat UI for mobile apps

**Dependencies:**
- `react-native`
- `socket.io-client`

**Exports:**
- `AIChatWidget` - Floating chat button
- `AIChatScreen` - Full-screen chat
- `useAIChatRN` - Socket.IO hook

### @rez/agent-web
**Purpose:** Web chat components

**Dependencies:**
- `react`
- `socket.io-client`

**Exports:**
- `AIFloatingChat` - Web floating chat
- `useAIChat` - Hook

### Agent Dashboard (App)
**Purpose:** Admin analytics dashboard

**Stack:** React + Vite

**Features:**
- Session analytics
- Tool usage metrics
- Error monitoring
- A/B experiment results

## Extraction Steps

### Phase 1: Repository Setup
1. Create new GitHub repo
2. Initialize git workspace structure
3. Set up package workspace

### Phase 2: Package Extraction
1. Extract `agent-core` with all AI logic
2. Extract `agent-rn` with React Native components
3. Extract `agent-web` with web components
4. Create dashboard app

### Phase 3: Documentation
1. Write comprehensive README
2. Create API documentation
3. Add contribution guidelines
4. Set up CHANGELOG

### Phase 4: CI/CD
1. GitHub Actions for testing
2. NPM publishing workflow
3. Version management

## Version 1.0.0 Scope

### Included
- ✅ AI brain with Anthropic tool calling
- ✅ 14 base tools (hotel, restaurant, wallet, etc.)
- ✅ 5 orchestration tools
- ✅ Shared memory integration
- ✅ Socket.IO integration
- ✅ React Native UI components
- ✅ Web UI components
- ✅ Event trigger system (9 triggers)
- ✅ Analytics tracking
- ✅ Error monitoring
- ✅ A/B testing framework

### Future (v1.1.0+)
- [ ] Analytics dashboard app
- [ ] External API gateway
- [ ] Multi-tenant support
- [ ] Custom tool builder UI
- [ ] Prompt templates marketplace

## NPM Publishing Plan

```
@rez/agent-core - Core AI package
@rez/agent-rn - React Native components
@rez/agent-web - Web components
```

### Versioning Strategy
- **Patch (1.0.1)** - Bug fixes, error fixes
- **Minor (1.1.0)** - New tools, features
- **Major (2.0.0)** - Breaking API changes

## Local Development

After extraction, integrate back into main ecosystem:

```bash
# In main app's package.json
"@rez/agent-core": "workspace:../rez-agent-os/packages/agent-core"
"@rez/agent-rn": "workspace:../rez-agent-os/packages/agent-rn"
```

## Migration Checklist

- [ ] New repo created
- [ ] Git history cleaned (remove unrelated files)
- [ ] Package.json configured
- [ ] TypeScript configured
- [ ] Tests passing
- [ ] README written
- [ ] CHANGELOG started
- [ ] CI/CD pipeline working
- [ ] NPM credentials configured
- [ ] Initial version published
- [ ] Main repo updated with workspace refs
- [ ] Documentation updated

## Timeline

1. **Setup** - 15 min
2. **Extraction** - 30 min
3. **Documentation** - 15 min
4. **CI/CD** - 15 min
5. **Publishing** - 10 min

**Total:** ~1.5 hours
