/**
 * Email Module - Email Drafting & Management
 *
 * Handles email drafting, sending, and management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  Email,
  DraftEmailInput,
  EmailAddress,
  Attachment,
  ApiResponse
} from '../types.js';

const router = Router();

// ============================================================================
// IN-MEMORY STORE (Mock Implementation)
// In production, integrate with SMTP/SendGrid/SES
// ============================================================================

const emails: Map<string, Email> = new Map();
const sentEmails: Map<string, Email> = new Map();

// ============================================================================
// HELPERS
// ============================================================================

function generateEmailId(): string {
  return `email_${Date.now()}_${uuid().split('-')[0]}`;
}

function generateAttachmentId(): string {
  return `att_${uuid().split('-')[0]}`;
}

function validateEmailInput(input: DraftEmailInput): void {
  if (!input.to || input.to.length === 0) {
    throw new Error('At least one recipient (to) is required');
  }

  for (const addr of input.to) {
    if (!addr.email || !isValidEmail(addr.email)) {
      throw new Error(`Invalid email address: ${addr.email}`);
    }
  }

  if (input.cc) {
    for (const addr of input.cc) {
      if (!isValidEmail(addr.email)) {
        throw new Error(`Invalid CC email address: ${addr.email}`);
      }
    }
  }

  if (input.bcc) {
    for (const addr of input.bcc) {
      if (!isValidEmail(addr.email)) {
        throw new Error(`Invalid BCC email address: ${addr.email}`);
      }
    }
  }

  if (!input.subject?.trim()) {
    throw new Error('Subject is required');
  }

  if (!input.body?.trim()) {
    throw new Error('Email body is required');
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function serializeEmail(email: Email): Email {
  return {
    ...email,
    createdAt: new Date(email.createdAt),
    updatedAt: new Date(email.updatedAt),
    sentAt: email.sentAt ? new Date(email.sentAt) : undefined
  };
}

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'default-user';
}

function getTenantId(req: Request): string {
  return (req.headers['x-tenant-id'] as string) || 'default';
}

function getUserEmail(req: Request): EmailAddress {
  const email = req.headers['x-user-email'] as string;
  const name = req.headers['x-user-name'] as string;
  return {
    email: email || 'user@example.com',
    name: name || 'User'
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/emails/draft
 * Create a new email draft
 */
router.post('/draft', async (req: Request, res: Response) => {
  try {
    const input: DraftEmailInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const userEmail = getUserEmail(req);

    validateEmailInput(input);

    const attachments: Attachment[] = (input.attachments || []).map(att => ({
      ...att,
      id: generateAttachmentId()
    }));

    const email: Email = {
      id: generateEmailId(),
      userId,
      tenantId,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      from: userEmail,
      subject: input.subject.trim(),
      body: input.body.trim(),
      bodyHtml: input.bodyHtml,
      isDraft: true,
      isRead: true,
      isStarred: false,
      isArchived: false,
      labels: input.labels || [],
      attachments,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    emails.set(email.id, email);

    const response: ApiResponse<Email> = {
      success: true,
      data: serializeEmail(email),
      message: 'Email draft created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create draft';
    res.status(400).json({ success: false, error: message });
  }
});

/**
 * POST /api/emails/send
 * Send an email (or draft)
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { draftId, ...input }: { draftId?: string } & DraftEmailInput = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const userEmail = getUserEmail(req);

    let email: Email;

    if (draftId) {
      // Send existing draft
      const existing = emails.get(draftId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ success: false, error: 'Draft not found' });
      }

      // Update draft to sent
      existing.isDraft = false;
      existing.sentAt = new Date();
      existing.updatedAt = new Date();
      email = existing;
      emails.delete(draftId);
      sentEmails.set(email.id, email);
    } else {
      // Send new email
      validateEmailInput(input);

      const attachments: Attachment[] = (input.attachments || []).map(att => ({
        ...att,
        id: generateAttachmentId()
      }));

      email = {
        id: generateEmailId(),
        userId,
        tenantId,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        from: userEmail,
        subject: input.subject.trim(),
        body: input.body.trim(),
        bodyHtml: input.bodyHtml,
        isDraft: false,
        isRead: true,
        isStarred: false,
        isArchived: false,
        labels: input.labels || [],
        attachments,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      sentEmails.set(email.id, email);
    }

    // In production, this would actually send the email via SMTP/SendGrid/SES
    console.log(`[Email] Sent email to ${email.to.map(t => t.email).join(', ')}: ${email.subject}`);

    const response: ApiResponse<Email> = {
      success: true,
      data: serializeEmail(email),
      message: 'Email sent successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/emails
 * List all emails (inbox/drafts/sent)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);
    const { folder = 'inbox', isRead, isStarred, search, labels, page = '1', limit = '20' } = req.query;

    // Combine inbox and sent emails
    let allEmails = [...Array.from(emails.values()), ...Array.from(sentEmails.values())]
      .filter(email => email.userId === userId && email.tenantId === tenantId);

    // Filter by folder
    if (folder === 'inbox') {
      allEmails = allEmails.filter(e => e.isDraft === false && !e.isArchived);
    } else if (folder === 'drafts') {
      allEmails = allEmails.filter(e => e.isDraft === true);
    } else if (folder === 'sent') {
      allEmails = allEmails.filter(e => e.sentAt !== undefined);
    } else if (folder === 'starred') {
      allEmails = allEmails.filter(e => e.isStarred === true);
    } else if (folder === 'archived') {
      allEmails = allEmails.filter(e => e.isArchived === true);
    }

    // Filter by read status
    if (isRead !== undefined) {
      const read = isRead === 'true';
      allEmails = allEmails.filter(e => e.isRead === read);
    }

    // Filter by starred
    if (isStarred !== undefined) {
      const starred = isStarred === 'true';
      allEmails = allEmails.filter(e => e.isStarred === starred);
    }

    // Filter by labels
    if (labels) {
      const labelList = (labels as string).split(',').map(l => l.trim());
      allEmails = allEmails.filter(e =>
        e.labels?.some(label => labelList.includes(label))
      );
    }

    // Search
    if (search) {
      const searchLower = (search as string).toLowerCase();
      allEmails = allEmails.filter(e =>
        e.subject.toLowerCase().includes(searchLower) ||
        e.body.toLowerCase().includes(searchLower) ||
        e.to.some(t => t.email.toLowerCase().includes(searchLower))
      );
    }

    // Sort by most recent first
    allEmails.sort((a, b) => {
      const aDate = a.sentAt || a.createdAt;
      const bDate = b.sentAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const total = allEmails.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedEmails = allEmails.slice(startIndex, startIndex + limitNum);

    const response: ApiResponse<Email[]> = {
      success: true,
      data: paginatedEmails.map(serializeEmail),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list emails';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/emails/:id
 * Get a specific email
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    let email = emails.get(id) || sentEmails.get(id);

    if (!email || email.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    // Mark as read
    if (!email.isRead) {
      email.isRead = true;
      email.updatedAt = new Date();
      emails.set(id, email);
    }

    const response: ApiResponse<Email> = {
      success: true,
      data: serializeEmail(email)
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get email';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/emails/:id
 * Update email (star, archive, labels)
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isStarred, isArchived, labels } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    let email = emails.get(id) || sentEmails.get(id);

    if (!email || email.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    if (isStarred !== undefined) email.isStarred = isStarred;
    if (isArchived !== undefined) email.isArchived = isArchived;
    if (labels !== undefined) email.labels = labels;

    email.updatedAt = new Date();

    emails.set(id, email);

    const response: ApiResponse<Email> = {
      success: true,
      data: serializeEmail(email),
      message: 'Email updated'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update email';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/emails/:id
 * Delete an email
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    let email = emails.get(id);

    if (!email || email.userId !== userId) {
      email = sentEmails.get(id);
      if (!email || email.userId !== userId) {
        return res.status(404).json({ success: false, error: 'Email not found' });
      }
    }

    emails.delete(id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Email deleted'
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete email';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/emails/:id/reply
 * Reply to an email
 */
router.post('/:id/reply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { body, cc, attachments } = req.body;
    const userId = getUserId(req);
    const userEmail = getUserEmail(req);

    const originalEmail = emails.get(id) || sentEmails.get(id);

    if (!originalEmail || originalEmail.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    if (!body?.trim()) {
      return res.status(400).json({ success: false, error: 'Reply body is required' });
    }

    // Create reply draft
    const reply: Email = {
      id: generateEmailId(),
      userId,
      tenantId: originalEmail.tenantId,
      to: [originalEmail.from],
      cc: cc || [],
      from: userEmail,
      subject: originalEmail.subject.startsWith('Re:')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`,
      body: body.trim(),
      isDraft: true,
      isRead: true,
      isStarred: false,
      isArchived: false,
      attachments: (attachments || []).map((att: Omit<Attachment, 'id'>) => ({
        ...att,
        id: generateAttachmentId()
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    emails.set(reply.id, reply);

    const response: ApiResponse<Email> = {
      success: true,
      data: serializeEmail(reply),
      message: 'Reply draft created'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create reply';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/emails/:id/forward
 * Forward an email
 */
router.post('/:id/forward', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { to, body, attachments } = req.body;
    const userId = getUserId(req);
    const userEmail = getUserEmail(req);

    const originalEmail = emails.get(id) || sentEmails.get(id);

    if (!originalEmail || originalEmail.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ success: false, error: 'Recipients (to) are required' });
    }

    // Create forward draft
    const forward: Email = {
      id: generateEmailId(),
      userId,
      tenantId: originalEmail.tenantId,
      to: to.map((t: string | EmailAddress) =>
        typeof t === 'string' ? { email: t } : t
      ),
      from: userEmail,
      subject: originalEmail.subject.startsWith('Fwd:')
        ? originalEmail.subject
        : `Fwd: ${originalEmail.subject}`,
      body: body?.trim() || '',
      bodyHtml: undefined,
      isDraft: true,
      isRead: true,
      isStarred: false,
      isArchived: false,
      attachments: [
        ...(originalEmail.attachments || []),
        ...((attachments || []).map((att: Omit<Attachment, 'id'>) => ({
          ...att,
          id: generateAttachmentId()
        })))
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    emails.set(forward.id, forward);

    const response: ApiResponse<Email> = {
      success: true,
      data: serializeEmail(forward),
      message: 'Forward draft created'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create forward';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/emails/templates
 * Create an email template
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const { name, subject, body, bodyHtml, labels } = req.body;
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'Template name is required' });
    }

    const template: Email = {
      id: generateEmailId(),
      userId,
      tenantId,
      to: [],
      from: { email: '', name: '' },
      subject: subject?.trim() || '',
      body: body?.trim() || '',
      bodyHtml,
      isDraft: false,
      isRead: true,
      isStarred: false,
      isArchived: false,
      labels: labels || ['template'],
      metadata: { isTemplate: true, templateName: name.trim() },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    emails.set(template.id, template);

    const response: ApiResponse<Email> = {
      success: true,
      data: serializeEmail(template),
      message: 'Template created'
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/emails/templates
 * List email templates
 */
router.get('/templates/list', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const tenantId = getTenantId(req);

    const templates = Array.from(emails.values()).filter(
      e => e.userId === userId &&
           e.tenantId === tenantId &&
           e.metadata?.isTemplate === true
    );

    const response: ApiResponse<Email[]> = {
      success: true,
      data: templates.map(serializeEmail)
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list templates';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
