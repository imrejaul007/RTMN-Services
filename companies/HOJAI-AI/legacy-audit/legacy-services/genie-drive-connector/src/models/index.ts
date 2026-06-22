/**
 * GENIE Drive Connector - Models
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IDriveConnection extends Document {
  user_id: string; email: string; access_token: string; refresh_token: string;
  token_expiry: Date; last_sync?: Date; settings: {
    sync_docs: boolean; sync_sheets: boolean; sync_slides: boolean;
    sync_folders: string[]; exclude_folders: string[]; auto_sync: boolean; sync_interval_minutes: number;
  }; tenant_id: string;
}
const DriveConnectionSchema = new Schema<IDriveConnection>({
  user_id: { type: String, required: true, index: true },
  email: { type: String, required: true },
  access_token: String, refresh_token: String, token_expiry: Date, last_sync: Date,
  settings: {
    sync_docs: { type: Boolean, default: true }, sync_sheets: { type: Boolean, default: true },
    sync_slides: { type: Boolean, default: false }, sync_folders: [String], exclude_folders: [String],
    auto_sync: { type: Boolean, default: false }, sync_interval_minutes: { type: Number, default: 60 },
  },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });
DriveConnectionSchema.index({ tenant_id: 1, user_id: 1 }, { unique: true });
export const DriveConnection = mongoose.model<IDriveConnection>('DriveConnection', DriveConnectionSchema);

export interface IDriveDocument extends Document {
  connection_id: string; drive_file_id: string; name: string; mime_type: string;
  parent_id?: string; path: string; content?: string; size: number;
  created_time: Date; modified_time: Date; last_synced?: Date;
  tenant_id: string; linked_user_id: string;
}
const DriveDocumentSchema = new Schema<IDriveDocument>({
  connection_id: { type: String, required: true, index: true },
  drive_file_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  mime_type: { type: String, enum: ['document', 'spreadsheet', 'presentation', 'folder', 'other'], default: 'other' },
  parent_id: String, path: { type: String, required: true },
  content: String, size: { type: Number, default: 0 },
  created_time: Date, modified_time: Date, last_synced: Date,
  tenant_id: { type: String, required: true, index: true },
  linked_user_id: { type: String, required: true, index: true },
}, { timestamps: true });
DriveDocumentSchema.index({ tenant_id: 1, linked_user_id: 1, drive_file_id: 1 }, { unique: true });
DriveDocumentSchema.index({ tenant_id: 1, linked_user_id: 1, mime_type: 1 });
export const DriveDocument = mongoose.model<IDriveDocument>('DriveDocument', DriveDocumentSchema);
