/**
 * @hojai/create — prompts module.
 *
 * Pure functions for the question catalogue. The interactive loop
 * itself lives in `index.js`; this file just defines the questions
 * and the supported enums so they can be unit-tested without
 * importing the `prompts` library.
 */

export const TEMPLATES = [
  { value: 'marketplace', name: 'Marketplace (B2C/B2B catalog + checkout)',  emoji: '🛒', description: 'Buyers + sellers, listings, orders, payments. Best for marketplaces.' },
  { value: 'b2b',         name: 'B2B Platform (RFQ + quote + trade finance)', emoji: '🤝', description: 'Buyers post RFQs, sellers quote. Trade finance + escrow built in.' },
  { value: 'company',     name: 'Company (single-tenant business OS)',       emoji: '🏢', description: 'One business, many departments (Sales, Marketing, Finance, HR, Ops).' },
  { value: 'hotel',       name: 'Hotel OS (rooms, bookings, guests)',         emoji: '🏨', description: 'Property + rooms + bookings + guest profiles.' },
  { value: 'restaurant',  name: 'Restaurant OS (menu, tables, orders)',      emoji: '🍽️', description: 'Menu + tables + KOT + billing + delivery.' },
  { value: 'logistics',   name: 'Logistics (fleet + dispatch + delivery)',   emoji: '🚚', description: 'Fleet, dispatch, last-mile delivery, tracking.' },
  { value: 'crm',         name: 'CRM (leads + pipeline + customers)',        emoji: '👥', description: 'Lead capture, pipeline, customer 360.' },
  { value: 'erp',         name: 'ERP (inventory + procurement + finance)',   emoji: '📦', description: 'Procurement, inventory, GL, AP/AR.' },
  { value: 'pos',         name: 'POS (counter + barcode + receipts)',         emoji: '🧾', description: 'In-store point-of-sale with barcode + receipts.' }
];

export const AGENT_PRESETS = {
  marketplace: ['CEO', 'Sales', 'Procurement', 'Finance', 'Support'],
  b2b:         ['CEO', 'Sales', 'Procurement', 'Finance', 'Logistics', 'Support'],
  company:     ['CEO', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'],
  hotel:       ['CEO', 'Reception', 'Housekeeping', 'Revenue', 'Support'],
  restaurant:  ['CEO', 'Front-of-house', 'Kitchen', 'Procurement', 'Finance'],
  logistics:   ['CEO', 'Dispatch', 'Fleet', 'Customer', 'Finance'],
  crm:         ['CEO', 'Sales', 'Support', 'Marketing'],
  erp:         ['CEO', 'Procurement', 'Finance', 'Operations', 'HR'],
  pos:         ['CEO', 'Cashier', 'Inventory', 'Finance']
};

export const REGIONS = [
  { value: 'us-east',  name: 'US East (Virginia)',    emoji: '🌎' },
  { value: 'us-west',  name: 'US West (Oregon)',      emoji: '🌎' },
  { value: 'eu-west',  name: 'EU West (Frankfurt)',   emoji: '🌍' },
  { value: 'ap-south', name: 'Asia South (Mumbai)',   emoji: '🌏' },
  { value: 'ap-south-east', name: 'Asia SE (Singapore)', emoji: '🌏' },
  { value: 'me',       name: 'Middle East (Dubai)',   emoji: '🌍' }
];

export const LANGUAGES = [
  { value: 'en',    name: 'English' },
  { value: 'ar',    name: 'Arabic' },
  { value: 'hi',    name: 'Hindi' },
  { value: 'es',    name: 'Spanish' },
  { value: 'fr',    name: 'French' },
  { value: 'de',    name: 'German' },
  { value: 'pt',    name: 'Portuguese' },
  { value: 'zh',    name: 'Chinese (Simplified)' },
  { value: 'ja',    name: 'Japanese' }
];

export const ALL_AGENTS = [
  'CEO', 'Sales', 'Marketing', 'Procurement', 'Finance', 'HR', 'Operations',
  'Support', 'Logistics', 'Dispatch', 'Fleet', 'Customer', 'Reception',
  'Housekeeping', 'Revenue', 'Front-of-house', 'Kitchen', 'Cashier', 'Inventory'
];

export function templateByValue(value) {
  return TEMPLATES.find(t => t.value === value) || null;
}

export function presetAgentsFor(templateValue) {
  return AGENT_PRESETS[templateValue] || AGENT_PRESETS.marketplace;
}

export function regionByValue(value) {
  return REGIONS.find(r => r.value === value) || REGIONS[0];
}

export function isValidName(name) {
  return typeof name === 'string'
    && name.length >= 2
    && name.length <= 40
    && /^[a-z][a-z0-9-]*$/.test(name);
}
