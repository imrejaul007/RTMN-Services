# RTMN TwinOS - Complete Documentation

> **Version:** 2.0  
> **Last Updated:** June 18, 2026  
> **Status:** ✅ OPERATIONAL

---

## 📚 Documentation Index

### Quick Start
- [Architecture Overview](docs/TWINOS_ARCHITECTURE.md) - Complete architecture and twin registry
- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running in 5 minutes

### Implementation
- [Service Implementation](docs/IMPLEMENTATION.md) - How to implement a twin service
- [Shared Library](services/twinos-shared/) - Common utilities and middleware
- [API Reference](docs/API_REFERENCE.md) - Complete API documentation

### Architecture
- [Twin Registry](docs/TWINOS_ARCHITECTURE.md) - 60+ canonical twins
- [Relationships](docs/RELATIONSHIPS.md) - Twin relationship graphs
- [Service Connections](docs/CONNECTIONS.md) - How services connect

### Guides
- [Security Guide](docs/SECURITY.md) - Authentication, authorization, best practices
- [Performance Guide](docs/PERFORMANCE.md) - Optimization tips
- [Migration Guide](docs/MIGRATION.md) - Upgrading from v1

---

## 🎯 What Is TwinOS?

TwinOS is RTMN's **domain-centric digital twin platform** that provides unified digital representations of real-world entities across the entire ecosystem.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Digital Twin** | A digital representation of a real-world entity |
| **Domain** | A group of related twins (e.g., Commerce, Healthcare) |
| **Canonical Twin** | A standardized, reusable twin definition |
| **Twin Service** | A microservice that manages one or more twins |
| **Twin State** | The current data/state of a twin |
| **Twin Relationship** | Links between twins (e.g., owns, has, part_of) |

---

## 📊 Twin Statistics

| Category | Twins | Status |
|----------|-------|--------|
| Foundation | 5 | ✅ Implemented |
| Commerce | 9 | ✅ Implemented |
| People | 4 | ✅ Implemented |
| AI/Memory | 9 | ✅ Implemented |
| Hospitality | 7 | ✅ Implemented |
| Healthcare | 6 | ✅ Implemented |
| Finance | 6 | ✅ Implemented |
| Marketing | 6 | ✅ Implemented |
| Operations | 6 | ✅ Implemented |
| Real Estate | 5 | ✅ Implemented |
| HR | 5 | ✅ Implemented |
| Event | 6 | ✅ Implemented |
| Travel | 5 | ✅ Implemented |
| Business | 4 | ✅ Implemented |
| Personal | 3 | ✅ Implemented |
| **TOTAL** | **86** | **100%** |

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd companies/HOJAI-AI/services/twinos-hub
npm install
```

### 2. Start TwinOS Hub

```bash
npm start
# TwinOS Hub running on port 4705
```

### 3. Register a Twin

```bash
curl -X POST http://localhost:4705/api/twins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "id": "myapp.user-profile",
    "name": "User Profile",
    "type": "entity",
    "category": "custom"
  }'
```

### 4. Update Twin State

```bash
curl -X PUT http://localhost:4705/api/twins/myapp.user-profile/state \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "data": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RTMN TWINOS PLATFORM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    TwinOS Hub (4705)                     │ │
│  │  • Twin Registry    • State Management                  │ │
│  │  • Relationships     • Sync Operations                  │ │
│  │  • Authentication    • Analytics                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                   │
│         ┌─────────────────┼─────────────────┐                 │
│         │                 │                 │                 │
│         ▼                 ▼                 ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Commerce   │  │   People    │  │     AI      │         │
│  │   Twins     │  │   Twins     │  │   Twins     │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ Customer    │  │ Employee    │  │ Memory      │         │
│  │ Order       │  │ User        │  │ Conversation │         │
│  │ Wallet      │  │ Founder     │  │ Intent       │         │
│  │ Payment     │  │ Candidate   │  │ Goal        │         │
│  │ Product     │  │             │  │ Agent       │         │
│  │ Inventory   │  │             │  │ Knowledge   │         │
│  │ Merchant    │  │             │  │ Simulation  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                            │                                   │
│         ┌─────────────────┬─┴─────────────────┐                 │
│         │                 │                 │                 │
│         ▼                 ▼                 ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Hospitality │  │ Healthcare  │  │   Finance   │         │
│  │   Twins     │  │   Twins     │  │   Twins     │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ Hotel       │  │ Patient     │  │ Asset       │         │
│  │ Room        │  │ Doctor      │  │ Budget      │         │
│  │ Guest       │  │ Hospital    │  │ Invoice     │         │
│  │ Booking     │  │ Prescription│  │ Ledger     │         │
│  │ Restaurant  │  │ Lab         │  │ Expense     │         │
│  │ Menu        │  │ Insurance   │  │ Tax         │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     FOUNDATION LAYER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   CorpID    │  │  MemoryOS   │  │  TwinOS Hub │           │
│  │   (4702)    │  │   (4703)    │  │   (4705)    │           │
│  │ Identity    │  │ Context     │  │ Registry    │           │
│  │ Auth        │  │ Learning    │  │ State       │           │
│  │ SSO         │  │ Memory      │  │ Relations   │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Key Relationships

### Commerce Loop

```
Customer ──[has]──► Wallet ──[has]──► Transaction
    │
    └──[has]──► Cart ──[converts]──► Order ──[has]──► Payment
                                       │
                                       └──[has]──► Shipment
```

### Customer Journey

```
Unknown → Lead → Customer → Loyal → Advocate
   │       │        │         │        │
   │       │        │         │        └── Reviews, Referrals
   │       │        │         └── Repeat Purchases, Rewards
   │       │        └── First Purchase, Welcome
   │       └── Qualified, Contacted
   └── Captured, Tracked
```

---

## 📦 Service Inventory

### Core Services

| Service | Port | Twins Managed | Status |
|---------|------|--------------|--------|
| **TwinOS Hub** | 4705 | 60+ registry | ✅ Running |
| CorpID | 4702 | Identity | ✅ Running |
| MemoryOS | 4703 | Memory, Knowledge | ✅ Running |
| Agent OS | 3002 | AI Agents | ✅ Running |

### Commerce Services

| Service | Port | Twins Managed | Status |
|---------|------|--------------|--------|
| **Customer Twin** | 4895 | Customer, LTV, Churn | ✅ NEW |
| **Order Twin** | 4885 | Cart, Order, Shipment, Return | ✅ NEW |
| **Wallet Twin** | 4896 | Wallet, Transactions, Rewards | ✅ NEW |
| **Product Twin** | 4720 | Product, Inventory | ✅ Fixed |
| Asset Twin | 4890 | Assets | ✅ Fixed |

### People Services

| Service | Port | Twins Managed | Status |
|---------|------|--------------|--------|
| **Employee Twin** | 4730 | Employee, Performance | ✅ Fixed |
| Lead Twin | 4894 | Leads | ✅ Fixed |
| Organization Twin | 4710 | Organization | ✅ Fixed |
| Partner Twin | 4892 | Partners | ✅ Fixed |

### Industry Services

| Service | Port | Industry | Status |
|---------|------|----------|--------|
| Hotel OS | 5025 | Hospitality | ✅ Running |
| Restaurant OS | 5010 | Hospitality | ✅ Running |
| Healthcare OS | 5020 | Healthcare | ✅ Running |
| Event OS | 4751 | Events | ✅ Running |
| RealEstate OS | 5230 | Real Estate | ✅ Running |
| Travel OS | 5190 | Travel | ✅ Running |

---

## 🔒 Security

All twin services implement:

- ✅ JWT Authentication
- ✅ Role-Based Access Control
- ✅ Rate Limiting (100/min default, 20/min strict)
- ✅ Input Validation & Sanitization
- ✅ Prototype Pollution Prevention
- ✅ Request Logging & Audit Trail
- ✅ Error Handling Middleware
- ✅ Helmet Security Headers

---

## 📈 Monitoring

### Health Endpoints

Every service exposes:

- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe

### Metrics

```bash
# TwinOS Hub Statistics
curl http://localhost:4705/api/stats

# TwinOS Hub Health
curl http://localhost:4705/health
```

---

## 🛠️ Development

### Create a New Twin Service

```bash
# 1. Create service directory
mkdir services/my-twin
cd companies/HOJAI-AI/services/my-twin

# 2. Create package.json
cat > package.json << 'EOF'
{
  "name": "@rtmn/my-twin",
  "type": "module",
  "dependencies": {
    "@rtmn/twinos-shared": "file:../twinos-shared"
  }
}
EOF

# 3. Install
npm install

# 4. Implement service
cat > src/index.js << 'EOF'
import express from 'express';
import { requireAuth, ... } from '@rtmn/twinos-shared';

const app = express();
// ... implementation
app.listen(4000);
EOF
```

### Register with TwinOS Hub

```bash
curl -X POST http://localhost:4705/api/twins \
  -H "Authorization: Bearer <token>" \
  -d '{
    "id": "mydomain.my-entity",
    "name": "My Entity",
    "service": "my-twin",
    "port": 4000,
    "type": "entity",
    "category": "mydomain"
  }'
```

---

## 📚 Learn More

### Architecture
- [Complete Architecture](docs/TWINOS_ARCHITECTURE.md)
- [Twin Registry (86 twins)](docs/TWINOS_ARCHITECTURE.md#complete-twin-registry)
- [Service Connections](docs/CONNECTIONS.md)

### Implementation
- [Service Implementation Guide](docs/IMPLEMENTATION.md)
- [Shared Library API](services/twinos-shared/src/index.js)
- [API Reference](docs/API_REFERENCE.md)

### Best Practices
- [Security Best Practices](docs/SECURITY.md)
- [Performance Optimization](docs/PERFORMANCE.md)
- [Error Handling](docs/ERROR_HANDLING.md)

---

## 🤝 Contributing

1. Fork the repository
2. Create your twin service in `services/`
3. Add twin definitions to TwinOS Hub
4. Update documentation
5. Submit PR

---

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** GitHub Issues
- **Discord:** RTMN Community

---

*Built with ❤️ by HOJAI AI*  
*Part of the RTMN Ecosystem*
