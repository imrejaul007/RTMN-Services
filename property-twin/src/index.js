const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { v4: uuidv4 } = require('uuid');

const app = Fastify({ logger: true });

// Stores
const properties = new Map();
const listings = new Map();
const valuations = new Map();

function initSampleData() {
  const sampleProps = [
    { id: 'p1', title: 'Luxury Apartment', type: 'apartment', price: 500000, status: 'active' },
    { id: 'p2', title: 'Commercial Space', type: 'commercial', price: 1200000, status: 'active' },
  ];
  sampleProps.forEach(p => properties.set(p.id, { ...p, createdAt: new Date().toISOString() }));
}

async function start() {
  try {
    await app.register(cors);

    app.get('/health', async () => ({ status: 'healthy', service: 'property-twin', version: '1.0.0' }));

    // Properties
    app.get('/api/properties', async (req, res) => {
      const { type, status, minPrice, maxPrice } = req.query;
      let result = Array.from(properties.values());
      if (type) result = result.filter(p => p.type === type);
      if (status) result = result.filter(p => p.status === status);
      if (minPrice) result = result.filter(p => p.price >= parseFloat(minPrice));
      if (maxPrice) result = result.filter(p => p.price <= parseFloat(maxPrice));
      return { success: true, count: result.length, properties: result };
    });

    app.get('/api/properties/:id', async (req, res) => {
      const prop = properties.get(req.params.id);
      if (!prop) return res.code(404).send({ success: false, error: 'Property not found' });
      return { success: true, property: prop };
    });

    app.post('/api/properties', async (req, res) => {
      const { title, type, price, address, ownerId, features } = req.body;
      if (!title || !type) return res.code(400).send({ success: false, error: 'Title and type required' });
      const prop = { id: uuidv4(), title, type, price: price || 0, address: address || {}, ownerId: ownerId || null, features: features || {}, status: 'active', createdAt: new Date().toISOString() };
      properties.set(prop.id, prop);
      return res.code(201).send({ success: true, property: prop });
    });

    app.put('/api/properties/:id', async (req, res) => {
      const prop = properties.get(req.params.id);
      if (!prop) return res.code(404).send({ success: false, error: 'Property not found' });
      const updated = { ...prop, ...req.body, id: prop.id };
      properties.set(prop.id, updated);
      return { success: true, property: updated };
    });

    app.delete('/api/properties/:id', async (req, res) => {
      if (!properties.has(req.params.id)) return res.code(404).send({ success: false, error: 'Property not found' });
      properties.delete(req.params.id);
      return { success: true, message: 'Property deleted' };
    });

    // Listings
    app.get('/api/listings', async () => ({ success: true, count: listings.size, listings: Array.from(listings.values()) }));

    app.post('/api/listings', async (req, res) => {
      const { propertyId, askingPrice, listingDate, expiresDate } = req.body;
      if (!propertyId) return res.code(400).send({ success: false, error: 'propertyId required' });
      const listing = { id: uuidv4(), propertyId, askingPrice: askingPrice || 0, listingDate: listingDate || new Date().toISOString(), expiresDate: expiresDate || null, status: 'active', createdAt: new Date().toISOString() };
      listings.set(listing.id, listing);
      return res.code(201).send({ success: true, listing });
    });

    // Valuations
    app.get('/api/valuations', async () => ({ success: true, count: valuations.size, valuations: Array.from(valuations.values()) }));

    app.post('/api/valuations', async (req, res) => {
      const { propertyId, value, method, date } = req.body;
      if (!propertyId || value === undefined) return res.code(400).send({ success: false, error: 'propertyId and value required' });
      const valuation = { id: uuidv4(), propertyId, value, method: method || 'estimate', date: date || new Date().toISOString(), createdAt: new Date().toISOString() };
      valuations.set(valuation.id, valuation);
      return res.code(201).send({ success: true, valuation });
    });

    initSampleData();
    await app.listen({ port: 3015, host: '0.0.0.0' });
    console.log('🏠 Property Twin running on port 3015');
  } catch (err) { app.log.error(err); process.exit(1); }
}

start();

module.exports = app;
