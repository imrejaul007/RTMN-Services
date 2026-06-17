import { Router, Response } from 'express';
import { z } from 'zod';
import { Contact, LifecycleStage } from '../models';
import { AuthRequest, requireTenantId } from '../middleware';
import { hubspotSyncContacts } from '../services/hubspot';
import { zohoSyncContacts } from '../services/zoho';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
  leadSource: z.string().optional(),
  owner: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateContactSchema = contactSchema.partial();

// Get all contacts
router.get('/', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', stage, search } = req.query;
    const tenantId = req.tenantId!;

    const query: Record<string, unknown> = { tenantId };

    if (stage) {
      query.lifecycleStage = stage;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [contacts, total] = await Promise.all([
      Contact.find(query).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Contact.countDocuments(query),
    ]);

    res.json({
      data: contacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get contact by ID
router.get('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json({ data: contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Create contact
router.post('/', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const validated = contactSchema.parse(req.body);
    const tenantId = req.tenantId!;

    const contact = new Contact({
      ...validated,
      tenantId,
    });

    await contact.save();
    res.status(201).json({ data: contact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    if ((error as any).code === 11000) {
      res.status(409).json({ error: 'Contact with this email already exists' });
      return;
    }
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const validated = updateContactSchema.parse(req.body);

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: validated },
      { new: true, runValidators: true }
    );

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json({ data: contact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Sync with HubSpot
router.post('/sync/hubspot', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await hubspotSyncContacts(tenantId);
    res.json({ message: 'HubSpot sync completed', ...result });
  } catch (error) {
    console.error('HubSpot sync error:', error);
    res.status(500).json({ error: 'Failed to sync with HubSpot' });
  }
});

// Sync with Zoho
router.post('/sync/zoho', requireTenantId, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await zohoSyncContacts(tenantId);
    res.json({ message: 'Zoho sync completed', ...result });
  } catch (error) {
    console.error('Zoho sync error:', error);
    res.status(500).json({ error: 'Failed to sync with Zoho' });
  }
});

export default router;
