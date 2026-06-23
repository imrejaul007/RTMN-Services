/**
 * MissionTemplate — a reusable mission definition.
 *
 * Templates are public (or tenant-owned for private templates) and can
 * be instantiated as Missions by any tenant. Each template defines:
 *   - The DAG of subtasks (with dependsOn links)
 *   - Default inputs (parametrized with {{placeholders}})
 *   - Required capabilities
 *
 * Templates are shipped with the service but can also be created by
 * tenants (visibility = PRIVATE | PUBLIC).
 */

import mongoose from 'mongoose';

export const TEMPLATE_VISIBILITY = ['PUBLIC', 'PRIVATE'];
export const TEMPLATE_CATEGORIES = ['hospitality', 'construction', 'retail', 'logistics', 'finance', 'general'];

const TemplateSubtaskSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    type:        { type: String, required: true },          // see SUBTASK_TYPES in Mission.js
    capability:  { type: String, required: true },
    inputs:      { type: mongoose.Schema.Types.Mixed, default: {} },
    dependsOn:   { type: [String], default: [] },
  },
  { versionKey: false, _id: false },
);

const MissionTemplateSchema = new mongoose.Schema(
  {
    tenantId:    { type: String, default: null, index: true },  // null for system templates
    templateId:  { type: String, required: true },
    name:        { type: String, required: true },
    description: { type: String, default: '' },
    category:    { type: String, enum: TEMPLATE_CATEGORIES, default: 'general', index: true },
    visibility:  { type: String, enum: TEMPLATE_VISIBILITY, default: 'PUBLIC', index: true },
    version:     { type: String, default: '1.0.0' },
    subtasks:    { type: [TemplateSubtaskSchema], default: [] },
    requiredInputs: { type: [String], default: [] },     // list of placeholder names
    defaultContext: { type: mongoose.Schema.Types.Mixed, default: {} },
    metadata:    { type: mongoose.Schema.Types.Mixed, default: {} },
    installCount: { type: Number, default: 0 },
    createdAt:   { type: Date, default: Date.now, index: true },
    updatedAt:   { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false },
);

// Per-tenant uniqueness for tenant-owned templates; system templates have tenantId=null
MissionTemplateSchema.index(
  { tenantId: 1, templateId: 1 },
  {
    unique: true,
    partialFilterExpression: { tenantId: { $type: 'string' } },
  },
);
// System templates (tenantId=null) uniqueness by templateId alone
MissionTemplateSchema.index(
  { templateId: 1 },
  {
    unique: true,
    partialFilterExpression: { tenantId: null },
  },
);

MissionTemplateSchema.index({ visibility: 1, category: 1, name: 1 });

MissionTemplateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const MissionTemplate = mongoose.model('NexhaMissionTemplate', MissionTemplateSchema);
export default MissionTemplate;