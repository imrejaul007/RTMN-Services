/**
 * GENIE Obsidian Service - Mongoose Models
 */
import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Vault Model
// ============================================================================
export interface IObsidianVault extends Document {
  tenant_id: string;
  linked_user_id?: string;
  linked_at?: Date;
  name: string;
  path: string;
  settings: {
    sync_daily_notes: boolean;
    sync_todos: boolean;
    sync_calendar: boolean;
    sync_tags: string[];
    exclude_folders: string[];
    sync_direction: 'bidirectional' | 'to_genie' | 'from_genie';
  };
  last_sync?: Date;
  status: 'active' | 'inactive' | 'syncing';
}

const VaultSettingsSchema = new Schema({
  sync_daily_notes: { type: Boolean, default: true },
  sync_todos: { type: Boolean, default: true },
  sync_calendar: { type: Boolean, default: false },
  sync_tags: [{ type: String }],
  exclude_folders: { type: [String], default: ['.obsidian', '.trash', '.git', 'node_modules'] },
  sync_direction: { type: String, enum: ['bidirectional', 'to_genie', 'from_genie'], default: 'to_genie' },
}, { _id: false });

const ObsidianVaultSchema = new Schema<IObsidianVault>({
  tenant_id: { type: String, required: true, index: true },
  linked_user_id: { type: String, index: true },
  linked_at: { type: Date },
  name: { type: String, required: true },
  path: { type: String, required: true },
  settings: { type: VaultSettingsSchema, default: () => ({}) },
  last_sync: Date,
  status: { type: String, enum: ['active', 'inactive', 'syncing'], default: 'active' },
}, { timestamps: true });

ObsidianVaultSchema.index({ tenant_id: 1, linked_user_id: 1 });
ObsidianVaultSchema.index({ tenant_id: 1, status: 1 });
export const ObsidianVault = mongoose.model<IObsidianVault>('ObsidianVault', ObsidianVaultSchema);

// ============================================================================
// Note Model
// ============================================================================
export interface IObsidianNote extends Document {
  tenant_id: string;
  vault_id: string;
  path: string;
  title: string;
  content: string;
  frontmatter?: Record<string, unknown>;
  tags: string[];
  links: string[];
  backlinks: string[];
  word_count: number;
  created: Date;
  modified: Date;
}

const ObsidianNoteSchema = new Schema<IObsidianNote>({
  tenant_id: { type: String, required: true, index: true },
  vault_id: { type: String, required: true, index: true },
  path: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  frontmatter: { type: Schema.Types.Mixed },
  tags: [{ type: String }],
  links: [{ type: String }],
  backlinks: [{ type: String }],
  word_count: { type: Number, default: 0 },
  created: { type: Date, required: true },
  modified: { type: Date, required: true },
}, { timestamps: true });

ObsidianNoteSchema.index({ tenant_id: 1, vault_id: 1, path: 1 }, { unique: true });
ObsidianNoteSchema.index({ tenant_id: 1, tags: 1 });
ObsidianNoteSchema.index({ tenant_id: 1, modified: -1 });
export const ObsidianNote = mongoose.model<IObsidianNote>('ObsidianNote', ObsidianNoteSchema);