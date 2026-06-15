# Contributing to RTMN

**Last Updated:** June 15, 2026

Thank you for your interest in contributing to the RTMN platform! This document describes how to contribute code, documentation, bug reports, and feature requests.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How to Contribute](#how-to-contribute)
4. [Development Workflow](#development-workflow)
5. [Style Guide](#style-guide)
6. [Testing Requirements](#testing-requirements)
7. [Pull Request Process](#pull-request-process)
8. [Community](#community)

---

## 🤝 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Report violations to conduct@rtmn.com.

## 🚀 Getting Started

### Repository Structure

RTMN uses a **multi-repo architecture**:

```
rtmn-services (main repo)         → Documentation, audits, roadmaps
companies/hojai-ai/               → HOJAI AI product code
companies/StayOwn-Hospitality/    → StayOwn Hospitality code
companies/RABTUL-Technologies/    → RABTUL services code
companies/REZ-Merchant/           → REZ-Merchant services code
companies/Karma-Foundation/       → Karma Foundation code
... (one repo per company)
```

### Choose the Right Repo

| What you're contributing | Repo |
|--------------------------|------|
| Documentation, audits, architecture | `rtmn-services` (main) |
| HOJAI AI product code | `companies/hojai-ai` |
| StayOwn products | `companies/StayOwn-Hospitality` |
| RABTUL services | `companies/RABTUL-Technologies` |
| ... | `companies/<company-name>` |

### Local Setup

```bash
# Clone the main repo (for docs)
git clone https://github.com/rtmn-group/rtmn-services.git
cd rtmn-services

# Clone the company repo you want to contribute to
git clone https://github.com/rtmn-group/hojai-ai.git companies/hojai-ai
cd companies/hojai-ai
npm install
npm run dev
```

## 🛠️ How to Contribute

### Reporting Bugs

Use the **issue tracker** in the relevant company repo.

**Bug report template:**

```markdown
**Describe the bug**
A clear description.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable.

**Environment:**
- Product: [e.g., BrandPulse v1.0.0]
- Browser: [e.g., Chrome 125]
- OS: [e.g., macOS 15.2]
- Account ID: [if applicable]

**Severity:** [P1/P2/P3/P4]
```

### Suggesting Features

Open a **feature request** issue. Include:
- **Problem:** What problem does this solve?
- **Proposed solution:** How should it work?
- **Alternatives considered:** What other approaches did you consider?
- **Use case:** Who benefits and how?

### Improving Documentation

- Fix typos, broken links, unclear examples
- Add missing documentation for public APIs
- Translate to other languages (see [TRANSLATION-GUIDE.md](TRANSLATION-GUIDE.md) TBD)
- Submit a PR directly — small doc changes don't need an issue

### Submitting Code

1. Find or open an issue describing the change
2. Fork the relevant company repo
3. Create a feature branch
4. Write code + tests
5. Ensure CI passes
6. Submit a Pull Request

## 💻 Development Workflow

### Branching Strategy

We use **GitHub Flow**:

- `main` — production-ready code
- `feature/short-description` — new features
- `fix/short-description` — bug fixes
- `chore/short-description` — maintenance tasks
- `docs/short-description` — documentation only

**Never commit directly to `main`.** Always use a feature branch.

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Formatting, missing semicolons, etc.
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `perf` — Performance improvement
- `test` — Adding or fixing tests
- `chore` — Build, CI, dependencies, etc.

**Examples:**

```
feat(brandpulse): add aspect-based sentiment analysis
fix(hotel-os): resolve booking race condition
docs(readme): add Quick Start section
chore(deps): bump express to 4.21.0
```

### Pre-commit Hooks

We use **Husky** + **lint-staged** to enforce quality:

- ESLint (with auto-fix)
- Prettier (formatting)
- TypeScript type-check
- Tests for affected files

Install: `npm run prepare` (runs automatically on `npm install`)

## 🎨 Style Guide

### TypeScript / JavaScript

- **Style:** [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- **Formatter:** Prettier (config in `.prettierrc`)
- **Linter:** ESLint (config in `.eslintrc`)
- **Naming:**
  - `camelCase` for variables, functions
  - `PascalCase` for classes, types, React components
  - `UPPER_SNAKE_CASE` for constants
  - `kebab-case` for file names (except React components)
- **No `any`:** Use `unknown` and narrow with type guards
- **Prefer immutability:** Use `readonly`, `as const`, spread operator
- **Async/await over `.then()` chains**

### Python

- **Style:** [PEP 8](https://peps.python.org/pep-0008/) + [Black](https://black.readthedocs.io/)
- **Type hints required** for all public functions
- **Docstrings:** Google style

### API Design

- **REST:** Follow RESTful conventions
  - `GET /api/v1/resources` — list
  - `GET /api/v1/resources/:id` — read
  - `POST /api/v1/resources` — create
  - `PUT /api/v1/resources/:id` — full update
  - `PATCH /api/v1/resources/:id` — partial update
  - `DELETE /api/v1/resources/:id` — delete
- **Error responses:** Use standard HTTP status codes
  ```json
  {
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "The requested resource does not exist",
      "details": { "id": "123" }
    }
  }
  ```
- **Pagination:** Cursor-based for large datasets
- **Versioning:** URL path (`/api/v1/...`)
- **Idempotency:** Support `Idempotency-Key` header for POST

### Documentation

- **JSDoc/TSDoc** for all exported functions and types
- **OpenAPI spec** for all REST APIs (auto-generated)
- **README.md** required in every service folder
- **CHANGELOG.md** entry for every user-facing change

## ✅ Testing Requirements

### Coverage Thresholds

- **Lines:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Critical paths:** 100% (auth, billing, data integrity)

### Test Types

1. **Unit tests** — Test individual functions/classes
2. **Integration tests** — Test API endpoints with real DB
3. **E2E tests** — Test full user flows (Playwright/Cypress)
4. **Load tests** — For endpoints expecting > 100 RPS
5. **Security tests** — OWASP ZAP scan in CI

### Frameworks

- **TypeScript:** Jest + Supertest
- **Python:** pytest
- **E2E:** Playwright
- **Load:** k6

### Running Tests

```bash
npm test                  # All tests
npm run test:unit         # Unit only
npm run test:integration  # Integration only
npm run test:e2e          # E2E only
npm run test:coverage     # With coverage
```

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows the style guide
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (for user-facing changes)
- [ ] CI passes
- [ ] No new linter warnings
- [ ] Reviewed your own diff

### PR Template

```markdown
## Description
What does this PR do? Link to issue.

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe your test approach.

## Checklist
- [ ] My code follows the style guide
- [ ] I have added tests
- [ ] All tests pass
- [ ] I have updated relevant documentation
- [ ] I have updated the CHANGELOG
```

### Review Process

1. **Automated checks** must pass (CI, lint, tests, coverage)
2. **1 approval** required from a code owner
3. **Squash and merge** to `main` (commit message will be cleaned)
4. **Deploy** to staging automatically
5. **Promote to production** via merge of release branch

### After Merge

- The PR is included in the next release
- The author is credited in CHANGELOG and release notes
- The associated issue is auto-closed (if specified)

## 🌍 Community

### Channels

- **GitHub Discussions** — General Q&A, ideas
- **Discord** — [TBD] — Real-time chat
- **Monthly Community Call** — Last Friday of each month, 10 AM PT
- **Office Hours** — Wednesdays 2 PM ET (see [SUPPORT.md](SUPPORT.md))

### Roles

- **Contributors** — Anyone who submits a merged PR
- **Maintainers** — Recurring contributors with repo write access
- **Code Owners** — Reviewers assigned to specific paths in CODEOWNERS
- **Core Team** — RTMN Group employees

---

## ❓ Questions?

- **General:** Open a GitHub Discussion
- **Security:** security@rtmn.com (see [SECURITY.md](SECURITY.md))
- **Code of Conduct violation:** conduct@rtmn.com
- **Anything else:** hello@rtmn.com

---

*Thank you for contributing to RTMN! Together, we're building the future of multi-industry intelligent automation.* 🚀
