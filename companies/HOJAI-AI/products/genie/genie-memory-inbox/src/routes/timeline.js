/**
 * Timeline Routes
 *
 * Chronological view of all memories
 */

const express = require('express');

module.exports = function(memories) {
  const router = express.Router();

  /**
   * GET /api/timeline
   * Get timeline with date grouping
   */
  router.get('/', (req, res) => {
    const { userId, startDate, endDate, limit = 100 } = req.query;

    let result = Array.from(memories.values());

    // Filter by user
    if (userId) {
      result = result.filter(m => m.userId === userId);
    }

    // Filter by date range
    if (startDate) {
      result = result.filter(m => new Date(m.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      result = result.filter(m => new Date(m.createdAt) <= new Date(endDate));
    }

    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit
    result = result.slice(0, Number(limit));

    // Group by date
    const grouped = groupByDate(result);

    res.json({
      success: true,
      memories: result,
      grouped,
      total: result.length
    });
  });

  /**
   * GET /api/timeline/by-date
   * Get memories grouped by date
   */
  router.get('/by-date', (req, res) => {
    const { userId, days = 30 } = req.query;

    let result = Array.from(memories.values());

    if (userId) {
      result = result.filter(m => m.userId === userId);
    }

    // Filter to last N days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(days));
    result = result.filter(m => new Date(m.createdAt) >= cutoff);

    // Sort
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Group by date
    const grouped = {};
    result.forEach(memory => {
      const date = new Date(memory.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(memory);
    });

    // Convert to array
    const timeline = Object.entries(grouped).map(([date, items]) => ({
      date,
      memories: items,
      count: items.length
    }));

    res.json({
      success: true,
      timeline,
      total: result.length
    });
  });

  /**
   * GET /api/timeline/activity
   * Get activity stream (what happened when)
   */
  router.get('/activity', (req, res) => {
    const { userId, limit = 50 } = req.query;

    let result = Array.from(memories.values());

    if (userId) {
      result = result.filter(m => m.userId === userId);
    }

    // Sort by date
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Take limit
    result = result.slice(0, Number(limit));

    // Create activity stream
    const activities = result.map(memory => ({
      id: memory.id,
      type: memory.type,
      title: memory.title,
      category: memory.category,
      createdAt: memory.createdAt,
      source: memory.source,
      // Create activity description
      activity: createActivityDescription(memory)
    }));

    res.json({
      success: true,
      activities,
      total: result.length
    });
  });

  /**
   * GET /api/timeline/summary
   * Get daily/weekly summary
   */
  router.get('/summary', (req, res) => {
    const { userId, period = 'week' } = req.query;

    let result = Array.from(memories.values());

    if (userId) {
      result = result.filter(m => m.userId === userId);
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    if (period === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Filter by date range
    result = result.filter(m => new Date(m.createdAt) >= startDate);

    // Calculate summary
    const summary = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalMemories: result.length,
      byType: {},
      byCategory: {},
      byDay: {},
      topTags: [],
      hasReminders: result.filter(m => m.type === 'reminder').length,
      hasVoiceNotes: result.filter(m => m.type === 'voice').length,
      hasImages: result.filter(m => m.type === 'image').length
    };

    // Count by type
    result.forEach(m => {
      summary.byType[m.type] = (summary.byType[m.type] || 0) + 1;
      summary.byCategory[m.category] = (summary.byCategory[m.category] || 0) + 1;

      // Count by day
      const day = new Date(m.createdAt).toISOString().split('T')[0];
      summary.byDay[day] = (summary.byDay[day] || 0) + 1;
    });

    // Top tags
    const tagCounts = {};
    result.forEach(m => {
      if (m.tags) {
        m.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    summary.topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      success: true,
      summary
    });
  });

  /**
   * GET /api/timeline/today
   * Get today's memories
   */
  router.get('/today', (req, res) => {
    const { userId } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let result = Array.from(memories.values());

    if (userId) {
      result = result.filter(m => m.userId === userId);
    }

    result = result.filter(m => {
      const date = new Date(m.createdAt);
      return date >= today && date < tomorrow;
    });

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      date: today.toISOString().split('T')[0],
      memories: result,
      total: result.length
    });
  });

  /**
   * GET /api/timeline/year/:year
   * Get memories for a specific year
   */
  router.get('/year/:year', (req, res) => {
    const { userId } = req.query;
    const year = Number(req.params.year);

    let result = Array.from(memories.values());

    if (userId) {
      result = result.filter(m => m.userId === userId);
    }

    result = result.filter(m => {
      const date = new Date(m.createdAt);
      return date.getFullYear() === year;
    });

    // Group by month
    const byMonth = {};
    result.forEach(m => {
      const month = new Date(m.createdAt).toISOString().split('T')[0].substring(0, 7);
      if (!byMonth[month]) {
        byMonth[month] = [];
      }
      byMonth[month].push(m);
    });

    res.json({
      success: true,
      year,
      total: result.length,
      byMonth,
      months: Object.keys(byMonth).sort().reverse()
    });
  });

  // Helper: Group memories by date
  function groupByDate(memories) {
    const grouped = {};

    memories.forEach(memory => {
      const date = new Date(memory.createdAt);
      const dateKey = date.toISOString().split('T')[0];

      // Get relative date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateOnly = new Date(dateKey);
      dateOnly.setHours(0, 0, 0, 0);

      let label;
      if (dateOnly.getTime() === today.getTime()) {
        label = 'Today';
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        label = 'Yesterday';
      } else {
        label = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
      }

      if (!grouped[label]) {
        grouped[label] = {
          label,
          date: dateKey,
          memories: []
        };
      }
      grouped[label].memories.push(memory);
    });

    return Object.values(grouped);
  }

  // Helper: Create activity description
  function createActivityDescription(memory) {
    const typeDescriptions = {
      text: 'captured a note',
      voice: 'recorded a voice note',
      image: 'saved an image',
      link: 'bookmarked a link',
      email: 'saved an email',
      whatsapp: 'captured from WhatsApp',
      document: 'saved a document',
      meeting: 'created meeting notes',
      expense: 'logged an expense',
      reminder: 'set a reminder',
      task: 'added a task'
    };

    return typeDescriptions[memory.type] || 'captured something';
  }

  return router;
};
