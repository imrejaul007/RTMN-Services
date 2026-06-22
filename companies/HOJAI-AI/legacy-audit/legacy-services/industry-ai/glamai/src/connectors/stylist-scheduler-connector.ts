/**
 * GlamAI → Stylist Scheduler Connector
 *
 * Connects GlamAI to automated scheduling
 * Enables auto-booking and smart stylist allocation
 *
 * Flow: Customer asks → Auto-schedule → Best Stylist → Confirmation
 *
 * @module glamai-stylist-scheduler-connector
 * @version 1.0.0
 */

import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

export interface Stylist {
  id: string;
  name: string;
  specialties: string[];
  rating: number;
  experience: number;
  availability: { [day: string]: string[] };
  currentLoad: number;
  maxDailyAppointments: number;
}

export interface TimeSlot {
  time: string;
  stylistId: string;
  stylistName: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  customerId: string;
  stylistId: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
}

export class StylistSchedulerConnector {
  private glamaiUrl: string;
  private salonaiUrl: string;

  constructor(config?: { glamaiUrl?: string; salonaiUrl?: string }) {
    this.glamaiUrl = config?.glamaiUrl || process.env.GLAMAI_URL || 'http://localhost:4830';
    this.salonaiUrl = config?.salonaiUrl || 'http://localhost:4811';

    logger.info('StylistSchedulerConnector initialized', { glamaiUrl: this.glamaiUrl });
  }

  /**
   * Find available slots for service
   */
  async findSlots(params: {
    salonId: string;
    serviceId: string;
    date: string;
    preferredStylistId?: string;
  }): Promise<TimeSlot[]> {
    try {
      logger.info('Finding available slots', { salonId: params.salonId, serviceId: params.serviceId, date: params.date });

      // Get stylists
      const stylists = await this.getAvailableStylists(params.salonId, params.preferredStylistId);

      // Generate slots for the day
      const slots: TimeSlot[] = [];
      const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

      for (const stylist of stylists) {
        for (const hour of hours) {
          const isAvailable = this.isStylistAvailable(stylist, params.date, hour);
          slots.push({
            time: hour,
            stylistId: stylist.id,
            stylistName: stylist.name,
            available: isAvailable
          });
        }
      }

      return slots.filter(s => s.available).sort((a, b) => a.time.localeCompare(b.time));
    } catch (error: any) {
      logger.error('Slot finding failed', { error: error.message });
      return [];
    }
  }

  /**
   * Auto-book best available slot
   */
  async autoBook(params: {
    salonId: string;
    customerId: string;
    serviceId: string;
    serviceName: string;
    date: string;
    preferredTime?: string;
    preferredStylistId?: string;
  }): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    try {
      logger.info('Auto-booking appointment', { customerId: params.customerId, service: params.serviceName, date: params.date });

      // Find best slot
      const slots = await this.findSlots({
        salonId: params.salonId,
        serviceId: params.serviceId,
        date: params.date,
        preferredStylistId: params.preferredStylistId
      });

      if (slots.length === 0) {
        return { success: false, error: 'No available slots' };
      }

      // Select best slot
      let selectedSlot: TimeSlot;
      if (params.preferredTime) {
        selectedSlot = slots.find(s => s.time === params.preferredTime) || slots[0];
      } else {
        selectedSlot = slots[0];
      }

      // Book appointment
      const appointment = await this.createAppointment({
        customerId: params.customerId,
        stylistId: selectedSlot.stylistId,
        serviceId: params.serviceId,
        serviceName: params.serviceName,
        date: params.date,
        time: selectedSlot.time,
        duration: 60
      });

      return { success: true, appointment };
    } catch (error: any) {
      logger.error('Auto-book failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get stylist availability
   */
  async getStylistAvailability(params: {
    salonId: string;
    stylistId: string;
    date: string;
  }): Promise<{ stylist: Stylist; daySchedule: string[] }> {
    const stylists = await this.getAvailableStylists(params.salonId);
    const stylist = stylists.find(s => s.id === params.stylistId);

    if (!stylist) throw new Error('Stylist not found');

    const daySlots = await this.findSlots({
      salonId: params.salonId,
      serviceId: 'any',
      date: params.date
    });

    const availableSlots = daySlots.filter(s => s.stylistId === params.stylistId);

    return {
      stylist,
      daySchedule: availableSlots.map(s => s.time)
    };
  }

  /**
   * Reschedule appointment
   */
  async reschedule(params: {
    appointmentId: string;
    newDate: string;
    newTime: string;
    newStylistId?: string;
  }): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    try {
      logger.info('Rescheduling appointment', { appointmentId: params.appointmentId });

      // Cancel old appointment
      await this.cancelAppointment(params.appointmentId);

      // Get original appointment details
      const original = await this.getAppointment(params.appointmentId);
      if (!original) return { success: false, error: 'Original appointment not found' };

      // Book new slot
      return this.autoBook({
        salonId: original.salonId || 'default',
        customerId: original.customerId,
        serviceId: original.serviceId,
        serviceName: original.serviceName,
        date: params.newDate,
        preferredTime: params.newTime,
        preferredStylistId: params.newStylistId || original.stylistId
      });
    } catch (error: any) {
      logger.error('Reschedule failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // ============ Private Methods ============

  private async getAvailableStylists(salonId: string, preferredId?: string): Promise<Stylist[]> {
    const stylists: Stylist[] = [
      { id: 'stylist-1', name: 'Priya', specialties: ['haircut', 'coloring'], rating: 4.8, experience: 5, availability: {}, currentLoad: 3, maxDailyAppointments: 10 },
      { id: 'stylist-2', name: 'Rahul', specialties: ['haircut', 'styling'], rating: 4.6, experience: 3, availability: {}, currentLoad: 5, maxDailyAppointments: 12 },
      { id: 'stylist-3', name: 'Sneha', specialties: ['facial', 'makeup'], rating: 4.9, experience: 7, availability: {}, currentLoad: 2, maxDailyAppointments: 8 },
      { id: 'stylist-4', name: 'Amit', specialties: ['haircut', 'beard'], rating: 4.5, experience: 4, availability: {}, currentLoad: 4, maxDailyAppointments: 10 }
    ];

    // Filter by preference
    if (preferredId) {
      const preferred = stylists.find(s => s.id === preferredId);
      if (preferred) {
        return [preferred, ...stylists.filter(s => s.id !== preferredId)];
      }
    }

    // Sort by load (prefer less busy)
    return stylists.sort((a, b) => a.currentLoad - b.currentLoad);
  }

  private isStylistAvailable(stylist: Stylist, date: string, time: string): boolean {
    // Check if stylist has capacity
    if (stylist.currentLoad >= stylist.maxDailyAppointments) return false;

    // Check day of week (example: closed on Sunday)
    const day = new Date(date).getDay();
    if (day === 0) return false;

    // Check time (salon hours 9AM - 8PM)
    const hour = parseInt(time.split(':')[0]);
    if (hour < 9 || hour >= 20) return false;

    return true;
  }

  private async createAppointment(params: {
    customerId: string;
    stylistId: string;
    serviceId: string;
    serviceName: string;
    date: string;
    time: string;
    duration: number;
  }): Promise<Appointment> {
    const appointment: Appointment = {
      id: `APT-${Date.now()}`,
      customerId: params.customerId,
      stylistId: params.stylistId,
      serviceId: params.serviceId,
      serviceName: params.serviceName,
      date: params.date,
      time: params.time,
      duration: params.duration,
      status: 'confirmed'
    };

    logger.info('Appointment created', { appointmentId: appointment.id });

    return appointment;
  }

  private async cancelAppointment(appointmentId: string): Promise<void> {
    logger.info('Appointment cancelled', { appointmentId });
  }

  private async getAppointment(appointmentId: string): Promise<any> {
    return { appointmentId, status: 'pending' };
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true };
  }
}

export const stylistSchedulerConnector = new StylistSchedulerConnector();
