# HOJAI Data Service

Centralized data management and ETL pipeline for the HOJAI ecosystem.

**Port: 4590**

## Features

- **Data Sources**: Connect to APIs, databases, files, and streams
- **Pipelines**: Create and manage ETL pipelines with transformations
- **Datasets**: Query and analyze processed data
- **Sync Management**: Automated data synchronization
- **Partitioning**: Support for partitioned datasets

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/datasources` | List all data sources |
| POST | `/api/datasources` | Create data source |
| POST | `/api/datasources/:id/sync` | Sync data source |
| GET | `/api/pipelines` | List pipelines |
| POST | `/api/pipelines` | Create pipeline |
| POST | `/api/pipelines/:id/run` | Run pipeline |
| GET | `/api/datasets` | List datasets |
| POST | `/api/datasets` | Create dataset |
| POST | `/api/datasets/:id/query` | Query dataset |
| GET | `/api/stats` | Get statistics |

## Quick Start

```bash
npm install
npm run build
npm start
```

## Data Source Types

| Type | Description |
|------|-------------|
| `api` | REST/GraphQL API |
| `database` | SQL/NoSQL database |
| `file` | CSV, JSON, Parquet files |
| `stream` | Real-time data streams |
