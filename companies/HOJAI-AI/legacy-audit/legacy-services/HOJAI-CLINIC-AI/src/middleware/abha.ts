import axios from 'axios';
import { config } from '../config';
import { Patient } from '../models';
import { Types } from 'mongoose';

export interface AbhaVerificationResult {
  success: boolean;
  abhaId?: string;
  abhaNumber?: string;
  name?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: {
    district?: string;
    state?: string;
    country?: string;
  };
  error?: string;
}

export class AbhaService {
  private apiUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.apiUrl = config.abha.apiUrl;
    this.clientId = config.abha.clientId;
    this.clientSecret = config.abha.clientSecret;
  }

  /**
   * Check if ABHA service is configured
   */
  isConfigured(): boolean {
    return !!(this.apiUrl && this.clientId && this.clientSecret);
  }

  /**
   * Generate ABHA address (username)
   */
  async generateAbhaAddress(prefix?: string): Promise<{ abhaAddress: string; transactionId: string }> {
    if (!this.isConfigured()) {
      throw new Error('ABHA service is not configured');
    }

    // This would call the actual ABHA API
    // For now, return a mock response
    const abhaAddress = `${prefix || 'user'}_${Date.now().toString(36)}@abha`;
    const transactionId = `txn_${Date.now().toString(36)}`;

    return { abhaAddress, transactionId };
  }

  /**
   * Verify ABHA ID
   */
  async verifyAbhaId(abhaId: string): Promise<AbhaVerificationResult> {
    if (!this.isConfigured()) {
      // In development without ABHA, simulate verification
      return {
        success: true,
        abhaId,
        name: 'Demo User',
        gender: 'M',
        dateOfBirth: '1990-01-01',
      };
    }

    try {
      // Call ABHA API to verify
      const response = await axios.post(
        `${this.apiUrl}/hip/verifyAadhaar`,
        { aadhaar: abhaId },
        {
          headers: {
            'Content-Type': 'application/json',
            'client-id': this.clientId,
            'client-secret': this.clientSecret,
          },
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          abhaId: response.data.healthIdNumber,
          name: response.data.name,
          gender: response.data.gender,
          dateOfBirth: response.data.dayOfBirth,
          phone: response.data.mobile,
          email: response.data.email,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Verification failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Verification failed',
      };
    }
  }

  /**
   * Verify ABHA number (12-digit)
   */
  async verifyAbhaNumber(abhaNumber: string): Promise<AbhaVerificationResult> {
    if (!this.isConfigured()) {
      // In development without ABHA, simulate verification
      if (/^\d{14}$/.test(abhaNumber)) {
        return {
          success: true,
          abhaNumber,
          name: 'Demo User',
          gender: 'M',
        };
      }
      return {
        success: false,
        error: 'Invalid ABHA number format',
      };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/hip/verifyMobile`,
        { healthIdNumber: abhaNumber },
        {
          headers: {
            'Content-Type': 'application/json',
            'client-id': this.clientId,
            'client-secret': this.clientSecret,
          },
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          abhaNumber: response.data.healthIdNumber,
          name: response.data.name,
          gender: response.data.gender,
          dateOfBirth: response.data.dayOfBirth,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Verification failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Verification failed',
      };
    }
  }

  /**
   * Link ABHA to patient
   */
  async linkAbhaToPatient(
    clinicId: string,
    patientId: string,
    abhaId: string,
    abhaNumber?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verify ABHA first
    const verification = await this.verifyAbhaId(abhaId);

    if (!verification.success) {
      return { success: false, error: verification.error };
    }

    // Update patient record
    const patient = await Patient.findOne({
      _id: new Types.ObjectId(patientId),
      clinicId: new Types.ObjectId(clinicId),
    });

    if (!patient) {
      return { success: false, error: 'Patient not found' };
    }

    patient.abhaId = abhaId;
    if (abhaNumber) {
      patient.abhaNumber = abhaNumber;
    }

    await patient.save();

    return { success: true };
  }

  /**
   * Get patient health records from ABHA
   */
  async getHealthRecords(
    abhaId: string
  ): Promise<{
    success: boolean;
    records?: Array<{
      type: string;
      date: string;
      provider: string;
      summary: string;
    }>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: true,
        records: [],
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/healthRecords/${abhaId}`,
        {
          headers: {
            Authorization: `Bearer ${await this.getAccessToken()}`,
          },
        }
      );

      return {
        success: true,
        records: response.data.records || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch records',
      };
    }
  }

  /**
   * Get access token for ABHA API
   */
  private async getAccessToken(): Promise<string> {
    // In production, implement OAuth2 flow to get access token
    // For now, return empty string
    return '';
  }

  /**
   * Search patient by ABHA
   */
  async searchByAbha(
    clinicId: string,
    abhaId: string
  ): Promise<Patient | null> {
    return Patient.findOne({
      clinicId: new Types.ObjectId(clinicId),
      abhaId,
      isActive: true,
    });
  }
}

export const abhaService = new AbhaService();
export default abhaService;
