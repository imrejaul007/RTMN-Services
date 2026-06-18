import Stripe from 'stripe';
import { BaseConnector, ConnectorConfig, SyncResult, EntityData } from './base';

export class StripeConnector extends BaseConnector {
  private stripe: Stripe | null = null;

  constructor(config: ConnectorConfig) {
    super('stripe', config);
  }

  protected initializeClient(): void {
    if (this.config.apiKey) {
      this.stripe = new Stripe(this.config.apiKey, {
        apiVersion: '2023-10-16'
      });
    } else {
      console.log('Stripe connector: Not configured, using mock mode');
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      await this.stripe.balance.retrieve();
      return { success: true };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to connect to Stripe' };
    }
  }

  async fetch(entityType: string, options: { limit?: number; starting_after?: string } = {}): Promise<EntityData[]> {
    if (!this.stripe) {
      console.log(`[MOCK] Fetching ${entityType} from Stripe`);
      return this.getMockData(entityType);
    }

    try {
      const params = { limit: options.limit || 100 };
      let response;

      switch (entityType) {
        case 'customers':
          response = await this.stripe.customers.list(params);
          break;
        case 'subscriptions':
          response = await this.stripe.subscriptions.list(params);
          break;
        case 'invoices':
          response = await this.stripe.invoices.list(params);
          break;
        case 'payments':
          response = await this.stripe.paymentIntents.list(params);
          break;
        case 'products':
          response = await this.stripe.products.list(params);
          break;
        case 'prices':
          response = await this.stripe.prices.list(params);
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      return response.data;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw { success: false, error: error.message };
      }
      throw { success: false, error: `Failed to fetch ${entityType}` };
    }
  }

  async push(entityType: string, data: EntityData[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: []
    };

    if (!this.stripe) {
      console.log(`[MOCK] Creating ${data.length} ${entityType} in Stripe`);
      result.recordsProcessed = data.length;
      result.recordsCreated = data.length;
      return result;
    }

    for (const item of data) {
      try {
        switch (entityType) {
          case 'customers':
            if (item.id) {
              const { id, ...updateData } = item;
              await this.stripe!.customers.update(String(item.id), updateData as Stripe.CustomerUpdateParams);
              result.recordsUpdated++;
            } else {
              await this.stripe!.customers.create(item as unknown as Stripe.CustomerCreateParams);
              result.recordsCreated++;
            }
            break;
          case 'subscriptions':
            if (item.id) {
              const { id, ...updateData } = item;
              await this.stripe!.subscriptions.update(String(item.id), updateData as Stripe.SubscriptionUpdateParams);
              result.recordsUpdated++;
            } else {
              await this.stripe!.subscriptions.create(item as unknown as Stripe.SubscriptionCreateParams);
              result.recordsCreated++;
            }
            break;
          case 'products':
            if (item.id) {
              const { id, ...updateData } = item;
              await this.stripe!.products.update(String(item.id), updateData as Stripe.ProductUpdateParams);
              result.recordsUpdated++;
            } else {
              await this.stripe!.products.create(item as unknown as Stripe.ProductCreateParams);
              result.recordsCreated++;
            }
            break;
          default:
            throw new Error(`Unsupported entity type for push: ${entityType}`);
        }
        result.recordsProcessed++;
      } catch (error) {
        result.recordsFailed++;
        result.errors.push({
          record: String(item.id) || JSON.stringify(item),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  getEntityTypes(): string[] {
    return ['customers', 'subscriptions', 'invoices', 'payments', 'products', 'prices'];
  }

  private getMockData(entityType: string): EntityData[] {
    const mockData: Record<string, EntityData[]> = {
      customers: [
        { id: 'cus_mock1', email: 'customer@example.com', name: 'John Doe' },
        { id: 'cus_mock2', email: 'jane@example.com', name: 'Jane Smith' }
      ],
      subscriptions: [
        { id: 'sub_mock1', customer: 'cus_mock1', status: 'active', amount: 9900 },
        { id: 'sub_mock2', customer: 'cus_mock2', status: 'trialing', amount: 4900 }
      ],
      invoices: [
        { id: 'in_mock1', customer: 'cus_mock1', amount_due: 9900, status: 'paid' },
        { id: 'in_mock2', customer: 'cus_mock2', amount_due: 4900, status: 'open' }
      ],
      payments: [
        { id: 'pi_mock1', amount: 9900, status: 'succeeded' },
        { id: 'pi_mock2', amount: 4900, status: 'succeeded' }
      ],
      products: [
        { id: 'prod_mock1', name: 'Basic Plan', active: true },
        { id: 'prod_mock2', name: 'Premium Plan', active: true }
      ],
      prices: [
        { id: 'price_mock1', product: 'prod_mock1', unit_amount: 9900, currency: 'usd' },
        { id: 'price_mock2', product: 'prod_mock2', unit_amount: 4900, currency: 'usd' }
      ]
    };
    return mockData[entityType] || [];
  }

  async createCustomer(data: Partial<EntityData>): Promise<EntityData> {
    if (!this.stripe) {
      return { id: `cus_mock_${Date.now()}`, ...data };
    }

    try {
      const customer = await this.stripe.customers.create(data as Stripe.CustomerCreateParams);
      return customer;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw { success: false, error: error.message };
      }
      throw error;
    }
  }

  async createSubscription(data: Partial<EntityData>): Promise<EntityData> {
    if (!this.stripe) {
      return { id: `sub_mock_${Date.now()}`, ...data };
    }

    try {
      const subscription = await this.stripe.subscriptions.create(data as Stripe.SubscriptionCreateParams);
      return subscription;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw { success: false, error: error.message };
      }
      throw error;
    }
  }

  async createPaymentIntent(data: Partial<EntityData>): Promise<EntityData> {
    if (!this.stripe) {
      return { id: `pi_mock_${Date.now()}`, ...data };
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create(data as Stripe.PaymentIntentCreateParams);
      return paymentIntent;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw { success: false, error: error.message };
      }
      throw error;
    }
  }

  async getCustomerBalance(customerId: string): Promise<{ balance: number }> {
    if (!this.stripe) {
      return { balance: 0 };
    }

    try {
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
      return { balance: customer.balance };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw { success: false, error: error.message };
      }
      throw error;
    }
  }

  async handleWebhook(payload: string, signature: string): Promise<{ received: boolean }> {
    if (!this.stripe || !this.config.webhookSecret) {
      console.log('[MOCK] Handling webhook');
      return { received: true };
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      return { received: true };
    } catch {
      throw { success: false, error: 'Webhook signature verification failed' };
    }
  }
}
