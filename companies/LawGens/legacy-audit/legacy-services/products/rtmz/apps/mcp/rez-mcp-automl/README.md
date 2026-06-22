# REZ MCP AutoML

MCP server for AutoML pipeline control and management.

## Features

- Start/stop ML training pipelines
- Monitor training progress
- Access model metadata
- Trigger predictions

## Usage

```bash
npm install
npm run build
npm start
```

## Environment

```
PORT=3110
AUTOML_URL=http://automl:5001
AUTH_SERVICE_URL=http://rez-auth:4002
```