/**
 * Media OS - Equipment Model
 * Production equipment inventory
 */

const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  category: { type: String, enum: ['camera', 'lighting', 'audio', 'grip', 'props', 'vfx', 'edit_suite'] },
  brand: String,
  model: String,
  serialNumber: String,
  purchaseDate: Date,
  purchasePrice: Number,
  condition: { type: String, enum: ['new', 'excellent', 'good', 'fair', 'needs_repair'], default: 'new' },
  status: { type: String, enum: ['available', 'in_use', 'maintenance', 'retired', 'rented_out'], default: 'available' },
  quantity: { type: Number, default: 1 },
  available: { type: Number, default: 1 },
  location: {
    studio: { type: mongoose.Schema.Types.ObjectId, ref: 'Studio' },
    storage: String,
  },
  rentalRate: {
    hourly: Number,
    daily: Number,
    weekly: Number,
  },
  maintenance: {
    lastMaintenance: Date,
    nextMaintenance: Date,
    records: [{
      date: Date,
      type: String,
      cost: Number,
      notes: String,
    }],
  },
  insurance: {
    policyNumber: String,
    expiry: Date,
    value: Number,
  },
  assignedTo: [{
    crewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
    assignedAt: Date,
    returnedAt: Date,
  }],
  twinId: String,
}, { timestamps: true });

equipmentSchema.index({ category: 1, status: 1 });
equipmentSchema.index({ code: 1 }, { unique: true });

const Equipment = mongoose.model('Equipment', equipmentSchema);
module.exports = Equipment;
