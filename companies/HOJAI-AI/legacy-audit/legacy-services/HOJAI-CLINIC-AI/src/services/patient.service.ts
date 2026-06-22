import { Types } from 'mongoose';
import { Patient } from '../models';
import { IPatient, IPatientCreate, IPatientUpdate, IApiResponse, IQueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';

export class PatientService {
  /**
   * Create a new patient
   */
  async create(clinicId: string, data: IPatientCreate): Promise<IApiResponse<IPatient>> {
    try {
      // Check if patient with same phone already exists
      const existingPatient = await Patient.findByPhone(data.phone, new Types.ObjectId(clinicId));
      if (existingPatient) {
        throw new AppError('Patient with this phone number already exists', 400);
      }

      // Check if ABHA ID is provided and unique within clinic
      if (data.abhaId) {
        const existingAbha = await Patient.findByAbhaId(data.abhaId, new Types.ObjectId(clinicId));
        if (existingAbha) {
          throw new AppError('Patient with this ABHA ID already exists', 400);
        }
      }

      const patient = new Patient({
        clinicId: new Types.ObjectId(clinicId),
        ...data,
        dateOfBirth: new Date(data.dateOfBirth),
      });

      await patient.save();

      return {
        success: true,
        data: patient.toJSON() as IPatient,
        message: 'Patient registered successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient by ID
   */
  async getById(clinicId: string, patientId: string): Promise<IApiResponse<IPatient>> {
    const patient = await Patient.findOne({
      _id: new Types.ObjectId(patientId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return {
      success: true,
      data: patient.toJSON() as IPatient,
    };
  }

  /**
   * Get patient by phone number
   */
  async getByPhone(clinicId: string, phone: string): Promise<IApiResponse<IPatient>> {
    const patient = await Patient.findByPhone(phone, new Types.ObjectId(clinicId));

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return {
      success: true,
      data: patient.toJSON() as IPatient,
    };
  }

  /**
   * List patients with pagination and filters
   */
  async list(clinicId: string, params: IQueryParams): Promise<IApiResponse<IPatient[]>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      clinicId: new Types.ObjectId(clinicId),
      isActive: true,
    };

    // Search by name
    if (params.search) {
      query.$or = [
        { firstName: { $regex: params.search, $options: 'i' } },
        { lastName: { $regex: params.search, $options: 'i' } },
        { phone: { $regex: params.search, $options: 'i' } },
        { email: { $regex: params.search, $options: 'i' } },
      ];
    }

    // Filter by tags
    if (params.status) {
      query.tags = { $in: params.status.split(',') };
    }

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .sort({ [params.sort || 'createdAt']: params.order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(query),
    ]);

    return {
      success: true,
      data: patients as IPatient[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update patient
   */
  async update(
    clinicId: string,
    patientId: string,
    data: IPatientUpdate
  ): Promise<IApiResponse<IPatient>> {
    const patient = await Patient.findOne({
      _id: new Types.ObjectId(patientId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    // Update fields
    Object.assign(patient, data);

    // Convert dateOfBirth if provided
    if (data.dateOfBirth) {
      patient.dateOfBirth = new Date(data.dateOfBirth);
    }

    await patient.save();

    return {
      success: true,
      data: patient.toJSON() as IPatient,
      message: 'Patient updated successfully',
    };
  }

  /**
   * Archive patient (soft delete)
   */
  async archive(clinicId: string, patientId: string): Promise<IApiResponse<void>> {
    const patient = await Patient.findOne({
      _id: new Types.ObjectId(patientId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    patient.isActive = false;
    await patient.save();

    return {
      success: true,
      message: 'Patient archived successfully',
    };
  }

  /**
   * Add allergy to patient
   */
  async addAllergy(
    clinicId: string,
    patientId: string,
    allergy: string
  ): Promise<IApiResponse<IPatient>> {
    const patient = await Patient.findOne({
      _id: new Types.ObjectId(patientId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    if (!patient.allergies.includes(allergy)) {
      patient.allergies.push(allergy);
      await patient.save();
    }

    return {
      success: true,
      data: patient.toJSON() as IPatient,
      message: 'Allergy added successfully',
    };
  }

  /**
   * Add medical history entry
   */
  async addMedicalHistory(
    clinicId: string,
    patientId: string,
    history: string
  ): Promise<IApiResponse<IPatient>> {
    const patient = await Patient.findOne({
      _id: new Types.ObjectId(patientId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    if (!patient.medicalHistory.includes(history)) {
      patient.medicalHistory.push(history);
      await patient.save();
    }

    return {
      success: true,
      data: patient.toJSON() as IPatient,
      message: 'Medical history added successfully',
    };
  }

  /**
   * Get patient statistics
   */
  async getStatistics(clinicId: string): Promise<{
    total: number;
    male: number;
    female: number;
    other: number;
    averageAge: number;
    byBloodType: Record<string, number>;
    byAgeGroup: Record<string, number>;
  }> {
    const patients = await Patient.find({
      clinicId: new Types.ObjectId(clinicId),
      isActive: true,
    }).select('dateOfBirth gender bloodType');

    const stats = {
      total: patients.length,
      male: 0,
      female: 0,
      other: 0,
      averageAge: 0,
      byBloodType: {} as Record<string, number>,
      byAgeGroup: { '0-10': 0, '11-20': 0, '21-40': 0, '41-60': 0, '60+': 0 },
    };

    let totalAge = 0;

    for (const patient of patients) {
      // Gender
      if (patient.gender === 'male') stats.male++;
      else if (patient.gender === 'female') stats.female++;
      else stats.other++;

      // Blood type
      if (patient.bloodType) {
        stats.byBloodType[patient.bloodType] = (stats.byBloodType[patient.bloodType] || 0) + 1;
      }

      // Age
      const age = patient.getAge();
      totalAge += age;

      if (age <= 10) stats.byAgeGroup['0-10']++;
      else if (age <= 20) stats.byAgeGroup['11-20']++;
      else if (age <= 40) stats.byAgeGroup['21-40']++;
      else if (age <= 60) stats.byAgeGroup['41-60']++;
      else stats.byAgeGroup['60+']++;
    }

    stats.averageAge = patients.length > 0 ? Math.round(totalAge / patients.length) : 0;

    return stats;
  }

  /**
   * Search patients for autocomplete
   */
  async search(clinicId: string, query: string, limit: number = 10): Promise<IPatient[]> {
    const patients = await Patient.find({
      clinicId: new Types.ObjectId(clinicId),
      isActive: true,
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ],
    })
      .select('firstName lastName phone email dateOfBirth')
      .limit(limit)
      .lean();

    return patients as IPatient[];
  }
}

export const patientService = new PatientService();
export default patientService;
