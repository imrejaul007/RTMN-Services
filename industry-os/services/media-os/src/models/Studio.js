/**
 * Media OS - Studio Model
 * Production studios and facilities
 */

const mongoose = require('mongoose');

const studioSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['film', 'tv', 'recording', 'post_production', 'animation', 'vfx'] },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
  },
  facilities: [{
    name: String,
    type: String,
    capacity: Number,
    available: { type: Boolean, default: true },
  }],
  equipment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
  staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crew' }],
  hourlyRate: Number,
  dailyRate: Number,
  status: { type: String, enum: ['available', 'booked', 'maintenance', 'closed'], default: 'available' },
  images: [String],
  amenities: [String],
  rules: String,
  contact: {
    name: String,
    phone: String,
    email: String,
  },
  twinId: String,
}, { timestamps: true });

studioSchema.index({ type: 1, status: 1 });
studioSchema.index({ 'address.city': 1 });

const Studio = mongoose.model('Studio', studioSchema);
module.exports = Studio;
