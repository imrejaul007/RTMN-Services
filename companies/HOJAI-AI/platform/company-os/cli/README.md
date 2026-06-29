# CompanyOS CLI

Command-line interface for CompanyOS.

## Installation

```bash
cd cli
npm install
npm run build
npm link  # Make available globally
```

## Usage

```bash
# Create a company
company-os create "My Restaurant" --industry restaurant

# List companies
company-os list

# Check status
company-os status company_123

# Deploy AI worker
company-os deploy company_123 ai-cfo

# Check health
company-os health

# Generate new extension
company-os generate healthcare --from restaurant

# Delete company
company-os delete company_123
```

## Environment Variables

```bash
COMPANY_OS_API=http://localhost:4010
```

## Commands

| Command | Description |
|---------|-------------|
| `create <name>` | Create a new company |
| `list` | List all companies |
| `status <id>` | Show company status |
| `deploy <id> <worker>` | Deploy AI worker |
| `health` | Show system health |
| `generate <industry>` | Generate new extension |
| `delete <id>` | Delete a company |

## Options

```bash
-v, --verbose     Verbose output
-h, --help       Show help
```
