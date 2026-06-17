import mongoose, { Document, Schema } from 'mongoose';

export interface IBusinessHours extends Document {
  tenantId: string;
  branchId: mongoose.Types.ObjectId;
  schedule: {
    [day: string]: {
      isOpen: boolean;
      openTime?: string; // HH:mm format
      closeTime?: string;
      shifts?: Array<{
        openTime: string;
        closeTime: string;
        label?: string;
      }>;
    };
  };
  timezone: string;
  exceptions: Array<{
    date: Date;
    type: 'closed' | 'modified';
    openTime?: string;
    closeTime?: string;
    reason?: string;
    recurring?: boolean;
    recurrenceRule?: string; // RRULE format for recurring exceptions
  }>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const dayScheduleSchema = new Schema({
  isOpen: {
    type: Boolean,
    default: true,
  },
  openTime: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/,
  },
  closeTime: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/,
  },
  shifts: [{
    openTime: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    closeTime: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    label: String,
  }],
}, { _id: false });

const exceptionSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['closed', 'modified'],
    required: true,
  },
  openTime: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/,
  },
  closeTime: {
    type: String,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/,
  },
  reason: String,
  recurring: Boolean,
  recurrenceRule: String,
}, { _id: false });

const BusinessHoursSchema = new Schema<IBusinessHours>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      unique: true,
    },
    schedule: {
      monday: dayScheduleSchema,
      tuesday: dayScheduleSchema,
      wednesday: dayScheduleSchema,
      thursday: dayScheduleSchema,
      friday: dayScheduleSchema,
      saturday: dayScheduleSchema,
      sunday: dayScheduleSchema,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    exceptions: [exceptionSchema],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Default schedule configuration
BusinessHoursSchema.pre('save', function (next) {
  if (this.isNew) {
    const defaultSchedule: IBusinessHours['schedule'] = {
      monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      saturday: { isOpen: false },
      sunday: { isOpen: false },
    };
    this.schedule = defaultSchedule;
  }
  next();
});

BusinessHoursSchema.index({ tenantId: 1, branchId: 1 });

export const BusinessHours = mongoose.model<IBusinessHours>('BusinessHours', BusinessHoursSchema);
