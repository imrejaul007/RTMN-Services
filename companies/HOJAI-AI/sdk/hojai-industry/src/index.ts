/**
 * @hojai/industry SDK
 *
 * Client for the 24 (now 26 with Event-Banquet and Exhibition) vertical
 * Industry OS services of the RTMN ecosystem. Each industry has its own
 * sub-client targeting its dedicated port.
 *
 * 22 of the 26 sub-clients share a common template surface
 * (menu/orders/tables/customers) via IndustryBaseClient. Hotel, Beauty,
 * Event-Banquet, and Exhibition have richer industry-specific surfaces.
 *
 * @example
 * ```ts
 * import { Industry } from '@hojai/industry';
 *
 * const ind = new Industry({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // Restaurant: create an order
 * const order = await ind.restaurant.createOrder({
 *   tableId: 't-1', customerId: 'c-1',
 *   items: [{ menuItemId: 'm-1', quantity: 2 }]
 * });
 *
 * // Hotel: book + check in
 * const booking = await ind.hotel.createBooking({
 *   roomId: 'r-101', guestId: 'g-1',
 *   checkIn: '2026-07-01', checkOut: '2026-07-05'
 * });
 * await ind.hotel.checkIn(booking.id);
 *
 * // Beauty: book an appointment
 * const appt = await ind.beauty.createAppointment({
 *   serviceId: 's-1', stylistId: 'st-1', customerId: 'c-1',
 *   startAt: '2026-07-01T10:00:00Z'
 * });
 *
 * // Event: full lifecycle
 * const event = await ind.eventBanquet.createEvent({
 *   name: 'Wedding', eventDate: '2026-08-15', startTime: '18:00', endTime: '23:00',
 *   venue: 'Grand Ballroom', guestCount: 200, customerId: 'c-1'
 * });
 * await ind.eventBanquet.confirm(event.id);
 * await ind.eventBanquet.start(event.id);
 * await ind.eventBanquet.complete(event.id);
 *
 * // Cross-industry: get all open orders across all 22 template-style industries
 * const openOrders = await Promise.all([
 *   ind.restaurant.listOrders({ status: 'pending' }),
 *   ind.retail.listOrders({ status: 'pending' }),
 *   ind.healthcare.listOrders({ status: 'pending' }),
 * ]);
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { IndustryBaseClient, type CreateOrderRequest, type AddMenuItemRequest, type AddCustomerRequest } from './base.js';
import { INDUSTRY_PORTS, type MenuItem, type Order, type Table, type Customer } from './types.js';

import { RestaurantClient } from './restaurant.js';
import { HotelClient, type Room, type Booking, type Guest } from './hotel.js';
import { HealthcareClient } from './healthcare.js';
import { RetailClient } from './retail.js';
import { LegalClient } from './legal.js';
import { EducationClient } from './education.js';
import { AgricultureClient } from './agriculture.js';
import { AutomotiveClient } from './automotive.js';
import { BeautyClient, type Service, type Stylist, type StylistAvailability, type Appointment } from './beauty.js';
import { FashionClient } from './fashion.js';
import { FitnessClient } from './fitness.js';
import { GamingClient } from './gaming.js';
import { GovernmentClient } from './government.js';
import { HomeServicesClient } from './home-services.js';
import { ManufacturingClient } from './manufacturing.js';
import { NonProfitClient } from './non-profit.js';
import { ProfessionalClient } from './professional.js';
import { SportsClient } from './sports.js';
import { TravelClient } from './travel.js';
import { EntertainmentClient } from './entertainment.js';
import { ConstructionClient } from './construction.js';
import { FinancialClient } from './financial.js';
import { RealEstateClient } from './real-estate.js';
import { TransportClient } from './transport.js';
import { EventBanquetClient, type EventRecord, type EventModule, type EventAgent, type CreateEventRequest } from './event-banquet.js';
import { ExhibitionClient, type Exhibition, type ExhibitionModule, type ExhibitionAgent, type CreateExhibitionRequest, type Booth } from './exhibition.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { IndustryBaseClient, type CreateOrderRequest, type AddMenuItemRequest, type AddCustomerRequest } from './base.js';
export { INDUSTRY_PORTS, type MenuItem, type Order, type Table, type Customer } from './types.js';

export { RestaurantClient } from './restaurant.js';
export { HotelClient, type Room, type Booking, type Guest } from './hotel.js';
export { HealthcareClient } from './healthcare.js';
export { RetailClient } from './retail.js';
export { LegalClient } from './legal.js';
export { EducationClient } from './education.js';
export { AgricultureClient } from './agriculture.js';
export { AutomotiveClient } from './automotive.js';
export { BeautyClient, type Service, type Stylist, type StylistAvailability, type Appointment } from './beauty.js';
export { FashionClient } from './fashion.js';
export { FitnessClient } from './fitness.js';
export { GamingClient } from './gaming.js';
export { GovernmentClient } from './government.js';
export { HomeServicesClient } from './home-services.js';
export { ManufacturingClient } from './manufacturing.js';
export { NonProfitClient } from './non-profit.js';
export { ProfessionalClient } from './professional.js';
export { SportsClient } from './sports.js';
export { TravelClient } from './travel.js';
export { EntertainmentClient } from './entertainment.js';
export { ConstructionClient } from './construction.js';
export { FinancialClient } from './financial.js';
export { RealEstateClient } from './real-estate.js';
export { TransportClient } from './transport.js';
export { EventBanquetClient, type EventRecord, type EventModule, type EventAgent, type CreateEventRequest } from './event-banquet.js';
export { ExhibitionClient, type Exhibition, type ExhibitionModule, type ExhibitionAgent, type CreateExhibitionRequest, type Booth } from './exhibition.js';

/**
 * Main Industry SDK client (facade)
 *
 * Exposes one sub-client per industry OS, targeting its dedicated port.
 * The 22 template-style industries (Restaurant, Healthcare, Retail, ...)
 * share the 9-method surface from IndustryBaseClient. Hotel, Beauty,
 * Event-Banquet, and Exhibition have richer industry-specific surfaces.
 */
export class Industry {
  public readonly restaurant: RestaurantClient;
  public readonly hotel: HotelClient;
  public readonly healthcare: HealthcareClient;
  public readonly retail: RetailClient;
  public readonly legal: LegalClient;
  public readonly education: EducationClient;
  public readonly agriculture: AgricultureClient;
  public readonly automotive: AutomotiveClient;
  public readonly beauty: BeautyClient;
  public readonly fashion: FashionClient;
  public readonly fitness: FitnessClient;
  public readonly gaming: GamingClient;
  public readonly government: GovernmentClient;
  public readonly homeServices: HomeServicesClient;
  public readonly manufacturing: ManufacturingClient;
  public readonly nonProfit: NonProfitClient;
  public readonly professional: ProfessionalClient;
  public readonly sports: SportsClient;
  public readonly travel: TravelClient;
  public readonly entertainment: EntertainmentClient;
  public readonly construction: ConstructionClient;
  public readonly financial: FinancialClient;
  public readonly realEstate: RealEstateClient;
  public readonly transport: TransportClient;
  public readonly eventBanquet: EventBanquetClient;
  public readonly exhibition: ExhibitionClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;

    this.restaurant = new RestaurantClient(resolved);
    this.hotel = new HotelClient(resolved);
    this.healthcare = new HealthcareClient(resolved);
    this.retail = new RetailClient(resolved);
    this.legal = new LegalClient(resolved);
    this.education = new EducationClient(resolved);
    this.agriculture = new AgricultureClient(resolved);
    this.automotive = new AutomotiveClient(resolved);
    this.beauty = new BeautyClient(resolved);
    this.fashion = new FashionClient(resolved);
    this.fitness = new FitnessClient(resolved);
    this.gaming = new GamingClient(resolved);
    this.government = new GovernmentClient(resolved);
    this.homeServices = new HomeServicesClient(resolved);
    this.manufacturing = new ManufacturingClient(resolved);
    this.nonProfit = new NonProfitClient(resolved);
    this.professional = new ProfessionalClient(resolved);
    this.sports = new SportsClient(resolved);
    this.travel = new TravelClient(resolved);
    this.entertainment = new EntertainmentClient(resolved);
    this.construction = new ConstructionClient(resolved);
    this.financial = new FinancialClient(resolved);
    this.realEstate = new RealEstateClient(resolved);
    this.transport = new TransportClient(resolved);
    this.eventBanquet = new EventBanquetClient(resolved);
    this.exhibition = new ExhibitionClient(resolved);
  }
}

export default Industry;
