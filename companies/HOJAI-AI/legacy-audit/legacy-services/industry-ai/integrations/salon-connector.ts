/**
 * HOJAI Salon AI - REZ-Merchant Connector
 */

export interface SalonConnectorConfig {
  useREZServices: boolean;
  rezApiKey?: string;
  rezBaseUrl?: string;
}

export interface SalonService {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
}

export class SalonConnector {
  private config: SalonConnectorConfig;

  constructor(config: SalonConnectorConfig) {
    this.config = config;
  }

  /**
   * Get salon services
   */
  async getServices(salonId: string): Promise<SalonService[]> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/salons/${salonId}/services`, {
        headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` },
      });
      return response.json();
    }
    return this.getLocalServices(salonId);
  }

  /**
   * Book appointment
   */
  async bookAppointment(salonId: string, data: {
    customerId: string;
    serviceId: string;
    staffId?: string;
    date: string;
    time: string;
  }): Promise<Appointment> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/salons/${salonId}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    }
    return this.createLocalAppointment(salonId, data);
  }

  /**
   * Get available slots
   */
  async getAvailableSlots(salonId: string, serviceId: string, date: string): Promise<string[]> {
    if (this.config.useREZServices) {
      const response = await fetch(
        `${this.config.rezBaseUrl}/salons/${salonId}/slots?service=${serviceId}&date=${date}`,
        { headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` } }
      );
      return response.json();
    }
    return this.getLocalSlots(serviceId, date);
  }

  // Local methods - These call services built in hojai-ai/industry-ai/salon-ai/
  private async getLocalServices(salonId: string): Promise<SalonService[]> {
    // Mock data for development - replace with actual service call
    return this.mockServices;
  }

  private async createLocalAppointment(salonId: string, data: any): Promise<Appointment> {
    console.log(`[Local] Creating appointment for salon: ${salonId}`);
    return { id: `local-appt-${Date.now()}`, ...data, status: 'confirmed' };
  }

  private async getLocalSlots(serviceId: string, date: string): Promise<string[]> {
    // Generate slots based on time range
    const slots: string[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 18) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  }

  // Mock data for development
  private mockServices: SalonService[] = [
    { id: 'svc-1', name: 'Haircut', category: 'Hair', duration: 30, price: 299 },
    { id: 'svc-2', name: 'Facial', category: 'Skin', duration: 45, price: 599 },
    { id: 'svc-3', name: 'Manicure', category: 'Nails', duration: 30, price: 299 },
    { id: 'svc-4', name: 'Hair Coloring', category: 'Hair', duration: 90, price: 1999 },
  ];
}
