import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { Employee, EmployeeStatus } from '../types/index.js';

// ============================================================================
// MONGOOSE SCHEMA
// ============================================================================

const EmployeeSchema = new Schema<Employee>(
  {
    id: { type: String, required: true, unique: true, default: uuid },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    role: { type: String, required: true, maxlength: 100 },
    description: { type: String },
    avatar: { type: String },
    capabilities: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(EmployeeStatus),
      default: EmployeeStatus.OFFLINE
    },
    metadata: { type: Schema.Types.Mixed },
    skills: { type: [String], default: [] },
    languages: { type: [String], default: ['en'] },
    workingHours: {
      start: { type: String, match: /^\d{2}:\d{2}$/ },
      end: { type: String, match: /^\d{2}:\d{2}$/ },
      timezone: { type: String, default: 'Asia/Kolkata' }
    }
  },
  { timestamps: true }
);

// Compound indexes
EmployeeSchema.index({ tenantId: 1, status: 1 });
EmployeeSchema.index({ tenantId: 1, capabilities: 1 });
EmployeeSchema.index({ tenantId: 1, role: 1 });

let EmployeeModel: Model<Employee>;

try {
  EmployeeModel = mongoose.model<Employee>('CommInterfaceEmployee');
} catch {
  EmployeeModel = mongoose.model<Employee>('CommInterfaceEmployee', EmployeeSchema);
}

// ============================================================================
// EMPLOYEE REGISTRY
// ============================================================================

export interface EmployeeRegistration {
  tenantId: string;
  name: string;
  role: string;
  description?: string;
  avatar?: string;
  capabilities?: string[];
  skills?: string[];
  languages?: string[];
  workingHours?: {
    start: string;
    end: string;
    timezone?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface EmployeeUpdate {
  name?: string;
  role?: string;
  description?: string;
  avatar?: string;
  capabilities?: string[];
  skills?: string[];
  languages?: string[];
  workingHours?: {
    start: string;
    end: string;
    timezone?: string;
  };
  metadata?: Record<string, unknown>;
}

class EmployeeRegistry {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure indexes
    await EmployeeModel.ensureIndexes();
    this.initialized = true;

    console.log('[EmployeeRegistry] Initialized');
  }

  async register(data: EmployeeRegistration): Promise<Employee> {
    const employee = new EmployeeModel({
      ...data,
      id: uuid(),
      status: EmployeeStatus.OFFLINE
    });

    await employee.save();
    return employee.toObject();
  }

  async findById(id: string, tenantId: string): Promise<Employee | null> {
    return EmployeeModel.findOne({ id, tenantId }).lean() as Promise<Employee | null>;
  }

  async findByRole(tenantId: string, role: string): Promise<Employee[]> {
    return EmployeeModel.find({ tenantId, role }).lean() as Promise<Employee[]>;
  }

  async findByCapability(tenantId: string, capability: string): Promise<Employee[]> {
    return EmployeeModel.find({
      tenantId,
      capabilities: { $in: [capability] }
    }).lean() as Promise<Employee[]>;
  }

  async findByStatus(tenantId: string, status: EmployeeStatus): Promise<Employee[]> {
    return EmployeeModel.find({ tenantId, status }).lean() as Promise<Employee[]>;
  }

  async findAvailable(tenantId: string): Promise<Employee[]> {
    return EmployeeModel.find({
      tenantId,
      status: { $in: [EmployeeStatus.ONLINE, EmployeeStatus.AVAILABLE] }
    }).lean() as Promise<Employee[]>;
  }

  async listByTenant(tenantId: string): Promise<Employee[]> {
    return EmployeeModel.find({ tenantId }).lean() as Promise<Employee[]>;
  }

  async update(id: string, tenantId: string, updates: EmployeeUpdate): Promise<Employee | null> {
    const employee = await EmployeeModel.findOneAndUpdate(
      { id, tenantId },
      { $set: updates },
      { new: true }
    ).lean() as Employee | null;

    return employee;
  }

  async updateStatus(id: string, tenantId: string, status: EmployeeStatus): Promise<Employee | null> {
    return this.update(id, tenantId, { status } as EmployeeUpdate);
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await EmployeeModel.deleteOne({ id, tenantId });
    return result.deletedCount > 0;
  }

  async countByTenant(tenantId: string): Promise<number> {
    return EmployeeModel.countDocuments({ tenantId });
  }

  async countByStatus(tenantId: string): Promise<Record<EmployeeStatus, number>> {
    const results = await EmployeeModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts: Record<string, number> = {
      [EmployeeStatus.ONLINE]: 0,
      [EmployeeStatus.OFFLINE]: 0,
      [EmployeeStatus.BUSY]: 0,
      [EmployeeStatus.AWAY]: 0
    };

    for (const result of results) {
      counts[result._id] = result.count;
    }

    return counts as Record<EmployeeStatus, number>;
  }

  /**
   * Find the best available employee based on skills and availability
   */
  async findBestMatch(
    tenantId: string,
    requiredSkills: string[],
    preferredRole?: string
  ): Promise<Employee | null> {
    const query: Record<string, unknown> = {
      tenantId,
      status: { $in: [EmployeeStatus.ONLINE, EmployeeStatus.AVAILABLE] }
    };

    if (preferredRole) {
      query.role = preferredRole;
    }

    if (requiredSkills.length > 0) {
      query.capabilities = { $all: requiredSkills };
    }

    // Sort by number of matching skills (descending) and availability
    const employees = await EmployeeModel.aggregate([
      { $match: query },
      {
        $addFields: {
          skillMatchCount: {
            $size: {
              $setIntersection: ['$capabilities', requiredSkills]
            }
          }
        }
      },
      { $sort: { skillMatchCount: -1, updatedAt: 1 } },
      { $limit: 1 }
    ]);

    return employees.length > 0 ? (employees[0] as unknown as Employee) : null;
  }
}

export const employeeRegistry = new EmployeeRegistry();
