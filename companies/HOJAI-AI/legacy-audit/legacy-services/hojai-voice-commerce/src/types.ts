// Voice Commerce Types

export interface VoiceOrder {
  orderId: string;
  customerId: string;
  customerPhone: string;
  items: VoiceOrderItem[];
  total: number;
  paymentMethod: 'upi' | 'cod' | 'card';
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: 'pending' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered';
  channel: 'voice' | 'whatsapp' | 'chat';
  createdAt: Date;
}

export interface VoiceOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface VoiceBooking {
  bookingId: string;
  customerId: string;
  customerPhone: string;
  service: 'restaurant' | 'salon' | 'clinic' | 'hotel' | 'ride';
  details: Record<string, any>;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  datetime?: Date;
  channel: 'voice' | 'whatsapp' | 'chat';
  createdAt: Date;
}

export interface VoicePayment {
  paymentId: string;
  orderId?: string;
  bookingId?: string;
  amount: number;
  method: 'upi' | 'card' | 'cod';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: Date;
}

export interface VoiceCart {
  cartId: string;
  customerId: string;
  customerPhone: string;
  items: VoiceOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'active' | 'checked_out' | 'abandoned';
  channel: 'voice' | 'whatsapp' | 'chat';
}

export interface VoiceIntent {
  intent: 'order' | 'book' | 'inquire' | 'cancel' | 'refund' | 'support' | 'payment';
  entities: Record<string, any>;
  confidence: number;
  suggestedAction: string;
}
