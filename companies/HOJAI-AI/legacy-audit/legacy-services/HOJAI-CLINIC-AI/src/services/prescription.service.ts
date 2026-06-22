import { Types } from 'mongoose';
import { Prescription } from '../models';
import {
  IPrescription,
  IPrescriptionCreate,
  IPrescriptionUpdate,
  IApiResponse,
  IQueryParams,
  IPrescriptionItem,
} from '../types';
import { AppError } from '../middleware/errorHandler';

export class PrescriptionService {
  /**
   * Create a new prescription
   */
  async create(clinicId: string, data: IPrescriptionCreate): Promise<IApiResponse<IPrescription>> {
    // Validate appointment belongs to clinic
    const appointment = await Prescription.findById(data.appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Check if prescription already exists for this appointment
    const existing = await Prescription.findOne({
      appointmentId: new Types.ObjectId(data.appointmentId),
      isActive: true,
    });

    if (existing) {
      throw new AppError('A prescription already exists for this appointment', 400);
    }

    const prescription = new Prescription({
      clinicId: new Types.ObjectId(clinicId),
      appointmentId: new Types.ObjectId(data.appointmentId),
      patientId: new Types.ObjectId(data.patientId),
      doctorId: new Types.ObjectId(data.doctorId),
      medications: data.medications,
      diagnosis: data.diagnosis,
      chiefComplaint: data.chiefComplaint,
      advice: data.advice || [],
      tests: data.tests || [],
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      nextVisitNotes: data.nextVisitNotes,
    });

    await prescription.save();

    await prescription.populate('patientId', 'firstName lastName phone');
    await prescription.populate('doctorId', 'name specialization');

    return {
      success: true,
      data: prescription.toJSON() as IPrescription,
      message: 'Prescription created successfully',
    };
  }

  /**
   * Get prescription by ID
   */
  async getById(clinicId: string, prescriptionId: string): Promise<IApiResponse<IPrescription>> {
    const prescription = await Prescription.findOne({
      _id: new Types.ObjectId(prescriptionId),
      clinicId: new Types.ObjectId(clinicId),
    })
      .populate('patientId', 'firstName lastName phone dateOfBirth gender bloodType allergies')
      .populate('doctorId', 'name specialization qualifications');

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    return {
      success: true,
      data: prescription.toJSON() as IPrescription,
    };
  }

  /**
   * Get prescription by appointment ID
   */
  async getByAppointment(
    clinicId: string,
    appointmentId: string
  ): Promise<IApiResponse<IPrescription | null>> {
    const prescription = await Prescription.getByAppointment(
      new Types.ObjectId(appointmentId)
    );

    if (!prescription) {
      return {
        success: true,
        data: null,
        message: 'No prescription found for this appointment',
      };
    }

    return {
      success: true,
      data: prescription.toJSON() as IPrescription,
    };
  }

  /**
   * List prescriptions with filters
   */
  async list(
    clinicId: string,
    params: IQueryParams
  ): Promise<IApiResponse<IPrescription[]>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      clinicId: new Types.ObjectId(clinicId),
      isActive: true,
    };

    // Filter by patient
    if (params.doctorId) {
      query.patientId = new Types.ObjectId(params.doctorId);
    }

    // Filter by doctor
    if (params.status) {
      query.doctorId = new Types.ObjectId(params.status);
    }

    // Filter by date range
    if (params.startDate || params.endDate) {
      query.createdAt = {};
      if (params.startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(params.endDate);
      }
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate('patientId', 'firstName lastName phone')
        .populate('doctorId', 'name specialization')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Prescription.countDocuments(query),
    ]);

    return {
      success: true,
      data: prescriptions as IPrescription[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get prescriptions for a patient
   */
  async getByPatient(
    clinicId: string,
    patientId: string,
    limit: number = 10
  ): Promise<IApiResponse<IPrescription[]>> {
    const prescriptions = await Prescription.getPatientPrescriptions(
      new Types.ObjectId(patientId),
      new Types.ObjectId(clinicId),
      limit
    );

    return {
      success: true,
      data: prescriptions as IPrescription[],
    };
  }

  /**
   * Update prescription
   */
  async update(
    clinicId: string,
    prescriptionId: string,
    data: IPrescriptionUpdate
  ): Promise<IApiResponse<IPrescription>> {
    const prescription = await Prescription.findOne({
      _id: new Types.ObjectId(prescriptionId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    // Update fields
    if (data.medications) prescription.medications = data.medications;
    if (data.diagnosis !== undefined) prescription.diagnosis = data.diagnosis;
    if (data.chiefComplaint !== undefined) prescription.chiefComplaint = data.chiefComplaint;
    if (data.advice) prescription.advice = data.advice;
    if (data.tests) prescription.tests = data.tests;
    if (data.followUpDate) prescription.followUpDate = new Date(data.followUpDate);
    if (data.nextVisitNotes !== undefined) prescription.nextVisitNotes = data.nextVisitNotes;
    if (data.isActive !== undefined) prescription.isActive = data.isActive;

    await prescription.save();

    await prescription.populate('patientId', 'firstName lastName phone');
    await prescription.populate('doctorId', 'name specialization');

    return {
      success: true,
      data: prescription.toJSON() as IPrescription,
      message: 'Prescription updated successfully',
    };
  }

  /**
   * Add medication to prescription
   */
  async addMedication(
    clinicId: string,
    prescriptionId: string,
    medication: IPrescriptionItem
  ): Promise<IApiResponse<IPrescription>> {
    const prescription = await Prescription.findOne({
      _id: new Types.ObjectId(prescriptionId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    prescription.medications.push(medication);
    await prescription.save();

    return {
      success: true,
      data: prescription.toJSON() as IPrescription,
      message: 'Medication added successfully',
    };
  }

  /**
   * Remove medication from prescription
   */
  async removeMedication(
    clinicId: string,
    prescriptionId: string,
    medicationIndex: number
  ): Promise<IApiResponse<IPrescription>> {
    const prescription = await Prescription.findOne({
      _id: new Types.ObjectId(prescriptionId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    if (medicationIndex < 0 || medicationIndex >= prescription.medications.length) {
      throw new AppError('Invalid medication index', 400);
    }

    prescription.medications.splice(medicationIndex, 1);
    await prescription.save();

    return {
      success: true,
      data: prescription.toJSON() as IPrescription,
      message: 'Medication removed successfully',
    };
  }

  /**
   * Search medications (autocomplete)
   */
  async searchMedications(query: string, limit: number = 20): Promise<{
    medicine: string;
    dosage: string;
    frequency: string;
  }[]> {
    return Prescription.searchMedications(query, limit);
  }

  /**
   * Get prescription statistics
   */
  async getStatistics(clinicId: string, startDate: Date, endDate: Date): Promise<{
    totalPrescriptions: number;
    uniquePatients: number;
    averageMedicationsPerPrescription: number;
    topMedicines: { medicine: string; count: number }[];
    topDiagnoses: { diagnosis: string; count: number }[];
  }> {
    const prescriptions = await Prescription.find({
      clinicId: new Types.ObjectId(clinicId),
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: true,
    })
      .populate('patientId', '_id')
      .lean();

    const stats = {
      totalPrescriptions: prescriptions.length,
      uniquePatients: new Set(prescriptions.map((p) => p.patientId.toString())).size,
      averageMedicationsPerPrescription: 0,
      topMedicines: {} as Record<string, number>,
      topDiagnoses: {} as Record<string, number>,
    };

    let totalMedications = 0;

    for (const prescription of prescriptions) {
      totalMedications += prescription.medications.length;

      for (const medication of prescription.medications) {
        const medicine = medication.medicine.toLowerCase();
        stats.topMedicines[medicine] = (stats.topMedicines[medicine] || 0) + 1;
      }

      if (prescription.diagnosis) {
        const diagnosis = prescription.diagnosis.toLowerCase();
        stats.topDiagnoses[diagnosis] = (stats.topDiagnoses[diagnosis] || 0) + 1;
      }
    }

    stats.averageMedicationsPerPrescription = prescriptions.length > 0
      ? Math.round((totalMedications / prescriptions.length) * 10) / 10
      : 0;

    return {
      totalPrescriptions: stats.totalPrescriptions,
      uniquePatients: stats.uniquePatients,
      averageMedicationsPerPrescription: stats.averageMedicationsPerPrescription,
      topMedicines: Object.entries(stats.topMedicines)
        .map(([medicine, count]) => ({ medicine, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topDiagnoses: Object.entries(stats.topDiagnoses)
        .map(([diagnosis, count]) => ({ diagnosis, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * Generate prescription PDF data
   */
  async generatePdfData(
    clinicId: string,
    prescriptionId: string
  ): Promise<Record<string, unknown>> {
    const prescription = await Prescription.findOne({
      _id: new Types.ObjectId(prescriptionId),
      clinicId: new Types.ObjectId(clinicId),
    })
      .populate('patientId', 'firstName lastName phone dateOfBirth gender')
      .populate('doctorId', 'name specialization qualifications')
      .lean();

    if (!prescription) {
      throw new AppError('Prescription not found', 404);
    }

    return {
      prescription: {
        id: prescription._id.toString(),
        date: prescription.createdAt,
        diagnosis: prescription.diagnosis,
        chiefComplaint: prescription.chiefComplaint,
        medications: prescription.medications,
        advice: prescription.advice,
        tests: prescription.tests,
        followUpDate: prescription.followUpDate,
      },
      patient: {
        name: `${prescription.patientId.firstName} ${prescription.patientId.lastName}`,
        phone: prescription.patientId.phone,
        age: Math.floor(
          (Date.now() - new Date(prescription.patientId.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        ),
        gender: prescription.patientId.gender,
      },
      doctor: {
        name: prescription.doctorId.name,
        specialization: prescription.doctorId.specialization,
        qualifications: prescription.doctorId.qualifications,
      },
    };
  }
}

export const prescriptionService = new PrescriptionService();
export default prescriptionService;
