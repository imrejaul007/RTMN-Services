# Smart Building Manager — Product Specification

**Version:** 1.0  
**Date:** June 28, 2026  
**Product:** P1 (Phase 3)  
**Estimated Build:** ₹40L / 7 weeks  
**ARR Potential:** ₹1.8Cr

---

## 1. Concept & Vision

**What it is:** An AI-powered building management system that connects IoT devices, optimizes energy consumption, predicts maintenance needs, and provides real-time occupancy analytics for commercial real estate.

**What it does:**
- Centralized control of all building systems (HVAC, lighting, security, elevators)
- Real-time energy monitoring and optimization
- Predictive maintenance to reduce equipment failures
- Occupancy analytics for space optimization
- Tenant experience management

**The feeling:** Like having a digital building manager that never sleeps — constantly optimizing, predicting problems before they happen, and keeping tenants comfortable while reducing costs.

---

## 2. Problem Statement

- Commercial buildings waste 30% energy due to inefficient operations
- 50% of equipment failures cause disruptions (preventable with prediction)
- Space utilization averages only 40-60% despite full leases
- Manual building management requires large operations teams
- Tenant complaints about comfort are reactive, not proactive

---

## 3. Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART BUILDING MANAGER                          │
├─────────────────────────────────────────────────────────────────┤
│  IOT GATEWAY LAYER                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ HVAC    │ │ Lighting│ │ Security│ │ Elevator│ │ Energy │ │
│  │ Sensors │ │ Controls│ │ Cameras │ │ Systems │ │ Meters │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬────┘ │
│       └────────────┴───────────┴───────────┴───────────┘        │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   BUILDING TWIN CORE                         │ │
│  │  Energy │ Maintenance │ Occupancy │ Comfort │ Security      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    AI OPTIMIZATION LAYER                     │ │
│  │  Demand Response │ Fault Detection │ Predictive Maintenance  │ │
│  │  Occupancy Forecasting │ Comfort Optimization                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    DASHBOARD & APPS                         │ │
│  │  Building Manager │ Tenant App │ Owner Portal               │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Core Features

### 4.1 Energy Management (P0)

| Feature | Description |
|---------|-------------|
| Real-time Monitoring | kWh, kW, power factor per zone/equipment |
| Cost Allocation | Divide energy costs by tenant/square footage |
| Peak Load Management | Auto-shed non-critical loads during peaks |
| Demand Response | Participate in utility DR programs |
| Solar Integration | Monitor rooftop solar generation |
| Carbon Tracking | Real-time CO2 emissions calculation |

**Energy Dashboard Metrics:**
- Total consumption (kWh)
- Cost (₹) with trend
- Peak demand (kW)
- Carbon footprint (kg CO2)
- Energy per sq ft
- Comparison to benchmark

### 4.2 Predictive Maintenance (P0)

**Monitored Equipment:**
- HVAC compressors and fans
- Elevator motors and controls
- Fire protection systems
- Water pumps
- Electrical panels
- Generators

**ML Models:**
```
Equipment Health = f(sensor_data, historical_failures, age, usage_patterns)

Indicators Monitored:
├── Vibration patterns (bearing wear)
├── Temperature trends (overheating)
├── Current draw (motor stress)
├── Runtime hours (usage-based wear)
└── Error codes (diagnostic data)

Prediction Types:
├── Remaining Useful Life (RUL) - days until failure
├── Anomaly Detection - unusual patterns
├── Degradation Trends - gradual decline
└── Maintenance Window - optimal service time
```

### 4.3 Occupancy Analytics (P0)

| Feature | Description |
|---------|-------------|
| Occupancy Heatmaps | Real-time density by zone |
| Space Utilization | % usage by floor/room |
| Peak Hours | When spaces are most/least used |
| Desk Booking | Reserve desks in advance |
| Room Scheduling | Book meeting rooms |
| Visitor Management | Pre-approve visitors |

**Analytics Views:**
- Building-wide occupancy rate
- Floor-by-floor comparison
- Room utilization percentage
- Desk utilization trends
- Average occupancy by hour/day
- Underutilized space identification

### 4.4 Comfort Optimization (P0)

**Climate Zones:**
- Per-floor or per-zone temperature control
- Air quality monitoring (CO2, PM2.5, humidity)
- Lighting level automation
- Occupancy-based climate control

**AI Comfort Model:**
```
Comfort Score = f(temperature, humidity, CO2, light_level, noise)

Target: Maximize comfort while minimizing energy
Trade-off: 1% comfort decrease = 5% energy savings
```

### 4.5 Security & Access (P1)

- Badge access control
- CCTV with AI analytics
- Fire alarm integration
- Perimeter security
- Visitor pre-registration
- Emergency response protocols

### 4.6 Tenant Experience (P1)

**Mobile App Features:**
- Temperature control requests
- Maintenance requests
- Visitor pass issuance
- Amenity booking (gym, parking)
- Service requests
- Bill payment
- Community announcements

---

## 5. AI Agents

### 5.1 Energy Optimization Agent
- Analyzes usage patterns continuously
- Recommends scheduling optimizations
- Executes demand response automatically
- Predicts energy costs for next month
- Suggests efficiency investments

### 5.2 Maintenance Predictor Agent
- Monitors all equipment health
- Generates work orders automatically
- Prioritizes by urgency and impact
- Schedules vendors
- Tracks completion and costs

### 5.3 Occupancy Forecast Agent
- Predicts future occupancy
- Optimizes HVAC/lighting schedules
- Identifies underutilized spaces
- Recommends layout changes
- Supports hybrid work policies

### 5.4 Comfort Manager Agent
- Learns tenant preferences
- Adjusts climate proactively
- Alerts before discomfort occurs
- Balances comfort vs. energy
- Handles complaints efficiently

---

## 6. Data Model

```typescript
interface BuildingTwin {
  id: string;
  buildingId: string;
  owner: string;
  address: string;
  
  // Physical Structure
  structure: {
    totalFloors: number;
    totalArea: number;           // sq ft
    zones: Zone[];
    commonAreas: Area[];
  };
  
  // Equipment Registry
  equipment: {
    hvac: HVACEquipment[];
    electrical: ElectricalEquipment[];
    plumbing: PlumbingEquipment[];
    elevators: Elevator[];
    fire: FireSafetyEquipment[];
  };
  
  // Energy Data
  energy: {
    meters: SmartMeter[];
    solarPanels?: SolarInstallation;
    bills: EnergyBill[];
    tariffs: Tariff[];
  };
  
  // Occupancy
  occupancy: {
    capacity: number;
    current: number;
    history: OccupancySnapshot[];
    bookings: SpaceBooking[];
  };
  
  // AI Models
  models: {
    energyForecast: MLModel;
    maintenancePredictor: MLModel;
    occupancyForecast: MLModel;
    comfortOptimizer: MLModel;
  };
  
  // Real-time State
  state: {
    temperature: ZoneReading[];
    humidity: ZoneReading[];
    airQuality: ZoneReading[];
    energyCurrent: EnergyReading[];
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface Zone {
  id: string;
  name: string;
  floor: number;
  type: 'office' | 'common' | 'utility' | 'amenity';
  area: number;
  temperature: number;
  humidity: number;
  occupancy: number;
  capacity: number;
}

interface SmartMeter {
  id: string;
  type: 'main' | 'tenant' | 'equipment';
  location: string;
  currentReading: number;
  lastSync: Date;
  dailyUsage: number[];
  monthlyCost: number;
}

interface MaintenanceWorkOrder {
  id: string;
  equipmentId: string;
  type: 'preventive' | 'predictive' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  description: string;
  predictedFailure?: Date;
  actualCost?: number;
  assignedVendor?: string;
  scheduledDate?: Date;
  completedDate?: Date;
}
```

---

## 7. API Endpoints

### Building Management
```
GET/POST          /api/buildings
GET                /api/buildings/:id
GET/PUT            /api/buildings/:id/settings
GET                /api/buildings/:id/zones
PUT                /api/buildings/:id/zones/:zoneId
```

### Energy Management
```
GET                /api/buildings/:id/energy
GET                /api/buildings/:id/energy/consumption
GET                /api/buildings/:id/energy/costs
GET                /api/buildings/:id/energy/carbon
POST               /api/buildings/:id/energy/demand-response
GET                /api/buildings/:id/energy/forecasts
```

### Equipment & Maintenance
```
GET                /api/buildings/:id/equipment
GET                /api/buildings/:id/equipment/:equipmentId
GET                /api/buildings/:id/equipment/:equipmentId/health
GET                /api/buildings/:id/maintenance/work-orders
POST               /api/buildings/:id/maintenance/work-orders
PUT                /api/buildings/:id/maintenance/work-orders/:id
GET                /api/buildings/:id/maintenance/predictions
```

### Occupancy
```
GET                /api/buildings/:id/occupancy
GET                /api/buildings/:id/occupancy/realtime
GET                /api/buildings/:id/occupancy/history
GET                /api/buildings/:id/occupancy/forecasts
POST               /api/buildings/:id/bookings
GET                /api/buildings/:id/bookings/:bookingId
```

### IoT Integration
```
POST               /api/iot/sensors/data
GET                /api/iot/devices
POST               /api/iot/devices/:deviceId/commands
GET                /api/iot/zones/:zoneId/state
PUT                /api/iot/zones/:zoneId/climate
```

### AI Insights
```
GET                /api/ai/buildings/:id/recommendations
GET                /api/ai/equipment/:id/failure-prediction
GET                /api/ai/energy/:id/optimization
GET                /api/ai/occupancy/:id/forecasting
```

### Tenant APIs
```
POST               /api/tenants/:tenantId/maintenance-request
POST               /api/tenants/:tenantId/visitor-pass
GET                /api/tenants/:tenantId/consumption
POST               /api/tenants/:tenantId/feedback
```

---

## 8. IoT Device Integration

### 8.1 Supported Protocols

| Protocol | Use Case | Devices |
|----------|----------|---------|
| BACnet | HVAC, Lighting | Thermostats, AHUs, VAVs |
| Modbus | Electrical, Meters | Power meters, panel sensors |
| KNX | Building automation | Lights, blinds, HVAC |
| Zigbee | Wireless sensors | Temperature, occupancy |
| MQTT | Real-time data | All IoT devices |
| REST | Smart devices | Cameras, access control |

### 8.2 Device Categories

**Climate Control:**
- Smart thermostats
- VAV controllers
- AHU monitoring
- Zone sensors (temp, humidity, CO2)
- Air quality monitors

**Lighting:**
- Smart LED fixtures
- Occupancy sensors
- Daylight sensors
- Dimmer switches

**Electrical:**
- Smart meters
- Panel monitors
- Solar inverters
- Generator monitors

**Security:**
- Access card readers
- CCTV cameras
- Motion sensors
- Fire alarms
- Door/window sensors

**Elevators:**
- Elevator controllers
- Passenger displays
- Destination dispatch

---

## 9. Dashboard Screens

### 9.1 Building Manager Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Building Command Center                    [Building: Tower A]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Energy Today          │  Occupancy      │  Active Alerts       │
│  ┌─────────────────┐   │  ┌───────────┐  │  ┌───────────────┐  │
│  │  1,245 kWh     │   │  │  78%      │  │  │ ⚠️ 2 critical │  │
│  │  ₹8,520        │   │  │  312/400  │  │  │ 🔴 5 warning  │  │
│  │  ↓ 12% vs ydy │   │  │  ↑ 5%     │  │  │ 🟡 12 info    │  │
│  └─────────────────┘   │  └───────────┘  │  └───────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  FLOOR MAP - LIVE OCCUPANCY                                ││
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               ││
│  │  │ 85% │ │ 92% │ │ 45% │ │ 78% │ │ 60% │  Floor 1-5   ││
│  │  │  F5 │ │  F4 │ │  F3 │ │  F2 │ │  F1 │               ││
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Equipment Health           │  Energy Breakdown                  │
│  ┌───────────────────────┐  │  ┌───────────────────────────┐  │
│  │ ● HVAC Unit 1: Good  │  │  │ HVAC      ████████ 45%   │  │
│  │ ● HVAC Unit 2: Fair  │  │  │ Lighting  ████     25%   │  │
│  │ ● Elevator A: Good   │  │  │ Elevators ██       12%   │  │
│  │ ⚠️ Pump 3: Attention │  │  │ Other     █████   18%   │  │
│  │ ✓ All systems OK     │  │  └───────────────────────────┘  │
│  └───────────────────────┘  │                                 │
│                              │  [View All Equipment]          │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Owner Portal

```
┌─────────────────────────────────────────────────────────────────┐
│  Building Owner Dashboard                    [All Buildings: 3]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Portfolio Summary                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ Tower A      │ │ Plaza B     │ │ Campus C     │           │
│  │ ₹12.5L/mo   │ │ ₹8.2L/mo   │ │ ₹15.8L/mo   │           │
│  │ 92% occupied │ │ 78% occupied │ │ 85% occupied │           │
│  │ 18 days EUI │ │ 24 days EUI │ │ 16 days EUI │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                 │
│  Portfolio Energy          │  ROI on Efficiency                 │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐  │
│  │ This Month: ₹36.5L  │  │  │ Investment: ₹25L            │  │
│  │ vs Last: ₹42.1L    │  │  │ Annual Savings: ₹8.2L        │  │
│  │ Savings: ₹5.6L (13%)│ │  │ Payback: 3.1 years          │  │
│  └─────────────────────┘  │  └─────────────────────────────┘  │
│                                                                 │
│  [Energy Trends]  [Maintenance Costs]  [Tenant Satisfaction] │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Energy savings | 20-30% |
| Maintenance cost reduction | 25% |
| Equipment downtime | -40% |
| Tenant satisfaction | +20 points |
| Occupancy utilization | +15% |
| Carbon reduction | 30% |
| Response time (complaints) | -50% |

---

## 11. Tech Stack

| Layer | Technology |
|-------|------------|
| IoT Gateway | Node-RED, Mosquitto |
| Backend | Node.js + TypeScript |
| Database | TimescaleDB, PostgreSQL |
| Cache | Redis |
| ML | TensorFlow, scikit-learn |
| Visualization | Grafana, D3.js |
| Mobile | React Native |

---

## 12. Team & Timeline

| Role | Count |
|------|-------|
| Tech Lead (IoT) | 1 |
| IoT Engineer | 1 |
| Backend Developer | 1 |
| ML Engineer | 1 |
| Frontend Developer | 1 |

**Duration:** 7 weeks  
**Investment:** ₹40L

---

## 13. Go-to-Market

### Phase 1: Pilot (Month 1-2)
- 1 building, 50,000 sq ft
- Full IoT installation
- 3-month data collection

### Phase 2: Expansion (Month 3-5)
- 5 buildings
- Standardized IoT packages
- Owner portal launch

### Phase 3: Scale (Month 5-7)
- 20 buildings
- Multi-building portfolio view
- Franchise model for property managers

### Revenue Model
- SaaS per sq ft/month: ₹0.50-1.50
- IoT hardware margin: 20-30%
- Implementation fee: ₹5-15L per building
- Energy savings share: 10-20% of savings

---

*Spec created: June 28, 2026*
