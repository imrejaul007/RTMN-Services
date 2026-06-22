# Genie Money OS - Documentation

> **Version:** 1.0.0  
> **Port:** 4724  
> **Status:** ✅ Complete - All Routes Built  
> **Last Updated:** June 18, 2026

---

## 🎯 Overview

Genie Money OS provides comprehensive financial management capabilities including budgeting, expense tracking, savings management, investment tracking, financial goals, and AI-powered financial insights.

---

## 🏗️ Architecture

```
Port 4724
└── Money OS
    ├── /budget       - Budget creation, category allocation
    ├── /expenses    - Expense logging, categorization, trends
    ├── /savings     - Savings accounts, goal progress
    ├── /investments - Portfolio tracking, performance
    ├── /goals       - Financial goals and milestones
    └── /insights    - AI financial insights & recommendations
```

---

## 📚 Routes

### Budget Management (`/budget`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:userId` | POST | Create monthly budget |
| `/:userId` | GET | Get current budget |
| `/:userId` | PUT | Update budget |
| `/:userId/categories` | GET | Get budget categories |
| `/:userId/categories/:categoryId` | PUT | Update category |
| `/:userId/categories` | POST | Add custom category |
| `/:userId/progress` | GET | Get budget progress |
| `/:userId/allocate` | POST | Allocate spending to category |
| `/defaults/categories` | GET | Get default categories |
| `/:userId/recommend` | POST | Get budget recommendations |

**Default Categories (10):**
- Housing (30%), Transportation (15%), Food (10%), Utilities (5%)
- Insurance (5%), Healthcare (5%), Personal (10%), Entertainment (5%)
- Savings (10%), Investments (5%)

### Expense Tracking (`/expenses`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:userId` | POST | Log expense |
| `/:userId` | GET | Get expenses (with filters) |
| `/:userId/summary` | GET | Get expense summary |
| `/:userId/trends` | GET | Get monthly trends |
| `/:userId/:expenseId` | DELETE | Delete expense |
| `/:userId/:expenseId` | PUT | Update expense |
| `/categories/all` | GET | Get expense categories |
| `/:userId/split` | POST | Split expense with others |
| `/:userId/recurring` | GET | Get recurring expenses |

**Expense Categories (25+):**
- Housing, Utilities, Transportation, Gas, Car Payment
- Insurance, Health Insurance, Car Insurance
- Food, Groceries, Dining Out, Coffee
- Healthcare, Personal, Clothing, Personal Care
- Entertainment, Subscriptions, Shopping, Education
- Travel, Gifts, Debt Payments, Other

### Savings Management (`/savings`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:userId/accounts` | POST | Create savings account |
| `/:userId/accounts` | GET | Get all accounts |
| `/:userId/accounts/:accountId` | GET | Get specific account |
| `/:userId/accounts/:accountId/deposit` | POST | Deposit funds |
| `/:userId/accounts/:accountId/withdraw` | POST | Withdraw funds |
| `/:userId/accounts/:accountId/transactions` | GET | Get transactions |
| `/:userId/goals` | POST | Create savings goal |
| `/:userId/goals` | GET | Get savings goals |
| `/:userId/goals/:goalId/contribute` | POST | Contribute to goal |
| `/account-types` | GET | Get account types |
| `/:userId/project` | POST | Calculate projections |

**Account Types (8):**
- Emergency Fund, Vacation, Home Down Payment, Car
- Education, Wedding, Retirement, General Savings

### Investment Tracking (`/investments`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:userId/portfolio` | GET | Get portfolio summary |
| `/:userId/holdings` | POST | Add holding |
| `/:userId/holdings` | GET | Get all holdings |
| `/:userId/holdings/:holdingId` | PUT | Update holding price |
| `/:userId/transactions` | POST | Record transaction |
| `/:userId/transactions` | GET | Get transactions |
| `/:userId/performance` | GET | Get performance metrics |
| `/:userId/recommendations` | GET | Get investment recommendations |
| `/:userId/retirement` | POST | Retirement projection |
| `/asset-types` | GET | Get asset types |

**Asset Types (8):**
- Stocks, ETFs, Mutual Funds, Bonds, Cryptocurrency
- Real Estate, Retirement (401k/IRA), Cash/Money Market

### Financial Goals (`/goals`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:userId` | POST | Create financial goal |
| `/:userId` | GET | Get all goals |
| `/:userId/:goalId` | GET | Get specific goal |
| `/:userId/:goalId/contribute` | POST | Contribute to goal |
| `/:userId/:goalId` | PUT | Update goal |
| `/:userId/:goalId` | DELETE | Delete goal |
| `/:userId/:goalId/timeline` | GET | Get goal timeline |
| `/:userId/milestones` | GET | Get all milestones |
| `/templates/all` | GET | Get goal templates |

**Goal Templates (12):**
- Emergency Fund, Debt Freedom, Vacation, Home, Car
- Retirement, Education, Wedding, Investment, Business
- Charitable Giving, Custom Goal

### Financial Insights (`/insights`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:userId` | GET | Comprehensive financial insights |
| `/:userId/spending` | GET | Spending insights |
| `/:userId/savings-insights` | GET | Savings insights |
| `/:userId/investment-insights` | GET | Investment insights |
| `/:userId/debt` | GET | Debt analysis |
| `/:userId/calendar` | GET | Financial calendar |
| `/:userId/monthly` | GET | Monthly summary |
| `/:userId/projection` | GET | Wealth projection |
| `/:userId/ask` | POST | AI financial advisor |

---

## 📊 Scoring System

### Financial Health Score (0-100)
```
Overall = (Savings × 0.25) + (Budget × 0.20) + (Goals × 0.20) + (Investments × 0.20) + (Emergency × 0.15)
```

### Dimension Scores
- **Savings Score**: Emergency fund coverage, overall savings
- **Budget Score**: Spending vs budget adherence
- **Goals Score**: Goal progress and completion
- **Investment Score**: Portfolio diversification and returns
- **Emergency Score**: Emergency fund months of coverage

---

## 💰 Key Features

1. **Smart Budgeting**: 50/30/20 rule with custom categories
2. **Expense Tracking**: Automatic categorization, trends, insights
3. **Savings Goals**: Milestones, projections, automated progress
4. **Investment Portfolio**: Holdings, performance, recommendations
5. **Financial Goals**: Track all financial objectives
6. **AI Insights**: Personalized recommendations and advice
7. **Wealth Projection**: See your financial future
8. **Financial Calendar**: Never miss a payment or deadline

---

## 🔗 Integration

**RTMN Integration:**
- Finance OS (4801) - Financial consolidation
- REZ Wallet (4004) - Payment integration
- TwinOS (4705) - Financial Twin
- MemoryOS (4703) - Financial memory

---

## 🚀 Quick Start

```bash
cd companies/HOJAI-AI/services/genie-money-os
npm install
npm start  # Port 4724
```

### Test Commands

```bash
# Create budget
curl -X POST http://localhost:4724/budget/user123 \
  -H "Content-Type: application/json" \
  -d '{"monthlyIncome": 5000}'

# Log expense
curl -X POST http://localhost:4724/expenses/user123 \
  -H "Content-Type: application/json" \
  -d '{"amount": 45.99, "category": "groceries", "merchant": "Whole Foods"}'

# Create savings goal
curl -X POST http://localhost:4724/savings/user123/goals \
  -H "Content-Type: application/json" \
  -d '{"name": "Emergency Fund", "targetAmount": 10000, "deadline": "2027-01-01"}'

# Add investment holding
curl -X POST http://localhost:4724/investments/user123/holdings \
  -H "Content-Type: application/json" \
  -d '{"symbol": "VOO", "shares": 10, "price": 420}'

# Get financial insights
curl http://localhost:4724/insights/user123

# Ask AI advisor
curl -X POST http://localhost:4724/insights/user123/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How should I allocate my savings?"}'
```

---

## 📈 Statistics

| Category | Count |
|----------|-------|
| Budget Categories | 10 |
| Expense Categories | 25+ |
| Savings Account Types | 8 |
| Asset Types | 8 |
| Goal Templates | 12 |
| Milestones per Goal | 5 |

---

## 📊 Data Models

### Budget
```javascript
{
  id: 'budget-xxx',
  monthlyIncome: 5000,
  categories: [
    { id: 'housing', name: 'Housing', amount: 1500, percent: 30, spent: 0 }
  ],
  totalAllocated: 5000,
  totalRemaining: 5000
}
```

### Financial Goal
```javascript
{
  id: 'goal-xxx',
  name: 'Emergency Fund',
  targetAmount: 10000,
  currentAmount: 3500,
  progress: 35,
  monthlyTarget: 500,
  deadline: '2027-01-01',
  milestones: [
    { amount: 2500, label: '25% - Foundation', achieved: true },
    { amount: 5000, label: '50% - Halfway', achieved: false }
  ]
}
```

### Portfolio
```javascript
{
  totalValue: 45000,
  totalGain: 5200,
  totalReturn: 13.1,
  allocation: [
    { type: 'stocks', value: 27000, percent: 60, gain: 4000 },
    { type: 'bonds', value: 13500, percent: 30, gain: 800 },
    { type: 'cash', value: 4500, percent: 10, gain: 0 }
  ]
}
```

---

## 🎯 Financial Health Indicators

| Score Range | Rating | Description |
|------------|--------|-------------|
| 90-100 | Excellent | Outstanding financial health |
| 75-89 | Good | Solid financial foundation |
| 60-74 | Fair | Room for improvement |
| 40-59 | Needs Work | Focus on key areas |
| 0-39 | Critical | Immediate action needed |

---

*Genie Money OS - Your Personal Financial Advisor*