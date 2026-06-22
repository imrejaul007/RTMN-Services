import mongoose, { Schema } from 'mongoose';
import { IDoctor } from '../types';

const doctorSchema = new Schema<IDoctor>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      maxlength: [200, 'Doctor name cannot exceed 200 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      maxlength: [200, 'Specialization cannot exceed 200 characters'],
    },
    qualifications: {
      type: [String],
      default: [],
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      max: [70, 'Experience years cannot exceed 70'],
    },
    licenseNumber: {
      type: String,
      maxlength: [100, 'License number cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    photo: {
      type: String,
      maxlength: [500, 'Photo URL cannot exceed 500 characters'],
    },
    availableDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      validate: {
        validator: (v: number[]) => v.every((day) => day >= 0 && day <= 6),
        message: 'Available days must be between 0 (Sunday) and 6 (Saturday)',
      },
    },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
    },
    consultationFee: {
      type: Number,
      default: 500,
      min: [0, 'Consultation fee cannot be negative'],
    },
    teleconsultFee: {
      type: Number,
      min: [0, 'Teleconsult fee cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
doctorSchema.index({ clinicId: 1, isActive: 1 });
doctorSchema.index({ clinicId: 1, specialization: 1 });
doctorSchema.index({ email: 1 }, { sparse: true });

// Virtual for formatted qualifications
doctorSchema.virtual('formattedQualifications').get(function () {
  return this.qualifications.join(', ');
});

// Method to check if available on a given day
doctorSchema.methods.isAvailableOn = function (dayOfWeek: number): boolean {
  return this.availableDays.includes(dayOfWeek);
};

// Method to get available time slots
doctorSchema.methods.getAvailableSlots = function (date: Date, slotDuration: number = 30): string[] {
  if (!this.isAvailableOn(date.getDay())) {
    return [];
  }

  const slots: string[] = [];
  const [startHour, startMin] = this.workingHours.start.split(':').map(Number);
  const [endHour, endMin] = this.workingHours.end.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    currentMinutes += slotDuration;
  }

  return slots;
};

// Static method to find by specialization
doctorSchema.statics.findBySpecialization = function (clinicId: mongoose.Types.ObjectId, specialization: string) {
  return this.find({
    clinicId,
    specialization: { $regex: specialization, $options: 'i' },
    isActive: true,
  });
};

export const Doctor = mongoose.model<IDoctor>('Doctor', doctorSchema);
export default Doctor;
