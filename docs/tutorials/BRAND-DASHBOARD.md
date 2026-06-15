# Tutorial: Build Your First Brand Dashboard

**In this tutorial, you'll build a real-time brand dashboard using BrandPulse and the RTNM SDK.**

**Time:** 15 minutes
**Prerequisites:** Node.js 18+, RTMN account, API key

---

## What You'll Build

A dashboard that shows:
- Overall sentiment score
- Review volume over time
- Source breakdown (Google, Yelp, TripAdvisor, Facebook)
- Recent reviews with sentiment analysis
- Alert when sentiment drops

---

## Step 1: Set Up the Project

```bash
mkdir brand-dashboard
cd brand-dashboard
npm init -y
npm install @rtmn/sdk express socket.io
```

---

## Step 2: Create the Server

Create `server.js`:

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RTMNClient } from '@rtmn/sdk';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});
```

---

## Step 3: Create Dashboard API Endpoints

```javascript
// Get brand overview
app.get('/api/brands/:brandId/overview', async (req, res) => {
  const { brandId } = req.params;

  // Fetch all data in parallel
  const [brand, analytics, recentReviews] = await Promise.all([
    rtmn.brands.get(brandId),
    rtmn.analytics.getSentimentOverview(brandId, { period: '30d' }),
    rtmn.reviews.list(brandId, { limit: 10, sort: 'createdAt', order: 'desc' })
  ]);

  res.json({
    brand,
    analytics,
    recentReviews
  });
});

// Get sentiment over time
app.get('/api/brands/:brandId/sentiment-trend', async (req, res) => {
  const { brandId } = req.params;
  const { period = '30d' } = req.query;

  const trend = await rtmn.analytics.getSentimentTrend(brandId, { period });
  res.json(trend);
});

// Get source breakdown
app.get('/api/brands/:brandId/sources', async (req, res) => {
  const { brandId } = req.params;

  const sources = await rtmn.analytics.getSourceBreakdown(brandId);
  res.json(sources);
});
```

---

## Step 4: Set Up Real-Time Updates

```javascript
// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Subscribe to brand updates
  socket.on('subscribe:brand', async (brandId) => {
    socket.join(`brand:${brandId}`);

    // Send initial data
    const overview = await rtmn.brands.get(brandId);
    socket.emit('brand:overview', overview);
  });

  socket.on('unsubscribe:brand', (brandId) => {
    socket.leave(`brand:${brandId}`);
  });
});

// Poll for updates every 30 seconds
setInterval(async () => {
  const brands = await rtmn.brands.list({ limit: 100 });

  for (const brand of brands.data) {
    const analytics = await rtmn.analytics.getSentimentOverview(brand.id, {
      period: '1d'
    });

    // Emit update to subscribed clients
    io.to(`brand:${brand.id}`).emit('brand:update', {
      brandId: brand.id,
      analytics
    });
  }
}, 30000);
```

---

## Step 5: Create the Frontend

Create `public/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Brand Dashboard</title>
  <script src="/socket.io/socket.io.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .card { background: #f5f5f5; border-radius: 8px; padding: 20px; }
    .sentiment-score { font-size: 48px; font-weight: bold; text-align: center; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .neutral { color: #f59e0b; }
  </style>
</head>
<body>
  <h1>Brand Dashboard</h1>

  <div class="grid">
    <div class="card">
      <h3>Sentiment Score</h3>
      <div id="sentiment-score" class="sentiment-score">--</div>
      <div id="sentiment-trend">--</div>
    </div>

    <div class="card">
      <h3>Review Volume (30 days)</h3>
      <canvas id="volume-chart"></canvas>
    </div>

    <div class="card">
      <h3>Source Breakdown</h3>
      <canvas id="sources-chart"></canvas>
    </div>

    <div class="card">
      <h3>Recent Reviews</h3>
      <div id="recent-reviews"></div>
    </div>
  </div>

  <script>
    const socket = io();
    const brandId = 'brand_abc123'; // Replace with your brand ID

    // Subscribe to brand updates
    socket.emit('subscribe:brand', brandId);

    socket.on('brand:overview', (data) => {
      updateDashboard(data);
    });

    socket.on('brand:update', (data) => {
      updateAnalytics(data.analytics);
    });

    async function updateDashboard(data) {
      // Update sentiment score
      const score = data.analytics.overallSentiment;
      const scoreEl = document.getElementById('sentiment-score');
      scoreEl.textContent = score.toFixed(2);
      scoreEl.className = 'sentiment-score ' + getSentimentClass(score);

      // Update trend
      document.getElementById('sentiment-trend').textContent =
        `Change: ${data.analytics.sentimentChange > 0 ? '+' : ''}${data.analytics.sentimentChange.toFixed(2)}`;

      // Render charts
      renderVolumeChart(data.analytics.volumeTrend);
      renderSourcesChart(data.analytics.sourceBreakdown);
      renderRecentReviews(data.recentReviews);
    }

    function getSentimentClass(score) {
      if (score > 0.2) return 'positive';
      if (score < -0.2) return 'negative';
      return 'neutral';
    }

    function renderVolumeChart(data) {
      new Chart(document.getElementById('volume-chart'), {
        type: 'line',
        data: {
          labels: data.map(d => d.date),
          datasets: [{
            label: 'Reviews',
            data: data.map(d => d.count),
            borderColor: '#3b82f6',
            fill: false
          }]
        }
      });
    }

    function renderSourcesChart(data) {
      new Chart(document.getElementById('sources-chart'), {
        type: 'doughnut',
        data: {
          labels: data.map(d => d.source),
          datasets: [{
            data: data.map(d => d.count),
            backgroundColor: ['#4285f4', '#ff0000', '#34a853', '#1877f2']
          }]
        }
      });
    }

    function renderRecentReviews(reviews) {
      const container = document.getElementById('recent-reviews');
      container.innerHTML = reviews.map(r => `
        <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
          <strong>${r.source}</strong> (${r.rating}/5)
          <div>${r.text.substring(0, 100)}...</div>
          <small>${new Date(r.createdAt).toLocaleDateString()}</small>
        </div>
      `).join('');
    }
  </script>
</body>
</html>
```

---

## Step 6: Run the Dashboard

```bash
# Set your API key
export RTMN_API_KEY=rtmn_prod_your_key_here

# Start the server
node server.js
```

Open `http://localhost:3000` in your browser.

---

## Step 7: Add Alert Notifications

```javascript
// Monitor for negative sentiment spikes
async function checkForAlerts(brandId) {
  const analytics = await rtmn.analytics.getSentimentOverview(brandId, { period: '1d' });

  if (analytics.negativeReviewCount > 5) {
    // Send email alert
    await fetch('https://api.rtmn.io/api/v1/alerts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RTMN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'negative_sentiment_spike',
        brandId,
        data: analytics
      })
    });

    // Emit WebSocket alert
    io.to(`brand:${brandId}`).emit('alert', {
      type: 'negative_sentiment_spike',
      message: `Alert: ${analytics.negativeReviewCount} negative reviews today`
    });
  }
}

// Check every 5 minutes
setInterval(() => checkForAlerts(brandId), 5 * 60 * 1000);
```

---

## Complete Code

Get the full source code:
```bash
git clone https://github.com/rtmn-group/brand-dashboard-example.git
cd brand-dashboard-example
npm install
export RTMN_API_KEY=your_key_here
node server.js
```

---

## Next Steps

- [Set Up Sentiment Alerts](SENTIMENT-ALERTS.md)
- [Connect Review Sources](CONNECT-SOURCES.md)
- [Integrate with Hotel OS](HOTEL-INTEGRATION.md)
- [API Reference](docs/api-reference/OVERVIEW.md)
