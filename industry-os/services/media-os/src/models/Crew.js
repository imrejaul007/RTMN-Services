/**
 * Media OS - Crew Model
 * Production crew members
 */

const mongoose = require('mongoose');

const crewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['director', 'producer', 'writer', 'cameraperson', 'editor', 'sound_engineer', 'lighting_director', 'art_director', 'makeup_artist', 'costume_designer', 'vfx_artist', 'colorist', 'music_director', 'actor', 'anchor', 'reporter'] },
  department: String,
  skills: [String],
  experience: { type: Number, default: 0 }, // years
  email: String,
  phone: String,
  address: String,
  hourlyRate: Number,
  dailyRate: Number,
  availability: { type: String, enum: ['available', 'busy', 'unavailable'], default: 'available' },
  bookedDates: [{
    startDate: Date,
    endDate: Date,
    production: String,
  }],
  ratings: {
    avgRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
  },
  portfolio: [String],
  certifications: [String],
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  equipment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
  twinId: String,
}, { timestamps: true });

crewSchema.index({ role: 1, availability: 1 });
crewSchema.index({ skills: 1 });

const Crew = mongoose.model('Crew', crewSchema);
module.exports = Crew;
