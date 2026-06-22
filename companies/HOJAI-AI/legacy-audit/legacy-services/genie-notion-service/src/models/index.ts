/**
 * GENIE Notion Service - Models
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface INotionWorkspace extends Document {
  workspace_name: string;
  workspace_icon?: string;
  linked_user_id?: string;
  linked_at?: Date;
  last_sync?: Date;
  settings: { sync_databases: boolean; sync_pages: boolean; sync_comments: boolean; filter_databases: string[]; sync_direction: string };
  tenant_id: string;
}

const NotionWorkspaceSchema = new Schema<INotionWorkspace>({
  workspace_name: { type: String, required: true },
  workspace_icon: String,
  linked_user_id: { type: String, index: true },
  linked_at: Date,
  last_sync: Date,
  settings: {
    sync_databases: { type: Boolean, default: true },
    sync_pages: { type: Boolean, default: true },
    sync_comments: { type: Boolean, default: false },
    filter_databases: [String],
    sync_direction: { type: String, enum: ['bidirectional', 'to_genie', 'from_genie'], default: 'to_genie' },
  },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });

export const NotionWorkspace = mongoose.model<INotionWorkspace>('NotionWorkspace', NotionWorkspaceSchema);

export interface INotionPage extends Document {
  notion_id: string;
  database_id?: string;
  workspace_id: string;
  title: string;
  content: any[];
  properties: Record<string, any>;
  url: string;
  linked_user_id?: string;
  tenant_id: string;
  created_time: Date;
  last_edited_time: Date;
}

const NotionPageSchema = new Schema<INotionPage>({
  notion_id: { type: String, required: true, unique: true },
  database_id: String,
  workspace_id: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: [Schema.Types.Mixed],
  properties: Schema.Types.Mixed,
  url: String,
  linked_user_id: String,
  tenant_id: { type: String, required: true, index: true },
  created_time: { type: Date, required: true },
  last_edited_time: { type: Date, required: true },
}, { timestamps: true });

NotionPageSchema.index({ tenant_id: 1, workspace_id: 1, title: 'text' });

export const NotionPage = mongoose.model<INotionPage>('NotionPage', NotionPageSchema);
