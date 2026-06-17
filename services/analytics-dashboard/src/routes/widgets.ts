import { Router, Request, Response } from 'express';
import { Widget, WidgetType } from '../models/Widget';
import { Dashboard } from '../models/Dashboard';

const router = Router();

// Create a new widget
router.post('/', (req: Request, res: Response) => {
  try {
    const { dashboardId, name, description, type, dataSource, position, style, config } = req.body;

    if (!dashboardId || !name || !type) {
      return res.status(400).json({ error: 'dashboardId, name, and type are required' });
    }

    const dashboard = Dashboard.getById(dashboardId);
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    const widget = Widget.create({
      dashboardId,
      name,
      description,
      type,
      dataSource,
      position,
      style,
      config
    });

    // Add widget reference to dashboard
    Dashboard.addWidget(dashboardId, widget.id);

    res.status(201).json(widget);
  } catch (error) {
    console.error('Error creating widget:', error);
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

// Get all widgets
router.get('/', (req: Request, res: Response) => {
  try {
    const { dashboardId, type } = req.query;

    let widgets = Widget.getAll();

    if (dashboardId) {
      widgets = Widget.getByDashboard(dashboardId as string);
    } else if (type) {
      widgets = Widget.getByType(type as WidgetType);
    }

    res.json({
      count: widgets.length,
      widgets
    });
  } catch (error) {
    console.error('Error fetching widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Get widget by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const widget = Widget.getById(req.params.id);

    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    res.json(widget);
  } catch (error) {
    console.error('Error fetching widget:', error);
    res.status(500).json({ error: 'Failed to fetch widget' });
  }
});

// Update widget
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, description, type, dataSource, position, style, config } = req.body;

    const widget = Widget.update(req.params.id, {
      name,
      description,
      type,
      dataSource,
      position,
      style,
      config
    });

    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    res.json(widget);
  } catch (error) {
    console.error('Error updating widget:', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

// Update widget position
router.patch('/:id/position', (req: Request, res: Response) => {
  try {
    const { x, y, w, h } = req.body;

    const widget = Widget.updatePosition(req.params.id, { x, y, w, h });

    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    res.json(widget);
  } catch (error) {
    console.error('Error updating widget position:', error);
    res.status(500).json({ error: 'Failed to update widget position' });
  }
});

// Delete widget
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const widget = Widget.getById(req.params.id);

    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    // Remove widget reference from dashboard
    Dashboard.removeWidget(widget.dashboardId, widget.id);

    // Delete widget
    Widget.delete(req.params.id);

    res.json({ message: 'Widget deleted successfully' });
  } catch (error) {
    console.error('Error deleting widget:', error);
    res.status(500).json({ error: 'Failed to delete widget' });
  }
});

// Duplicate widget
router.post('/:id/duplicate', (req: Request, res: Response) => {
  try {
    const original = Widget.getById(req.params.id);

    if (!original) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const { dashboardId } = req.body;
    const targetDashboardId = dashboardId || original.dashboardId;

    const targetDashboard = Dashboard.getById(targetDashboardId);
    if (!targetDashboard) {
      return res.status(404).json({ error: 'Target dashboard not found' });
    }

    const newWidget = Widget.create({
      dashboardId: targetDashboardId,
      name: `${original.name} (Copy)`,
      description: original.description,
      type: original.type,
      dataSource: { ...original.dataSource },
      position: {
        ...original.position,
        x: original.position.x + original.position.w + 1
      },
      style: { ...original.style },
      config: { ...original.config }
    });

    Dashboard.addWidget(targetDashboardId, newWidget.id);

    res.status(201).json(newWidget);
  } catch (error) {
    console.error('Error duplicating widget:', error);
    res.status(500).json({ error: 'Failed to duplicate widget' });
  }
});

// Get widget types
router.get('/types/list', (req: Request, res: Response) => {
  const types: WidgetType[] = [
    'kpi',
    'line-chart',
    'bar-chart',
    'pie-chart',
    'area-chart',
    'scatter-chart',
    'heatmap',
    'table',
    'gauge',
    'funnel',
    'donut',
    'metric'
  ];

  res.json({
    types: types.map(type => ({
      type,
      label: type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: getWidgetTypeDescription(type)
    }))
  });
});

function getWidgetTypeDescription(type: WidgetType): string {
  const descriptions: Record<WidgetType, string> = {
    'kpi': 'Key Performance Indicator - single value display',
    'line-chart': 'Line chart for trend analysis over time',
    'bar-chart': 'Bar chart for comparing values across categories',
    'pie-chart': 'Pie chart for showing proportional distribution',
    'area-chart': 'Area chart for cumulative values over time',
    'scatter-chart': 'Scatter plot for showing relationships between variables',
    'heatmap': 'Heatmap for density/intensity visualization',
    'table': 'Tabular data display with sorting and filtering',
    'gauge': 'Gauge for displaying progress or measurement',
    'funnel': 'Funnel chart for conversion analysis',
    'donut': 'Donut chart for proportional data',
    'metric': 'Simple metric display for single values'
  };

  return descriptions[type];
}

export default router;
