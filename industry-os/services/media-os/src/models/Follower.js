/**
 * Media OS - Follower Model
 * Viewer/Creator following relationships
 */

const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema({
  follower: {
    type: { type: String, enum: ['viewer', 'creator'], required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  following: {
    type: { type: String, enum: ['creator', 'channel', 'series'], required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  status: { type: String, enum: ['active', 'muted', 'blocked'], default: 'active' },
  notify: { type: Boolean, default: true },
}, { timestamps: true });

followerSchema.index({ 'follower.id': 1, 'following.id': 1 }, { unique: true });
followerSchema.index({ 'following.id': 1, status: 1 });
followerSchema.index({ 'follower.id': 1, status: 1 });

const Follower = mongoose.model('Follower', followerSchema);
module.exports = Follower;
