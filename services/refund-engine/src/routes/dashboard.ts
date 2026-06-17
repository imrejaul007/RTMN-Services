import { Router, Request, Response } from 'express';
import { refundStore } from '../models/Refund';
import { analytics } from '../services/analytics';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get dashboard summary
router.get('/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const summary = analytics.getDashboardSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Failed to get dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard summary'
    });
  }
});

// Get refund statistics by status
router.get('/stats/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = refundStore.getStats();
    res.json({
      success: true,
      data: {
        total: stats.total,
        byStatus: stats.byStatus,
        totalCompletedAmount: stats.totalAmount
      }
    });
  } catch (error) {
    logger.error('Failed to get status stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status stats'
    });
  }
});

// Get refund statistics by channel
router.get('/stats/channels', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = refundStore.getStats();
    res.json({
      success: true,
      data: {
        byChannel: stats.byChannel
      }
    });
  } catch (error) {
    logger.error('Failed to get channel stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get channel stats'
    });
  }
});

// Get refund trends (daily/weekly/monthly)
router.get('/stats/trends', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { period = '7d', groupBy = 'day' } = req.query;
    const trends = analytics.getRefundTrends(period as string, groupBy as string);
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Failed to get trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trends'
    });
  }
});

// Get top refund reasons
router.get('/stats/reasons', authMiddleware, async (req: Request, res: Response) => {
  try {
    const reasons = analytics.getTopRefundReasons();
    res.json({
      success: true,
      data: reasons
    });
  } catch (error) {
    logger.error('Failed to get top reasons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top reasons'
    });
  }
});

// Get customer refund history
router.get('/stats/customer/:customerId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const refunds = refundStore.findAll({ customerId: req.params.customerId });
    const summary = analytics.getCustomerRefundSummary(req.params.customerId);

    res.json({
      success: true,
      data: {
        summary,
        recentRefunds: refunds.slice(0, 10)
      }
    });
  } catch (error) {
    logger.error('Failed to get customer refund stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer refund stats'
    });
  }
});

// Get pending refunds requiring attention
router.get('/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { priority = 'all', limit = 20 } = req.query;

    const pendingRefunds = refundStore.findAll({ status: 'pending' });

    let filtered = pendingRefunds;

    if (priority !== 'all') {
      filtered = pendingRefunds.filter(r => r.priority === priority);
    }

    // Sort by priority and creation date
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    filtered.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    res.json({
      success: true,
      data: filtered.slice(0, Number(limit)),
      total: filtered.length
    });
  } catch (error) {
    logger.error('Failed to get pending refunds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending refunds'
    });
  }
});

// Get auto-approve statistics
router.get('/auto-approve/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const allRefunds = refundStore.findAll();
    const autoApproved = allRefunds.filter(r => r.autoApproved);
    const totalRefunds = allRefunds.length;

    const stats = {
      totalAutoApproved: autoApproved.length,
      autoApproveRate: totalRefunds > 0 ? (autoApproved.length / totalRefunds) * 100 : 0,
      totalAutoApprovedAmount: autoApproved.reduce((sum, r) => sum + r.refundAmount, 0),
      averageAutoApproveAmount: autoApproved.length > 0
        ? autoApproved.reduce((sum, r) => sum + r.refundAmount, 0) / autoApproved.length
        : 0,
      byChannel: {
        order: autoApproved.filter(r => r.channel === 'order').length,
        payment: autoApproved.filter(r => r.channel === 'payment').length,
        subscription: autoApproved.filter(r => r.channel === 'subscription').length
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get auto-approve stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get auto-approve stats'
    });
  }
});

// Get processing time statistics
router.get('/stats/processing-time', authMiddleware, async (req: Request, res: Response) => {
  try {
    const completedRefunds = refundStore.findAll({ status: 'completed' });

    const processingTimes = completedRefunds
      .filter(r => r.processedAt && r.completedAt)
      .map(r => ({
        channel: r.channel,
        timeMs: new Date(r.completedAt!).getTime() - new Date(r.processedAt!).getTime()
      }));

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, t) => sum + t.timeMs, 0) / processingTimes.length
      : 0;

    // Group by channel
    const byChannel: Record<string, { count: number; avgTime: number }> = {};
    const channelGroups: Record<string, number[]> = {};

    processingTimes.forEach(t => {
      if (!channelGroups[t.channel]) channelGroups[t.channel] = [];
      channelGroups[t.channel].push(t.timeMs);
    });

    Object.entries(channelGroups).forEach(([channel, times]) => {
      byChannel[channel] = {
        count: times.length,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length
      };
    });

    res.json({
      success: true,
      data: {
        overall: {
          averageMs: avgProcessingTime,
          averageFormatted: formatDuration(avgProcessingTime),
          sampleSize: processingTimes.length
        },
        byChannel
      }
    });
  } catch (error) {
    logger.error('Failed to get processing time stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get processing time stats'
    });
  }
});

// Get fraud/risk indicators
router.get('/stats/risk', authMiddleware, async (req: Request, res: Response) => {
  try {
    const riskStats = analytics.getRiskIndicators();
    res.json({
      success: true,
      data: riskStats
    });
  } catch (error) {
    logger.error('Failed to get risk stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get risk stats'
    });
  }
});

// Export refund data
router.get('/export', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { format = 'json', startDate, endDate, status, channel } = req.query;

    const filters: Record<string, unknown> = {};
    if (status) filters.status = status;
    if (channel) filters.channel = channel;

    let refunds = refundStore.findAll(filters);

    // Apply date filters
    if (startDate) {
      const start = new Date(startDate as string);
      refunds = refunds.filter(r => new Date(r.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      refunds = refunds.filter(r => new Date(r.createdAt) <= end);
    }

    if (format === 'csv') {
      const csv = convertToCSV(refunds);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=refunds-export.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: refunds,
      exportedAt: new Date().toISOString(),
      totalCount: refunds.length
    });
  } catch (error) {
    logger.error('Failed to export refunds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export refunds'
    });
  }
});

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function convertToCSV(refunds: ReturnType<typeof refundStore.findAll>): string {
  const headers = [
    'requestId', 'customerId', 'channel', 'originalAmount', 'refundAmount',
    'currency', 'status', 'reason', 'autoApproved', 'createdAt', 'processedAt', 'completedAt'
  ];

  const rows = refunds.map(r => [
    r.requestId,
    r.customerId,
    r.channel,
    r.originalAmount,
    r.refundAmount,
    r.currency,
    r.status,
    r.reason,
    r.autoApproved,
    new Date(r.createdAt).toISOString(),
    r.processedAt ? new Date(r.processedAt).toISOString() : '',
    r.completedAt ? new Date(r.completedAt).toISOString() : ''
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n');
}

export default router;
