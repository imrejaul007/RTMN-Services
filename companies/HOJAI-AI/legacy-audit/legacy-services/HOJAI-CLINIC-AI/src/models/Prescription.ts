import mongoose, { Schema } from 'mongoose';
import { IPrescription, IPrescriptionItem } from '../types';

const prescriptionItemSchema = new Schema<IPrescriptionItem>(
  {
    medicine: {
      type: String,
      required: [true, 'Medicine name is required'],
      maxlength: [200, 'Medicine name cannot exceed 200 characters'],
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      maxlength: [100, 'Dosage cannot exceed 100 characters'],
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      maxlength: [100, 'Frequency cannot exceed 100 characters'],
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      maxlength: [100, 'Duration cannot exceed 100 characters'],
    },
    instructions: {
      type: String,
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    quantity: {
      type: Number,
      min: [1, 'Quantity must be at least 1'],
      max: [1000, 'Quantity cannot exceed 1000'],
    },
    takeWithFood: {
      type: Boolean,
      default: false,
    },
    sideEffects: {
      type: [String],
      default: [],
    },
  },
  { _id: true }
);

const prescriptionSchema = new Schema<IPrescription>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Appointment is required'],
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
    medications: {
      type: [prescriptionItemSchema],
      required: [true, 'At least one medication is required'],
      validate: {
        validator: (v: IPrescriptionItem[]) => v.length > 0,
        message: 'At least one medication is required',
      },
    },
    diagnosis: {
      type: String,
      maxlength: [1000, 'Diagnosis cannot exceed 1000 characters'],
    },
    chiefComplaint: {
      type: String,
      maxlength: [500, 'Chief complaint cannot exceed 500 characters'],
    },
    advice: {
      type: [String],
      default: [],
    },
    tests: {
      type: [String],
      default: [],
    },
    followUpDate: {
      type: Date,
    },
    nextVisitNotes: {
      type: String,
      maxlength: [500, 'Next visit notes cannot exceed 500 characters'],
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

// Compound indexes
prescriptionSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
prescriptionSchema.index({ clinicId: 1, doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ appointmentId: 1 });

// Virtual for total medications count
prescriptionSchema.virtual('medicationCount').get(function () {
  return this.medications.length;
});

// Method to format prescription for display
prescriptionSchema.methods.toDisplayFormat = function () {
  return {
    id: this._id,
    date: this.createdAt,
    doctor: this.doctorId,
    diagnosis: this.diagnosis,
    medications: this.medications.map((med) => ({
      name: med.medicine,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      instructions: med.instructions,
    })),
    advice: this.advice,
    tests: this.tests,
    followUpDate: this.followUpDate,
  };
};

// Static method to get prescriptions for a patient
prescriptionSchema.statics.getPatientPrescriptions = function (
  patientId: mongoose.Types.ObjectId,
  clinicId: mongoose.Types.ObjectId,
  limit: number = 10
) {
  return this.find({ patientId, clinicId, isActive: true })
    .populate('doctorId', 'name specialization')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get prescriptions by appointment
prescriptionSchema.statics.getByAppointment = function (appointmentId: mongoose.Types.ObjectId) {
  return this.findOne({ appointmentId, isActive: true })
    .populate('doctorId', 'name specialization')
    .populate('patientId', 'firstName lastName phone');
};

// Static method to search medications
prescriptionSchema.statics.searchMedications = async function (
  query: string,
  limit: number = 20
): Promise<{ medicine: string; dosage: string; frequency: string }[]> {
  const results = await this.aggregate([
    { $unwind: '$medications' },
    { $match: { 'medications.medicine': { $regex: query, $options: 'i' } } },
    {
      $group: {
        _id: { medicine: '$medications.medicine', dosage: '$medications.dosage', frequency: '$medications.frequency' },
      },
    },
    { $limit: limit },
  ]);

  return results.map((r) => ({
    medicine: r._id.medicine,
    dosage: r._id.dosage,
    frequency: r._id.frequency,
  }));
};

export const Prescription = mongoose.model<IPrescription>('Prescription', prescriptionSchema);
export default Prescription;
