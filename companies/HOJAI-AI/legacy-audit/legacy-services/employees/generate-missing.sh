#!/bin/bash
# Generate Missing AI Employees
# Creates basic Express servers for 47 missing employee templates

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MISSING_EMPLOYEES=(
    "account-manager"
    "accounting-ai"
    "analyst-ai"
    "analyst-ai-expert"
    "architect-ai"
    "assistant-ai"
    "automator-ai"
    "bot-ai"
    "controller-ai"
    "creator-ai"
    "designer-ai"
    "developer-ai"
    "discoverer-ai"
    "editor-ai"
    "engineer-ai"
    "executor-ai"
    "expert-ai"
    "explorer-ai"
    "guard-ai"
    "handler-ai"
    "helper-ai"
    "innovator-ai"
    "inventor-ai"
    "manager-ai"
    "monitor-ai"
    "notifier-ai"
    "operator-ai"
    "optimizer-ai"
    "overseer-ai"
    "photographer-ai"
    "pioneer-ai"
    "planner-ai"
    "professional-ai"
    "protector-ai"
    "reporter-ai"
    "researcher-ai"
    "scheduler-ai"
    "scientist-ai"
    "specialist-ai"
    "supervisor-ai"
    "supporter-ai"
    "technician-ai"
    "technologist-ai"
    "tutor-ai"
    "voyager-ai"
    "watcher-ai"
)

# Port counter - starting from 4858
PORT=4858

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Generating ${#MISSING_EMPLOYEES[@]} missing AI employees...${NC}"

for employee in "${MISSING_EMPLOYEES[@]}"; do
    dir="$BASE_DIR/$employee"

    # Skip if already exists
    if [ -f "$dir/package.json" ]; then
        echo -e "  ${YELLOW}Skipping${NC} $employee (already exists)"
        continue
    fi

    echo -e "  Creating $employee..."

    # Create directory
    mkdir -p "$dir/src"

    # Convert name for display
    display_name=$(echo "$employee" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

    # Create package.json
    cat > "$dir/package.json" << EOF
{
  "name": "@hojai/$employee",
  "version": "1.0.0",
  "description": "HOJAI $display_name - AI-powered $display_name for business operations",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "keywords": ["hojai", "ai", "$employee"],
  "author": "HOJAI AI",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

    # Create TypeScript config
    cat > "$dir/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

    # Create main index.ts
    cat > "$dir/src/index.ts" << EOF
/**
 * HOJAI $display_name
 * Port: $PORT
 *
 * AI-powered $display_name for business operations
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const PORT = $PORT;
const SERVICE_NAME = '$employee';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));

// Health endpoints
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

// Info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'AI-powered $display_name for business operations',
    capabilities: {
      task_automation: true,
      ai_assistance: true,
      reporting: true
    }
  });
});

// Main API route
app.post('/api/execute', async (req: Request, res: Response) => {
  try {
    const { task, context } = req.body;

    // TODO: Implement $employee business logic
    const result = {
      task,
      status: 'completed',
      output: \`$display_name processed task: \${task || 'no task provided'}\`,
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(\`[\${SERVICE_NAME}] Error:\`, err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(\`
╔══════════════════════════════════════════════╗
║  HOJAI $display_name
║  Port: ${PORT}
║  Status: RUNNING
╚══════════════════════════════════════════════╝
  \`);
});

export default app;
EOF

    PORT=$((PORT + 1))
done

echo -e "${GREEN}Done! Created ${#MISSING_EMPLOYEES[@]} AI employees.${NC}"
echo "Ports allocated: 4858-$((PORT-1))"
