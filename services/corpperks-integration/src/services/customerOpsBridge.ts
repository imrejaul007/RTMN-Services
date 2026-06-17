import axios, { AxiosInstance } from 'axios';
import { EmployeeProfile } from '../models/EmployeeProfile';
import { logger } from '../index';

interface TwinConnection {
  twinId: string;
  twinType: string;
  twinUrl: string;
  connectedAt: string;
  lastSync: string;
  status: 'connected' | 'disconnected' | 'error';
}

interface CustomerOpsEvent {
  eventId: string;
  eventType: string;
  source: string;
  target: string;
  payload: any;
  timestamp: string;
}

interface SyncResult {
  success: boolean;
  twinId?: string;
  error?: string;
  syncedAt?: string;
}

class CustomerOpsBridge {
  private httpClient: AxiosInstance;
  private twinConnections: Map<string, TwinConnection> = new Map();

  // Service URLs from environment
  private employeeTwinUrl: string;
  private paymentTwinUrl: string;
  private industryTwinUrl: string;
  private eventBusUrl: string;
  private serviceRegistryUrl: string;

  constructor() {
    this.employeeTwinUrl = process.env.EMPLOYEE_TWIN_URL || 'http://localhost:3011';
    this.paymentTwinUrl = process.env.PAYMENT_TWIN_URL || 'http://localhost:3012';
    this.industryTwinUrl = process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705';
    this.eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';
    this.serviceRegistryUrl = process.env.SERVICE_REGISTRY_URL || 'http://localhost:4399';

    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.initializeConnections();
  }

  private async initializeConnections(): Promise<void> {
    logger.info('Initializing Customer Ops Bridge connections...');

    // Initialize Employee Twin connection
    this.twinConnections.set('employee', {
      twinId: '',
      twinType: 'employee-twin',
      twinUrl: this.employeeTwinUrl,
      connectedAt: new Date().toISOString(),
      lastSync: '',
      status: 'disconnected'
    });

    // Initialize Payment Twin connection
    this.twinConnections.set('payment', {
      twinId: '',
      twinType: 'payment-twin',
      twinUrl: this.paymentTwinUrl,
      connectedAt: new Date().toISOString(),
      lastSync: '',
      status: 'disconnected'
    });

    // Initialize Industry Twin connection
    this.twinConnections.set('industry', {
      twinId: '',
      twinType: 'industry-twin',
      twinUrl: this.industryTwinUrl,
      connectedAt: new Date().toISOString(),
      lastSync: '',
      status: 'disconnected'
    });

    // Test connections
    await this.testConnections();
  }

  private async testConnections(): Promise<void> {
    const tests = [
      { name: 'Employee Twin', url: this.employeeTwinUrl },
      { name: 'Payment Twin', url: this.paymentTwinUrl },
      { name: 'Industry Twin', url: this.industryTwinUrl }
    ];

    for (const test of tests) {
      try {
        await this.httpClient.get(`${test.url}/health`);
        logger.info(`${test.name} connection successful`);
      } catch (error) {
        logger.warn(`${test.name} not reachable at ${test.url}`);
      }
    }
  }

  /**
   * Connect Employee Profile to Employee Twin
   */
  async connectEmployeeTwin(employee: EmployeeProfile): Promise<SyncResult> {
    try {
      logger.info(`Connecting employee ${employee.employeeId} to Employee Twin`);

      // In production, call the actual Employee Twin API
      // POST /api/employee-twin/profiles
      const response = await this.httpClient.post(
        `${this.employeeTwinUrl}/api/profiles`,
        {
          sourceId: employee.employeeId,
          sourceType: 'corpperks',
          profile: {
            employeeId: employee.employeeId,
            employeeNumber: employee.employeeNumber,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            phone: employee.phone,
            companyId: employee.companyId,
            department: employee.department,
            jobTitle: employee.jobTitle,
            employmentType: employee.employmentType,
            status: employee.status,
            hireDate: employee.hireDate,
            workLocation: employee.workLocation
          },
          metadata: {
            connectedAt: new Date().toISOString(),
            source: 'corpperks-integration'
          }
        }
      );

      const twinId = response.data?.twinId || `EMP-TWIN-${employee.employeeId.substring(0, 8)}`;

      // Update connection status
      this.twinConnections.set('employee', {
        ...this.twinConnections.get('employee')!,
        twinId,
        lastSync: new Date().toISOString(),
        status: 'connected'
      });

      // Publish event to Event Bus
      await this.publishEvent({
        eventId: `evt-${Date.now()}`,
        eventType: 'employee.twin.connected',
        source: 'corpperks-integration',
        target: 'employee-twin',
        payload: {
          employeeId: employee.employeeId,
          twinId,
          action: 'created'
        },
        timestamp: new Date().toISOString()
      });

      logger.info(`Employee ${employee.employeeId} connected to Employee Twin: ${twinId}`);
      return {
        success: true,
        twinId,
        syncedAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error(`Failed to connect employee to twin: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Connect Payroll to Payment Twin
   */
  async connectPaymentTwin(payrollData: any): Promise<SyncResult> {
    try {
      logger.info(`Connecting payroll ${payrollData.recordId} to Payment Twin`);

      // In production, call the actual Payment Twin API
      // POST /api/payment-twin/transactions
      const response = await this.httpClient.post(
        `${this.paymentTwinUrl}/api/transactions`,
        {
          sourceId: payrollData.recordId,
          sourceType: 'corpperks-payroll',
          transaction: {
            employeeId: payrollData.employeeId,
            amount: payrollData.netPay,
            type: 'payroll',
            payPeriod: payrollData.payPeriod,
            status: payrollData.status,
            paymentMethod: payrollData.paymentMethod
          },
          metadata: {
            connectedAt: new Date().toISOString(),
            source: 'corpperks-integration'
          }
        }
      );

      const twinId = response.data?.twinId || `PAY-TWIN-${payrollData.recordId.substring(0, 8)}`;

      // Update connection status
      this.twinConnections.set('payment', {
        ...this.twinConnections.get('payment')!,
        twinId,
        lastSync: new Date().toISOString(),
        status: 'connected'
      });

      // Publish event
      await this.publishEvent({
        eventId: `evt-${Date.now()}`,
        eventType: 'payment.twin.created',
        source: 'corpperks-integration',
        target: 'payment-twin',
        payload: {
          recordId: payrollData.recordId,
          twinId,
          amount: payrollData.netPay
        },
        timestamp: new Date().toISOString()
      });

      logger.info(`Payroll ${payrollData.recordId} connected to Payment Twin: ${twinId}`);
      return {
        success: true,
        twinId,
        syncedAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error(`Failed to connect payroll to Payment Twin: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Connect Benefits to Industry Twin (HR)
   */
  async connectIndustryTwin(benefitData: any): Promise<SyncResult> {
    try {
      logger.info(`Connecting benefits ${benefitData.enrollmentId} to Industry Twin`);

      // In production, call the actual Industry Twin API
      // POST /api/industry-twin/hr-benefits
      const response = await this.httpClient.post(
        `${this.industryTwinUrl}/api/hr-benefits`,
        {
          sourceId: benefitData.enrollmentId,
          sourceType: 'corpperks-benefits',
          benefit: {
            employeeId: benefitData.employeeId,
            health: benefitData.benefits.health,
            dental: benefitData.benefits.dental,
            vision: benefitData.benefits.vision,
            life: benefitData.benefits.life,
            retirement: benefitData.benefits.retirement,
            status: benefitData.status,
            effectiveDate: benefitData.effectiveDate
          },
          metadata: {
            connectedAt: new Date().toISOString(),
            source: 'corpperks-integration',
            industry: 'hr'
          }
        }
      );

      const twinId = response.data?.twinId || `HR-TWIN-${benefitData.enrollmentId.substring(0, 8)}`;

      // Update connection status
      this.twinConnections.set('industry', {
        ...this.twinConnections.get('industry')!,
        twinId,
        lastSync: new Date().toISOString(),
        status: 'connected'
      });

      // Publish event
      await this.publishEvent({
        eventId: `evt-${Date.now()}`,
        eventType: 'benefits.industry.connected',
        source: 'corpperks-integration',
        target: 'industry-twin',
        payload: {
          enrollmentId: benefitData.enrollmentId,
          twinId,
          industry: 'hr'
        },
        timestamp: new Date().toISOString()
      });

      logger.info(`Benefits ${benefitData.enrollmentId} connected to Industry Twin: ${twinId}`);
      return {
        success: true,
        twinId,
        syncedAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error(`Failed to connect benefits to Industry Twin: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Publish event to Event Bus
   */
  async publishEvent(event: CustomerOpsEvent): Promise<boolean> {
    try {
      await this.httpClient.post(`${this.eventBusUrl}/events`, event);
      logger.debug(`Event published: ${event.eventType}`);
      return true;
    } catch (error: any) {
      logger.warn(`Failed to publish event: ${error.message}`);
      return false;
    }
  }

  /**
   * Register this service with Service Registry
   */
  async registerService(): Promise<boolean> {
    try {
      await this.httpClient.post(`${this.serviceRegistryUrl}/api/services`, {
        name: 'corpperks-integration',
        type: 'integration',
        port: process.env.PORT || 4968,
        url: `http://localhost:${process.env.PORT || 4968}`,
        endpoints: [
          '/api/hr',
          '/api/payroll',
          '/api/benefits'
        ],
        twins: [
          { type: 'employee-twin', url: this.employeeTwinUrl },
          { type: 'payment-twin', url: this.paymentTwinUrl },
          { type: 'industry-twin', url: this.industryTwinUrl }
        ],
        healthCheck: '/health'
      });
      logger.info('Service registered with Service Registry');
      return true;
    } catch (error: any) {
      logger.warn(`Failed to register service: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all twin connections status
   */
  getConnectionsStatus(): TwinConnection[] {
    return Array.from(this.twinConnections.values());
  }

  /**
   * Get connection status for a specific twin type
   */
  getConnectionStatus(type: 'employee' | 'payment' | 'industry'): TwinConnection | undefined {
    return this.twinConnections.get(type);
  }

  /**
   * Sync employee data to all relevant twins
   */
  async syncEmployeeAll(employee: EmployeeProfile): Promise<{
    employeeTwin?: SyncResult;
    paymentTwin?: SyncResult;
    industryTwin?: SyncResult;
  }> {
    const results: {
      employeeTwin?: SyncResult;
      paymentTwin?: SyncResult;
      industryTwin?: SyncResult;
    } = {};

    // Connect to Employee Twin
    results.employeeTwin = await this.connectEmployeeTwin(employee);

    // Connect benefits to Industry Twin if present
    if (employee.benefitsPackage) {
      results.industryTwin = await this.connectIndustryTwin({
        enrollmentId: `ENR-${employee.employeeId}`,
        employeeId: employee.employeeId,
        benefits: {
          health: { enrolled: true, ...employee.benefitsPackage.healthInsurance },
          dental: { enrolled: !!employee.benefitsPackage.dentalInsurance },
          vision: { enrolled: !!employee.benefitsPackage.visionInsurance },
          life: { enrolled: !!employee.benefitsPackage.lifeInsurance },
          retirement: { enrolled: !!employee.benefitsPackage.retirement401k }
        },
        status: 'active',
        effectiveDate: employee.startDate || employee.hireDate
      });
    }

    return results;
  }
}

// Export singleton instance
export const customerOpsBridge = new CustomerOpsBridge();
export default customerOpsBridge;
