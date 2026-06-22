import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// API types
export interface CustomerIntelligence {
  customerId: string
  name: string
  phone: string
  email?: string
  customerTier: 'new' | 'regular' | 'vip' | 'at-risk' | 'churned'
  beautyProfile: {
    hairType: string | null
    hairTexture: string | null
    scalpCondition: string | null
    skinType: string | null
    allergies: string[]
  }
  visitStats: {
    totalVisits: number
    totalSpent: number
    averageSpend: number
    lastVisit: string | null
    daysSinceLastVisit: number
    preferredServices: string[]
    preferredStylists: string[]
  }
  currentColorFormula: {
    color: string
    brand: string
    lastColored?: string
  } | null
  activeNotes: {
    category: string
    content: string
    stylistName: string
    date: string
  }[]
  churnRisk: 'high' | 'medium' | 'low'
  lifetimeValue: number
  engagementLevel: 'minimal' | 'standard' | 'high' | 'vip'
  recentServices: {
    serviceName: string
    date: string
    stylistName: string
    satisfaction?: number
  }[]
  overdueServices: string[]
}

export interface StylistCustomer {
  customerId: string
  name: string
  phone: string
  hairType: string | null
  hairTexture: string | null
  scalpCondition: string | null
  skinType: string | null
  allergies: string[]
  currentColorFormula: {
    color: string
    brand: string
    lastColored?: string
  } | null
  visitCount: number
  daysSinceLastVisit: number
  preferredServices: string[]
  activeNotes: {
    category: string
    content: string
    date: string
  }[]
  lovedProducts: string[]
  productsToAvoid: string[]
}

export interface Appointment {
  appointmentId: string
  customerId: string
  customer: StylistCustomer
  serviceName: string
  startTime: string
  endTime: string
  duration: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
}

// API functions
export async function getStylistToday(stylistId: string): Promise<Appointment[]> {
  const { data } = await api.get(`/api/stylists/${stylistId}/today`)
  return data.data
}

export async function getCustomerContext(customerId: string): Promise<StylistCustomer> {
  const { data } = await api.get(`/api/stylists/STYLIST_001/customer/${customerId}`)
  return data.data
}

export async function getCustomerIntelligence(customerId: string): Promise<CustomerIntelligence> {
  const { data } = await api.get(`/api/customers/${customerId}/intelligence`)
  return data.data
}

export async function addStylistNote(
  customerId: string,
  note: string,
  category: 'treatment' | 'preference' | 'allergy' | 'concern' | 'general'
) {
  const { data } = await api.post('/api/stylists/note', {
    customerId,
    stylistId: 'STYLIST_001',
    stylistName: 'Current Stylist',
    note,
    category,
  })
  return data
}

export async function recordServiceComplete(
  customerId: string,
  serviceId: string,
  serviceName: string,
  products: { productId: string; productName: string; quantity: number }[],
  notes?: string,
  satisfaction?: number
) {
  const { data } = await api.post('/api/stylists/service-complete', {
    customerId,
    stylistId: 'STYLIST_001',
    stylistName: 'Current Stylist',
    serviceId,
    serviceName,
    products,
    notes,
    satisfaction,
  })
  return data
}

export async function recordHairColor(
  customerId: string,
  colorFormula: {
    color: string
    brand: string
    developer: string
    processingTime: number
    notes: string
  }
) {
  const { data } = await api.post('/api/stylists/color', {
    customerId,
    stylistId: 'STYLIST_001',
    stylistName: 'Current Stylist',
    colorFormula,
  })
  return data
}

export async function recordProductReaction(
  customerId: string,
  productId: string,
  productName: string,
  reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | 'allergic',
  notes?: string
) {
  const { data } = await api.post('/api/stylists/product-reaction', {
    customerId,
    productId,
    productName,
    reaction,
    notes,
  })
  return data
}

export async function getServicePlan(customerId: string) {
  const { data } = await api.post(`/api/customers/${customerId}/service-plan`, {
    currentServices: [],
  })
  return data.data
}
