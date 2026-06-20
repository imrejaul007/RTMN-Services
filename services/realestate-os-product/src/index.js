// realestate-os-product (5276) - Real Estate Management.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const SERVICE = 'realestate-os-product';
const PORT = parseInt(process.env.PORT || '5276', 10);

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

const ok = (data) => ({ ok: true, ...data });
const fail = (msg) => ({ ok: false, error: msg });

const properties = new Map();  // pId -> { id, address, city, state, zip, type, bedrooms, bathrooms, sqft, lot_size, year_built, mls_id, status }
const listings = new Map();    // lId -> { id, property_id, agent_id, price, status, listed_at, days_on_market }
const agents = new Map();      // aId -> { id, name, email, phone, license, brokerage, total_sales }
const showings = new Map();    // sId -> { id, listing_id, buyer_id, scheduled_at, status, notes }
const buyers = new Map();      // bId -> { id, name, email, phone, pre_approved, max_budget, agent_id }
const offers = new Map();      // oId -> { id, listing_id, buyer_id, amount, contingencies[], status, expires_at, submitted_at }
const contracts = new Map();   // cId -> { id, offer_id, signed_by_seller, signed_by_buyer, status, signed_at, closing_date }
const closings = new Map();    // clId -> { id, contract_id, closed_at, sale_price, commission, recorded }

// Seed
(function seed() {
  const pId = uuid();
  properties.set(pId, { id: pId, address: '123 Main St', city: 'San Francisco', state: 'CA', zip: '94101',
    type: 'single-family', bedrooms: 3, bathrooms: 2, sqft: 1800, lot_size: 5000, year_built: 1995,
    mls_id: 'MLS-12345', status: 'available' });
  const aId = uuid();
  agents.set(aId, { id: aId, name: 'Pat Realtor', email: 'pat@realty.example', phone: '555-0101',
    license: 'CA-DRE-01987654', brokerage: 'E2E Realty', total_sales: 12 });
  listings.set(uuid(), { id: uuid(), property_id: pId, agent_id: aId, price: 1250000, status: 'active',
    listed_at: new Date().toISOString(), days_on_market: 0 });
})();

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE, port: PORT,
  endpoints: ['/api/properties', '/api/listings', '/api/agents', '/api/showings',
              '/api/buyers', '/api/offers', '/api/contracts', '/api/closings']
})));

// Properties
app.get('/api/properties', (req, res) => {
  let list = [...properties.values()];
  if (req.query.city) list = list.filter(p => p.city === req.query.city);
  if (req.query.status) list = list.filter(p => p.status === req.query.status);
  if (req.query.type) list = list.filter(p => p.type === req.query.type);
  res.json(ok({ properties: list }));
});
app.post('/api/properties', (req, res) => {
  const { address, city, state, zip, type = 'single-family', bedrooms = 0, bathrooms = 0, sqft = 0, year_built, mls_id } = req.body || {};
  if (!address || !city) return res.status(400).json(fail('address + city required'));
  const id = uuid();
  properties.set(id, { id, address, city, state: state || '', zip: zip || '', type, bedrooms, bathrooms, sqft,
    lot_size: 0, year_built: year_built || null, mls_id: mls_id || null, status: 'available' });
  res.status(201).json(ok({ property: properties.get(id) }));
});

// Agents
app.get('/api/agents', (_req, res) => res.json(ok({ agents: [...agents.values()] })));
app.post('/api/agents', (req, res) => {
  const { name, email, phone, license, brokerage = '' } = req.body || {};
  if (!name || !email) return res.status(400).json(fail('name + email required'));
  const id = uuid();
  agents.set(id, { id, name, email, phone: phone || null, license: license || null, brokerage, total_sales: 0 });
  res.status(201).json(ok({ agent: agents.get(id) }));
});

// Listings
app.get('/api/listings', (req, res) => {
  let list = [...listings.values()];
  if (req.query.status) list = list.filter(l => l.status === req.query.status);
  if (req.query.agent_id) list = list.filter(l => l.agent_id === req.query.agent_id);
  res.json(ok({ listings: list }));
});
app.post('/api/listings', (req, res) => {
  const { property_id, agent_id, price } = req.body || {};
  if (!property_id || !agent_id || !price) return res.status(400).json(fail('property_id + agent_id + price required'));
  if (!properties.has(property_id)) return res.status(400).json(fail('property_id invalid'));
  if (!agents.has(agent_id)) return res.status(400).json(fail('agent_id invalid'));
  const id = uuid();
  listings.set(id, { id, property_id, agent_id, price, status: 'active',
    listed_at: new Date().toISOString(), days_on_market: 0 });
  // Update property status
  const p = properties.get(property_id);
  p.status = 'listed';
  properties.set(p.id, p);
  res.status(201).json(ok({ listing: listings.get(id) }));
});
app.patch('/api/listings/:id', (req, res) => {
  const l = listings.get(req.params.id);
  if (!l) return res.status(404).json(fail('listing not found'));
  if (req.body.status) {
    l.status = req.body.status;
    if (req.body.status === 'sold') {
      const a = agents.get(l.agent_id);
      if (a) { a.total_sales++; agents.set(a.id, a); }
    }
  }
  if (req.body.price) { l.price = req.body.price; }
  // Update days_on_market
  l.days_on_market = Math.floor((Date.now() - new Date(l.listed_at).getTime()) / (24 * 3600 * 1000));
  listings.set(l.id, l);
  res.json(ok({ listing: l }));
});

// Buyers
app.get('/api/buyers', (_req, res) => res.json(ok({ buyers: [...buyers.values()] })));
app.post('/api/buyers', (req, res) => {
  const { name, email, phone, pre_approved = false, max_budget = 0, agent_id = null } = req.body || {};
  if (!name || !email) return res.status(400).json(fail('name + email required'));
  if (agent_id && !agents.has(agent_id)) return res.status(400).json(fail('agent_id invalid'));
  const id = uuid();
  buyers.set(id, { id, name, email, phone: phone || null, pre_approved, max_budget, agent_id });
  res.status(201).json(ok({ buyer: buyers.get(id) }));
});

// Showings
app.get('/api/showings', (req, res) => {
  let list = [...showings.values()];
  if (req.query.listing_id) list = list.filter(s => s.listing_id === req.query.listing_id);
  if (req.query.buyer_id) list = list.filter(s => s.buyer_id === req.query.buyer_id);
  res.json(ok({ showings: list }));
});
app.post('/api/showings', (req, res) => {
  const { listing_id, buyer_id, scheduled_at } = req.body || {};
  if (!listing_id || !buyer_id || !scheduled_at) return res.status(400).json(fail('listing_id + buyer_id + scheduled_at required'));
  if (!listings.has(listing_id)) return res.status(400).json(fail('listing_id invalid'));
  if (!buyers.has(buyer_id)) return res.status(400).json(fail('buyer_id invalid'));
  // Conflict detection
  const conflict = [...showings.values()].find(s => s.listing_id === listing_id
    && s.scheduled_at === scheduled_at && s.status !== 'cancelled');
  if (conflict) return res.status(400).json(fail('showing already scheduled'));
  const id = uuid();
  showings.set(id, { id, listing_id, buyer_id, scheduled_at, status: 'scheduled', notes: '' });
  res.status(201).json(ok({ showing: showings.get(id) }));
});
app.patch('/api/showings/:id', (req, res) => {
  const s = showings.get(req.params.id);
  if (!s) return res.status(404).json(fail('showing not found'));
  if (req.body.status) s.status = req.body.status;
  if (req.body.notes) s.notes = req.body.notes;
  showings.set(s.id, s);
  res.json(ok({ showing: s }));
});

// Offers
app.get('/api/offers', (req, res) => {
  let list = [...offers.values()];
  if (req.query.listing_id) list = list.filter(o => o.listing_id === req.query.listing_id);
  if (req.query.buyer_id) list = list.filter(o => o.buyer_id === req.query.buyer_id);
  res.json(ok({ offers: list }));
});
app.post('/api/offers', (req, res) => {
  const { listing_id, buyer_id, amount, contingencies = [], expires_at } = req.body || {};
  if (!listing_id || !buyer_id || !amount) return res.status(400).json(fail('listing_id + buyer_id + amount required'));
  if (!listings.has(listing_id)) return res.status(400).json(fail('listing_id invalid'));
  if (!buyers.has(buyer_id)) return res.status(400).json(fail('buyer_id invalid'));
  const id = uuid();
  offers.set(id, { id, listing_id, buyer_id, amount, contingencies, status: 'pending',
    submitted_at: new Date().toISOString(),
    expires_at: expires_at || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() });
  res.status(201).json(ok({ offer: offers.get(id) }));
});
app.patch('/api/offers/:id', (req, res) => {
  const o = offers.get(req.params.id);
  if (!o) return res.status(404).json(fail('offer not found'));
  if (req.body.status) o.status = req.body.status;
  offers.set(o.id, o);
  res.json(ok({ offer: o }));
});

// Contracts
app.get('/api/contracts', (req, res) => {
  let list = [...contracts.values()];
  if (req.query.offer_id) list = list.filter(c => c.offer_id === req.query.offer_id);
  res.json(ok({ contracts: list }));
});
app.get('/api/contracts/:id', (req, res) => {
  const c = contracts.get(req.params.id);
  if (!c) return res.status(404).json(fail('contract not found'));
  res.json(ok({ contract: c }));
});
app.post('/api/offers/:id/accept', (req, res) => {
  const o = offers.get(req.params.id);
  if (!o) return res.status(404).json(fail('offer not found'));
  if (o.status !== 'pending') return res.status(400).json(fail('offer not pending'));
  o.status = 'accepted';
  offers.set(o.id, o);
  // Create contract
  const id = uuid();
  contracts.set(id, { id, offer_id: o.id, signed_by_seller: false, signed_by_buyer: false,
    status: 'draft', signed_at: null, closing_date: req.body.closing_date || null });
  res.status(201).json(ok({ offer: o, contract: contracts.get(id) }));
});
app.patch('/api/contracts/:id', (req, res) => {
  const c = contracts.get(req.params.id);
  if (!c) return res.status(404).json(fail('contract not found'));
  if (req.body.signed_by_seller !== undefined) c.signed_by_seller = req.body.signed_by_seller;
  if (req.body.signed_by_buyer !== undefined) c.signed_by_buyer = req.body.signed_by_buyer;
  if (c.signed_by_seller && c.signed_by_buyer) {
    c.status = 'fully-signed';
    c.signed_at = new Date().toISOString();
  }
  contracts.set(c.id, c);
  res.json(ok({ contract: c }));
});

// Closings
app.get('/api/closings', (_req, res) => res.json(ok({ closings: [...closings.values()] })));
app.post('/api/contracts/:id/close', (req, res) => {
  const c = contracts.get(req.params.id);
  if (!c) return res.status(404).json(fail('contract not found'));
  if (c.status !== 'fully-signed') return res.status(400).json(fail('contract must be fully signed'));
  const o = offers.get(c.offer_id);
  const salePrice = o ? o.amount : 0;
  const commission = +(salePrice * 0.025).toFixed(2); // 2.5% commission
  const id = uuid();
  closings.set(id, { id, contract_id: c.id, closed_at: new Date().toISOString(),
    sale_price: salePrice, commission, recorded: false });
  // Update listing + property status
  if (o) {
    const l = listings.get(o.listing_id);
    if (l) {
      l.status = 'sold';
      listings.set(l.id, l);
      const p = properties.get(l.property_id);
      if (p) { p.status = 'sold'; properties.set(p.id, p); }
    }
  }
  c.status = 'closed';
  contracts.set(c.id, c);
  res.status(201).json(ok({ closing: closings.get(id), contract: c }));
});

app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));
