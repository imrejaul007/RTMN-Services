import mongoose, { Schema } from 'mongoose';
import { IVoiceCall, VoiceCallStatus, VoiceCallDirection } from '../types';

const voiceCallSchema = new Schema<IVoiceCall>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    callSid: {
      type: String,
      sparse: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'] as VoiceCallDirection[],
      required: true,
    },
    from: {
      type: String,
      required: true,
      maxlength: [20, 'From number cannot exceed 20 characters'],
    },
    to: {
      type: String,
      required: true,
      maxlength: [20, 'To number cannot exceed 20 characters'],
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      sparse: true,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      sparse: true,
    },
    agent: {
      type: String,
      enum: ['receptionist', 'nurse', 'care_manager', 'custom'] as const[],
      default: 'receptionist',
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'in_progress', 'completed', 'failed', 'missed', 'busy', 'no_answer'] as VoiceCallStatus[],
      default: 'initiated',
      index: true,
    },
    duration: {
      type: Number,
      min: 0,
    },
    recordingUrl: {
      type: String,
      maxlength: [500, 'Recording URL cannot exceed 500 characters'],
    },
    transcript: {
      type: String,
      maxlength: [10000, 'Transcript cannot exceed 10000 characters'],
    },
    summary: {
      type: String,
      maxlength: [1000, 'Summary cannot exceed 1000 characters'],
    },
    intent: {
      type: String,
      maxlength: [200, 'Intent cannot exceed 200 characters'],
    },
    entities: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
voiceCallSchema.index({ clinicId: 1, status: 1, createdAt: -1 });
voiceCallSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
voiceCallSchema.index({ callSid: 1 }, { sparse: true });
voiceCallSchema.index({ createdAt: -1 });

// Virtual for call duration formatted
voiceCallSchema.virtual('formattedDuration').get(function () {
  if (!this.duration) return '0:00';
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

// Pre-save hook to set startedAt
voiceCallSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'in_progress' && !this.startedAt) {
    this.startedAt = new Date();
  }
  if (['completed', 'failed', 'missed', 'busy', 'no_answer'].includes(this.status) && !this.endedAt) {
    this.endedAt = new Date();
  }
  next();
});

// Method to update call duration
voiceCallSchema.methods.updateDuration = async function () {
  if (this.startedAt && this.endedAt) {
    this.duration = Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
    await this.save();
  }
};

// Static method to get call statistics
voiceCallSchema.statics.getCallStats = async function (clinicId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
  const stats = await this.aggregate([
    {
      $match: {
        clinicId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
      },
    },
  ]);

  const result = {
    total: 0,
    byStatus: {} as Record<string, { count: number; totalDuration: number }>,
    averageDuration: 0,
  };

  let totalDuration = 0;
  for (const stat of stats) {
    result.byStatus[stat._id] = { count: stat.count, totalDuration: stat.totalDuration || 0 };
    result.total += stat.count;
    totalDuration += stat.totalDuration || 0;
  }

  result.averageDuration = result.total > 0 ? Math.round(totalDuration / result.total) : 0;

  return result;
};

// Static method to find active calls
voiceCallSchema.statics.findActiveCalls = function (clinicId: mongoose.Types.ObjectId) {
  return this.find({
    clinicId,
    status: { $in: ['initiated', 'ringing', 'in_progress'] },
  });
};

export const VoiceCall = mongoose.model<IVoiceCall>('VoiceCall', voiceCallSchema);
export default VoiceCall;
