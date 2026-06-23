import mongoose from 'mongoose';

/**
 * ProvisioningPlan — declarative plan emitted by the engine for an
 * external orchestrator (K8s controller, Terraform runner, etc.) to apply.
 *
 * The plan describes WHAT to stand up. The engine does not stand it up.
 * An external orchestrator reads `plan.json` or `plan.yaml` and applies it.
 *
 * Status state machine:
 *   PENDING → APPLYING → READY
 *                     → FAILED
 *   READY   → RECONCILING (drift) → READY
 *   READY   → DESTROYING → DESTROYED (terminal)
 *   *       → CANCELLED (terminal)
 */

const RESOURCE_KINDS = [
  'compute.k8s.deployment',
  'compute.k8s.service',
  'compute.k8s.ingress',
  'database.mongodb.sharded',
  'database.postgresql.managed',
  'storage.s3.bucket',
  'dns.route53.record',
  'tls.cert_manager.certificate',
  'secret.kubernetes.secret',
  'queue.redis.streams',
  'cache.redis.cluster',
  'network.cidr.allocation',
];

const TARGET_INSTANCE_KINDS = [
  'sutar-tenant-instance',
  'industry-tenant-instance',
];

const provisionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    kind: { type: String, enum: RESOURCE_KINDS, required: true },
    spec: { type: mongoose.Schema.Types.Mixed, required: true },
    dependsOn: { type: [String], default: [] },
  },
  { _id: true }
);

const planSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^pln_[a-f0-9]{16}$/,
    },
    tenantId: { type: String, required: true, index: true, maxlength: 100 },
    targetInstanceKind: {
      type: String,
      enum: TARGET_INSTANCE_KINDS,
      required: true,
    },
    targetInstanceId: { type: String, required: true, maxlength: 100 },
    isolationLevel: {
      type: String,
      enum: ['SHARED', 'DEDICATED', 'ISOLATED'],
      required: true,
    },
    region: { type: String, required: true, maxlength: 50 },
    status: {
      type: String,
      enum: [
        'PENDING',
        'APPLYING',
        'READY',
        'RECONCILING',
        'DESTROYING',
        'DESTROYED',
        'FAILED',
        'CANCELLED',
      ],
      default: 'PENDING',
      index: true,
    },
    resources: { type: [provisionSchema], default: [] },
    outputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    appliedBy: { type: String, default: null, maxlength: 200 },
    appliedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    destroyedAt: { type: Date, default: null },
    failureReason: { type: String, default: null, maxlength: 1000 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'provisioning_plans' }
);

planSchema.index({ tenantId: 1, status: 1 });
planSchema.index({ targetInstanceKind: 1, targetInstanceId: 1 });
planSchema.index({ status: 1, createdAt: 1 });

export const ProvisioningPlan = mongoose.model(
  'ProvisioningPlan',
  planSchema
);

export const RESOURCE_KIND_LIST = RESOURCE_KINDS;
export const TARGET_INSTANCE_KIND_LIST = TARGET_INSTANCE_KINDS;
