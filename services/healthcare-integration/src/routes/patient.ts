import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { HealthSync } from '../services/healthSync';
import { logger } from '../services/logger';
import {
  PatientProfile,
  ApiResponse,
  PaginatedResponse
} from '../models/PatientProfile';

const router = Router();
const customerOpsBridge = new CustomerOpsBridge();
const healthSync = new HealthSync();

// In-memory store (replace with database in production)
const patients: Map<string, PatientProfile> = new Map();

// Get all patients
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    let patientList = Array.from(patients.values());

    if (search) {
      const searchLower = search.toLowerCase();
      patientList = patientList.filter(
        p =>
          p.firstName.toLowerCase().includes(searchLower) ||
          p.lastName.toLowerCase().includes(searchLower) ||
          p.email?.toLowerCase().includes(searchLower) ||
          p.phone.includes(search)
      );
    }

    const total = patientList.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedPatients = patientList.slice(startIndex, startIndex + limit);

    const response: PaginatedResponse<PatientProfile> = {
      success: true,
      data: paginatedPatients,
      pagination: { page, limit, total, totalPages },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get patient by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patient = patients.get(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const response: ApiResponse<PatientProfile> = {
      success: true,
      data: patient,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Create new patient
router.post('/', async (req: Request, res: Response) => {
  try {
    const patientData: Omit<PatientProfile, 'id' | 'createdAt' | 'updatedAt'> = req.body;

    const patient: PatientProfile = {
      ...patientData,
      id: `PAT-${uuidv4().substring(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as PatientProfile;

    patients.set(patient.id, patient);

    // Sync to Customer Twin
    try {
      const customerTwinResult = await customerOpsBridge.syncPatientToCustomerTwin(patient);
      if (customerTwinResult.success && customerTwinResult.data) {
        patient.customerTwinId = customerTwinResult.data.id;
        patient.journeyStage = 'lead';
        patients.set(patient.id, patient);
      }
    } catch (syncError) {
      logger.warn('Customer Twin sync failed, will retry:', syncError);
    }

    // Sync to Healthcare Industry Twin
    try {
      await healthSync.syncToIndustryTwin('patient', patient);
    } catch (syncError) {
      logger.warn('Industry Twin sync failed, will retry:', syncError);
    }

    const response: ApiResponse<PatientProfile> = {
      success: true,
      data: patient,
      message: 'Patient created and synced to Customer Twin',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create patient',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Update patient
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingPatient = patients.get(id);

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const updatedPatient: PatientProfile = {
      ...existingPatient,
      ...req.body,
      id: existingPatient.id,
      createdAt: existingPatient.createdAt,
      updatedAt: new Date().toISOString()
    };

    patients.set(id, updatedPatient);

    // Sync updates to Customer Twin
    if (updatedPatient.customerTwinId) {
      try {
        await customerOpsBridge.updateCustomerTwin(updatedPatient.customerTwinId, {
          firstName: updatedPatient.firstName,
          lastName: updatedPatient.lastName,
          email: updatedPatient.email,
          phone: updatedPatient.phone
        });
      } catch (syncError) {
        logger.warn('Customer Twin update failed:', syncError);
      }
    }

    // Sync to Healthcare Industry Twin
    try {
      await healthSync.syncToIndustryTwin('patient', updatedPatient);
    } catch (syncError) {
      logger.warn('Industry Twin sync failed:', syncError);
    }

    const response: ApiResponse<PatientProfile> = {
      success: true,
      data: updatedPatient,
      message: 'Patient updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update patient',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Delete patient
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patient = patients.get(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    // Remove from Customer Twin if linked
    if (patient.customerTwinId) {
      try {
        await customerOpsBridge.removeFromCustomerTwin(patient.customerTwinId);
      } catch (syncError) {
        logger.warn('Customer Twin removal failed:', syncError);
      }
    }

    patients.delete(id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Patient deleted successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error deleting patient:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete patient',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get patient journey/analytics
router.get('/:id/journey', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patient = patients.get(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const journeyData = {
      patientId: patient.id,
      stage: patient.journeyStage || 'unknown',
      lifetimeValue: patient.lifetimeValue || 0,
      riskScore: patient.riskScore || 0,
      lastVisit: patient.lastVisit,
      nextAppointment: patient.nextAppointment,
      customerTwinId: patient.customerTwinId,
      analytics: {
        visitCount: patient.medicalHistory ? patient.medicalHistory.conditions.length : 0,
        activeConditions: patient.medicalHistory?.conditions.length || 0,
        activeMedications: patient.medicalHistory?.medications.length || 0
      }
    };

    const response: ApiResponse<typeof journeyData> = {
      success: true,
      data: journeyData,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching patient journey:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient journey',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

export default router;
