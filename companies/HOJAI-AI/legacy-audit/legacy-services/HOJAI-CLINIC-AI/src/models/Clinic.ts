import mongoose, { Schema } from 'mongoose';
import { IClinic, IndustryVertical } from '../types';

const clinicSchema = new Schema<IClinic>(
  {
    name: {
      type: String,
      required: [true, 'Clinic name is required'],
      trim: true,
      maxlength: [200, 'Clinic name cannot exceed 200 characters'],
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    logo: {
      type: String,
      maxlength: [500, 'Logo URL cannot exceed 500 characters'],
    },
    address: {
      street: { type: String, required: true, maxlength: 500 },
      city: { type: String, required: true, maxlength: 100 },
      state: { type: String, required: true, maxlength: 100 },
      pincode: { type: String, required: true, maxlength: 10 },
      country: { type: String, default: 'India', maxlength: 100 },
      landmark: { type: String, maxlength: 200 },
      coordinates: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 },
      },
    },
    industryVertical: {
      type: String,
      enum: ['single_doctor', 'multi_specialty', 'dental', 'veterinary', 'diagnostic', 'ayurvedic', 'homeopathic'] as IndustryVertical[],
      default: 'single_doctor',
    },
    specialty: {
      type: [String],
      default: [],
    },
    workingHours: {
      type: [
        {
          day: { type: Number, required: true, min: 0, max: 6 },
          start: { type: String, required: true },
          end: { type: String, required: true },
          isOpen: { type: Boolean, default: true },
        },
      ],
      default: [
        { day: 0, start: '09:00', end: '18:00', isOpen: false }, // Sunday
        { day: 1, start: '09:00', end: '18:00', isOpen: true },
        { day: 2, start: '09:00', end: '18:00', isOpen: true },
        { day: 3, start: '09:00', end: '18:00', isOpen: true },
        { day: 4, start: '09:00', end: '18:00', isOpen: true },
        { day: 5, start: '09:00', end: '18:00', isOpen: true },
        { day: 6, start: '09:00', end: '18:00', isOpen: true },
      ],
    },
    slotDurationMinutes: {
      type: Number,
      default: 30,
      min: [10, 'Slot duration must be at least 10 minutes'],
      max: [120, 'Slot duration cannot exceed 120 minutes'],
    },
    maxDailyAppointments: {
      type: Number,
      default: 50,
      min: [1, 'Maximum daily appointments must be at least 1'],
      max: [200, 'Maximum daily appointments cannot exceed 200'],
    },
    appointmentBufferMinutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 60,
    },
    settings: {
      allowTeleconsult: { type: Boolean, default: true },
      allowOnlinePayment: { type: Boolean, default: false },
      autoConfirmAppointments: { type: Boolean, default: false },
      sendReminders: { type: Boolean, default: true },
      reminderHoursBefore: { type: Number, default: 24, min: 1, max: 72 },
      requireAbha: { type: Boolean, default: false },
      defaultConsultationFee: { type: Number, default: 500, min: 0 },
      cancellationPolicyHours: { type: Number, default: 24, min: 0, max: 168 },
    },
    integrations: {
      whatsappEnabled: { type: Boolean, default: false },
      whatsappPhoneNumber: { type: String },
      twilioEnabled: { type: Boolean, default: false },
      twilioPhoneNumber: { type: String },
      abhaEnabled: { type: Boolean, default: false },
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

// Pre-save hook to generate slug
clinicSchema.pre('save', function (next) {
  if (!this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }
  next();
});

// Virtual for formatted address
clinicSchema.virtual('formattedAddress').get(function () {
  const parts = [this.address.street];
  if (this.address.landmark) parts.push(this.address.landmark);
  parts.push(`${this.address.city}, ${this.address.state} ${this.address.pincode}`);
  return parts.join(', ');
});

// Method to check if clinic is open on a given day and time
clinicSchema.methods.isOpenAt = function (date: Date, time: string): boolean {
  const dayOfWeek = date.getDay();
  const workingDay = this.workingHours.find((wh) => wh.day === dayOfWeek);

  if (!workingDay || !workingDay.isOpen) return false;

  const [checkHour, checkMin] = time.split(':').map(Number);
  const [startHour, startMin] = workingDay.start.split(':').map(Number);
  const [endHour, endMin] = workingDay.end.split(':').map(Number);

  const checkMinutes = checkHour * 60 + checkMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return checkMinutes >= startMinutes && checkMinutes <= endMinutes;
};

// Method to get today's working hours
clinicSchema.methods.getTodaysHours = function (): { start: string; end: string } | null {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const workingDay = this.workingHours.find((wh) => wh.day === dayOfWeek);

  if (!workingDay || !workingDay.isOpen) return null;
  return { start: workingDay.start, end: workingDay.end };
};

// Static method to find by slug
clinicSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug, isActive: true });
};

export const Clinic = mongoose.model<IClinic>('Clinic', clinicSchema);
export default Clinic;
