// Catalog of 24 industry services with pricing.
// Mirrors the master RTMN ecosystem registry.
export const SERVICES = [
  { id: 'hotel-os',         name: 'Hotel OS',         port: 5025, category: 'hospitality', price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Hotel property management, bookings, housekeeping, guest twins.', pilotReady: true },
  { id: 'restaurant-os',    name: 'Restaurant OS',    port: 5010, category: 'hospitality', price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Menu, orders, kitchen, tables, customer twins.', pilotReady: true },
  { id: 'healthcare-os',    name: 'Healthcare OS',    port: 5020, category: 'health',      price: { pilot: 149, growth: 599, enterprise: 3999 }, description: 'Patient, doctor, appointment, prescription twins.', pilotReady: true },
  { id: 'retail-os',        name: 'Retail OS',        port: 5030, category: 'commerce',    price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Product, inventory, cart, supplier twins.', pilotReady: true },
  { id: 'legal-os',         name: 'Legal OS',         port: 5035, category: 'professional',price: { pilot: 149, growth: 599, enterprise: 3999 }, description: 'Case, client, lawyer, document twins.', pilotReady: true },
  { id: 'education-os',     name: 'Education OS',     port: 5060, category: 'education',   price: { pilot: 99, growth: 399, enterprise: 2499 }, description: 'Course, student, instructor, enrollment twins.', pilotReady: true },
  { id: 'agriculture-os',   name: 'Agriculture OS',   port: 5070, category: 'agriculture', price: { pilot: 99, growth: 399, enterprise: 2499 }, description: 'Farm, crop, livestock twins.', pilotReady: true },
  { id: 'automotive-os',    name: 'Automotive OS',    port: 5080, category: 'mobility',    price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Vehicle, customer, service twins.', pilotReady: true },
  { id: 'beauty-os',        name: 'Beauty OS',        port: 5090, category: 'lifestyle',   price: { pilot: 79, growth: 299, enterprise: 1999 }, description: 'Client, service, staff, appointment twins.', pilotReady: true },
  { id: 'fashion-os',       name: 'Fashion OS',       port: 5095, category: 'commerce',    price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Product, collection twins.', pilotReady: true },
  { id: 'fitness-os',       name: 'Fitness OS',       port: 5110, category: 'lifestyle',   price: { pilot: 79, growth: 299, enterprise: 1999 }, description: 'Member, trainer, class, membership twins.', pilotReady: true },
  { id: 'gaming-os',        name: 'Gaming OS',        port: 5120, category: 'entertainment', price: { pilot: 149, growth: 599, enterprise: 3999 }, description: 'Game, player, tournament twins.', pilotReady: false },
  { id: 'government-os',    name: 'Government OS',    port: 5130, category: 'public',      price: { pilot: 0,   growth: 0,    enterprise: 0    }, description: 'Citizen, service, department twins. (Custom pricing.)', pilotReady: true },
  { id: 'home-services-os', name: 'Home Services OS', port: 5140, category: 'services',    price: { pilot: 99, growth: 399, enterprise: 2499 }, description: 'Provider, customer, booking twins.', pilotReady: true },
  { id: 'manufacturing-os', name: 'Manufacturing OS', port: 5150, category: 'industry',    price: { pilot: 199, growth: 899, enterprise: 5999 }, description: 'Product, machine, production, quality twins.', pilotReady: true },
  { id: 'nonprofit-os',     name: 'Non-Profit OS',    port: 5160, category: 'public',      price: { pilot: 49, growth: 199, enterprise: 1499 }, description: 'Donor, campaign, beneficiary twins.', pilotReady: true },
  { id: 'professional-os',  name: 'Professional OS',  port: 5170, category: 'professional',price: { pilot: 99, growth: 399, enterprise: 2499 }, description: 'Consultant, client, project twins.', pilotReady: true },
  { id: 'sports-os',        name: 'Sports OS',        port: 5180, category: 'sports',      price: { pilot: 99, growth: 399, enterprise: 2499 }, description: 'Team, player, match twins.', pilotReady: true },
  { id: 'travel-os',        name: 'Travel OS',        port: 5190, category: 'travel',      price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Destination, package twins.', pilotReady: true },
  { id: 'entertainment-os', name: 'Entertainment OS', port: 5200, category: 'entertainment', price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Event, venue, ticket twins.', pilotReady: true },
  { id: 'construction-os',  name: 'Construction OS',  port: 5210, category: 'industry',    price: { pilot: 149, growth: 599, enterprise: 3999 }, description: 'Project, contractor twins.', pilotReady: true },
  { id: 'financial-os',     name: 'Financial OS',     port: 5220, category: 'finance',     price: { pilot: 199, growth: 899, enterprise: 5999 }, description: 'Account, transaction twins.', pilotReady: true },
  { id: 'realestate-os',    name: 'Real Estate OS',   port: 5230, category: 'real-estate', price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Property, listing, lead, agent twins.', pilotReady: true },
  { id: 'transport-os',     name: 'Transport OS',     port: 5240, category: 'mobility',    price: { pilot: 99, growth: 499, enterprise: 2999 }, description: 'Vehicle, driver, rider twins.', pilotReady: true }
];

export const PLANS = [
  { id: 'pilot',     name: 'Pilot',     priceMultiplier: 1,   description: '1 industry service, sandbox data, 30-day trial.' },
  { id: 'growth',    name: 'Growth',    priceMultiplier: 5,   description: '3 industry services, 5K records, email support.' },
  { id: 'enterprise',name: 'Enterprise',priceMultiplier: 30,  description: 'Unlimited industries, 100K+ records, SLA, dedicated CSM.' }
];

export function findService(id) {
  return SERVICES.find(s => s.id === id);
}

export function priceFor(serviceId, planId) {
  const svc = findService(serviceId);
  if (!svc) return null;
  if (svc.price.pilot === 0) return { monthly: 0, currency: 'USD', custom: true };
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return null;
  return {
    monthly: svc.price[planId],
    currency: 'USD',
    plan: planId
  };
}
