import { Router, Request, Response } from 'express';
import { KnownIssue, IssueSeverity, IssueStatus } from '../models/KnownIssue';
import mongoose from 'mongoose';

const router = Router();

// List all issues with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      page = '1',
      limit = '20',
      severity,
      status,
      productId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId };
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (productId) query.productId = productId;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const [issues, total] = await Promise.all([
      KnownIssue.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      KnownIssue.countDocuments(query)
    ]);

    res.json({
      data: issues,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get single issue by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const issue = await KnownIssue.findOne({ _id: id, tenantId }).lean();

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Create issue
router.post('/', async (req: Request, res: Response) => {
  try {
    const issueData = req.body;

    if (!issueData.tenantId || !issueData.productId) {
      return res.status(400).json({ error: 'tenantId and productId are required' });
    }

    const issue = new KnownIssue(issueData);
    await issue.save();

    res.status(201).json(issue);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update issue
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.body;
    const { id } = req.params;
    const updates = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    delete updates.tenantId;
    delete updates._id;

    const issue = await KnownIssue.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Delete issue
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const issue = await KnownIssue.findOneAndDelete({ _id: id, tenantId });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get issues by product
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { tenantId, status, severity, includeResolved } = req.query;
    const { productId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const query: any = { tenantId, productId };

    if (status) {
      query.status = status;
    } else if (!includeResolved) {
      query.status = { $nin: [IssueStatus.RESOLVED, IssueStatus.WONT_FIX] };
    }

    if (severity) query.severity = severity;

    const issues = await KnownIssue.find(query).sort({ severity: 1, createdAt: -1 }).lean();

    res.json(issues);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get active issues by product (quick access)
router.get('/product/:productId/active', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { productId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const issues = await KnownIssue.findActiveByProduct(
      tenantId as string,
      new mongoose.Types.ObjectId(productId)
    );

    res.json(issues);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get issue statistics for a product
router.get('/product/:productId/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { productId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const stats = await KnownIssue.getStats(
      tenantId as string,
      new mongoose.Types.ObjectId(productId)
    );

    res.json(stats);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Increment ticket count
router.patch('/:id/tickets', async (req: Request, res: Response) => {
  try {
    const { tenantId, increment = 1 } = req.body;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const issue = await KnownIssue.findOneAndUpdate(
      { _id: id, tenantId },
      {
        $inc: { ticketCount: increment as number },
        $set: { lastOccurrence: new Date() }
      },
      { new: true }
    );

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ ticketCount: issue.ticketCount });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Resolve issue
router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { tenantId, resolution } = req.body;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const issue = await KnownIssue.findOneAndUpdate(
      { _id: id, tenantId },
      {
        $set: {
          status: IssueStatus.RESOLVED,
          resolutionDate: new Date(),
          ...(resolution && { fix: resolution })
        }
      },
      { new: true }
    );

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Check if version is affected
router.get('/:id/affected/:version', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const { id, version } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const issue = await KnownIssue.findOne({ _id: id, tenantId });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const isAffected = issue.isVersionAffected(version);

    res.json({
      issueId: id,
      version,
      isAffected,
      workaroundAvailable: issue.workaroundAvailable,
      workaround: issue.workaroundAvailable ? issue.workaround : null
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Bulk create issues
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { tenantId, issues } = req.body;

    if (!tenantId || !Array.isArray(issues)) {
      return res.status(400).json({ error: 'tenantId and issues array are required' });
    }

    const issuesWithTenant = issues.map((issue: any) => ({
      ...issue,
      tenantId
    }));

    const created = await KnownIssue.insertMany(issuesWithTenant);

    res.status(201).json(created);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update issue status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { tenantId, status } = req.body;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    if (!Object.values(IssueStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const issue = await KnownIssue.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { status } },
      { new: true }
    );

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;
