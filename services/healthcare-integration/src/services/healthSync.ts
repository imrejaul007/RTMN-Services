import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';
import { PatientProfile, MedicalRecord, ApiResponse } from '../models/PatientProfile';

interface SyncResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class HealthSync {
  private industryTwinClient: AxiosInstance;
  private healthcareOSClient: AxiosInstance;
  private risaCareClient: AxiosInstance;

  constructor() {
    const industryTwinUrl = process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705';
    const healthcareOSUrl = process.env.HEALTHCARE_OS_URL || 'http://localhost:5020';
    const risaCareUrl = process.env.RISACARE_URL || 'http://localhost:7000';

    this.industryTwinClient = axios.create({
      baseURL: industryTwinUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.healthcareOSClient = axios.create({
      baseURL: healthcareOSUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.risaCareClient = axios.create({
      baseURL: risaCareUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ============ SYNC TO INDUSTRY TWIN ============

  async syncToIndustryTwin(entityType: string, data: any): Promise<SyncResult> {
    try {
      logger.info(`Syncing ${entityType} to Healthcare Industry Twin`);

      const twinData = this.transformToIndustryTwin(entityType, data);

      const response = await this.industryTwinClient.post('/api/twins', twinData);

      logger.info(`${entityType} synced to Industry Twin: ${response.data?.id}`);

      return {
        success: true,
        data: {
          industryTwinId: response.data?.id,
          ...response.data
        }
      };
    } catch (error: any) {
      logger.error(`Failed to sync ${entityType} to Industry Twin:`, error.message);

      // Return mock data for development
      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          data: {
            industryTwinId: `IT-${entityType}-${data.id}`,
            ...data
          }
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  private transformToIndustryTwin(entityType: string, data: any): any {
    switch (entityType) {
      case 'patient':
        return this.transformPatientToTwin(data);
      case 'medical-record':
        return this.transformMedicalRecordToTwin(data);
      case 'appointment':
        return this.transformAppointmentToTwin(data);
      case 'prescription':
        return this.transformPrescriptionToTwin(data);
      default:
        return {
          externalId: data.id,
          type: entityType,
          industry: 'healthcare',
          data,
          source: 'healthcare-integration'
        };
    }
  }

  private transformPatientToTwin(patient: PatientProfile): any {
    return {
      externalId: patient.id,
      type: 'healthcare-patient',
      industry: 'healthcare',
      name: `${patient.firstName} ${patient.lastName}`,
      metadata: {
        corpid: patient.corpid,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        insuranceInfo: patient.insuranceInfo,
        medicalHistory: patient.medicalHistory,
        preferences: patient.preferences,
        lifetimeValue: patient.lifetimeValue,
        riskScore: patient.riskScore,
        lastVisit: patient.lastVisit,
        nextAppointment: patient.nextAppointment
      },
      tags: ['healthcare', 'patient', 'risacare', 'industry-twin'],
      source: 'healthcare-integration',
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };
  }

  private transformMedicalRecordToTwin(record: MedicalRecord): any {
    return {
      externalId: record.id,
      type: 'healthcare-medical-record',
      industry: 'healthcare',
      name: record.title,
      metadata: {
        patientId: record.patientId,
        recordType: record.recordType,
        description: record.description,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        providerId: record.providerId,
        providerName: record.providerName,
        facility: record.facility,
        attachments: record.attachments
      },
      tags: ['healthcare', 'medical-record', record.recordType, 'industry-twin'],
      source: 'healthcare-integration',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  private transformAppointmentToTwin(appointment: any): any {
    return {
      externalId: appointment.id,
      type: 'healthcare-appointment',
      industry: 'healthcare',
      name: `Appointment: ${appointment.appointmentType}`,
      metadata: {
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        providerId: appointment.providerId,
        providerName: appointment.providerName,
        appointmentType: appointment.appointmentType,
        status: appointment.status,
        scheduledAt: appointment.scheduledAt,
        duration: appointment.duration,
        location: appointment.location,
        telehealhLink: appointment.telehealhLink,
        notes: appointment.notes
      },
      tags: ['healthcare', 'appointment', appointment.appointmentType, 'industry-twin'],
      source: 'healthcare-integration',
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    };
  }

  private transformPrescriptionToTwin(prescription: any): any {
    return {
      externalId: prescription.id,
      type: 'healthcare-prescription',
      industry: 'healthcare',
      name: `Prescription: ${prescription.medication}`,
      metadata: {
        patientId: prescription.patientId,
        medication: prescription.medication,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        refills: prescription.refills,
        refillsRemaining: prescription.refillsRemaining,
        prescribedBy: prescription.prescribedBy,
        prescribedAt: prescription.prescribedAt,
        pharmacy: prescription.pharmacy,
        status: prescription.status
      },
      tags: ['healthcare', 'prescription', 'medication', 'industry-twin'],
      source: 'healthcare-integration'
    };
  }

  // ============ HEALTHCARE OS OPERATIONS ============

  async syncPatientToHealthcareOS(patient: PatientProfile): Promise<SyncResult> {
    try {
      logger.info(`Syncing patient ${patient.id} to Healthcare OS`);

      const response = await this.healthcareOSClient.post('/api/patients', {
        externalId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        emergencyContact: patient.emergencyContact,
        insuranceInfo: patient.insuranceInfo,
        medicalHistory: patient.medicalHistory,
        preferences: patient.preferences
      });

      logger.info(`Patient ${patient.id} synced to Healthcare OS`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to sync patient to Healthcare OS:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          data: { id: `HCOS-${patient.id}`, ...patient }
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPatientFromHealthcareOS(patientId: string): Promise<SyncResult> {
    try {
      logger.info(`Fetching patient ${patientId} from Healthcare OS`);

      const response = await this.healthcareOSClient.get(`/api/patients/${patientId}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to fetch patient from Healthcare OS:`, error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  async createAppointmentInHealthcareOS(appointment: any): Promise<SyncResult> {
    try {
      logger.info(`Creating appointment in Healthcare OS`);

      const response = await this.healthcareOSClient.post('/api/appointments', {
        externalId: appointment.id,
        patientId: appointment.patientId,
        providerId: appointment.providerId,
        appointmentType: appointment.appointmentType,
        scheduledAt: appointment.scheduledAt,
        duration: appointment.duration,
        location: appointment.location,
        notes: appointment.notes
      });

      logger.info(`Appointment created in Healthcare OS`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to create appointment in Healthcare OS:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          data: { id: `HCOS-${appointment.id}`, ...appointment }
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ RISACARE OPERATIONS ============

  async syncToRisaCare(entityType: string, data: any): Promise<SyncResult> {
    try {
      logger.info(`Syncing ${entityType} to RisaCare`);

      let endpoint = '/api';
      let payload = data;

      switch (entityType) {
        case 'patient':
          endpoint = '/api/patients';
          break;
        case 'appointment':
          endpoint = '/api/appointments';
          break;
        case 'medical-record':
          endpoint = '/api/records';
          break;
        case 'prescription':
          endpoint = '/api/prescriptions';
          break;
      }

      const response = await this.risaCareClient.post(endpoint, {
        source: 'healthcare-integration',
        data: payload
      });

      logger.info(`${entityType} synced to RisaCare`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to sync ${entityType} to RisaCare:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          data: { id: `RC-${entityType}-${data.id}` }
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ BULK SYNC OPERATIONS ============

  async bulkSyncPatients(patients: PatientProfile[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      total: patients.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const patient of patients) {
      try {
        // Sync to Industry Twin
        const twinResult = await this.syncToIndustryTwin('patient', patient);
        if (!twinResult.success) {
          results.failed++;
          results.errors.push(`Patient ${patient.id}: ${twinResult.error}`);
          continue;
        }

        // Sync to Healthcare OS
        const hcosResult = await this.syncPatientToHealthcareOS(patient);
        if (!hcosResult.success) {
          results.failed++;
          results.errors.push(`Patient ${patient.id}: ${hcosResult.error}`);
          continue;
        }

        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Patient ${patient.id}: ${error.message}`);
      }
    }

    logger.info(`Bulk sync complete: ${results.successful}/${results.total} successful`);

    return results;
  }

  // ============ HEALTH CHECK ============

  async checkConnections(): Promise<{
    industryTwin: boolean;
    healthcareOS: boolean;
    risaCare: boolean;
  }> {
    const results = {
      industryTwin: false,
      healthcareOS: false,
      risaCare: false
    };

    try {
      await this.industryTwinClient.get('/health');
      results.industryTwin = true;
    } catch (error) {
      logger.warn('Industry Twin health check failed');
    }

    try {
      await this.healthcareOSClient.get('/health');
      results.healthcareOS = true;
    } catch (error) {
      logger.warn('Healthcare OS health check failed');
    }

    try {
      await this.risaCareClient.get('/health');
      results.risaCare = true;
    } catch (error) {
      logger.warn('RisaCare health check failed');
    }

    return results;
  }
}
