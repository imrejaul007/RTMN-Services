/**
 * Media OS - AuditLog Model
 * Audit trail for all changes
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'login', 'logout', 'payment', 'refund', 'view', 'download', 'share'],
    required: true,
  },
  entity: {
    type: { type: String, required: true },
    id: { type: mongoose.Schema.Types.ObjectId },
  },
  user: {
    type: { type: String, enum: ['viewer', 'creator', 'advertiser', 'admin', 'system'] },
    id: String,
    email: String,
    ip: String,
    userAgent: String,
  },
  changes: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
  error: String,
}, { timestamps: true });

auditLogSchema.index({ 'entity.type': 1, 'entity.id': 1, createdAt: -1 });
auditLogSchema.index({ 'user.id': 1, action: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
