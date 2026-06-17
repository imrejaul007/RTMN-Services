import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';
import {
  PatientProfile,
  Appointment,
  Prescription,
  ApiResponse
} from '../models/PatientProfile';

interface TwinResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class CustomerOpsBridge {
  private customerTwinClient: AxiosInstance;
  private journeyTwinClient: AxiosInstance;
  private subscriptionTwinClient: AxiosInstance;
  private voiceAIClient: AxiosInstance;
  private eventBusClient: AxiosInstance;

  constructor() {
    const customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
    const journeyTwinUrl = process.env.JOURNEY_TWIN_URL || 'http://localhost:3016';
    const subscriptionTwinUrl = process.env.SUBSCRIPTION_TWIN_URL || 'http://localhost:3018';
    const voiceAIUrl = process.env.VOICE_AI_URL || 'http://localhost:3000';
    const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';

    this.customerTwinClient = axios.create({
      baseURL: customerTwinUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.journeyTwinClient = axios.create({
      baseURL: journeyTwinUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.subscriptionTwinClient = axios.create({
      baseURL: subscriptionTwinUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.voiceAIClient = axios.create({
      baseURL: voiceAIUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.eventBusClient = axios.create({
      baseURL: eventBusUrl,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ============ PATIENT → CUSTOMER TWIN ============

  async syncPatientToCustomerTwin(patient: PatientProfile): Promise<TwinResponse> {
    try {
      logger.info(`Syncing patient ${patient.id} to Customer Twin`);

      const customerData = {
        externalId: patient.id,
        corpid: patient.corpid,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        type: 'patient',
        industry: 'healthcare',
        metadata: {
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          insurance: patient.insuranceInfo,
          lifetimeValue: patient.lifetimeValue || 0,
          riskScore: patient.riskScore || 0
        },
        tags: ['healthcare', 'patient', 'risacare'],
        source: 'healthcare-integration'
      };

      const response = await this.customerTwinClient.post('/api/buyers', customerData);

      logger.info(`Patient ${patient.id} synced to Customer Twin: ${response.data?.id}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to sync patient to Customer Twin:`, error.message);

      // Return success with mock data for development
      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          data: { id: `CT-${patient.id}`, ...patient }
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateCustomerTwin(twinId: string, data: Partial<PatientProfile>): Promise<TwinResponse> {
    try {
      logger.info(`Updating Customer Twin ${twinId}`);

      const response = await this.customerTwinClient.patch(`/api/buyers/${twinId}`, {
        ...data,
        updatedAt: new Date().toISOString()
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to update Customer Twin:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return { success: true, data: { id: twinId, ...data } };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async removeFromCustomerTwin(twinId: string): Promise<TwinResponse> {
    try {
      logger.info(`Removing from Customer Twin: ${twinId}`);

      await this.customerTwinClient.delete(`/api/buyers/${twinId}`);

      return { success: true };
    } catch (error: any) {
      logger.error(`Failed to remove from Customer Twin:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return { success: true };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ APPOINTMENT → JOURNEY TWIN ============

  async syncToJourneyTwin(appointment: Appointment): Promise<TwinResponse> {
    try {
      logger.info(`Syncing appointment ${appointment.id} to Journey Twin`);

      const journeyData = {
        externalId: appointment.id,
        customerId: appointment.patientId,
        type: 'healthcare-appointment',
        stage: 'appointment_scheduled',
        status: appointment.status,
        scheduledAt: appointment.scheduledAt,
        metadata: {
          appointmentType: appointment.appointmentType,
          providerId: appointment.providerId,
          duration: appointment.duration,
          location: appointment.location,
          telehealhLink: appointment.telehealhLink
        },
        tags: ['healthcare', 'appointment', appointment.appointmentType],
        source: 'healthcare-integration'
      };

      const response = await this.journeyTwinClient.post('/api/referrals', journeyData);

      logger.info(`Appointment ${appointment.id} synced to Journey Twin: ${response.data?.id}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to sync to Journey Twin:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          data: { id: `JT-${appointment.id}`, ...appointment }
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateJourneyTwin(twinId: string, data: Partial<Appointment>): Promise<TwinResponse> {
    try {
      logger.info(`Updating Journey Twin ${twinId}`);

      const response = await this.journeyTwinClient.patch(`/api/referrals/${twinId}`, {
        ...data,
        updatedAt: new Date().toISOString()
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to update Journey Twin:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return { success: true, data: { id: twinId, ...data } };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ PRESCRIPTION → SUBSCRIPTION TWIN ============

  async syncToSubscriptionTwin(prescription: Prescription): Promise<TwinResponse> {
    try {
      logger.info(`Syncing prescription ${prescription.id} to Subscription Twin`);

      const subscriptionData = {
        externalId: prescription.id,
        customerId: prescription.patientId,
        type: 'healthcare-prescription',
        status: prescription.status,
        metadata: {
          medication: prescription.medication,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          refills: prescription.refills,
          refillsRemaining: prescription.refillsRemaining,
          prescribedBy: prescription.prescribedBy,
          prescribedAt: prescription.prescribedAt,
          pharmacy: prescription.pharmacy
        },
        billing: {
          type: 'subscription',
          interval: prescription.frequency,
          itemName: prescription.medication
        },
        tags: ['healthcare', 'prescription', 'medication'],
        source: 'healthcare-integration'
      };

      const response = await this.subscriptionTwinClient.post('/api/deals', subscriptionData);

      logger.info(`Prescription ${prescription.id} synced to Subscription Twin: ${response.data?.id}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to sync to Subscription Twin:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          data: { id: `ST-${prescription.id}`, ...prescription }
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateSubscriptionTwin(twinId: string, data: Partial<Prescription>): Promise<TwinResponse> {
    try {
      logger.info(`Updating Subscription Twin ${twinId}`);

      const response = await this.subscriptionTwinClient.patch(`/api/deals/${twinId}`, {
        ...data,
        updatedAt: new Date().toISOString()
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to update Subscription Twin:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return { success: true, data: { id: twinId, ...data } };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ TELEHEALTH → VOICE AI RUNTIME ============

  async initializeVoiceAISession(sessionData: {
    sessionId: string;
    patientId: string;
    providerId: string;
    sessionType: string;
    scheduledAt: string;
  }): Promise<TwinResponse> {
    try {
      logger.info(`Initializing Voice AI session for telehealth ${sessionData.sessionId}`);

      const response = await this.voiceAIClient.post('/api/conversations', {
        type: 'healthcare-telehealth',
        customerId: sessionData.patientId,
        metadata: {
          telehealthSessionId: sessionData.sessionId,
          providerId: sessionData.providerId,
          sessionType: sessionData.sessionType
        },
        settings: {
          enableTranscription: true,
          enableSentiment: true,
          enableSummary: true,
          language: 'en'
        }
      });

      logger.info(`Voice AI conversation created: ${response.data?.id}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to initialize Voice AI session:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          data: { conversationId: `VA-${sessionData.sessionId}` }
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async activateVoiceAI(conversationId: string): Promise<TwinResponse> {
    try {
      logger.info(`Activating Voice AI conversation: ${conversationId}`);

      const response = await this.voiceAIClient.post(`/api/conversations/${conversationId}/activate`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to activate Voice AI:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return { success: true };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async deactivateVoiceAI(conversationId: string, metadata: {
    duration?: number;
    notes?: string;
  }): Promise<TwinResponse> {
    try {
      logger.info(`Deactivating Voice AI conversation: ${conversationId}`);

      const response = await this.voiceAIClient.post(`/api/conversations/${conversationId}/end`, {
        duration: metadata.duration,
        summary: metadata.notes,
        endedAt: new Date().toISOString()
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.error(`Failed to deactivate Voice AI:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return { success: true };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelVoiceAISession(conversationId: string): Promise<TwinResponse> {
    try {
      logger.info(`Cancelling Voice AI session: ${conversationId}`);

      await this.voiceAIClient.post(`/api/conversations/${conversationId}/cancel`);

      return { success: true };
    } catch (error: any) {
      logger.error(`Failed to cancel Voice AI session:`, error.message);

      if (process.env.NODE_ENV === 'development') {
        return { success: true };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ EVENT BUS ============

  async publishEvent(eventType: string, payload: any): Promise<TwinResponse> {
    try {
      logger.info(`Publishing event: ${eventType}`);

      const response = await this.eventBusClient.post('/events/publish', {
        type: eventType,
        source: 'healthcare-integration',
        timestamp: new Date().toISOString(),
        data: payload
      });

      logger.info(`Event published: ${eventType}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      logger.warn(`Failed to publish event ${eventType}:`, error.message);

      // Events are non-critical, don't fail the operation
      return {
        success: true,
        error: error.message
      };
    }
  }
}
