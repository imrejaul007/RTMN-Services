# SUTAR Memory Bridge

## Purpose
Bridge between SUTAR agents and the Memory Layer for persistent knowledge.

## Key Features
- Memory read/write
- Memory search
- Memory sync
- Context management

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/memory | Write memory |
| GET | /api/memory/:id | Read memory |
| GET | /api/memory/search | Search memories |
| DELETE | /api/memory/:id | Delete memory |

## Port
4143