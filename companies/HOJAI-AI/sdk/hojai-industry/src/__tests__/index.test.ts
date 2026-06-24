/**
 * Tests for the @hojai/industry SDK
 *
 * 1 instantiation test (all 26 sub-clients present) +
 * 1 happy-path test per category surface (template / hotel / beauty /
 * event-banquet / exhibition) +
 * 1 retry + 1 throw = 8 tests.
 *
 * The 22 template-style sub-clients all use the same underlying
 * IndustryBaseClient methods, so testing one (restaurant) effectively
 * proves the pattern works for the other 21.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Industry } from '../index.js';

function withFetchMock(handler: (url: any, options: any) => Promise<any>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as any;
  return () => { globalThis.fetch = original; };
}

test('Industry client instantiates with all 26 sub-clients', () => {
  const ind = new Industry({ apiKey: 'test', baseUrl: 'http://localhost:9999' });

  // 22 template-style sub-clients
  assert.ok(ind.restaurant, 'restaurant');
  assert.ok(ind.healthcare, 'healthcare');
  assert.ok(ind.retail, 'retail');
  assert.ok(ind.legal, 'legal');
  assert.ok(ind.education, 'education');
  assert.ok(ind.agriculture, 'agriculture');
  assert.ok(ind.automotive, 'automotive');
  assert.ok(ind.fashion, 'fashion');
  assert.ok(ind.fitness, 'fitness');
  assert.ok(ind.gaming, 'gaming');
  assert.ok(ind.government, 'government');
  assert.ok(ind.homeServices, 'homeServices');
  assert.ok(ind.manufacturing, 'manufacturing');
  assert.ok(ind.nonProfit, 'nonProfit');
  assert.ok(ind.professional, 'professional');
  assert.ok(ind.sports, 'sports');
  assert.ok(ind.travel, 'travel');
  assert.ok(ind.entertainment, 'entertainment');
  assert.ok(ind.construction, 'construction');
  assert.ok(ind.financial, 'financial');
  assert.ok(ind.realEstate, 'realEstate');
  assert.ok(ind.transport, 'transport');

  // 4 industry-specific sub-clients
  assert.ok(ind.hotel, 'hotel');
  assert.ok(ind.beauty, 'beauty');
  assert.ok(ind.eventBanquet, 'eventBanquet');
  assert.ok(ind.exhibition, 'exhibition');
});

test('RestaurantClient.createOrder POSTs to :5010/api/orders', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'o-1', items: [{ menuItemId: 'm-1', quantity: 2 }],
        status: 'pending', total: { amount: 0, currency: 'USD' },
        createdAt: 't', updatedAt: 't',
      }),
    };
  });
  const ind = new Industry({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await ind.restaurant.createOrder({ tableId: 't-1', items: [{ menuItemId: 'm-1', quantity: 2 }] });
  assert.equal(captured.url, 'http://localhost:5010/api/orders');
  assert.equal(captured.body.tableId, 't-1');
  restore();
});

test('HotelClient.createBooking POSTs to :5025/api/bookings + checkIn transitions', async () => {
  let bookingCall: any;
  let checkInCall: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    if (url.endsWith('/api/bookings')) {
      bookingCall = { url, body: JSON.parse(options.body) };
      return {
        ok: true, status: 201, headers: { get: () => 'application/json' },
        json: async () => ({
          id: 'b-1', roomId: 'r-101', guestId: 'g-1',
          checkIn: '2026-07-01', checkOut: '2026-07-05',
          status: 'confirmed', totalPrice: { amount: 40000, currency: 'USD' },
          createdAt: 't',
        }),
      };
    }
    if (url.endsWith('/check-in')) {
      checkInCall = { url, method: options.method };
      return {
        ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({
          id: 'b-1', roomId: 'r-101', guestId: 'g-1',
          checkIn: '2026-07-01', checkOut: '2026-07-05',
          status: 'checked-in', totalPrice: { amount: 40000, currency: 'USD' },
          createdAt: 't',
        }),
      };
    }
    return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
  });
  const ind = new Industry({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const booking = await ind.hotel.createBooking({ roomId: 'r-101', guestId: 'g-1', checkIn: '2026-07-01', checkOut: '2026-07-05' });
  assert.equal(bookingCall.url, 'http://localhost:5025/api/bookings');
  assert.equal(booking.status, 'confirmed');
  const checked = await ind.hotel.checkIn(booking.id);
  assert.equal(checkInCall.url, 'http://localhost:5025/api/bookings/b-1/check-in');
  assert.equal(checkInCall.method, 'POST');
  assert.equal(checked.status, 'checked-in');
  restore();
});

test('BeautyClient.createAppointment POSTs to :5090/api/appointments', async () => {
  let captured: any;
  const restore = withFetchMock(async (url: any, options: any) => {
    captured = { url, body: JSON.parse(options.body) };
    return {
      ok: true, status: 201, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'a-1', serviceId: 's-1', stylistId: 'st-1', customerId: 'c-1',
        startAt: '2026-07-01T10:00:00Z', endAt: '2026-07-01T11:00:00Z',
        status: 'confirmed', totalPrice: { amount: 5000, currency: 'USD' },
        createdAt: 't',
      }),
    };
  });
  const ind = new Industry({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const appt = await ind.beauty.createAppointment({ serviceId: 's-1', stylistId: 'st-1', customerId: 'c-1', startAt: '2026-07-01T10:00:00Z' });
  assert.equal(captured.url, 'http://localhost:5090/api/appointments');
  assert.equal(captured.body.stylistId, 'st-1');
  assert.equal(appt.status, 'confirmed');
  restore();
});

test('EventBanquetClient.createEvent + confirm + start + complete lifecycle', async () => {
  const calls: any[] = [];
  const restore = withFetchMock(async (url: any, options: any) => {
    calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined });
    let status = 'pending';
    if (url.endsWith('/confirm')) status = 'confirmed';
    else if (url.endsWith('/start')) status = 'in-progress';
    else if (url.endsWith('/complete')) status = 'completed';
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'e-1', name: 'Wedding', eventDate: '2026-08-15', startTime: '18:00', endTime: '23:00',
        venue: 'Grand Ballroom', guestCount: 200, customerId: 'c-1',
        items: [], status, totalPrice: { amount: 0, currency: 'USD' },
        createdAt: 't', updatedAt: 't',
      }),
    };
  });
  const ind = new Industry({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const event = await ind.eventBanquet.createEvent({
    name: 'Wedding', eventDate: '2026-08-15', startTime: '18:00', endTime: '23:00',
    venue: 'Grand Ballroom', guestCount: 200, customerId: 'c-1',
  });
  assert.equal(calls[0].url, 'http://localhost:4751/api/events');
  assert.equal(event.status, 'pending');

  const confirmed = await ind.eventBanquet.confirm(event.id);
  assert.equal(confirmed.status, 'confirmed');
  const started = await ind.eventBanquet.start(event.id);
  assert.equal(started.status, 'in-progress');
  const completed = await ind.eventBanquet.complete(event.id, 'Went perfectly');
  assert.equal(completed.status, 'completed');
  restore();
});

test('ExhibitionClient.createExhibition + publish + start + complete lifecycle', async () => {
  const calls: string[] = [];
  const restore = withFetchMock(async (url: any, _options: any) => {
    calls.push(url);
    let status = 'pending';
    if (url.endsWith('/publish')) status = 'published';
    else if (url.endsWith('/start')) status = 'in-progress';
    else if (url.endsWith('/complete')) status = 'completed';
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ({
        id: 'x-1', name: 'TechExpo 2026',
        startDate: '2026-09-01', endDate: '2026-09-03', venue: 'Convention Center',
        booths: [], status, expectedAttendees: 5000,
        totalRevenue: { amount: 0, currency: 'USD' },
        createdAt: 't', updatedAt: 't',
      }),
    };
  });
  const ind = new Industry({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const ex = await ind.exhibition.createExhibition({
    name: 'TechExpo 2026', startDate: '2026-09-01', endDate: '2026-09-03',
    venue: 'Convention Center', expectedAttendees: 5000,
  });
  assert.equal(calls[0], 'http://localhost:5040/api/exhibitions');
  assert.equal(ex.status, 'pending');

  await ind.exhibition.publish(ex.id);
  await ind.exhibition.start(ex.id);
  const completed = await ind.exhibition.complete(ex.id);
  assert.equal(completed.status, 'completed');
  // verify the lifecycle calls were made on the right host
  assert.ok(calls.some(u => u.endsWith('/publish')));
  assert.ok(calls.some(u => u.endsWith('/start')));
  assert.ok(calls.some(u => u.endsWith('/complete')));
  restore();
});

test('Industry client retries on 5xx errors', async () => {
  let calls = 0;
  const restore = withFetchMock(async () => {
    calls++;
    if (calls < 3) {
      return { ok: false, status: 503, headers: { get: () => 'text/plain' }, text: async () => 'Service Unavailable' };
    }
    return {
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => ([{ id: 'm-1', name: 'Pizza', available: true, price: { amount: 1000, currency: 'USD' } }]),
    };
  });
  const ind = new Industry({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  const items = await ind.restaurant.listMenu();
  assert.equal(calls, 3);
  assert.equal(items[0].name, 'Pizza');
  restore();
});

test('Industry client throws on 4xx errors', async () => {
  const restore = withFetchMock(async () => {
    return { ok: false, status: 404, headers: { get: () => 'text/plain' }, text: async () => 'Not Found' };
  });
  const ind = new Industry({ apiKey: 'test', baseUrl: 'http://localhost:9999' });
  await assert.rejects(
    () => ind.retail.updateOrderStatus('missing', 'cancelled'),
    /HTTP 404/
  );
  restore();
});
