import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { HealthSync } from '../services/healthSync';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { logger } from '../services/logger';
import {
  MedicalRecord,
  Prescription,
  ApiResponse,
  PaginatedResponse
} from '../models/PatientProfile';

const router = Router();
const healthSync = new HealthSync();
const customerOpsBridge = new CustomerOpsBridge();

// In-memory stores (replace with database in production)
const medicalRecords: Map<string, MedicalRecord> = new Map();
const prescriptions: Map<string, Prescription> = new Map();

// ============ MEDICAL RECORDS ============

// Get all medical records
router.get('/records', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const patientId = req.query.patientId as string;
    const recordType = req.query.recordType as string;

    let records = Array.from(medicalRecords.values());

    if (patientId) {
      records = records.filter(r => r.patientId === patientId);
    }
    if (recordType) {
      records = records.filter(r => r.recordType === recordType);
    }

    // Sort by date, newest first
    records.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = records.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedRecords = records.slice(startIndex, startIndex + limit);

    const response: PaginatedResponse<MedicalRecord> = {
      success: true,
      data: paginatedRecords,
      pagination: { page, limit, total, totalPages },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching medical records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical records',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get medical record by ID
router.get('/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = medicalRecords.get(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const response: ApiResponse<MedicalRecord> = {
      success: true,
      data: record,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching medical record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical record',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Create medical record
router.post('/records', async (req: Request, res: Response) => {
  try {
    const recordData: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt' | 'industryTwinId'> = req.body;

    const record: MedicalRecord = {
      ...recordData,
      id: `MR-${uuidv4().substring(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as MedicalRecord;

    medicalRecords.set(record.id, record);

    // Sync to Healthcare Industry Twin
    try {
      const syncResult = await healthSync.syncToIndustryTwin('medical-record', record);
      if (syncResult.success && syncResult.data) {
        record.industryTwinId = (syncResult.data as any).industryTwinId;
        medicalRecords.set(record.id, record);
      }
    } catch (syncError) {
      logger.warn('Industry Twin sync failed:', syncError);
    }

    // Publish medical record created event
    try {
      await customerOpsBridge.publishEvent('medical.record.created', {
        recordId: record.id,
        patientId: record.patientId,
        recordType: record.recordType,
        diagnosis: record.diagnosis
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<MedicalRecord> = {
      success: true,
      data: record,
      message: 'Medical record created and synced to Industry Twin',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating medical record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create medical record',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Update medical record
router.put('/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingRecord = medicalRecords.get(id);

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Medical record not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const updatedRecord: MedicalRecord = {
      ...existingRecord,
      ...req.body,
      id: existingRecord.id,
      createdAt: existingRecord.createdAt,
      updatedAt: new Date().toISOString()
    };

    medicalRecords.set(id, updatedRecord);

    // Sync to Industry Twin
    try {
      await healthSync.syncToIndustryTwin('medical-record', updatedRecord);
    } catch (syncError) {
      logger.warn('Industry Twin sync failed:', syncError);
    }

    const response: ApiResponse<MedicalRecord> = {
      success: true,
      data: updatedRecord,
      message: 'Medical record updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating medical record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update medical record',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get patient's medical history
router.get('/history/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const patientRecords = Array.from(medicalRecords.values())
      .filter(r => r.patientId === patientId)
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    // Aggregate diagnosis
    const allDiagnosis = patientRecords
      .flatMap(r => r.diagnosis || [])
      .filter((d, i, arr) => arr.indexOf(d) === i);

    const historySummary = {
      patientId,
      totalRecords: patientRecords.length,
      diagnosis: allDiagnosis,
      byType: {
        consultation: patientRecords.filter(r => r.recordType === 'consultation').length,
        'lab-result': patientRecords.filter(r => r.recordType === 'lab-result').length,
        imaging: patientRecords.filter(r => r.recordType === 'imaging').length,
        diagnosis: patientRecords.filter(r => r.recordType === 'diagnosis').length,
        'treatment-plan': patientRecords.filter(r => r.recordType === 'treatment-plan').length
      },
      records: patientRecords
    };

    const response: ApiResponse<typeof historySummary> = {
      success: true,
      data: historySummary,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching medical history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch medical history',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// ============ PRESCRIPTIONS ============

// Get all prescriptions
router.get('/prescriptions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const patientId = req.query.patientId as string;
    const status = req.query.status as string;

    let prescriptionList = Array.from(prescriptions.values());

    if (patientId) {
      prescriptionList = prescriptionList.filter(p => p.patientId === patientId);
    }
    if (status) {
      prescriptionList = prescriptionList.filter(p => p.status === status);
    }

    prescriptionList.sort((a, b) =>
      new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime()
    );

    const total = prescriptionList.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedPrescriptions = prescriptionList.slice(startIndex, startIndex + limit);

    const response: PaginatedResponse<Prescription> = {
      success: true,
      data: paginatedPrescriptions,
      pagination: { page, limit, total, totalPages },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prescriptions',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Get prescription by ID
router.get('/prescriptions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prescription = prescriptions.get(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const response: ApiResponse<Prescription> = {
      success: true,
      data: prescription,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prescription',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Create prescription
router.post('/prescriptions', async (req: Request, res: Response) => {
  try {
    const prescriptionData: Omit<Prescription, 'id' | 'subscriptionTwinId'> = req.body;

    const prescription: Prescription = {
      ...prescriptionData,
      id: `RX-${uuidv4().substring(0, 8).toUpperCase()}`,
      status: 'active'
    } as Prescription;

    prescriptions.set(prescription.id, prescription);

    // Sync to Subscription Twin (for recurring prescription management)
    try {
      const subscriptionResult = await customerOpsBridge.syncToSubscriptionTwin(prescription);
      if (subscriptionResult.success && subscriptionResult.data) {
        prescription.subscriptionTwinId = (subscriptionResult.data as any).id;
        prescriptions.set(prescription.id, prescription);
      }
    } catch (syncError) {
      logger.warn('Subscription Twin sync failed:', syncError);
    }

    // Publish prescription created event
    try {
      await customerOpsBridge.publishEvent('prescription.created', {
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        medication: prescription.medication,
        refills: prescription.refills
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    const response: ApiResponse<Prescription> = {
      success: true,
      data: prescription,
      message: 'Prescription created and synced to Subscription Twin',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating prescription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prescription',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Update prescription (refill, cancel, etc.)
router.put('/prescriptions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingPrescription = prescriptions.get(id);

    if (!existingPrescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    const updatedPrescription: Prescription = {
      ...existingPrescription,
      ...req.body,
      id: existingPrescription.id
    };

    prescriptions.set(id, updatedPrescription);

    // Update Subscription Twin
    if (updatedPrescription.subscriptionTwinId) {
      try {
        await customerOpsBridge.updateSubscriptionTwin(updatedPrescription.subscriptionTwinId, {
          refillsRemaining: updatedPrescription.refillsRemaining,
          status: updatedPrescription.status
        });
      } catch (syncError) {
        logger.warn('Subscription Twin update failed:', syncError);
      }
    }

    const response: ApiResponse<Prescription> = {
      success: true,
      data: updatedPrescription,
      message: 'Prescription updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating prescription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prescription',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

// Request refill
router.post('/prescriptions/:id/refill', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prescription = prescriptions.get(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        error: 'Prescription not found',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    if (prescription.refillsRemaining <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No refills remaining',
        timestamp: new Date().toISOString()
      } as ApiResponse<null>);
    }

    prescription.refillsRemaining -= 1;

    // Publish refill requested event
    try {
      await customerOpsBridge.publishEvent('prescription.refill-requested', {
        prescriptionId: prescription.id,
        patientId: prescription.patientId,
        medication: prescription.medication,
        refillsRemaining: prescription.refillsRemaining
      });
    } catch (eventError) {
      logger.warn('Event publish failed:', eventError);
    }

    prescriptions.set(id, prescription);

    const response: ApiResponse<Prescription> = {
      success: true,
      data: prescription,
      message: `Refill requested. ${prescription.refillsRemaining} refills remaining.`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error requesting refill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request refill',
      timestamp: new Date().toISOString()
    } as ApiResponse<null>);
  }
});

export default router;
