/**
 * Hotel/Room QR types for Merchant SDK
 */

export interface HotelContact {
  phone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
}

export interface HotelInfo {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  city?: string;
  contact?: HotelContact;
}

export interface RoomService {
  id: string;
  name: string;
  icon: string;
  description?: string;
  price?: number;
  estimatedTime?: string;
}

export interface RoomQuickAction {
  action: string;
  label: string;
  icon: string;
  deepLink?: string;
}

export interface HotelRoom {
  hotel: HotelInfo;
  room: {
    id: string;
    roomNumber?: string;
    floor?: string;
    roomType?: string;
    availableServices: RoomService[];
    quickActions: RoomQuickAction[];
  };
  menu: {
    hasMenu: boolean;
    endpoint: string;
  };
}

export interface HotelRoomResponse {
  success: boolean;
  data: HotelRoom;
  meta?: {
    qrType?: string;
    hotelId?: string;
    roomId?: string;
    scannedAt?: string;
  };
}

export interface ServiceRequestItem {
  productId?: string;
  name: string;
  quantity: number;
  notes?: string;
}

export interface ServiceRequest {
  type: 'room_service' | 'housekeeping' | 'maintenance' | 'general' | 'order';
  storeId: string;
  roomId?: string;
  hotelId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  request: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  items?: ServiceRequestItem[];
  scheduledTime?: string;
}

export interface ServiceRequestResponse {
  success: boolean;
  data: {
    requestId: string;
    status: string;
    estimatedResponse?: string;
  };
  message?: string;
}
