import { Router, Request, Response } from 'express';
import { Dashboard } from '../models/Dashboard';
import { Widget } from '../models/Widget';

const router = Router();

// Create a new dashboard
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, ownerId, industry, config, filters, isPublic, tags } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Name and ownerId are required' });
    }

    const dashboard = Dashboard.create({
      name,
      description,
      ownerId,
      industry,
      config,
      filters,
      isPublic,
      tags
    });

    res.status(201).json(dashboard);
  } catch (error) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

// Get all dashboards
router.get('/', (req: Request, res: Response) => {
  try {
    const { owner, industry, public: isPublic } = req.query;

    let dashboards = Dashboard.getAll();

    if (owner) {
      dashboards = Dashboard.getByOwner(owner as string);
    } else if (industry) {
      dashboards = Dashboard.getByIndustry(industry as string);
    } else if (isPublic === 'true') {
      dashboards = dashboards.filter(d => d.isPublic);
    }

    res.json({
      count: dashboards.length,
      dashboards
    });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
});

// Get dashboard by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const dashboard = Dashboard.getById(req.params.id);

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Include widgets
    const widgets = Widget.getByDashboard(dashboard.id);

    res.json({
      ...dashboard,
      widgets
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Update dashboard
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, description, config, filters, isPublic, tags } = req.body;

    const dashboard = Dashboard.update(req.params.id, {
      name,
      description,
      config,
      filters,
      isPublic,
      tags
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json(dashboard);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

// Delete dashboard
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const dashboard = Dashboard.getById(req.params.id);

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // Delete associated widgets
    const deletedWidgets = Widget.deleteByDashboard(req.params.id);

    // Delete dashboard
    Dashboard.delete(req.params.id);

    res.json({
      message: 'Dashboard deleted successfully',
      deletedWidgets
    });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

// Add widget to dashboard
router.post('/:id/widgets', (req: Request, res: Response) => {
  try {
    const dashboard = Dashboard.getById(req.params.id);

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const { name, description, type, dataSource, position, style, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required for widget' });
    }

    const widget = Widget.create({
      dashboardId: req.params.id,
      name,
      description,
      type,
      dataSource,
      position,
      style,
      config
    });

    // Update dashboard with widget reference
    Dashboard.addWidget(req.params.id, widget.id);

    res.status(201).json(widget);
  } catch (error) {
    console.error('Error adding widget:', error);
    res.status(500).json({ error: 'Failed to add widget to dashboard' });
  }
});

// Get widgets for dashboard
router.get('/:id/widgets', (req: Request, res: Response) => {
  try {
    const dashboard = Dashboard.getById(req.params.id);

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const widgets = Widget.getByDashboard(req.params.id);

    res.json({
      count: widgets.length,
      widgets
    });
  } catch (error) {
    console.error('Error fetching widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Duplicate dashboard
router.post('/:id/duplicate', (req: Request, res: Response) => {
  try {
    const original = Dashboard.getById(req.params.id);

    if (!original) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const { targetOwnerId } = req.body;

    const newDashboard = Dashboard.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      ownerId: targetOwnerId || original.ownerId,
      industry: original.industry,
      config: { ...original.config },
      filters: [...original.filters],
      isPublic: false,
      tags: [...original.tags]
    });

    // Duplicate widgets
    const originalWidgets = Widget.getByDashboard(original.id);
    originalWidgets.forEach(w => {
      Widget.create({
        dashboardId: newDashboard.id,
        name: w.name,
        description: w.description,
        type: w.type,
        dataSource: { ...w.dataSource },
        position: { ...w.position },
        style: { ...w.style },
        config: { ...w.config }
      });
    });

    const newWidgets = Widget.getByDashboard(newDashboard.id);

    res.status(201).json({
      ...newDashboard,
      widgets: newWidgets
    });
  } catch (error) {
    console.error('Error duplicating dashboard:', error);
    res.status(500).json({ error: 'Failed to duplicate dashboard' });
  }
});

export default router;
