# RTNM-Group Architecture Diagrams

All diagrams are compatible with Mermaid (GitHub, Notion, VS Code Mermaid Preview, etc.)

---

## 1. System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Apps]
        Mobile[Mobile Apps]
        Admin[Admin Panels]
    end

    subgraph "RTNM-Group Services"
        Gateway[API Gateway<br/>Port 3000]
        Identity[REZ-identity-service<br/>Port 3003]
        AccessCtrl[REZ-access-control-service<br/>Port 3000]
        CentralPerm[REZ-central-permissions<br/>Port 3001]
        Capital[REZ-capital-service<br/>Port 3005]
        BNPL[REZ-bnpl-service<br/>Port 3080]
        Ledger[REZ-financial-ledger]
        PaymentLinks[rez-payment-links-service<br/>Port 4018]
        Compliance[REZ-compliance-platform]
        Ops[REZ-ops-dashboard<br/>Port 4032]
        Admin[rez-admin-service<br/>Port 4003]
    end

    subgraph "Infrastructure"
        MongoDB[(MongoDB Atlas)]
        Redis[(Redis Cloud)]
    end

    Web --> Gateway
    Mobile --> Gateway
    Admin --> Gateway

    Gateway --> Identity
    Gateway --> AccessCtrl
    Gateway --> Capital
    Gateway --> BNPL
    Gateway --> PaymentLinks

    Identity --> MongoDB
    Identity --> Redis
    Capital --> MongoDB
    BNPL --> MongoDB
    BNPL --> Redis
    Ledger --> MongoDB
    AccessCtrl --> Redis
    CentralPerm --> Redis
```

---

## 2. Identity Resolution Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant IdentityService
    participant IdentityGraph
    participant TrustScore
    participant FraudDetection
    participant MongoDB

    Client->>Gateway: POST /api/v1/resolve
    Gateway->>IdentityService: resolve(phone, email)
    IdentityService->>MongoDB: Find by hashIdentifier
    MongoDB-->>IdentityService: Identity found?
    IdentityService->>IdentityGraph: getCluster(clusterId)
    IdentityGraph-->>IdentityService: Cluster with links
    IdentityService->>TrustScore: calculateTrustScore()
    TrustScore-->>IdentityService: Score: 85 (HIGH)
    IdentityService->>FraudDetection: checkFraudIndicators()
    FraudDetection-->>IdentityService: Risk: LOW
    IdentityService-->>Gateway: UnifiedProfile
    Gateway-->>Client: { clusterId, trustScore, riskLevel }
```

---

## 3. Loan Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> Pending: loan.apply()

    Pending --> Approved: credit.check() >= 550
    Pending --> Rejected: credit.check() < 550
    Approved --> Disbursed: loans.disburse()
    Disbursed --> Repaid: All EMIs paid
    Disbursed --> Overdue: EMI due date passed
    Overdue --> Repaid: Late payment received
    Overdue --> Defaulted: 30+ days overdue

    Rejected --> [*]
    Defaulted --> [*]
    Repaid --> [*]
```

---

## 4. BNPL Processing Flow

```mermaid
flowchart TD
    A[User selects BNPL] --> B{Credit Score >= 700?}
    B -->|Yes| C[Auto-Approve]
    B -->|No| D[Manual Review]
    C --> E[Calculate EMI]
    D --> E
    E --> F[Generate Schedule]
    F --> G[EMI 1 Due]
    G --> H{Payment Received?}
    H -->|Yes| I[Mark Paid]
    I --> J[EMI 2 Due]
    J --> H
    H -->|No| K[Wait 7 days]
    K --> L{Overdue?}
    L -->|Yes| M[Apply Late Fee ₹50/day]
    L -->|No| J
    M --> N[Max ₹500 cap]
    N --> J
    I --> O{All EMIs Paid?}
    O -->|Yes| P[Status: PAID]
    O -->|No| J
```

---

## 5. Access Control Decision Flow

```mermaid
flowchart TD
    A[Access Request] --> B{RBAC Check}
    B -->|Allowed| C[Return: ALLOW]
    B -->|Denied| D{ABAC Policy Check}
    D -->|DENY Policy| E[Return: DENY]
    D -->|ALLOW Policy| C
    D -->|No Match| F[Custom Policy Check]
    F -->|Allow| C
    F -->|Deny| E
    F -->|No Match| G[Return: DENY<br/>Default Deny]
```

---

## 6. Service Dependency Graph

```mermaid
graph LR
    subgraph "RTNM-Group"
        A[API Gateway] --> B[Identity Service]
        A --> C[Access Control]
        A --> D[Capital Service]
        A --> E[BNPL Service]
        A --> F[Payment Links]
    end

    subgraph "RABTUL-Technologies"
        B --> G[Auth Service]
        D --> H[Payment Service]
        D --> I[Wallet Service]
        E --> H
        F --> H
    end

    subgraph "REZ-Intelligence"
        B --> J[Identity Graph]
        A --> K[Intent Graph]
        A --> L[Event Bus]
    end

    G --> M[(MongoDB)]
    H --> M
    I --> M
    J --> M
    K --> N[(Redis)]
    L --> N
```

---

## 7. Database Schema Relationships

```mermaid
erDiagram
    CLUSTER ||--o{ IDENTITY : contains
    CLUSTER ||--|| TRUST_SCORE : has
    CLUSTER ||--o| FRAUD_PROFILE : has
    IDENTITY ||--o| IDENTITY_LINK : linked_to

    LOAN ||--o| REPAYMENT : has
    MERCHANT_HEALTH ||--o{ LOAN : provides_credit
    LOAN ||--|| NBFC_PARTNER : disbursed_by

    BNPL_APPLICATION ||--o| EMI_SCHEDULE : has
    USER ||--o{ BNPL_APPLICATION : has

    FEATURE_FLAG ||--o| AUDIT_LOG : logged_in

    classDef primary fill:#e1f5fe
    classDef secondary fill:#f3e5f5
    classDef tertiary fill:#fff3e0

    class CLUSTER primary
    class IDENTITY primary
    class TRUST_SCORE secondary
    class FRAUD_PROFILE secondary
    class LOAN secondary
    class MERCHANT_HEALTH tertiary
    class BNPL_APPLICATION tertiary
    class FEATURE_FLAG tertiary
```

---

## 8. Rate Limiting Architecture

```mermaid
graph TB
    Request[Incoming Request] --> IP[Extract IP]
    IP --> Redis[(Redis)]
    Redis --> |SCAN ratelimit:123.45.*| Bucket[Rate Limit Bucket]
    Bucket --> |Count| Check{Count < Limit?}
    Check -->|Yes| Allowed[✓ Allowed]
    Check -->|No| Rejected[✗ 429 Too Many Requests]
    Allowed --> Headers[Set Headers]
    Headers --> X1[X-RateLimit-Limit: 100]
    Headers --> X2[X-RateLimit-Remaining: 99]
    Headers --> X3[X-RateLimit-Reset: 1705312200]

    Rejected --> X4[Retry-After: 60]
```

---

## 9. Multi-Tenant Architecture

```mermaid
graph TB
    subgraph "Multi-Tenant Isolation"
        subgraph "Tenant A (Merchant)"
            A_DB[(MongoDB<br/>merchant_a)]
            A_Redis[(Redis<br/>tenant_a)]
            A_Service[Service Instance A]
        end

        subgraph "Tenant B (Enterprise)"
            B_DB[(MongoDB<br/>merchant_b)]
            B_Redis[(Redis<br/>tenant_b)]
            B_Service[Service Instance B]
        end

        subgraph "Tenant C (Consumer)"
            C_DB[(MongoDB<br/>consumer)]
            C_Redis[(Redis<br/>consumer)]
            C_Service[Service Instance C]
        end
    end

    Gateway[API Gateway] --> TenantResolver[Tenant Resolver]
    TenantResolver --> |merchant_a| A_Service
    TenantResolver --> |merchant_b| B_Service
    TenantResolver --> |consumer| C_Service

    A_Service --> A_DB
    A_Service --> A_Redis
    B_Service --> B_DB
    B_Service --> B_Redis
    C_Service --> C_DB
    C_Service --> C_Redis
```

---

## 10. Security Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant WAF
    participant RateLimit
    participant Auth
    participant Service
    participant DB

    Client->>WAF: HTTPS Request
    WAF->>WAF: Check headers, block malicious
    WAF->>RateLimit: Forward
    RateLimit->>RateLimit: Check Redis bucket
    RateLimit->>Auth: Token valid?
    Auth->>Auth: JWT.verify(token)
    Auth->>Service: Authenticated Request
    Service->>DB: Query with tenant filter
    DB-->>Service: Result
    Service-->>Auth: Response
    Auth-->>RateLimit: Response
    RateLimit-->>WAF: Response
    WAF-->>Client: Final Response
```

---

## 11. Event-Driven Architecture

```mermaid
flowchart LR
    subgraph Publishers
        P1[Payment Service]
        P2[Identity Service]
        P3[Capital Service]
        P4[BNPL Service]
    end

    subgraph EventBus[REZ-event-bus<br/>Redis Pub/Sub]
        Channel1[events.payment.*]
        Channel2[events.identity.*]
        Channel3[events.loan.*]
        Channel4[events.bnpl.*]
    end

    subgraph Subscribers
        S1[Notification Service]
        S2[Analytics Service]
        S3[Fraud Detection]
        S4[Intent Graph]
    end

    P1 -->|publish| Channel1
    P2 -->|publish| Channel2
    P3 -->|publish| Channel3
    P4 -->|publish| Channel4

    Channel1 -->|subscribe| S1
    Channel1 -->|subscribe| S3
    Channel2 -->|subscribe| S4
    Channel3 -->|subscribe| S2
    Channel4 -->|subscribe| S1
    Channel4 -->|subscribe| S3
```

---

## 12. Deployment Architecture

```mermaid
graph TB
    subgraph "Cloudflare"
        DNS[DNS + CDN]
        WAF[WAF + DDoS Protection]
        SSL[SSL Termination]
    end

    subgraph "Render Cloud"
        subgraph "Web Tier"
            WebApps[Next.js Apps<br/>Vercel Edge]
        end

        subgraph "API Tier"
            Gateway[API Gateway]
            Services[RTNM Services<br/>Auto-scaling]
        end

        subgraph "Worker Tier"
            Workers[BullMQ Workers]
            Cron[Cron Jobs]
        end
    end

    subgraph "Data Tier"
        MongoDB[(MongoDB Atlas<br/>Cluster)]
        Redis[(Redis Cloud<br/>Enterprise)]
        S3[(S3 Buckets)]
    end

    DNS --> WAF
    WAF --> SSL
    SSL --> WebApps
    SSL --> Gateway
    Gateway --> Services
    Services --> Workers
    Workers --> Cron
    Services --> MongoDB
    Services --> Redis
    Services --> S3
```

---

## 13. Data Flow for Payment Processing

```mermaid
flowchart TD
    A[Order Created] --> B[Create Payment Link]
    B --> C[Generate UPI QR Code]
    C --> D[User Scans QR]
    D --> E[UPI App Opens]
    E --> F[User Confirms]
    F --> G[Razorpay Webhook]
    G --> H{Verify Signature}
    H -->|Valid| I[Update Payment Status]
    H -->|Invalid| J[Reject - Log Fraud]
    I --> K[Credit Merchant Wallet]
    K --> L[Notify User]
    L --> M[Update Order Status]
    M --> N[Trigger Analytics]
    N --> O[Send Intent to AI]
```

---

## 14. Credit Scoring Algorithm

```mermaid
flowchart TD
    A[Start: Credit Request] --> B[Get Merchant Health]
    B --> C{Record exists?}
    C -->|No| D[Create default record]
    C -->|Yes| E[Calculate Factors]

    subgraph "Revenue Factor (0-20 pts)"
    E1[Monthly Revenue<br/>₹50K = max] --> E
    end

    subgraph "Order Factor (0-15 pts)"
    E2[Order Count<br/>500 = max] --> E
    end

    subgraph "Payment History (+/-20 pts)"
    E3[On-time ratio] --> E
    end

    subgraph "Defaults (-30 max)"
    E4[Default count] --> E
    end

    D --> E
    E --> F[Sum all factors<br/>Clamp 0-100]

    F --> G{Health Score >= 50?}
    G -->|Yes| H[Credit Score += 100]
    G -->|No| I[Credit Score += 0]
    H --> J[Calculate Risk Rating]
    I --> J
    J --> K{>= 700 = LOW<br/>550-699 = MEDIUM<br/>< 550 = HIGH}
    K --> L[Return Result]
```

---

## 15. Failover & Recovery

```mermaid
flowchart LR
    subgraph Primary
        P1[Primary Pod] --> P2[MongoDB Primary]
    end

    subgraph Replica
        R1[Replica Pod 1]
        R2[Replica Pod 2]
        R3[Replica Pod 3]
    end

    subgraph "Health Check"
        HC[Health Monitor]
    end

    HC -.->|ping| P1
    HC -.->|ping| R1
    HC -.->|ping| R2
    HC -.->|ping| R3

    P1 -.->|replicate| R1
    P1 -.->|replicate| R2
    P1 -.->|replicate| R3

    P1 -->|Fail| HC
    HC -->|Promote| R1
    R1 -->|New Primary| NewPrimary[Primary Pod]
```
