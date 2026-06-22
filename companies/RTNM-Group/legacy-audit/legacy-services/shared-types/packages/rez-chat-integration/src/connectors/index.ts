// ── Connectors ────────────────────────────────────────────────────────────────────

export { HotelOTAConnector } from './hotel.connector';
export type {
  HotelSearchParams,
  HotelSearchResult,
  HotelDetails,
  RoomAvailability,
  BookingHold,
  BookingConfirmation,
  BookingDetails,
} from './hotel.connector';

export { MerchantConnector } from './merchant.connector';
export type {
  MerchantSearchParams,
  MerchantSearchResult,
  MerchantDetails,
  MenuItem,
  Menu,
  ProductSearchResult,
  TableAvailability,
} from './merchant.connector';

export { OrderConnector } from './order.connector';
export type {
  CartItem,
  AddToCartResult,
  PlaceOrderParams,
  OrderResult,
  OrderDetails,
  OrderHistoryItem,
} from './order.connector';

export { WalletConnector } from './wallet.connector';
export type {
  WalletBalance,
  CheckoutCalculation,
  CoinTransaction,
} from './wallet.connector';

export { LoyaltyConnector } from './loyalty.connector';
export type {
  LoyaltyProfile,
  ExpiringReward,
  TierBenefit,
} from './loyalty.connector';

export { NotificationConnector } from './notification.connector';
export type {
  NotificationPayload,
  NotificationResult,
} from './notification.connector';
