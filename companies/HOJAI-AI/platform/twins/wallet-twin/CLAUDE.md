# Wallet Twin - Port 4896

## Overview
Digital wallet, transactions, rewards tracking.

## Key Features
- Transaction history
- Balance tracking
- Reward points
- Spending patterns

## API Endpoints
- GET /api/wallet/:userId - Get wallet
- GET /api/wallet/:userId/transactions - Get transactions
- POST /api/wallet/:userId/transactions - Add transaction

## Environment
- Port: 4896

## Startup
cd platform/twins/wallet-twin && npm run dev
