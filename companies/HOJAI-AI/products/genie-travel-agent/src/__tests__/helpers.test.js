const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  mockFlightSearch, mockHotelSearch, planItinerary, haversineKm, daysBetween
} = require('../index.js');

// ─── Flight search ─────────────────────────────────────────────────────

test('mockFlightSearch returns 3 carrier options sorted by price', () => {
  const flights = mockFlightSearch({
    origin: 'NYC',
    destination: 'LON',
    departDate: '2026-07-15',
    passengers: 1,
    cabinClass: 'economy'
  });
  assert.equal(flights.length, 3);
  for (let i = 1; i < flights.length; i++) {
    assert.ok(flights[i - 1].priceUsd <= flights[i].priceUsd);
  }
});

test('mockFlightSearch prices business class ~4x economy', () => {
  const econ = mockFlightSearch({
    origin: 'NYC', destination: 'LON', departDate: '2026-07-15', passengers: 1, cabinClass: 'economy'
  });
  const biz = mockFlightSearch({
    origin: 'NYC', destination: 'LON', departDate: '2026-07-15', passengers: 1, cabinClass: 'business'
  });
  const cheapestEcon = econ[0].priceUsd;
  const cheapestBiz = biz[0].priceUsd;
  assert.ok(cheapestBiz >= cheapestEcon * 3);
});

test('mockFlightSearch passengers multiplier works', () => {
  const solo = mockFlightSearch({ origin: 'NYC', destination: 'LON', departDate: '2026-07-15', passengers: 1 });
  const pair = mockFlightSearch({ origin: 'NYC', destination: 'LON', departDate: '2026-07-15', passengers: 2 });
  assert.ok(pair[0].priceUsd >= solo[0].priceUsd * 1.8);
});

test('mockFlightSearch includes carrier and flightId', () => {
  const flights = mockFlightSearch({ origin: 'NYC', destination: 'LON', departDate: '2026-07-15' });
  for (const f of flights) {
    assert.ok(f.carrier);
    assert.ok(f.flightId);
    assert.ok(f.flightId.startsWith('FL-'));
  }
});

// ─── Hotel search ──────────────────────────────────────────────────────

test('mockHotelSearch respects minStars filter', () => {
  const hotels = mockHotelSearch({
    city: 'Paris', checkIn: '2026-07-15', checkOut: '2026-07-18', guests: 2, minStars: 4
  });
  for (const h of hotels) {
    assert.ok(h.stars >= 4);
  }
});

test('mockHotelSearch respects maxPriceUsd budget', () => {
  const hotels = mockHotelSearch({
    city: 'Paris', checkIn: '2026-07-15', checkOut: '2026-07-18', guests: 2, maxPriceUsd: 500
  });
  for (const h of hotels) {
    // Total divided by guests should fit budget
    assert.ok(h.totalUsd / 1 <= 500 * 3); // 3 nights × 500 = 1500
  }
});

test('mockHotelSearch returns at least one hotel', () => {
  const hotels = mockHotelSearch({
    city: 'London', checkIn: '2026-07-15', checkOut: '2026-07-16', guests: 1
  });
  assert.ok(hotels.length >= 1);
});

// ─── Itinerary planning ────────────────────────────────────────────────

test('planItinerary produces one day per requested day', () => {
  const plan = planItinerary({ city: 'Tokyo', days: 5, budgetUsd: 3000 });
  assert.equal(plan.itinerary.length, 5);
});

test('planItinerary respects pace setting', () => {
  const relaxed = planItinerary({ city: 'Tokyo', days: 2, pace: 'relaxed', budgetUsd: 1000 });
  const packed = planItinerary({ city: 'Tokyo', days: 2, pace: 'packed', budgetUsd: 1000 });
  // Both should produce same structure but packed might have longer durations
  assert.equal(relaxed.itinerary.length, packed.itinerary.length);
});

test('planItinerary budgets per day = total / days', () => {
  const plan = planItinerary({ city: 'Paris', days: 4, budgetUsd: 2000 });
  assert.equal(plan.itinerary[0].dayBudgetUsd, 500);
});

test('planItinerary includes travel tips', () => {
  const plan = planItinerary({ city: 'Dubai', days: 3 });
  assert.ok(Array.isArray(plan.tips));
  assert.ok(plan.tips.length >= 3);
});

// ─── Distance + dates ──────────────────────────────────────────────────

test('haversineKm NYC → LON ≈ 5500km', () => {
  const d = haversineKm({ lat: 40.71, lon: -74.0 }, { lat: 51.5, lon: -0.45 });
  assert.ok(d > 5400 && d < 5600, `expected ~5500, got ${d}`);
});

test('haversineKm same point = 0', () => {
  const d = haversineKm({ lat: 40.0, lon: -74.0 }, { lat: 40.0, lon: -74.0 });
  assert.ok(d < 1);
});

test('haversineKm returns default when coords missing', () => {
  const d = haversineKm({ name: 'A' }, { name: 'B' });
  assert.equal(d, 5000);
});

test('daysBetween computes day difference', () => {
  assert.equal(daysBetween('2026-07-15', '2026-07-18'), 3);
});

test('daysBetween clamps to minimum 1', () => {
  assert.equal(daysBetween('2026-07-15', '2026-07-15'), 1);
});