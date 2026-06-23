/**
 * Mission — a multi-step, multi-tenant composition of subtasks.
 *
 * Per ADR-0010 Phase 6 (2026-06-22): a mission is owned by one tenant
 * (the "mission owner") but its subtasks may be assigned to agents
 * belonging to OTHER tenants (e.g., a procurement agent from nexha-X
 * does a subtask for a mission owned by tenant-Y).
 *
 * Each mission is built from a TEMPLATE (e.g., "open-restaurant",
 * "build-apartment") that defines the DAG of subtasks. The mission
 * then progresses through statuses as subtasks complete.
 *
 * Subtask types reference capabilities in `nexha-business-directory`:
 *   - "find-supplier"       → resolves via supplier-network
 *   - "negotiate-price"     → resolves via pricing-network
 *   - "execute-acp-message" → resolves via acp-messaging
 *   - "install-listing"     → resolves via marketplace-listings
 *
 * Lifecycle:
 *   DRAFT → PLANNED → EXECUTING → COMPLETED
 *                ↓           ↓
 *              PAUSED     FAILED
 *                ↓
 *           CANCELLED (terminal)
 */

import mongoose from 'mongoose';

export const MISSION_STATUS = ['DRAFT', 'PLANNED', 'EXECUTING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'];

export const SUBTASK_STATUS = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'FAILED', 'SKIPPED'];

export const SUBTASK_TYPES = [
  'find-supplier',
  'negotiate-price',
  'execute-acp-message',
  'install-listing',
  'custom',
];

const SubtaskSchema = new mongoose.Schema(
  {
    subtaskId:      { type: String, required: true },
    name:           { type: String, required: true },
    type:           { type: String, enum: SUBTASK_TYPES, required: true },
    capability:     { type: String, required: true },  // capability key (e.g., 'supplier-registry')
    inputs:         { type: mongoose.Schema.Types.Mixed, default: {} },
    dependsOn:      { type: [String], default: [] },   // subtaskIds this subtask waits for
    assignedAgent:  { type: String, default: null },    // directoryAgentId or null
    assignedTenant: { type: String, default: null },    // tenantId of the assigned agent (may differ from mission owner)
    status:         { type: String, enum: SUBTASK_STATUS, default: 'PENDING', index: true },
    startedAt:      { type: Date, default: null },
    completedAt:    { type: Date, default: null },
    result:         { type: mongoose.Schema.Types.Mixed, default: null },
    error:          { type: String, default: null },
    retryCount:     { type: Number, default: 0 },
    metadata:       { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { versionKey: false, _id: false },
);

const MissionSchema = new mongoose.Schema(
  {
    tenantId:        { type: String, required: true, index: true },
    missionId:       { type: String, required: true },
    name:            { type: String, required: true },
    description:     { type: String, default: '' },
    templateId:      { type: String, default: null, index: true },   // e.g., 'open-restaurant'
    templateVersion: { type: String, default: '1.0.0' },
    status:          { type: String, enum: MISSION_STATUS, default: 'DRAFT', index: true },
    priority:        { type: Number, default: 5, min: 1, max: 10 },
    subtasks:        { type: [SubtaskSchema], default: [] },
    context:         { type: mongoose.Schema.Types.Mixed, default: {} },
    participants:    { type: [String], default: [] },        // tenantIds of participating agents
    startedAt:       { type: Date, default: null },
    completedAt:     { type: Date, default: null },
    deadline:        { type: Date, default: null },
    metadata:        { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt:       { type: Date, default: Date.now, index: true },
    updatedAt:       { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false },
);

MissionSchema.index({ tenantId: 1, missionId: 1 }, { unique: true });
MissionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
MissionSchema.index({ templateId: 1, status: 1 });
MissionSchema.index({ 'subtasks.assignedTenant': 1, 'subtasks.status': 1 });
MissionSchema.index({ participants: 1, status: 1 });

MissionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const Mission = mongoose.model('NexhaMission', MissionSchema);
export default Mission;