import mongoose, { Schema, Model } from 'mongoose';
import { IPatient } from '../types';

// Extend Model interface for static methods
interface IPatientModel extends Model<IPatient> {
  findByPhone(phone: string, clinicId: mongoose.Types.ObjectId): Promise<IPatient | null>;
  findByAbhaId(abhaId: string, clinicId: mongoose.Types.ObjectId): Promise<IPatient | null>;
}

const patientSchema = new Schema<IPatient>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [100, 'First name cannot exceed 100 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [100, 'Last name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      required: [true, 'Gender is required'],
    },
    address: {
      street: { type: String, maxlength: 500 },
      city: { type: String, maxlength: 100 },
      state: { type: String, maxlength: 100 },
      pincode: { type: String, maxlength: 10 },
      landmark: { type: String, maxlength: 200 },
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    allergies: {
      type: [String],
      default: [],
    },
    medicalHistory: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      name: { type: String, maxlength: 100 },
      phone: { type: String, maxlength: 20 },
      relationship: { type: String, maxlength: 50 },
    },
    abhaId: {
      type: String,
      sparse: true,
      index: true,
    },
    abhaNumber: {
      type: String,
      sparse: true,
    },
    documents: [
      {
        type: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    tags: {
      type: [String],
      default: [],
      index: true,
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

// Indexes for efficient querying
patientSchema.index({ clinicId: 1, isActive: 1 });
patientSchema.index({ clinicId: 1, phone: 1 });
patientSchema.index({ clinicId: 1, 'lastName': 1, 'firstName': 1 });
patientSchema.index({ abhaId: 1 }, { sparse: true });

// Virtual for full name
patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Method to calculate age
patientSchema.methods.getAge = function (): number {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Static method to find patients by phone
patientSchema.statics.findByPhone = function (phone: string, clinicId: mongoose.Types.ObjectId) {
  return this.findOne({ phone, clinicId, isActive: true });
};

// Static method to find patients by ABHA ID
patientSchema.statics.findByAbhaId = function (abhaId: string, clinicId: mongoose.Types.ObjectId) {
  return this.findOne({ abhaId, clinicId });
};

export const Patient = mongoose.model<IPatient, IPatientModel>('Patient', patientSchema);
export default Patient;
