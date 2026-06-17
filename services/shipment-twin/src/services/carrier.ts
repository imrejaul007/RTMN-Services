import { Carrier, ICarrier } from '../models';
import { CreateCarrierRequest } from '../types';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';

export class CarrierService {
  /**
   * Create a new carrier
   */
  async createCarrier(data: CreateCarrierRequest): Promise<ICarrier> {
    const existing = await Carrier.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw new ConflictError(`Carrier with code ${data.code} already exists`);
    }

    const carrier = new Carrier({
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description,
      trackingUrl: data.trackingUrl,
      apiKey: data.apiKey,
      active: data.active ?? true,
      services: data.services || []
    });

    await carrier.save();
    logger.info(`Carrier created: ${carrier.code}`);

    return carrier;
  }

  /**
   * Get carrier by code
   */
  async getCarrier(code: string): Promise<ICarrier> {
    const carrier = await Carrier.findByCode(code);
    if (!carrier) {
      throw new NotFoundError('Carrier');
    }
    return carrier;
  }

  /**
   * Get all active carriers
   */
  async getActiveCarriers(): Promise<ICarrier[]> {
    return Carrier.getActive();
  }

  /**
   * List all carriers with optional filters
   */
  async listCarriers(options: {
    active?: boolean;
    skip?: number;
    limit?: number;
  } = {}): Promise<{ carriers: ICarrier[]; total: number }> {
    const query: any = {};
    if (typeof options.active === 'boolean') {
      query.active = options.active;
    }

    const [carriers, total] = await Promise.all([
      Carrier.find(query)
        .sort({ name: 1 })
        .skip(options.skip || 0)
        .limit(options.limit || 50),
      Carrier.countDocuments(query)
    ]);

    return { carriers, total };
  }

  /**
   * Update carrier
   */
  async updateCarrier(
    code: string,
    updates: Partial<CreateCarrierRequest>
  ): Promise<ICarrier> {
    const carrier = await Carrier.findByCode(code);
    if (!carrier) {
      throw new NotFoundError('Carrier');
    }

    if (updates.name) carrier.name = updates.name;
    if (updates.description !== undefined) carrier.description = updates.description;
    if (updates.trackingUrl !== undefined) carrier.trackingUrl = updates.trackingUrl;
    if (updates.apiKey !== undefined) carrier.apiKey = updates.apiKey;
    if (updates.active !== undefined) carrier.active = updates.active;
    if (updates.services) carrier.services = updates.services;

    await carrier.save();
    logger.info(`Carrier updated: ${code}`);

    return carrier;
  }

  /**
   * Deactivate carrier
   */
  async deactivateCarrier(code: string): Promise<ICarrier> {
    const carrier = await Carrier.findByCode(code);
    if (!carrier) {
      throw new NotFoundError('Carrier');
    }

    carrier.active = false;
    await carrier.save();
    logger.info(`Carrier deactivated: ${code}`);

    return carrier;
  }

  /**
   * Get carrier tracking URL with tracking number
   */
  async getTrackingUrl(code: string, trackingNumber: string): Promise<string> {
    const carrier = await Carrier.findByCode(code);
    if (!carrier) {
      throw new NotFoundError('Carrier');
    }

    return `${carrier.trackingUrl}${trackingNumber}`;
  }

  /**
   * Seed default carriers
   */
  async seedDefaults(): Promise<void> {
    await Carrier.seedDefaults();
    logger.info('Default carriers seeded');
  }
}

export const carrierService = new CarrierService();
