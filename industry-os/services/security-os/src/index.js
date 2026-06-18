/**
 * RTMN Security OS
 * AI-powered security and access control
 *
 * Port: 5270
 *
 * Features:
 * - CCTV AI Analytics
 * - Face Recognition
 * - Digital Access Control
 * - Emergency Alerts
 * - Incident Management
 * - Visitor Verification
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5270;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// ============================================
// IN-MEMORY DATA STORES
// ============================================

const cameras = new Map();
const accessPoints = new Map();
const visitors = new Map();
const incidents = new Map();
const employees = new Map();
const accessLogs = new Map();
const alerts = new Map();
const zones = new Map();

// Initialize with sample data
function initData() {
  // Cameras
  const cameraLocations = ['Lobby', 'Entrance', 'Parking', 'Corridor', 'Lift', 'Restaurant', 'Pool', 'Gym', 'Back Entrance', 'Server Room'];
  cameraLocations.forEach((loc, i) => {
    const camera = {
      id: `CAM${String(i + 1).padStart(3, '0')}`,
      name: `${loc} Camera`,
      location: loc,
      zone: i < 5 ? 'public' : 'restricted',
      status: 'online',
      type: i === 9 ? 'thermal' : 'standard',
      resolution: '4K',
      nightVision: true,
      lastMotion: new Date().toISOString(),
      alerts: []
    };
    cameras.set(camera.id, camera);
  });

  // Access Points
  const accessTypes = ['Door', 'Gate', 'Lift', 'Turnstile', 'Parking'];
  for (let i = 1; i <= 15; i++) {
    const accessPoint = {
      id: `AP${String(i).padStart(3, '0')}`,
      name: `${accessTypes[i % 5]} ${i}`,
      location: ['Main Entrance', 'Lobby', 'Floor 1', 'Floor 2', 'Parking', 'Emergency Exit'][i % 6],
      type: accessTypes[i % 5],
      status: 'locked',
      lastAccess: new Date().toISOString(),
      accessCount: Math.floor(Math.random() * 100)
    };
    accessPoints.set(accessPoint.id, accessPoint);
  }

  // Employees
  const sampleEmployees = [
    { id: 'EMP001', name: 'John Manager', role: 'manager', accessLevel: 5 },
    { id: 'EMP002', name: 'Jane Staff', role: 'staff', accessLevel: 3 },
    { id: 'EMP003', name: 'Bob Security', role: 'security', accessLevel: 5 },
    { id: 'EMP004', name: 'Alice Housekeeping', role: 'housekeeping', accessLevel: 2 },
  ];
  sampleEmployees.forEach(emp => {
    emp.faceId = `FACE_${emp.id}`;
    emp.photo = `https://example.com/photos/${emp.id}.jpg`;
    employees.set(emp.id, emp);
  });

  // Zones
  const zoneList = [
    { id: 'Z001', name: 'Public Area', level: 1, description: 'Lobby, Reception, Parking' },
    { id: 'Z002', name: 'Guest Floors', level: 2, description: 'Guest rooms, Corridors' },
    { id: 'Z003', name: 'Staff Area', level: 3, description: 'Back office, Kitchen' },
    { id: 'Z004', name: 'Restricted', level: 4, description: 'Server Room, Safe, Manager Office' },
    { id: 'Z005', name: 'Emergency', level: 5, description: 'Fire Exit, Emergency Stairs' },
  ];
  zoneList.forEach(z => zones.set(z.id, z));

  // Sample visitors
  const visitorList = [
    { id: 'V001', name: 'Guest: Robert Smith', checkIn: '2026-06-18T10:00:00Z', checkOut: '2026-06-20T10:00:00Z', room: '301', status: 'checked_in' },
    { id: 'V002', name: 'Visitor: Alice Johnson', checkIn: '2026-06-18T14:00:00Z', purpose: 'Meeting', host: 'John Manager', status: 'expected' },
    { id: 'V003', name: 'Delivery: FedEx', checkIn: '2026-06-18T09:00:00Z', purpose: 'Delivery', status: 'completed' },
  ];
  visitorList.forEach(v => visitors.set(v.id, v));

  console.log(`   Cameras: ${cameras.size}`);
  console.log(`   Access Points: ${accessPoints.size}`);
  console.log(`   Employees: ${employees.size}`);
  console.log(`   Visitors: ${visitors.size}`);
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'security-os',
    version: '1.0.0',
    port: PORT,
    capabilities: [
      'CCTV AI Analytics', 'Face Recognition', 'Access Control',
      'Emergency Alerts', 'Visitor Management', 'Incident Response'
    ],
    timestamp: new Date().toISOString()
  });
});

// ============================================
// CCTV & CAMERAS
// ============================================

app.get('/api/cameras', (req, res) => {
  const { zone, status, type } = req.query;
  let list = Array.from(cameras.values());
  if (zone) list = list.filter(c => c.zone === zone);
  if (status) list = list.filter(c => c.status === status);
  if (type) list = list.filter(c => c.type === type);
  res.json({ success: true, count: list.length, cameras: list });
});

app.get('/api/cameras/:id', (req, res) => {
  const camera = cameras.get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  res.json({ success: true, camera });
});

app.put('/api/cameras/:id/control', (req, res) => {
  const { status, settings } = req.body;
  const camera = cameras.get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  if (status) camera.status = status;
  if (settings) Object.assign(camera, settings);

  cameras.set(req.params.id, camera);
  res.json({ success: true, camera });
});

// AI Analytics
app.get('/api/cameras/:id/analytics', (req, res) => {
  const camera = cameras.get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  res.json({
    success: true,
    camera: camera.id,
    analytics: {
      motionDetected: Math.random() > 0.5,
      lastMotion: new Date().toISOString(),
      facesDetected: Math.floor(Math.random() * 3),
      objectsDetected: ['person', 'bag', 'vehicle'],
      crowdDensity: Math.floor(Math.random() * 20),
      unusualActivity: Math.random() > 0.8,
      confidence: 85 + Math.random() * 15
    },
    alerts: camera.alerts
  });
});

// Live stream simulation
app.get('/api/cameras/:id/stream', (req, res) => {
  const camera = cameras.get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  res.json({
    success: true,
    stream: {
      url: `rtsp://camera.local/${camera.id}/live`,
      status: 'active',
      resolution: camera.resolution,
      fps: 30,
      latency: '50ms'
    }
  });
});

// ============================================
// FACE RECOGNITION
// ============================================

app.post('/api/face/register', (req, res) => {
  const { employeeId, name, photo, accessLevel } = req.body;

  if (!employeeId) return res.status(400).json({ error: 'Employee ID required' });

  const faceId = `FACE_${employeeId}`;
  const employee = {
    id: employeeId,
    name: name || 'Unknown',
    faceId,
    photo,
    accessLevel: accessLevel || 1,
    registered: new Date().toISOString(),
    status: 'active'
  };

  employees.set(employeeId, employee);

  res.json({
    success: true,
    employee,
    message: 'Face registered successfully'
  });
});

app.post('/api/face/recognize', (req, res) => {
  const { cameraId, image } = req.body;

  // Simulate face recognition
  const matched = employees.size > 0 ? Array.from(employees.values())[Math.floor(Math.random() * employees.size)] : null;

  res.json({
    success: true,
    recognition: {
      detected: true,
      match: matched ? {
        employeeId: matched.id,
        name: matched.name,
        confidence: 85 + Math.random() * 15,
        accessLevel: matched.accessLevel,
        recognized: true
      } : null,
      unknownFaces: matched ? 0 : 1,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/faces', (req, res) => {
  const list = Array.from(employees.values());
  res.json({ success: true, count: list.length, faces: list });
});

// ============================================
// ACCESS CONTROL
// ============================================

app.get('/api/access', (req, res) => {
  const { type, status, zone } = req.query;
  let list = Array.from(accessPoints.values());
  if (type) list = list.filter(a => a.type === type);
  if (status) list = list.filter(a => a.status === status);
  if (zone) list = list.filter(a => a.zone === zone);
  res.json({ success: true, count: list.length, accessPoints: list });
});

app.get('/api/access/:id', (req, res) => {
  const point = accessPoints.get(req.params.id);
  if (!point) return res.status(404).json({ error: 'Access point not found' });
  res.json({ success: true, accessPoint: point });
});

app.post('/api/access/:id/unlock', (req, res) => {
  const { reason, employeeId } = req.body;
  const point = accessPoints.get(req.params.id);
  if (!point) return res.status(404).json({ error: 'Access point not found' });

  point.status = 'unlocked';
  point.lastAccess = new Date().toISOString();
  point.accessCount++;

  // Log access
  const log = {
    id: `LOG${accessLogs.size + 1}`,
    accessPoint: point.id,
    action: 'unlock',
    reason,
    employeeId,
    timestamp: new Date().toISOString()
  };
  accessLogs.set(log.id, log);

  accessPoints.set(point.id, point);

  res.json({ success: true, accessPoint: point, log });
});

app.post('/api/access/:id/lock', (req, res) => {
  const point = accessPoints.get(req.params.id);
  if (!point) return res.status(404).json({ error: 'Access point not found' });

  point.status = 'locked';
  accessPoints.set(point.id, point);

  res.json({ success: true, accessPoint: point });
});

// Access by face
app.post('/api/access/face-verify', (req, res) => {
  const { faceId, accessPointId } = req.body;

  const employee = Array.from(employees.values()).find(e => e.faceId === faceId);
  const point = accessPoints.get(accessPointId);

  if (!employee || !point) {
    return res.status(404).json({ success: false, error: 'Employee or access point not found' });
  }

  const granted = employee.accessLevel >= 3;
  const log = {
    id: `LOG${accessLogs.size + 1}`,
    accessPoint: point.id,
    action: granted ? 'granted' : 'denied',
    method: 'face',
    employeeId: employee.id,
    timestamp: new Date().toISOString()
  };
  accessLogs.set(log.id, log);

  if (granted) {
    point.status = 'unlocked';
    point.lastAccess = new Date().toISOString();
    point.accessCount++;
    accessPoints.set(point.id, point);
  }

  res.json({
    success: true,
    access: {
      granted,
      employee: { id: employee.id, name: employee.name },
      accessPoint: { id: point.id, name: point.name },
      log
    }
  });
});

app.get('/api/access/logs', (req, res) => {
  const { date, employeeId, accessPointId } = req.query;
  let logs = Array.from(accessLogs.values()).reverse();
  if (date) logs = logs.filter(l => l.timestamp.startsWith(date));
  if (employeeId) logs = logs.filter(l => l.employeeId === employeeId);
  if (accessPointId) logs = logs.filter(l => l.accessPoint === accessPointId);
  res.json({ success: true, count: logs.length, logs: logs.slice(0, 100) });
});

// ============================================
// VISITOR MANAGEMENT
// ============================================

app.get('/api/visitors', (req, res) => {
  const { status } = req.query;
  let list = Array.from(visitors.values());
  if (status) list = list.filter(v => v.status === status);
  res.json({ success: true, count: list.length, visitors: list });
});

app.post('/api/visitors', (req, res) => {
  const { name, phone, email, purpose, host, checkIn, checkOut, room } = req.body;
  const id = `V${String(visitors.size + 1).padStart(3, '0')}`;

  const visitor = {
    id,
    name,
    phone,
    email,
    purpose: purpose || 'General Visit',
    host,
    room,
    checkIn,
    checkOut,
    status: 'expected',
    registered: new Date().toISOString()
  };

  visitors.set(id, visitor);

  // Generate QR Code
  visitor.qrCode = `https://api.qrcode.com/${id}.png`;

  res.json({ success: true, visitor });
});

app.post('/api/visitors/:id/checkin', (req, res) => {
  const visitor = visitors.get(req.params.id);
  if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

  visitor.status = 'checked_in';
  visitor.actualCheckIn = new Date().toISOString();

  visitors.set(visitor.id, visitor);

  res.json({ success: true, visitor });
});

app.post('/api/visitors/:id/checkout', (req, res) => {
  const visitor = visitors.get(req.params.id);
  if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

  visitor.status = 'checked_out';
  visitor.checkOut = new Date().toISOString();

  visitors.set(visitor.id, visitor);

  res.json({ success: true, visitor });
});

// ============================================
// INCIDENTS & ALERTS
// ============================================

app.get('/api/incidents', (req, res) => {
  const { severity, status, type } = req.query;
  let list = Array.from(incidents.values()).reverse();
  if (severity) list = list.filter(i => i.severity === severity);
  if (status) list = list.filter(i => i.status === status);
  if (type) list = list.filter(i => i.type === type);
  res.json({ success: true, count: list.length, incidents: list });
});

app.post('/api/incidents', (req, res) => {
  const { type, severity, location, description, reportedBy } = req.body;
  const id = `INC${String(incidents.size + 1).padStart(4, '0')}`;

  const incident = {
    id,
    type,
    severity: severity || 'medium',
    location,
    description,
    reportedBy,
    status: 'open',
    created: new Date().toISOString(),
    assignedTo: null,
    notes: []
  };

  incidents.set(id, incident);

  // Auto-create alert for high severity
  if (severity === 'high' || severity === 'critical') {
    const alert = {
      id: `ALT${alerts.size + 1}`,
      type: 'incident',
      severity,
      message: `${type}: ${description}`,
      location,
      incidentId: id,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    alerts.set(alert.id, alert);
  }

  res.json({ success: true, incident });
});

app.put('/api/incidents/:id/status', (req, res) => {
  const { status, notes, assignedTo } = req.body;
  const incident = incidents.get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  incident.status = status;
  if (notes) incident.notes.push({ text: notes, timestamp: new Date().toISOString() });
  if (assignedTo) incident.assignedTo = assignedTo;

  incidents.set(incident.id, incident);

  res.json({ success: true, incident });
});

app.get('/api/alerts', (req, res) => {
  const { severity, acknowledged } = req.query;
  let list = Array.from(alerts.values()).reverse();
  if (severity) list = list.filter(a => a.severity === severity);
  if (acknowledged !== undefined) list = list.filter(a => a.acknowledged === (acknowledged === 'true'));
  res.json({ success: true, count: list.length, alerts: list });
});

app.put('/api/alerts/:id/acknowledge', (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  alerts.set(alert.id, alert);

  res.json({ success: true, alert });
});

// ============================================
// EMERGENCY MANAGEMENT
// ============================================

app.get('/api/emergency/status', (req, res) => {
  res.json({
    success: true,
    status: 'normal',
    activeEmergency: null,
    evacuation: false,
    lastDrill: '2026-06-01',
    nextDrill: '2026-09-01',
    emergencyContacts: [
      { type: 'Fire', number: '101' },
      { type: 'Police', number: '100' },
      { type: 'Ambulance', number: '102' },
      { type: 'Security', number: '999' }
    ]
  });
});

app.post('/api/emergency/trigger', (req, res) => {
  const { type, location, severity } = req.body;

  const emergency = {
    id: `EMG${Date.now()}`,
    type,
    location,
    severity,
    triggered: new Date().toISOString(),
    status: 'active',
    actions: []
  };

  // Trigger alerts
  const alert = {
    id: `ALT${alerts.size + 1}`,
    type: 'emergency',
    severity: severity || 'critical',
    message: `EMERGENCY: ${type} at ${location}`,
    location,
    timestamp: new Date().toISOString(),
    acknowledged: false
  };
  alerts.set(alert.id, alert);

  res.json({
    success: true,
    emergency,
    alert,
    actions: [
      'Security notified',
      'CCTV recording enhanced',
      'Access points locked',
      'Emergency services contacted'
    ]
  });
});

app.post('/api/emergency/evacuate', (req, res) => {
  const { zones } = req.body;

  // Lock all access points
  accessPoints.forEach((point, id) => {
    point.status = 'locked';
    accessPoints.set(id, point);
  });

  res.json({
    success: true,
    evacuation: {
      status: 'initiated',
      zonesAffected: zones || 'all',
      assemblyPoints: ['Parking Lot A', 'Garden Area'],
      estimatedTime: '5 minutes'
    },
    accessPointsLocked: accessPoints.size
  });
});

// ============================================
// ZONES
// ============================================

app.get('/api/zones', (req, res) => {
  const list = Array.from(zones.values());
  res.json({ success: true, count: list.length, zones: list });
});

app.get('/api/zones/:id', (req, res) => {
  const zone = zones.get(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  const zoneCameras = Array.from(cameras.values()).filter(c => c.zone === req.params.id);
  const zoneAccess = Array.from(accessPoints.values()).filter(a => a.zone === req.params.id);

  res.json({ success: true, zone, cameras: zoneCameras, accessPoints: zoneAccess });
});

// ============================================
// DASHBOARD
// ============================================

app.get('/api/dashboard', (req, res) => {
  const onlineCameras = Array.from(cameras.values()).filter(c => c.status === 'online').length;
  const lockedAccess = Array.from(accessPoints.values()).filter(a => a.status === 'locked').length;
  const activeVisitors = Array.from(visitors.values()).filter(v => v.status === 'checked_in').length;
  const openIncidents = Array.from(incidents.values()).filter(i => i.status === 'open').length;
  const unacknowledgedAlerts = Array.from(alerts.values()).filter(a => !a.acknowledged).length;

  res.json({
    success: true,
    overview: {
      cameras: { total: cameras.size, online: onlineCameras },
      accessPoints: { total: accessPoints.size, locked: lockedAccess },
      visitors: { checkedIn: activeVisitors, expected: 5 },
      incidents: { open: openIncidents, today: incidents.size },
      alerts: { unacknowledged: unacknowledgedAlerts }
    },
    securityScore: 85 + Math.random() * 15,
    riskLevel: 'low',
    lastIncident: incidents.size > 0 ? Array.from(incidents.values())[incidents.size - 1] : null
  });
});

// ============================================
// START
// ============================================

initData();

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║           SECURITY OS - AI-POWERED SECURITY              ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  FEATURES:                                             ║`);
  console.log(`║  ✅ CCTV AI Analytics                                 ║`);
  console.log(`║  ✅ Face Recognition                                  ║`);
  console.log(`║  ✅ Access Control                                   ║`);
  console.log(`║  ✅ Visitor Management                                ║`);
  console.log(`║  ✅ Emergency Alerts                                  ║`);
  console.log(`║  ✅ Incident Response                                ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\n  Try: curl http://localhost:${PORT}/api/dashboard`);
  console.log(`       curl http://localhost:${PORT}/api/cameras`);
  console.log(`       curl http://localhost:${PORT}/api/access`);
});

module.exports = app;
