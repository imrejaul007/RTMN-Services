/**
 * Heatmap Aggregator
 * Port: 5454
 * Aggregates click/scroll data into heatmaps
 */
const express = require('express');
const app = express();
const PORT = process.env.HEATMAP_AGGREGATOR_PORT || 5454;

app.use(express.json());

// Grid-based aggregation (100x100 grid)
const GRID_SIZE = 100;

// In-memory heatmap data
const clickHeatmaps = new Map(); // pageId -> { clicks: [[row, col, count]] }
const scrollHeatmaps = new Map(); // pageId -> { scrollDepths: number[] }
const rageClicks = new Map(); // pageId -> { positions: [[x, y]], count: number }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toGrid(x, y, width, height) {
  const col = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((x / width) * GRID_SIZE)));
  const row = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((y / height) * GRID_SIZE)));
  return [row, col];
}

function incrementGrid(grid, row, col) {
  if (!grid[row]) grid[row] = [];
  grid[row][col] = (grid[row][col] || 0) + 1;
}

function gridToSparse(grid) {
  const sparse = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    if (!grid[r]) continue;
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]) sparse.push([r, c, grid[r][c]]);
    }
  }
  return sparse;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'heatmap-aggregator', pages: clickHeatmaps.size, port: PORT });
});

// POST /api/heatmap/clicks - Record click positions
app.post('/api/heatmap/clicks', (req, res) => {
  try {
    const { pageId, companyId, clicks, width, height } = req.body;
    if (!pageId || !Array.isArray(clicks)) {
      return res.status(400).json({ success: false, error: 'pageId and clicks array are required' });
    }

    if (!clickHeatmaps.has(pageId)) {
      clickHeatmaps.set(pageId, { grid: [], totalClicks: 0, pages: {} });
    }
    const heatmap = clickHeatmaps.get(pageId);

    for (const click of clicks) {
      const { x, y, visitorId, timestamp, tag } = click;
      const [row, col] = toGrid(x, y, width || 1920, height || 1080);
      incrementGrid(heatmap.grid, row, col);
      heatmap.totalClicks++;
      if (visitorId) {
        heatmap.pages[visitorId] = heatmap.pages[visitorId] || [];
        heatmap.pages[visitorId].push({ row, col, timestamp, tag });
      }
    }

    res.json({ success: true, data: { tracked: clicks.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/heatmap/scrolls - Record scroll depth
app.post('/api/heatmap/scrolls', (req, res) => {
  try {
    const { pageId, depths, visitorId } = req.body;
    if (!pageId || !Array.isArray(depths)) {
      return res.status(400).json({ success: false, error: 'pageId and depths array are required' });
    }

    if (!scrollHeatmaps.has(pageId)) {
      scrollHeatmaps.set(pageId, { depths: [], visitors: {} });
    }
    const heatmap = scrollHeatmaps.get(pageId);

    for (const depth of depths) {
      heatmap.depths.push(depth);
    }
    if (visitorId) {
      heatmap.visitors[visitorId] = depths;
    }

    res.json({ success: true, data: { tracked: depths.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/heatmap/rage-clicks - Record rage clicks (multiple clicks in same spot)
app.post('/api/heatmap/rage-clicks', (req, res) => {
  try {
    const { pageId, positions, visitorId } = req.body;
    if (!pageId || !Array.isArray(positions)) {
      return res.status(400).json({ success: false, error: 'pageId and positions array are required' });
    }

    if (!rageClicks.has(pageId)) {
      rageClicks.set(pageId, { positions: [], count: 0, visitors: {} });
    }
    const data = rageClicks.get(pageId);

    for (const pos of positions) {
      data.positions.push(pos);
      data.count++;
    }
    if (visitorId) {
      data.visitors[visitorId] = positions;
    }

    res.json({ success: true, data: { tracked: positions.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/heatmap/page/:pageId - Get heatmap data for a page
app.get('/api/heatmap/page/:pageId', (req, res) => {
  try {
    const pageId = decodeURIComponent(req.params.pageId);

    const clickData = clickHeatmaps.get(pageId) || { grid: [], totalClicks: 0 };
    const scrollData = scrollHeatmaps.get(pageId) || { depths: [] };
    const rageData = rageClicks.get(pageId) || { positions: [], count: 0 };

    // Calculate scroll depth distribution
    const scrollDistribution = { '0-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 };
    for (const depth of scrollData.depths) {
      if (depth < 25) scrollDistribution['0-25']++;
      else if (depth < 50) scrollDistribution['25-50']++;
      else if (depth < 75) scrollDistribution['50-75']++;
      else scrollDistribution['75-100']++;
    }

    // Find hot spots (top 5 click areas)
    const grid = clickData.grid;
    const hotspots = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] > 0) hotspots.push({ row: r, col: c, clicks: grid[r][c] });
      }
    }
    hotspots.sort((a, b) => b.clicks - a.clicks);

    res.json({
      success: true,
      data: {
        pageId,
        clicks: {
          total: clickData.totalClicks,
          sparseGrid: gridToSparse(grid),
          hotspots: hotspots.slice(0, 5)
        },
        scrolls: {
          total: scrollData.depths.length,
          distribution: scrollDistribution,
          avgDepth: scrollData.depths.length > 0
            ? Math.round(scrollData.depths.reduce((a, b) => a + b, 0) / scrollData.depths.length)
            : 0
        },
        rageClicks: {
          total: rageData.count,
          avgPerUser: Object.keys(rageData.visitors).length > 0
            ? Math.round(rageData.count / Object.keys(rageData.visitors).length)
            : 0
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/heatmap/summary - Get site-wide heatmap summary
app.get('/api/heatmap/summary', (req, res) => {
  try {
    const { companyId } = req.query;

    const summary = {
      totalPages: clickHeatmaps.size,
      totalClicks: 0,
      avgScrollDepth: 0,
      allScrollDepths: []
    };

    for (const [, data] of clickHeatmaps) {
      summary.totalClicks += data.totalClicks || 0;
    }
    for (const [, data] of scrollHeatmaps) {
      summary.allScrollDepths.push(...data.depths);
    }

    if (summary.allScrollDepths.length > 0) {
      summary.avgScrollDepth = Math.round(
        summary.allScrollDepths.reduce((a, b) => a + b, 0) / summary.allScrollDepths.length
      );
    }

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Heatmap Aggregator running on port ${PORT}`);
});

module.exports = app;
