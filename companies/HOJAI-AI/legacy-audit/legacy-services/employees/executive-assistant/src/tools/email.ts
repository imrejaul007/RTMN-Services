/**
 * Executive Assistant - Email Tool
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Email management tool for drafting, sending, and managing emails
 */

import { z } from 'zod';
import type { Tool, ToolResult } from '../../core/src/BaseAgent.js';

// ============================================================================
// Email Data Store (In-Memory)
// ============================================================================

interface Email {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  subject: string;
  body: string;
  attachments?: string[];
  sentAt?: Date;
  status: 'draft' | 'sent' | 'failed';
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

class EmailStore {
  private emails: Map<string, Email> = new Map();
  private drafts: Map<string, Email> = new Map();

  createDraft(email: Omit<Email, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Email {
    const id = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newEmail: Email = {
      ...email,
      id,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    this.drafts.set(id, newEmail);
    return newEmail;
  }

  getDraft(id: string): Email | undefined {
    return this.drafts.get(id);
  }

  updateDraft(id: string, updates: Partial<Email>): Email | undefined {
    const draft = this.drafts.get(id);
    if (!draft) return undefined;

    const updated: Email = {
      ...draft,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.drafts.set(id, updated);
    return updated;
  }

  deleteDraft(id: string): boolean {
    return this.drafts.delete(id);
  }

  sendDraft(id: string): Email | undefined {
    const draft = this.drafts.get(id);
    if (!draft) return undefined;

    const email: Email = {
      ...draft,
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
    };
    this.emails.set(id, email);
    this.drafts.delete(id);
    return email;
  }

  sendEmail(email: Omit<Email, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Email {
    const id = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newEmail: Email = {
      ...email,
      id,
      status: 'sent',
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.emails.set(id, newEmail);
    return newEmail;
  }

  getEmail(id: string): Email | undefined {
    return this.emails.get(id) || this.drafts.get(id);
  }

  getEmailsBySender(sender: string): Email[] {
    return Array.from(this.emails.values()).filter(email => email.from === sender);
  }

  getEmailsByRecipient(recipient: string): Email[] {
    return Array.from(this.emails.values()).filter(email =>
      email.to.includes(recipient) ||
      email.cc?.includes(recipient) ||
      email.bcc?.includes(recipient)
    );
  }

  getAllDrafts(): Email[] {
    return Array.from(this.drafts.values());
  }

  getAllSent(): Email[] {
    return Array.from(this.emails.values());
  }

  deleteEmail(id: string): boolean {
    return this.emails.delete(id);
  }
}

const emailStore = new EmailStore();

// ============================================================================
// Parameter Schemas
// ============================================================================

const DraftEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]).describe('Recipient email(s)'),
  subject: z.string().min(1).describe('Email subject'),
  body: z.string().min(1).describe('Email body content'),
  cc: z.array(z.string().email()).optional().describe('CC recipients'),
  bcc: z.array(z.string().email()).optional().describe('BCC recipients'),
  from: z.string().email().describe('Sender email'),
  attachments: z.array(z.string()).optional().describe('Attachment filenames'),
});

const SendDraftSchema = z.object({
  draftId: z.string().describe('Draft ID to send'),
});

const SendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]).describe('Recipient email(s)'),
  subject: z.string().min(1).describe('Email subject'),
  body: z.string().min(1).describe('Email body content'),
  cc: z.array(z.string().email()).optional().describe('CC recipients'),
  bcc: z.array(z.string().email()).optional().describe('BCC recipients'),
  from: z.string().email().describe('Sender email'),
  attachments: z.array(z.string()).optional().describe('Attachment filenames'),
});

const GetEmailsSchema = z.object({
  type: z.enum(['sent', 'drafts', 'all']).optional().describe('Type of emails to retrieve'),
  recipient: z.string().optional().describe('Filter by recipient'),
  sender: z.string().optional().describe('Filter by sender'),
  limit: z.number().min(1).max(100).optional().describe('Max results to return'),
});

const GetDraftSchema = z.object({
  draftId: z.string().describe('Draft ID to retrieve'),
});

const UpdateDraftSchema = z.object({
  draftId: z.string().describe('Draft ID to update'),
  to: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  attachments: z.array(z.string()).optional(),
});

const DeleteDraftSchema = z.object({
  draftId: z.string().describe('Draft ID to delete'),
});

const ReplyEmailSchema = z.object({
  emailId: z.string().describe('Email ID to reply to'),
  body: z.string().min(1).describe('Reply body content'),
  cc: z.array(z.string().email()).optional().describe('Additional CC recipients'),
  includeOriginal: z.boolean().optional().describe('Include original email in reply'),
});

const ForwardEmailSchema = z.object({
  emailId: z.string().describe('Email ID to forward'),
  to: z.union([z.string().email(), z.array(z.string().email())]).describe('Forward recipient(s)'),
  body: z.string().optional().describe('Additional message'),
});

// ============================================================================
// Tool Implementations
// ============================================================================

async function draftEmailHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = DraftEmailSchema.parse(params);
    const toArray = Array.isArray(args.to) ? args.to : [args.to];

    const draft = emailStore.createDraft({
      to: toArray,
      subject: args.subject,
      body: args.body,
      cc: args.cc,
      bcc: args.bcc,
      from: args.from,
      attachments: args.attachments,
    });

    return {
      success: true,
      data: {
        draftId: draft.id,
        subject: draft.subject,
        to: draft.to,
        status: draft.status,
        message: `Draft created successfully for "${draft.subject}"`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create draft',
    };
  }
}

async function sendDraftHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = SendDraftSchema.parse(params);
    const email = emailStore.sendDraft(args.draftId);

    if (!email) {
      return {
        success: false,
        error: `Draft with ID "${args.draftId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        emailId: email.id,
        subject: email.subject,
        to: email.to,
        sentAt: email.sentAt?.toISOString(),
        status: email.status,
        message: `Email sent successfully to ${email.to.join(', ')}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send draft',
    };
  }
}

async function sendEmailHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = SendEmailSchema.parse(params);
    const toArray = Array.isArray(args.to) ? args.to : [args.to];

    const email = emailStore.sendEmail({
      to: toArray,
      subject: args.subject,
      body: args.body,
      cc: args.cc,
      bcc: args.bcc,
      from: args.from,
      attachments: args.attachments,
    });

    return {
      success: true,
      data: {
        emailId: email.id,
        subject: email.subject,
        to: email.to,
        sentAt: email.sentAt?.toISOString(),
        status: email.status,
        message: `Email sent successfully to ${email.to.join(', ')}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

async function getEmailsHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetEmailsSchema.parse(params);
    let emails: Email[];

    switch (args.type) {
      case 'sent':
        emails = emailStore.getAllSent();
        if (args.sender) {
          emails = emails.filter(e => e.from === args.sender);
        }
        break;
      case 'drafts':
        emails = emailStore.getAllDrafts();
        break;
      default:
        emails = [...emailStore.getAllSent(), ...emailStore.getAllDrafts()];
    }

    if (args.recipient) {
      emails = emails.filter(e =>
        e.to.includes(args.recipient!) ||
        e.cc?.includes(args.recipient!) ||
        e.bcc?.includes(args.recipient!)
      );
    }

    const limit = args.limit || 20;
    const result = emails.slice(-limit).reverse();

    return {
      success: true,
      data: {
        emails: result.map(e => ({
          id: e.id,
          from: e.from,
          to: e.to,
          cc: e.cc,
          subject: e.subject,
          body: e.body.substring(0, 200) + (e.body.length > 200 ? '...' : ''),
          status: e.status,
          sentAt: e.sentAt?.toISOString(),
          createdAt: e.createdAt.toISOString(),
        })),
        count: result.length,
        total: emails.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get emails',
    };
  }
}

async function getDraftHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetDraftSchema.parse(params);
    const draft = emailStore.getDraft(args.draftId);

    if (!draft) {
      return {
        success: false,
        error: `Draft with ID "${args.draftId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        draftId: draft.id,
        from: draft.from,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        body: draft.body,
        attachments: draft.attachments,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get draft',
    };
  }
}

async function updateDraftHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = UpdateDraftSchema.parse(params);
    const updates: Partial<Email> = {};

    if (args.to !== undefined) {
      updates.to = Array.isArray(args.to) ? args.to : [args.to];
    }
    if (args.subject) updates.subject = args.subject;
    if (args.body) updates.body = args.body;
    if (args.cc) updates.cc = args.cc;
    if (args.bcc) updates.bcc = args.bcc;
    if (args.attachments) updates.attachments = args.attachments;

    const draft = emailStore.updateDraft(args.draftId, updates);

    if (!draft) {
      return {
        success: false,
        error: `Draft with ID "${args.draftId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        draftId: draft.id,
        subject: draft.subject,
        message: 'Draft updated successfully',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update draft',
    };
  }
}

async function deleteDraftHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = DeleteDraftSchema.parse(params);
    const deleted = emailStore.deleteDraft(args.draftId);

    if (!deleted) {
      return {
        success: false,
        error: `Draft with ID "${args.draftId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        draftId: args.draftId,
        message: 'Draft deleted successfully',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete draft',
    };
  }
}

async function replyEmailHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = ReplyEmailSchema.parse(params);
    const originalEmail = emailStore.getEmail(args.emailId);

    if (!originalEmail) {
      return {
        success: false,
        error: `Email with ID "${args.emailId}" not found`,
      };
    }

    let body = args.body;
    if (args.includeOriginal) {
      body += `\n\n--- Original Message ---\nFrom: ${originalEmail.from}\nDate: ${originalEmail.sentAt?.toISOString()}\nSubject: ${originalEmail.subject}\n\n${originalEmail.body}`;
    }

    const reply = emailStore.sendEmail({
      to: [originalEmail.from],
      subject: `Re: ${originalEmail.subject}`,
      body,
      cc: args.cc,
      from: originalEmail.to[0], // Reply to the recipient
    });

    return {
      success: true,
      data: {
        emailId: reply.id,
        subject: reply.subject,
        to: reply.to,
        sentAt: reply.sentAt?.toISOString(),
        message: `Reply sent successfully`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reply',
    };
  }
}

async function forwardEmailHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = ForwardEmailSchema.parse(params);
    const originalEmail = emailStore.getEmail(args.emailId);

    if (!originalEmail) {
      return {
        success: false,
        error: `Email with ID "${args.emailId}" not found`,
      };
    }

    let body = args.body || '';
    body += `\n\n--- Forwarded Message ---\nFrom: ${originalEmail.from}\nDate: ${originalEmail.sentAt?.toISOString()}\nSubject: ${originalEmail.subject}\nTo: ${originalEmail.to.join(', ')}\n\n${originalEmail.body}`;

    const toArray = Array.isArray(args.to) ? args.to : [args.to];

    const forward = emailStore.sendEmail({
      to: toArray,
      subject: `Fwd: ${originalEmail.subject}`,
      body,
      from: originalEmail.from,
    });

    return {
      success: true,
      data: {
        emailId: forward.id,
        subject: forward.subject,
        to: forward.to,
        sentAt: forward.sentAt?.toISOString(),
        message: `Email forwarded successfully to ${forward.to.join(', ')}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to forward email',
    };
  }
}

// ============================================================================
// Email Tools Export
// ============================================================================

export const emailTools: Tool[] = [
  {
    name: 'draft_email',
    description: 'Create a new email draft',
    parameters: [
      { name: 'to', description: 'Recipient email(s)', schema: z.union([z.string().email(), z.array(z.string().email())]) },
      { name: 'subject', description: 'Email subject', schema: z.string().min(1) },
      { name: 'body', description: 'Email body content', schema: z.string().min(1) },
      { name: 'cc', description: 'CC recipients (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'bcc', description: 'BCC recipients (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'from', description: 'Sender email', schema: z.string().email() },
      { name: 'attachments', description: 'Attachment filenames (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: draftEmailHandler,
  },
  {
    name: 'send_draft',
    description: 'Send an existing email draft',
    parameters: [
      { name: 'draftId', description: 'Draft ID to send', schema: z.string() },
    ],
    execute: sendDraftHandler,
  },
  {
    name: 'send_email',
    description: 'Send an email directly without creating a draft first',
    parameters: [
      { name: 'to', description: 'Recipient email(s)', schema: z.union([z.string().email(), z.array(z.string().email())]) },
      { name: 'subject', description: 'Email subject', schema: z.string().min(1) },
      { name: 'body', description: 'Email body content', schema: z.string().min(1) },
      { name: 'cc', description: 'CC recipients (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'bcc', description: 'BCC recipients (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'from', description: 'Sender email', schema: z.string().email() },
      { name: 'attachments', description: 'Attachment filenames (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: sendEmailHandler,
  },
  {
    name: 'get_emails',
    description: 'Get emails (sent or drafts)',
    parameters: [
      { name: 'type', description: 'Type of emails to retrieve', schema: z.enum(['sent', 'drafts', 'all']).optional() },
      { name: 'recipient', description: 'Filter by recipient (optional)', schema: z.string().optional() },
      { name: 'sender', description: 'Filter by sender (optional)', schema: z.string().optional() },
      { name: 'limit', description: 'Max results to return (optional)', schema: z.number().min(1).max(100).optional() },
    ],
    execute: getEmailsHandler,
  },
  {
    name: 'get_draft',
    description: 'Get a specific draft by ID',
    parameters: [
      { name: 'draftId', description: 'Draft ID to retrieve', schema: z.string() },
    ],
    execute: getDraftHandler,
  },
  {
    name: 'update_draft',
    description: 'Update an existing draft',
    parameters: [
      { name: 'draftId', description: 'Draft ID to update', schema: z.string() },
      { name: 'to', description: 'New recipient(s) (optional)', schema: z.union([z.string().email(), z.array(z.string().email())]).optional() },
      { name: 'subject', description: 'New subject (optional)', schema: z.string().optional() },
      { name: 'body', description: 'New body (optional)', schema: z.string().optional() },
      { name: 'cc', description: 'New CC (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'bcc', description: 'New BCC (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'attachments', description: 'New attachments (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: updateDraftHandler,
  },
  {
    name: 'delete_draft',
    description: 'Delete a draft',
    parameters: [
      { name: 'draftId', description: 'Draft ID to delete', schema: z.string() },
    ],
    execute: deleteDraftHandler,
  },
  {
    name: 'reply_to_email',
    description: 'Reply to an existing email',
    parameters: [
      { name: 'emailId', description: 'Email ID to reply to', schema: z.string() },
      { name: 'body', description: 'Reply body content', schema: z.string().min(1) },
      { name: 'cc', description: 'Additional CC recipients (optional)', schema: z.array(z.string().email()).optional() },
      { name: 'includeOriginal', description: 'Include original email in reply (optional)', schema: z.boolean().optional() },
    ],
    execute: replyEmailHandler,
  },
  {
    name: 'forward_email',
    description: 'Forward an existing email',
    parameters: [
      { name: 'emailId', description: 'Email ID to forward', schema: z.string() },
      { name: 'to', description: 'Forward recipient(s)', schema: z.union([z.string().email(), z.array(z.string().email())]) },
      { name: 'body', description: 'Additional message (optional)', schema: z.string().optional() },
    ],
    execute: forwardEmailHandler,
  },
];

// Export the store for testing
export { EmailStore, emailStore };
