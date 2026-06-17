import mongoose, { Document, Schema } from 'mongoose';

// Connection Status
export type ConnectionStatus = 'online' | 'offline' | 'degraded' | 'unknown';

// Alert Level
export type AlertLevel = 'none' | 'info' | 'warning' | 'critical';

// Interface for IoT Status Document
export interface IIoTStatus extends Document {
  // Multi-tenant support
  tenantId: string;

  // Reference to Asset
  assetId: string;

  // IoT Device Info
  iotDeviceId: string;
  deviceType?: string;
  manufacturer?: string;
  model?: string;
  firmware?: string;
  macAddress?: string;
  ipAddress?: string;

  // Connection Status
  connectionStatus: ConnectionStatus;
  lastConnected?: Date;
  lastDisconnected?: Date;
  uptime?: number;  // in seconds
  signalStrength?: number;  // dBm

  // Core Metrics (temperature, humidity, pressure, etc.)
  metrics?: {
    temperature?: number;       // Celsius
    humidity?: number;          // Percentage
    pressure?: number;         // Pascal or bar
    voltage?: number;          // Volts
    current?: number;          // Amperes
    power?: number;            // Watts
    frequency?: number;        // Hz
    vibration?: number;        // mm/s
    noise?: number;             // dB
    flow?: number;             // L/min or similar
    level?: number;            // Percentage or units
  };

  // Operational Metrics
  operational?: {
    runningHours?: number;
    cycleCount?: number;
    throughput?: number;
    efficiency?: number;       // Percentage
    utilization?: number;      // Percentage
    speed?: number;            // RPM or m/s
  };

  // Health Metrics
  health?: {
    overallHealth?: number;     // 0-100 score
    componentHealth?: Array<{
      component: string;
      health: number;
      status: string;
    }>;
    errorCount?: number;
    warningCount?: number;
  };

  // Performance Metrics
  performance?: {
    cpuUsage?: number;          // Percentage
    memoryUsage?: number;       // Percentage
    storageUsage?: number;      // Percentage
    networkLatency?: number;    // ms
    responseTime?: number;      // ms
  };

  // Location (if tracked via IoT)
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    accuracy?: number;
    lastUpdated?: Date;
  };

  // Alerts
  alerts?: {
    level: AlertLevel;
    message?: string;
    details?: string[];
    triggeredAt?: Date;
  };

  // Thresholds (configurable)
  thresholds?: {
    temperature?: { min: number; max: number };
    humidity?: { min: number; max: number };
    voltage?: { min: number; max: number };
    [key: string]: { min: number; max: number } | undefined;
  };

  // Data History (embedded for recent data)
  recentData?: Array<{
    timestamp: Date;
    metrics: Record<string, number>;
  }>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// IoT Status Schema
const IoTStatusSchema = new Schema<IIoTStatus>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    assetId: {
      type: String,
      required: true,
      index: true,
    },
    iotDeviceId: {
      type: String,
      required: true,
      unique: true,
    },
    deviceType: String,
    manufacturer: String,
    model: String,
    firmware: String,
    macAddress: String,
    ipAddress: String,
    connectionStatus: {
      type: String,
      enum: ['online', 'offline', 'degraded', 'unknown'],
      default: 'unknown',
    },
    lastConnected: Date,
    lastDisconnected: Date,
    uptime: Number,
    signalStrength: Number,
    metrics: {
      temperature: Number,
      humidity: Number,
      pressure: Number,
      voltage: Number,
      current: Number,
      power: Number,
      frequency: Number,
      vibration: Number,
      noise: Number,
      flow: Number,
      level: Number,
    },
    operational: {
      runningHours: Number,
      cycleCount: Number,
      throughput: Number,
      efficiency: Number,
      utilization: Number,
      speed: Number,
    },
    health: {
      overallHealth: Number,
      componentHealth: [
        {
          component: String,
          health: Number,
          status: String,
        },
      ],
      errorCount: Number,
      warningCount: Number,
    },
    performance: {
      cpuUsage: Number,
      memoryUsage: Number,
      storageUsage: Number,
      networkLatency: Number,
      responseTime: Number,
    },
    location: {
      latitude: Number,
      longitude: Number,
      altitude: Number,
      accuracy: Number,
      lastUpdated: Date,
    },
    alerts: {
      level: {
        type: String,
        enum: ['none', 'info', 'warning', 'critical'],
        default: 'none',
      },
      message: String,
      details: [String],
      triggeredAt: Date,
    },
    thresholds: {
      temperature: { min: Number, max: Number },
      humidity: { min: Number, max: Number },
      voltage: { min: Number, max: Number },
    },
    recentData: [
      {
        timestamp: Date,
        metrics: { type: Map, of: Number },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
IoTStatusSchema.index({ tenantId: 1, assetId: 1 });
IoTStatusSchema.index({ tenantId: 1, connectionStatus: 1 });
IoTStatusSchema.index({ tenantId: 1, 'alerts.level': 1 });
IoTStatusSchema.index({ tenantId: 1, iotDeviceId: 1 });

// Virtual for checking if device is online
IoTStatusSchema.virtual('isOnline').get(function () {
  return this.connectionStatus === 'online';
});

export const IoTStatus = mongoose.model<IIoTStatus>('IoTStatus', IoTStatusSchema);
