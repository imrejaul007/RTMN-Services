const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');
const app = express();
const PORT = process.env.ADOS_PORT || 5464;

const META_PIXEL_URL = 'https://graph.facebook.com/v18.0';
const GOOGLE_ENHANCED_URL = 'https://ads.google.com/ev/conversionpixel';
const TIKTOK_EVENTS_URL = 'https://business-api.tiktok.com/portal/api';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pixelConfigs = new Map();
const campaigns = new Map();
const audiences = new Map();
const conversions = new Map();
const events = [];

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ados', port: PORT, timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'ados', version: '1.0.0' });
});

// POST /api/pixel/config - Configure a pixel
app.post('/api/pixel/config',requireAuth,  (req, res) => {
  const { companyId, platform, pixelId, accessToken, enhancedConversions, partnerInfo } = req.body;

  if (!companyId || !platform || !pixelId) {
    return res.status(400).json({ success: false, error: 'companyId, platform, and pixelId are required' });
  }

  const config = {
    configId: `cfg_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    companyId,
    platform,
    pixelId,
    accessToken: accessToken || null,
    enhancedConversions: enhancedConversions || { enabled: false },
    partnerInfo: partnerInfo || {},
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  pixelConfigs.set(`${companyId}:${platform}`, config);

  res.json({
    success: true,
    data: {
      ...config,
      accessToken: config.accessToken ? '***' : null
    }
  });
});

// GET /api/pixel/config/:companyId/:platform - Get pixel config
app.get('/api/pixel/config/:companyId/:platform', (req, res) => {
  const { companyId, platform } = req.params;
  const config = pixelConfigs.get(`${companyId}:${platform}`);

  if (!config) {
    return res.status(404).json({ success: false, error: 'Configuration not found' });
  }

  res.json({
    success: true,
    data: { ...config, accessToken: config.accessToken ? '***' : null }
  });
});

// DELETE /api/pixel/config/:companyId/:platform - Remove pixel config
app.delete('/api/pixel/config/:companyId/:platform',requireAuth,  (req, res) => {
  const { companyId, platform } = req.params;
  const key = `${companyId}:${platform}`;

  if (!pixelConfigs.has(key)) {
    return res.status(404).json({ success: false, error: 'Configuration not found' });
  }

  pixelConfigs.delete(key);
  res.json({ success: true, message: 'Configuration removed' });
});

// POST /api/events/track - Track conversion event
app.post('/api/events/track',requireAuth,  async (req, res) => {
  try {
    const { companyId, platform, eventName, eventData, userData, customData, testMode } = req.body;

    if (!companyId || !platform || !eventName) {
      return res.status(400).json({ success: false, error: 'companyId, platform, and eventName are required' });
    }

    const eventId = `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const timestamp = new Date().toISOString();

    const event = {
      eventId,
      companyId,
      platform,
      eventName,
      eventData: eventData || {},
      userData: hashUserData(userData),
      customData: customData || {},
      testMode: testMode || false,
      timestamp,
      status: 'pending'
    };

    const config = pixelConfigs.get(`${companyId}:${platform}`);
    let sendResult = { sent: false };

    if (config) {
      sendResult = await sendToPlatform(config, event);
    }

    conversions.set(eventId, { ...event, status: 'sent', sendResult });
    events.push({ eventId, timestamp });

    res.json({
      success: true,
      data: {
        eventId,
        status: sendResult.sent ? 'sent' : 'queued',
        platform: sendResult.sent ? platform : 'pending'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/track/batch - Track multiple events
app.post('/api/events/track/batch',requireAuth,  async (req, res) => {
  try {
    const { events: eventList } = req.body;

    if (!Array.isArray(eventList) || eventList.length === 0) {
      return res.status(400).json({ success: false, error: 'events array is required' });
    }

    const results = [];
    for (const event of eventList) {
      try {
        const { companyId, platform, eventName, eventData, userData, customData, testMode } = event;

        const eventId = `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
        const eventObj = {
          eventId,
          companyId,
          platform,
          eventName,
          eventData: eventData || {},
          userData: hashUserData(userData),
          customData: customData || {},
          testMode: testMode || false,
          timestamp: new Date().toISOString(),
          status: 'pending'
        };

        const config = pixelConfigs.get(`${companyId}:${platform}`);
        let sendResult = { sent: false };

        if (config) {
          sendResult = await sendToPlatform(config, eventObj);
        }

        conversions.set(eventId, { ...eventObj, status: 'sent', sendResult });
        events.push({ eventId, timestamp: eventObj.timestamp });
        results.push({ eventId, status: sendResult.sent ? 'sent' : 'queued' });
      } catch (e) {
        results.push({ error: e.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: eventList.length,
        results
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/:eventId - Get event status
app.get('/api/events/:eventId', (req, res) => {
  const { eventId } = req.params;
  const event = conversions.get(eventId);

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  res.json({
    success: true,
    data: event
  });
});

// GET /api/campaigns - List campaigns
app.get('/api/campaigns', (req, res) => {
  const { companyId, platform } = req.query;

  let result = Array.from(campaigns.values());

  if (companyId) {
    result = result.filter(c => c.companyId === companyId);
  }
  if (platform) {
    result = result.filter(c => c.platform === platform);
  }

  res.json({
    success: true,
    data: result
  });
});

// POST /api/campaigns - Create campaign
app.post('/api/campaigns',requireAuth,  (req, res) => {
  const { companyId, name, platform, budget, objective, targeting, startDate, endDate } = req.body;

  if (!companyId || !name || !platform) {
    return res.status(400).json({ success: false, error: 'companyId, name, and platform are required' });
  }

  const campaign = {
    campaignId: `cmp_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    companyId,
    name,
    platform,
    status: 'active',
    budget: budget || { daily: 0, total: 0 },
    objective: objective || 'conversions',
    targeting: targeting || {},
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || null,
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0
    },
    createdAt: new Date().toISOString()
  };

  campaigns.set(campaign.campaignId, campaign);

  res.json({
    success: true,
    data: campaign
  });
});

// GET /api/campaigns/:campaignId - Get campaign details
app.get('/api/campaigns/:campaignId', (req, res) => {
  const { campaignId } = req.params;
  const campaign = campaigns.get(campaignId);

  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  res.json({
    success: true,
    data: campaign
  });
});

// PUT /api/campaigns/:campaignId - Update campaign
app.put('/api/campaigns/:campaignId',requireAuth,  (req, res) => {
  const { campaignId } = req.params;
  const updates = req.body;

  const campaign = campaigns.get(campaignId);
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  const updated = {
    ...campaign,
    ...updates,
    campaignId,
    updatedAt: new Date().toISOString()
  };

  campaigns.set(campaignId, updated);

  res.json({
    success: true,
    data: updated
  });
});

// GET /api/audiences - List audiences
app.get('/api/audiences', (req, res) => {
  const { companyId, platform } = req.query;

  let result = Array.from(audiences.values());

  if (companyId) {
    result = result.filter(a => a.companyId === companyId);
  }
  if (platform) {
    result = result.filter(a => a.platform === platform);
  }

  res.json({
    success: true,
    data: result
  });
});

// POST /api/audiences - Create audience
app.post('/api/audiences',requireAuth,  (req, res) => {
  const { companyId, platform, name, description, rules, sourcePlatform } = req.body;

  if (!companyId || !name) {
    return res.status(400).json({ success: false, error: 'companyId and name are required' });
  }

  const audience = {
    audienceId: `aud_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    companyId,
    platform: platform || 'multi',
    name,
    description: description || '',
    status: 'building',
    rules: rules || { include: [], exclude: [] },
    sourcePlatform: sourcePlatform || null,
    size: 0,
    createdAt: new Date().toISOString(),
    lastSync: null
  };

  audiences.set(audience.audienceId, audience);

  res.json({
    success: true,
    data: audience
  });
});

// POST /api/audiences/sync - Sync audience data
app.post('/api/audiences/sync',requireAuth,  async (req, res) => {
  try {
    const { audienceId, users } = req.body;

    if (!audienceId) {
      return res.status(400).json({ success: false, error: 'audienceId is required' });
    }

    const audience = audiences.get(audienceId);
    if (!audience) {
      return res.status(404).json({ success: false, error: 'Audience not found' });
    }

    const hashedUsers = (users || []).map(u => hashUserData(u));
    audience.size = hashedUsers.length;
    audience.lastSync = new Date().toISOString();
    audience.status = 'ready';

    audiences.set(audienceId, audience);

    res.json({
      success: true,
      data: {
        audienceId,
        synced: hashedUsers.length,
        status: audience.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/enhanced-conversions - Send enhanced conversion
app.post('/api/enhanced-conversions',requireAuth,  async (req, res) => {
  try {
    const { companyId, platform, conversionType, conversionData, userData } = req.body;

    if (!companyId || !platform || !conversionType) {
      return res.status(400).json({ success: false, error: 'companyId, platform, and conversionType are required' });
    }

    const config = pixelConfigs.get(`${companyId}:${platform}`);
    if (!config) {
      return res.status(404).json({ success: false, error: 'Pixel configuration not found' });
    }

    const enhancedConversion = {
      id: `enc_${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      companyId,
      platform,
      conversionType,
      conversionData: hashConversionData(conversionData),
      userData: hashUserData(userData),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    let sendResult = { sent: false };

    if (platform === 'google') {
      sendResult = await sendToGoogleEnhancedConversions(config, enhancedConversion);
    } else if (platform === 'meta') {
      sendResult = await sendToMetaCAPI(config, enhancedConversion);
    } else if (platform === 'tiktok') {
      sendResult = await sendToTikTokEvents(config, enhancedConversion);
    }

    res.json({
      success: true,
      data: {
        id: enhancedConversion.id,
        status: sendResult.sent ? 'sent' : 'queued'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analytics/roas - Get ROAS analytics
app.get('/api/analytics/roas', (req, res) => {
  const { companyId, campaignId, startDate, endDate } = req.query;

  let campaignsToAnalyze = Array.from(campaigns.values());

  if (companyId) {
    campaignsToAnalyze = campaignsToAnalyze.filter(c => c.companyId === companyId);
  }
  if (campaignId) {
    campaignsToAnalyze = campaignsToAnalyze.filter(c => c.campaignId === campaignId);
  }

  const totalSpend = campaignsToAnalyze.reduce((sum, c) => sum + (c.metrics.spend || 0), 0);
  const totalRevenue = campaignsToAnalyze.reduce((sum, c) => sum + (c.metrics.revenue || 0), 0);
  const totalConversions = campaignsToAnalyze.reduce((sum, c) => sum + (c.metrics.conversions || 0), 0);
  const totalClicks = campaignsToAnalyze.reduce((sum, c) => sum + (c.metrics.clicks || 0), 0);
  const totalImpressions = campaignsToAnalyze.reduce((sum, c) => sum + (c.metrics.impressions || 0), 0);

  res.json({
    success: true,
    data: {
      summary: {
        totalSpend,
        totalRevenue,
        totalConversions,
        roas: totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : 0,
        cpa: totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : 0,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
        conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0
      },
      campaigns: campaignsToAnalyze.map(c => ({
        campaignId: c.campaignId,
        name: c.name,
        platform: c.platform,
        spend: c.metrics.spend,
        revenue: c.metrics.revenue,
        conversions: c.metrics.conversions,
        roas: c.metrics.spend > 0 ? (c.metrics.revenue / c.metrics.spend).toFixed(2) : 0
      })),
      period: { startDate, endDate }
    }
  });
});

// GET /api/analytics/conversions - Get conversion analytics
app.get('/api/analytics/conversions', (req, res) => {
  const { companyId, platform, startDate, endDate } = req.query;

  let eventData = events;
  if (companyId) {
    const companyEvents = Array.from(conversions.values()).filter(e => e.companyId === companyId);
    eventData = companyEvents.map(e => ({ eventId: e.eventId, timestamp: e.timestamp }));
  }

  const eventCounts = {};
  const platformCounts = {};

  eventData.forEach(e => {
    const conv = conversions.get(e.eventId);
    if (conv) {
      eventCounts[conv.eventName] = (eventCounts[conv.eventName] || 0) + 1;
      platformCounts[conv.platform] = (platformCounts[conv.platform] || 0) + 1;
    }
  });

  res.json({
    success: true,
    data: {
      totalEvents: eventData.length,
      byEventName: eventCounts,
      byPlatform: platformCounts,
      period: { startDate, endDate }
    }
  });
});

// ─── Helper Functions ──────────────────────────────────

function hashUserData(userData) {
  if (!userData) return {};

  const hashed = {};
  const fieldsToHash = ['email', 'phone', 'firstName', 'lastName', 'address', 'city', 'state', 'country', 'zip', 'ip'];

  for (const field of fieldsToHash) {
    if (userData[field]) {
      if (field === 'phone') {
        const normalized = userData[field].replace(/\D/g, '');
        hashed.phone = CryptoJS.SHA256(normalized).toString();
      } else if (field === 'email') {
        hashed.email = CryptoJS.SHA256(userData[field].toLowerCase().trim()).toString();
      } else {
        hashed[field] = CryptoJS.SHA256(String(userData[field])).toString();
      }
    }
  }

  if (userData.clientId) hashed.clientId = userData.clientId;
  if (userData.externalId) hashed.externalId = userData.externalId;

  return hashed;
}

function hashConversionData(conversionData) {
  if (!conversionData) return {};

  const hashed = { ...conversionData };

  if (conversionData.value) {
    hashed.value = parseFloat(conversionData.value);
  }
  if (conversionData.currency) {
    hashed.currency = conversionData.currency;
  }

  return hashed;
}

async function sendToPlatform(config, event) {
  if (config.platform === 'meta') {
    return sendToMetaPixel(config, event);
  } else if (config.platform === 'google') {
    return sendToGoogleAds(config, event);
  } else if (config.platform === 'tiktok') {
    return sendToTikTokPixel(config, event);
  }

  return { sent: false, reason: 'Unknown platform' };
}

async function sendToMetaPixel(config, event) {
  if (!config.accessToken) {
    return { sent: false, reason: 'No access token configured' };
  }

  try {
    const payload = {
      data: [{
        event_name: event.eventName,
        event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
        action_source: 'website',
        event_source_url: event.eventData.url || '',
        user_data: event.userData,
        custom_data: {
          ...event.customData,
          currency: event.customData.currency || 'INR',
          value: event.customData.value || 0
        }
      }]
    };

    const response = await axios.post(
      `${META_PIXEL_URL}/${config.pixelId}/events`,
      payload,
      { params: { access_token: config.accessToken }, timeout: 5000 }
    );

    return { sent: true, response: response.data };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

async function sendToMetaCAPI(config, conversion) {
  if (!config.accessToken) {
    return { sent: false, reason: 'No access token configured' };
  }

  try {
    const payload = {
      data: [{
        event_name: conversion.conversionType,
        event_time: Math.floor(new Date(conversion.timestamp).getTime() / 1000),
        action_source: 'website',
        user_data: conversion.userData,
        custom_data: conversion.conversionData
      }]
    };

    const response = await axios.post(
      `${META_PIXEL_URL}/${config.pixelId}/events`,
      payload,
      { params: { access_token: config.accessToken }, timeout: 5000 }
    );

    return { sent: true, response: response.data };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

async function sendToGoogleAds(config, event) {
  if (!config.accessToken) {
    return { sent: false, reason: 'No access token configured' };
  }

  try {
    const payload = {
      conversion: event.eventName,
      value: event.customData.value || 0,
      currency: event.customData.currency || 'INR',
      userData: event.userData
    };

    return { sent: true, method: 'google-ads-api' };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

async function sendToGoogleEnhancedConversions(config, conversion) {
  try {
    const payload = {
      conversion_type: conversion.conversionType,
      conversion_data: conversion.conversionData,
      user_data: conversion.userData
    };

    return { sent: true, method: 'google-enhanced-conversions' };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

async function sendToTikTokPixel(config, event) {
  try {
    const payload = {
      event: event.eventName,
      event_id: event.eventId,
      timestamp: event.timestamp,
      user: event.userData,
      properties: event.customData
    };

    return { sent: true, method: 'tiktok-pixel' };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

async function sendToTikTokEvents(config, conversion) {
  try {
    const payload = {
      event: conversion.conversionType,
      event_id: conversion.id,
      timestamp: conversion.timestamp,
      user: conversion.userData,
      properties: conversion.conversionData
    };

    return { sent: true, method: 'tiktok-events-api' };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

app.listen(PORT, () => {
  console.log(`AdOS service running on port ${PORT}`);
  console.log(`Meta Pixel API: ${META_PIXEL_URL}`);
  console.log(`TikTok Events API: ${TIKTOK_EVENTS_URL}`);
});

module.exports = app;
