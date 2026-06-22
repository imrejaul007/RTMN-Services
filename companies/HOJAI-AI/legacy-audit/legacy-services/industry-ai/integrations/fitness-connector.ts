/**
 * HOJAI Fitness AI - REZ-Merchant Connector
 */

export interface FitnessConnectorConfig {
  useREZServices: boolean;
  rezApiKey?: string;
  rezBaseUrl?: string;
}

export interface GymClass {
  id: string;
  name: string;
  trainer: string;
  time: string;
  capacity: number;
  booked: number;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  plan: string;
  status: 'active' | 'expired' | 'paused';
}

export class FitnessConnector {
  private config: FitnessConnectorConfig;

  constructor(config: FitnessConnectorConfig) {
    this.config = config;
  }

  /**
   * Get classes
   */
  async getClasses(gymId: string, date: string): Promise<GymClass[]> {
    if (this.config.useREZServices) {
      const response = await fetch(
        `${this.config.rezBaseUrl}/fitness/${gymId}/classes?date=${date}`,
        { headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` } }
      );
      return response.json();
    }
    return this.getLocalClasses(date);
  }

  /**
   * Book class
   */
  async bookClass(gymId: string, memberId: string, classId: string): Promise<{ success: boolean }> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/fitness/${gymId}/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId, classId }),
      });
      return response.json();
    }
    return { success: true };
  }

  /**
   * Check-in member
   */
  async checkIn(gymId: string, memberId: string): Promise<{ success: boolean }> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/fitness/${gymId}/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId }),
      });
      return response.json();
    }
    return { success: true };
  }

  // Local mock data
  private mockClasses: GymClass[] = [
    { id: 'cls-1', name: 'Yoga', trainer: 'Anita Desai', time: '06:00', capacity: 20, booked: 12 },
    { id: 'cls-2', name: 'Zumba', trainer: 'Rahul Verma', time: '07:30', capacity: 25, booked: 18 },
    { id: 'cls-3', name: 'HIIT', trainer: 'Suresh Patel', time: '09:00', capacity: 15, booked: 15 },
    { id: 'cls-4', name: 'Spinning', trainer: 'Meera Singh', time: '17:00', capacity: 12, booked: 8 },
    { id: 'cls-5', name: 'CrossFit', trainer: 'Vikram Rao', time: '18:30', capacity: 10, booked: 7 },
    { id: 'cls-6', name: 'Pilates', trainer: 'Anita Desai', time: '19:00', capacity: 15, booked: 10 },
  ];

  private mockMembers: Member[] = [
    { id: 'mem-001', name: 'Aditya Sharma', phone: '9876543001', plan: 'Annual Premium', status: 'active' },
    { id: 'mem-002', name: 'Neha Gupta', phone: '9876543002', plan: 'Monthly Basic', status: 'active' },
    { id: 'mem-003', name: 'Vijay Kumar', phone: '9876543003', plan: 'Quarterly Standard', status: 'active' },
  ];

  // Local methods
  private async getLocalClasses(date: string): Promise<GymClass[]> {
    return this.mockClasses;
  }
}
