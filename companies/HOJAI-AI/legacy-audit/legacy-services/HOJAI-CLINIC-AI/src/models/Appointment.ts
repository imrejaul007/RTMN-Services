import mongoose, { Schema } from 'mongoose';
import { IAppointment, AppointmentStatus, AppointmentType } from '../types';

const appointmentSchema = new Schema<IAppointment>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient is required'],
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Appointment date is required'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time in HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time in HH:MM format'],
    },
    type: {
      type: String,
      enum: ['consultation', 'follow_up', 'procedure', 'teleconsult', 'emergency'] as AppointmentType[],
      default: 'consultation',
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as AppointmentStatus[],
      default: 'scheduled',
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason for appointment is required'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    vitals: {
      temperature: { type: Number, min: 35, max: 45 },
      bloodPressure: {
        systolic: { type: Number, min: 60, max: 250 },
        diastolic: { type: Number, min: 40, max: 150 },
      },
      pulse: { type: Number, min: 30, max: 220 },
      weight: { type: Number, min: 0.5, max: 500 },
      height: { type: Number, min: 20, max: 300 },
      spo2: { type: Number, min: 50, max: 100 },
    },
    chiefComplaint: {
      type: String,
      maxlength: [1000, 'Chief complaint cannot exceed 1000 characters'],
    },
    followUpDate: {
      type: Date,
    },
    teleconsultLink: {
      type: String,
      maxlength: [500, 'Teleconsult link cannot exceed 500 characters'],
    },
    reminders: [
      {
        sentAt: { type: Date },
        type: {
          type: String,
          enum: ['sms', 'whatsapp', 'email', 'call'],
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed'],
          default: 'pending',
        },
      },
    ],
    cancellation: {
      reason: { type: String, maxlength: 500 },
      cancelledBy: {
        type: String,
        enum: ['patient', 'clinic', 'doctor'],
      },
      cancelledAt: { type: Date },
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

// Compound indexes for efficient querying
appointmentSchema.index({ clinicId: 1, date: 1, status: 1 });
appointmentSchema.index({ clinicId: 1, doctorId: 1, date: 1 });
appointmentSchema.index({ clinicId: 1, patientId: 1, date: 1 });
appointmentSchema.index({ clinicId: 1, status: 1, date: 1 });
appointmentSchema.index({ date: 1, status: 1 });

// Virtual for appointment time range
appointmentSchema.virtual('timeRange').get(function () {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual for duration in minutes
appointmentSchema.virtual('durationMinutes').get(function () {
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  return (endHour * 60 + endMin) - (startHour * 60 + startMin);
});

// Pre-save hook to set end time based on slot duration
appointmentSchema.pre('save', function (next) {
  if (this.isModified('startTime') && !this.endTime) {
    const [hour, min] = this.startTime.split(':').map(Number);
    const totalMinutes = hour * 60 + min + 30; // Default 30 min slot
    const endHour = Math.floor(totalMinutes / 60);
    const endMin = totalMinutes % 60;
    this.endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  }
  next();
});

// Static method to find available slots
appointmentSchema.statics.findAvailableSlots = async function (
  clinicId: mongoose.Types.ObjectId,
  doctorId: mongoose.Types.ObjectId,
  date: Date,
  slotDuration: number = 30
): Promise<string[]> {
  const appointments = await this.find({
    clinicId,
    doctorId,
    date,
    status: { $nin: ['cancelled', 'no_show'] },
  }).sort({ startTime: 1 });

  const bookedSlots = appointments.map((apt) => apt.startTime);
  const availableSlots: string[] = [];

  // Generate time slots from 9 AM to 6 PM
  for (let hour = 9; hour < 18; hour++) {
    for (let min = 0; min < 60; min += slotDuration) {
      const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      if (!bookedSlots.includes(time)) {
        availableSlots.push(time);
      }
    }
  }

  return availableSlots;
};

// Static method to get today's appointments
appointmentSchema.statics.getTodaysAppointments = function (clinicId: mongoose.Types.ObjectId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    clinicId,
    date: { $gte: today, $lt: tomorrow },
  })
    .populate('patientId', 'firstName lastName phone')
    .populate('doctorId', 'name specialization')
    .sort({ startTime: 1 });
};

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);
export default Appointment;
