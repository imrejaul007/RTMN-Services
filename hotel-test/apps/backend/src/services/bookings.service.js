import { store } from './store.js';

export function listRooms() { return store.rooms; }
export function getRoom(id) { return store.rooms.find(r => r.id === id) || null; }

export function createBooking({ roomId, guestId, checkIn, checkOut }) {
  const room = store.rooms.find(r => r.id === roomId);
  if (!room) throw new Error('room not found');
  if (room.status === 'occupied') throw new Error('room is occupied');
  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000));
  const booking = { id: crypto.randomUUID(), roomId, guestId, checkIn, checkOut, nights, totalInr: nights * room.rate, status: 'confirmed', createdAt: new Date().toISOString() };
  store.bookings.unshift(booking);
  room.status = 'occupied';
  return booking;
}

export function listBookings() { return store.bookings; }

export function checkout(bookingId) {
  const booking = store.bookings.find(b => b.id === bookingId);
  if (!booking) throw new Error('booking not found');
  const room = store.rooms.find(r => r.id === booking.roomId);
  if (room) room.status = 'available';
  booking.status = 'checked-out';
  return booking;
}
