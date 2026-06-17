# RTMN Cross-OS Integration Guide

**Version:** 1.0  
**Date:** June 17, 2026  
**Purpose:** Connect Workforce OS with all 24 Industry Operating Systems

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                    RTMN WORKFORCE OS - CROSS-ECOSYSTEM CONNECTOR                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│  │                   WORKFORCE OS (Port 5065)                                          │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │     │
│  │  │  Employees  │  │   Payroll   │  │  Benefits   │  │  Training   │      │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │     │
│  └─────────────────────────────────────────────────────────────────────────────────┘     │
│                                         │                                              │
│                                         ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│  │              CROSS-OS INTEGRATION HUB (Port 5085)                              │     │
│  │                                                                                  │     │
│  │  • Employee Registry Sync    • Skills Graph Bridge    • Compliance Bridge         │     │
│  │  • Payroll Bridge           • Training Bridge        • Analytics Bridge          │     │
│  └─────────────────────────────────────────────────────────────────────────────────┘     │
│                                         │                                              │
│          ┌───────────────────────────────┼───────────────────────────────┐              │
│          │                               │                               │              │
│          ▼                               ▼                               ▼              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐       │
│  │                    ALL 24 INDUSTRY OPERATING SYSTEMS                          │       │
│  │                                                                               │       │
│  │  Restaurant  ──┐                                                          │       │
│  │  Healthcare  ──┤                                                          │       │
│  │  Retail      ──┤                                                          │       │
│  │  Hotel       ──┼──► Employee Registry                                    │       │
│  │  Legal       ──┤     Skills Graph                                         │       │
│  │  Education   ──┤     Payroll Bridge                                       │       │
│  │  Automotive  ──┤     Training Sync                                        │       │
│  │  Beauty      ──┼──► Compliance Bridge                                     │       │
│  │  Fitness     ──┤     Performance Analytics                                │       │
│  │  RealEstate  ──┤                                                          │       │
│  │  Sales       ──┘                                                          │       │
│  │  Media       ──┐                                                          │       │
│  │  Travel     ──┼──────────────────────────────────────────────────────►       │       │
│  │  Gaming     ───┤                                                          │       │
│  │  Government ───┤                                                          │       │
│  │  HomeService ──┤                                                          │       │
│  │  Manufacturing ─┤                                                        │       │
│  │  NonProfit   ───┤                                                        │       │
│  │  Professional ──┤                                                        │       │
│  │  Sports     ────┤                                                        │       │
│  │  Entertainment ─┤                                                        │       │
│  │  Construction ──┤                                                        │       │
│  │  Financial   ───┤                                                        │       │
│  │  Transport  ────┘                                                        │       │
│  │                                                                               │       │
│  └───────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Patterns

### 1. Employee Registry Sync
When an employee is created/updated in Workforce OS, they are automatically provisioned across all relevant Industry OS services.

```
Workforce OS Employee Created
        │
        ▼
Cross-OS Integration Hub
        │
        ├──► Restaurant OS ──► Staff Registry
        ├──► Healthcare OS ──► Medical Staff
        ├──► Hotel OS ───────► Hotel Staff
        ├──► Retail OS ──────► Store Staff
        └──► ... (all relevant industries)
```

### 2. Role-Based Access
Industry OS services check employee roles from Workforce OS.

```javascript
// Industry OS checks Workforce OS for employee role
const employee = await fetch('http://localhost:5065/api/employees/' + employeeId);
const hasAccess = employee.department === 'Engineering' && employee.position === 'Manager';
```

### 3. Cross-Industry Skills
Skills learned in one industry can transfer to another.

```
Employee learns "Food Safety" in Restaurant OS
        │
        ▼
Skills synced to Workforce OS
        │
        ▼
Cross-OS Integration Hub identifies "Food Safety" is relevant for:
        ├──► Hotel OS (hospitality)
        ├──► Healthcare OS (dietary)
        └──► Retail OS (food retail)
```

### 4. Industry-Specific Payroll
Different compensation models per industry.

```javascript
// Restaurant: Hourly + Tips
{ type: 'hourly', rate: 15, includeTips: true }

// Healthcare: Salary + Shift Differential
{ type: 'salary', base: 80000, shiftDifferential: 5 }

// Sales: Base + Commission
{ type: 'salary_plus_commission', base: 50000, commission: 0.1 }

// Manufacturing: Hourly + Overtime
{ type: 'hourly', rate: 20, overtimeMultiplier: 1.5 }
```

### 5. Unified Compliance
Industry-specific certifications flow to Workforce OS for compliance tracking.

```
Healthcare OS ──► HIPAA Training ──► Cross-OS Hub ──► Workforce OS Compliance Dashboard
Restaurant OS ──► Food Safety ────► Cross-OS Hub ──► Workforce OS Compliance Dashboard
Manufacturing ──► OSHA Training ─► Cross-OS Hub ──► Workforce OS Compliance Dashboard
```

---

## Industry Integration Matrix

### All 24 Industries

| Industry | OS Port | Employee Type | Key Skills | Compliance |
|---------|---------|--------------|------------|------------|
| **Hospitality** | 5010 | restaurant_staff | food_preparation, bartending, customer_service | food_safety, hygiene |
| **Healthcare** | 5020 | medical_staff | patient_care, nursing, medical_coding | hipaa, medical_licensing |
| **Retail** | 5030 | retail_staff | pos_operations, inventory, merchandising | labor_laws |
| **Hotel** | 5025 | hotel_staff | front_desk, housekeeping, concierge | tourism, hospitality |
| **Legal** | 5035 | legal_professional | legal_research, litigation, contracts | bar_association |
| **Education** | 5060 | faculty | curriculum_design, instruction, research | ferpa, accreditation |
| **Automotive** | 5080 | automotive_technician | diagnostics, repair, certification | ase_certification |
| **Beauty** | 5090 | beauty_professional | hair_styling, skincare, makeup | cosmetology_license |
| **Fitness** | 5110 | fitness_professional | personal_training, group_fitness | certification |
| **Real Estate** | 5230 | real_estate_agent | property_sales, negotiation, marketing | real_estate_license |
| **Sales** | 5055 | sales_professional | crm, negotiation, account_management | sales_ethics |
| **Media** | 5600 | media_professional | content_creation, video_production | copyright |
| **Travel** | 5190 | travel_agent | destination_knowledge, booking_systems | iata, travel_licensing |
| **Gaming** | 5120 | gaming_professional | esports, streaming, community | esports_regulations |
| **Government** | 5130 | government_employee | public_administration, policy | civil_service |
| **Home Services** | 5140 | service_technician | hvac, plumbing, electrical | contractor_license |
| **Manufacturing** | 5150 | manufacturing_worker | machine_operation, quality_control | osha, iso |
| **Non-Profit** | 5160 | nonprofit_staff | fundraising, grant_writing | 501c3 |
| **Professional** | 5170 | consultant | consulting, project_management | contracts, nda |
| **Sports** | 5180 | athlete | sport_specific, teamwork | league_rules, anti_doping |
| **Entertainment** | 5200 | entertainment_professional | event_management, stage_crew | permits, safety |
| **Construction** | 5210 | construction_worker | construction, blueprint_reading | osha, building_codes |
| **Financial** | 5220 | financial_professional | financial_analysis, risk_management | sec, finra, sox |
| **Transport** | 5240 | driver | cdl, route_planning, vehicle_maintenance | dot, hours_of_service |

---

## API Integration Examples

### 1. Sync Employee to Multiple Industries

```bash
# Assign employee to Restaurant and Hotel industries
curl -X POST http://localhost:5085/api/employees/EMP001/assign \
  -H "Content-Type: application/json" \
  -d '{
    "industries": ["hospitality", "hotel"],
    "role": "Operations Manager"
  }'
```

### 2. Add Industry-Specific Skills

```bash
# Add food safety skills to employee
curl -X POST http://localhost:5085/api/employees/EMP001/skills \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "hospitality",
    "skills": ["food_safety", "hygiene", "culinary_arts"]
  }'
```

### 3. Get Cross-Industry Skills Gap

```bash
# Get skills gap for Hospitality industry
curl http://localhost:5085/api/industries/hospitality/skills-gap
```

Response:
```json
{
  "industry": "hospitality",
  "industryName": "Restaurant OS",
  "totalEmployees": 45,
  "skillsGap": {
    "food_safety": { "required": 45, "hasSkill": 40, "missing": 5, "coverage": "88.9" },
    "customer_service": { "required": 45, "hasSkill": 42, "missing": 3, "coverage": "93.3" },
    "bartending": { "required": 45, "hasSkill": 15, "missing": 30, "coverage": "33.3" }
  },
  "criticalGaps": [
    { "skill": "bartending", "coverage": "33.3" }
  ]
}
```

### 4. Record Training Completion

```bash
# Record food safety certification
curl -X POST http://localhost:5085/api/employees/EMP001/training \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "hospitality",
    "training": {
      "name": "Food Safety Certificate",
      "skills": ["food_safety", "hygiene"],
      "validUntil": "2027-06-17"
    }
  }'
```

### 5. Get Unified Workforce Analytics

```bash
# Get workforce analytics across all industries
curl http://localhost:5085/api/analytics/workforce
```

Response:
```json
{
  "totalEmployees": 250,
  "byIndustry": {
    "hospitality": { "name": "Restaurant OS", "employeeCount": 45 },
    "healthcare": { "name": "Healthcare OS", "employeeCount": 38 },
    "retail": { "name": "Retail OS", "employeeCount": 52 },
    ...
  },
  "complianceRate": "87.5"
}
```

---

## Implementation Guide

### Step 1: Deploy Cross-OS Integration Hub

```bash
cd industry-os/services/cross-os-integration
npm install
npm start
# Runs on port 5085
```

### Step 2: Configure Industry OS Services

Each Industry OS needs to add the Cross-OS Integration Hub as a dependency:

```javascript
// In each Industry OS (e.g., restaurant-os)
const CROSS_OS_URL = process.env.CROSS_OS_URL || 'http://localhost:5085';

// On employee creation in Industry OS
async function createEmployee(employeeData) {
  // Create locally
  const employee = await Employee.create(employeeData);

  // Sync to Workforce OS
  await fetch(`${WORKFORCE_OS_URL}/api/employees`, {
    method: 'POST',
    body: JSON.stringify(employeeData)
  });

  // Sync to Cross-OS Hub
  await fetch(`${CROSS_OS_URL}/api/employees/${employee.id}/assign`, {
    method: 'POST',
    body: JSON.stringify({
      industries: ['hospitality'],
      role: employeeData.position
    })
  });

  return employee;
}
```

### Step 3: Add Skills Sync

```javascript
// When employee completes training in Industry OS
async function completeTraining(employeeId, trainingData) {
  // Record locally
  const training = await Training.create(trainingData);

  // Sync skills to Cross-OS Hub
  await fetch(`${CROSS_OS_URL}/api/employees/${employeeId}/skills`, {
    method: 'POST',
    body: JSON.stringify({
      industry: 'hospitality',
      skills: trainingData.skills
    })
  });

  return training;
}
```

### Step 4: Configure Compliance Sync

```javascript
// When compliance certification is obtained
async function recordCompliance(employeeId, complianceData) {
  await fetch(`${CROSS_OS_URL}/api/employees/${employeeId}/compliance`, {
    method: 'POST',
    body: JSON.stringify({
      industry: 'hospitality',
      compliance: complianceData
    })
  });
}
```

---

## Use Cases

### Use Case 1: Employee Transfer Between Industries

```
Scenario: Employee moves from Restaurant to Hotel

1. Update in Workforce OS:
   POST /api/employees/EMP001/assign { "industries": ["hotel"] }

2. Cross-OS Hub syncs:
   - Hotel OS receives employee data
   - Skills "food_safety", "customer_service" recognized as transferable
   - Compliance "food_safety" carries over

3. Result: Employee ready for Hotel OS with transferred credentials
```

### Use Case 2: Cross-Industry Skills Development

```
Scenario: Identify employees who can work in multiple hospitality industries

1. Query Cross-OS Hub:
   GET /api/analytics/talent-pool

2. Response:
   [{
     "employeeId": "EMP005",
     "industries": ["hospitality", "hotel", "travel"],
     "crossIndustrySkills": ["customer_service", "food_safety", "event_management"],
     "recommendation": "Ideal for cross-functional projects"
   }]

3. Deploy to: Event management role spanning all 3 industries
```

### Use Case 3: Compliance Dashboard

```
Scenario: CEO wants to see compliance across all industries

1. Query Cross-OS Hub:
   GET /api/industries/healthcare/compliance-dashboard
   GET /api/industries/hospitality/compliance-dashboard
   GET /api/industries/manufacturing/compliance-dashboard

2. Aggregate in Workforce Intelligence (5073)

3. Display in CEO Dashboard
```

---

## Event-Driven Integration

### Events Published by Cross-OS Hub

| Event | Trigger | Payload |
|-------|---------|---------|
| `employee.industry.assigned` | Employee assigned to industry | employeeId, industries[] |
| `employee.skills.updated` | Skills added/removed | employeeId, industry, skills[] |
| `employee.compliance.updated` | Compliance status change | employeeId, industry, status |
| `employee.training.completed` | Training completed | employeeId, industry, training |
| `industry.skills_gap.detected` | Skills gap identified | industry, skill, gap% |

### Example Event Handler

```javascript
// In Workforce Intelligence (5073)
eventBus.subscribe('employee.training.completed', async (event) => {
  const { employeeId, industry, training } = event.data;

  // Update employee's training history
  await updateEmployeeTraining(employeeId, training);

  // If certification, update compliance
  if (training.certification) {
    await updateCompliance(employeeId, industry, {
      certification: training.name,
      validUntil: training.validUntil,
      status: 'compliant'
    });
  }

  // Sync skills to employee's profile
  await syncSkills(employeeId, training.skills);

  // Trigger workforce analytics update
  await recalculateWorkforceMetrics();
});
```

---

## Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  cross-os-integration:
    build: ./cross-os-integration
    ports:
      - "5085:5085"
    environment:
      - NODE_ENV=production
      - WORKFORCE_OS_URL=http://workforce-os:5065
    depends_on:
      - workforce-os
    networks:
      - rtmn-internal

  workforce-os:
    build: ./workforce-os
    ports:
      - "5065:5065"

networks:
  rtmn-internal:
    driver: bridge
```

### Render Deployment

Add to `render.yaml`:

```yaml
services:
  - name: rtmn-cross-os-integration
    region: singapore
    plan: starter
    repo: https://github.com/your-org/rtmn-services.git
    branch: main
    path: industry-os/services/cross-os-integration
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 5085
      - key: WORKFORCE_OS_URL
        fromService: rtmn-workforce-os
        envVarKey: RENDER_INTERNAL_HOSTNAME
        prefix: "http://"
        suffix: ":5065"
```

---

## Monitoring

### Health Checks

```bash
# Cross-OS Hub
curl http://localhost:5085/health

# Check connected industries
curl http://localhost:5085/status
```

### Key Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| `industries.connected` | Number of connected industry OS | 24 |
| `sync.latency` | Time to sync employee data | < 500ms |
| `compliance.rate` | Overall compliance rate | > 90% |
| `skills.gap.critical` | Critical skills gaps | < 5 |

---

*Last Updated: June 17, 2026*
