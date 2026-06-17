import mongoose, { Schema, Document } from 'mongoose';
import { NotificationChannel } from './Notification';

export interface ITemplate extends Document {
  name: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  render(variables: Record<string, string>): { subject: string; body: string };
  validateVariables(variables: Record<string, string>): string[];
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    channel: {
      type: String,
      enum: ['email', 'sms', 'push', 'whatsapp'],
      required: true,
      index: true
    },
    subject: {
      type: String,
      default: ''
    },
    body: {
      type: String,
      required: true
    },
    variables: [{
      type: String
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique name + channel
TemplateSchema.index({ name: 1, channel: 1 }, { unique: true });

// Methods
TemplateSchema.methods.render = function(variables: Record<string, string>): { subject: string; body: string } {
  let subject = this.subject;
  let body = this.body;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  }

  return { subject, body };
};

TemplateSchema.methods.validateVariables = function(variables: Record<string, string>): string[] {
  const missing: string[] = [];

  for (const variable of this.variables) {
    if (!(variable in variables)) {
      missing.push(variable);
    }
  }

  return missing;
};

export const Template = mongoose.model<ITemplate>('Template', TemplateSchema);
