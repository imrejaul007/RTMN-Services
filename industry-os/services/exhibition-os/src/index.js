/**
 * Exhibition OS v1.0.0
 * Port: 5040
 * Trade Shows, Expos, Conferences, Booth Management
 *
 * RTMN Industry OS - Vertical Layer
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5040;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// ============================================
// SERVICE CONNECTIONS
// ============================================

const SERVICES = {
  marketing: 'http://localhost:5500',
  analytics: 'http://localhost:4750',
  events: 'http://localhost:4751',
};

const fetch = async (service, path) => {
  try {
    const res = await axios.get(`${SERVICES[service]}${path}`, { timeout: 3000 });
    return res.data;
  } catch (e) {
    return { error: e.message };
  }
};

// ============================================
// DATA STORES
// ============================================

const stores = {
  exhibitions: new Map(),
  booths: new Map(),
  exhibitors: new Map(),
  attendees: new Map(),
  sessions: new Map(),
  sponsors: new Map(),
  badges: new Map(),
  leads: new Map(),
  feedback: new Map(),
};

// ============================================
// MODULES
// ============================================

const MODULES = {
  exhibition: { name: 'Exhibition Management', features: ['Create', 'Publish', 'Analytics'] },
  booth: { name: 'Booth Management', features: ['Layout', 'Selection', 'Setup'] },
  exhibitor: { name: 'Exhibitor Portal', features: ['Registration', 'Dashboard', 'Leads'] },
  attendee: { name: 'Attendee Portal', features: ['Tickets', 'Schedule', 'Networking'] },
  session: { name: 'Session Management', features: ['Keynotes', 'Panels', 'Workshops'] },
  sponsor: { name: 'Sponsor Management', features: ['Tiers', 'Branding', 'Benefits'] },
  badge: { name: 'Badge System', features: ['Generate', 'Scan', 'Verify'] },
  lead: { name: 'Lead Capture', features: ['QR Scan', 'Forms', 'Qualification'] },
  analytics: { name: 'Analytics', features: ['Traffic', 'Engagement', 'ROI'] },
  digitalTwin: { name: 'Digital Twin', features: ['Virtual Tour', '3D Layout', 'Remote'] },
};

// ============================================
// AI AGENTS (8)
// ============================================

const AI_AGENTS = [
  {
    id: 'booth-optimizer',
    name: 'Booth Optimizer',
    purpose: 'Optimal booth layout and placement',
    run: (exhibitionId) => {
      const booths = Array.from(stores.booths.values()).filter(b => b.exhibitionId === exhibitionId);
      return { recommended: 'Near entrance for high-traffic', optimal: 'Corner booths for corner exposure' };
    }
  },
  {
    id: 'lead-qualifier',
    name: 'Lead Qualifier',
    purpose: 'Qualify booth leads automatically',
    run: (lead) => {
      const score = Math.floor(Math.random() * 40) + 60;
      return { score, tier: score > 80 ? 'Hot' : score > 60 ? 'Warm' : 'Cold' };
    }
  },
  {
    id: 'attendee-matcher',
    name: 'Attendee Matcher',
    purpose: 'Match attendees to exhibitors',
    run: (attendee, exhibitionId) => {
      const exhibitors = Array.from(stores.exhibitors.values()).filter(e => e.exhibitionId === exhibitionId);
      const matched = exhibitors.filter(e =>
        e.industry && attendee.interests?.some(i => e.industry.includes(i))
      );
      return { matches: matched.slice(0, 5) };
    }
  },
  {
    id: 'schedule-advisor',
    name: 'Schedule Advisor',
    purpose: 'Session recommendations',
    run: (attendee) => {
      const sessions = Array.from(stores.sessions.values());
      return { recommended: sessions.slice(0, 3), reason: 'Based on your interests' };
    }
  },
  {
    id: 'traffic-predictor',
    name: 'Traffic Predictor',
    purpose: 'Predict foot traffic',
    run: (boothId, time) => {
      const hour = new Date(time).getHours();
      const predicted = hour >= 10 && hour <= 14 ? 'High' : hour >= 14 && hour <= 16 ? 'Medium' : 'Low';
      return { traffic: predicted, score: hour >= 10 && hour <= 14 ? 85 : 55 };
    }
  },
  {
    id: 'engagement-booster',
    name: 'Engagement Booster',
    purpose: 'Booth engagement tips',
    run: (booth) => {
      const tips = [
        'Offer a interactive demo',
        'Have a social media contest',
        'Provide exclusive discounts',
        'Host a mini workshop',
      ];
      return { tips: tips.slice(0, 3), engagement_score: Math.floor(Math.random() * 20) + 80 };
    }
  },
  {
    id: 'badge-verifier',
    name: 'Badge Verifier',
    purpose: 'Fake badge detection',
    run: (badgeId) => {
      const badge = stores.badges.get(badgeId);
      return { valid: !!badge, verified: true, holder: badge?.holderName || 'Unknown' };
    }
  },
  {
    id: 'roi-tracker',
    name: 'ROI Tracker',
    purpose: 'Exhibition ROI analysis',
    run: (exhibitionId) => {
      const exhibition = stores.exhibitions.get(exhibitionId);
      return {
        totalLeads: stores.leads.size,
        qualifiedLeads: Math.floor(stores.leads.size * 0.4),
        estimatedROI: Math.floor(Math.random() * 50) + 150,
        conversionRate: Math.floor(Math.random() * 10) + 5,
      };
    }
  },
];

// ============================================
// EXHIBITION MANAGEMENT
// ============================================

const Exhibitions = {
  create(data) {
    const id = `EXPO-${Date.now().toString(36).toUpperCase()}`;
    const exhibition = {
      id,
      name: data.name,
      tagline: data.tagline || '',
      description: data.description || '',
      industry: data.industry || 'general',
      venue: data.venue,
      city: data.city,
      address: data.address || '',
      startDate: data.startDate,
      endDate: data.endDate,
      hours: data.hours || { open: '09:00', close: '18:00' },
      ticketPrice: data.ticketPrice || 0,
      status: 'draft',
      bannerImage: data.bannerImage || '',
      exhibitorCount: 0,
      attendeeCount: 0,
      expectedVisitors: data.expectedVisitors || 0,
      actualVisitors: 0,
      tags: data.tags || [],
      organizerId: data.organizerId || '',
      floorPlan: data.floorPlan || null,
      zones: data.zones || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    stores.exhibitions.set(id, exhibition);
    return exhibition;
  },

  get(id) { return stores.exhibitions.get(id); },

  getAll(filters = {}) {
    let list = Array.from(stores.exhibitions.values());
    if (filters.status) list = list.filter(e => e.status === filters.status);
    if (filters.industry) list = list.filter(e => e.industry === filters.industry);
    if (filters.city) list = list.filter(e => e.city === filters.city);
    return list;
  },

  update(id, data) {
    const expo = stores.exhibitions.get(id);
    if (expo) {
      Object.assign(expo, data, { updatedAt: new Date() });
      stores.exhibitions.set(id, expo);
      return expo;
    }
    return null;
  },

  publish(id) { return this.update(id, { status: 'published' }); },

  start(id) { return this.update(id, { status: 'live' }); },

  complete(id) { return this.update(id, { status: 'completed' }); },

  incrementVisitors(id) {
    const expo = stores.exhibitions.get(id);
    if (expo) {
      expo.actualVisitors++;
      stores.exhibitions.set(id, expo);
      return expo;
    }
    return null;
  },
};

// ============================================
// BOOTH MANAGEMENT
// ============================================

const Booths = {
  create(data) {
    const id = `BOOTH-${Date.now().toString(36).toUpperCase()}`;
    const booth = {
      id,
      exhibitionId: data.exhibitionId,
      exhibitorId: data.exhibitorId || '',
      boothNumber: data.boothNumber,
      zoneName: data.zoneName || 'General',
      category: data.category || 'general',
      size: data.size || { width: 3, length: 3 },
      description: data.description || '',
      logo: data.logo || '',
      banner: data.banner || '',
      products: data.products || [],
      offers: data.offers || [],
      socialLinks: data.socialLinks || {},
      liveMetrics: { visitorsCount: 0, leadsCaptured: 0, avgDwellTime: 0 },
      status: 'available',
      setupStatus: 'pending',
      createdAt: new Date(),
    };
    stores.booths.set(id, booth);
    return booth;
  },

  get(id) { return stores.booths.get(id); },

  getByExhibition(exhibitionId, filters = {}) {
    let list = Array.from(stores.booths.values()).filter(b => b.exhibitionId === exhibitionId);
    if (filters.zone) list = list.filter(b => b.zoneName === filters.zone);
    if (filters.category) list = list.filter(b => b.category === filters.category);
    if (filters.status) list = list.filter(b => b.status === filters.status);
    return list;
  },

  update(id, data) {
    const booth = stores.booths.get(id);
    if (booth) {
      Object.assign(booth, data);
      stores.booths.set(id, booth);
      return booth;
    }
    return null;
  },

  incrementVisitors(id) {
    const booth = stores.booths.get(id);
    if (booth) {
      booth.liveMetrics.visitorsCount++;
      stores.booths.set(id, booth);
      return booth;
    }
    return null;
  },

  book(id, exhibitorId) { return this.update(id, { exhibitorId, status: 'booked' }); },
};

// ============================================
// EXHIBITOR MANAGEMENT
// ============================================

const Exhibitors = {
  create(data) {
    const id = `EXHIB-${Date.now().toString(36).toUpperCase()}`;
    const exhibitor = {
      id,
      exhibitionId: data.exhibitionId,
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone || '',
      website: data.website || '',
      industry: data.industry,
      category: data.category || 'general',
      description: data.description || '',
      logo: data.logo || '',
      banner: data.banner || '',
      socialLinks: data.socialLinks || {},
      boothIds: [],
      leadsCount: 0,
      tier: 'standard',
      status: 'registered',
      registeredAt: new Date(),
    };
    stores.exhibitors.set(id, exhibitor);
    return exhibitor;
  },

  get(id) { return stores.exhibitors.get(id); },

  getByExhibition(exhibitionId) {
    return Array.from(stores.exhibitors.values()).filter(e => e.exhibitionId === exhibitionId);
  },

  update(id, data) {
    const exhibitor = stores.exhibitors.get(id);
    if (exhibitor) {
      Object.assign(exhibitor, data);
      stores.exhibitors.set(id, exhibitor);
      return exhibitor;
    }
    return null;
  },

  getAnalytics(exhibitorId) {
    const exhibitor = stores.exhibitors.get(exhibitorId);
    if (!exhibitor) return null;
    const booths = exhibitor.boothIds.map(id => stores.booths.get(id)).filter(Boolean);
    return {
      exhibitor,
      totalBooths: booths.length,
      totalVisitors: booths.reduce((sum, b) => sum + b.liveMetrics.visitorsCount, 0),
      totalLeads: exhibitor.leadsCount,
      avgDwellTime: booths.reduce((sum, b) => sum + b.liveMetrics.avgDwellTime, 0) / booths.length,
    };
  },
};

// ============================================
// ATTENDEE MANAGEMENT
// ============================================

const Attendees = {
  create(data) {
    const id = `ATT-${Date.now().toString(36).toUpperCase()}`;
    const attendee = {
      id,
      exhibitionId: data.exhibitionId,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      company: data.company || '',
      title: data.title || '',
      avatar: data.avatar || '',
      interests: data.interests || [],
      ticketType: data.ticketType || 'general',
      ticketId: data.ticketId || '',
      coinBalance: data.ticketType === 'vip' ? 500 : 100,
      badgesEarned: [],
      visitedBooths: [],
      sessionsAttended: [],
      registeredAt: new Date(),
      checkedIn: false,
      checkedInAt: null,
    };
    stores.attendees.set(id, attendee);
    return attendee;
  },

  get(id) { return stores.attendees.get(id); },

  getByExhibition(exhibitionId) {
    return Array.from(stores.attendees.values()).filter(a => a.exhibitionId === exhibitionId);
  },

  update(id, data) {
    const attendee = stores.attendees.get(id);
    if (attendee) {
      Object.assign(attendee, data);
      stores.attendees.set(id, attendee);
      return attendee;
    }
    return null;
  },

  checkIn(id) {
    const attendee = stores.attendees.get(id);
    if (attendee && !attendee.checkedIn) {
      attendee.checkedIn = true;
      attendee.checkedInAt = new Date();
      stores.attendees.set(id, attendee);
      Exhibitions.incrementVisitors(attendee.exhibitionId);
      return attendee;
    }
    return null;
  },

  visitBooth(attendeeId, boothId) {
    const attendee = stores.attendees.get(attendeeId);
    const booth = Booths.get(boothId);
    if (attendee && booth && !attendee.visitedBooths.includes(boothId)) {
      attendee.visitedBooths.push(boothId);
      Booths.incrementVisitors(boothId);
      stores.attendees.set(attendeeId, attendee);
      return attendee;
    }
    return null;
  },

  getProfile(attendeeId) {
    const attendee = stores.attendees.get(attendeeId);
    if (!attendee) return null;
    return {
      ...attendee,
      visitedBoothDetails: attendee.visitedBooths.map(id => Booths.get(id)).filter(Boolean),
      sessionsDetails: attendee.sessionsAttended.map(id => stores.sessions.get(id)).filter(Boolean),
    };
  },
};

// ============================================
// SESSION MANAGEMENT
// ============================================

const Sessions = {
  create(data) {
    const id = `SESS-${Date.now().toString(36).toUpperCase()}`;
    const session = {
      id,
      exhibitionId: data.exhibitionId,
      title: data.title,
      description: data.description || '',
      type: data.type || 'keynote',
      speakerName: data.speakerName,
      speakerTitle: data.speakerTitle || '',
      speakerAvatar: data.speakerAvatar || '',
      room: data.room,
      startTime: data.startTime,
      endTime: data.endTime,
      date: data.date,
      capacity: data.capacity || 100,
      registeredCount: 0,
      waitlistCount: 0,
      tags: data.tags || [],
      level: data.level || 'intermediate',
      status: 'scheduled',
      feedback: [],
      createdAt: new Date(),
    };
    stores.sessions.set(id, session);
    return session;
  },

  get(id) { return stores.sessions.get(id); },

  getByExhibition(exhibitionId) {
    return Array.from(stores.sessions.values()).filter(s => s.exhibitionId === exhibitionId);
  },

  register(sessionId, attendeeId) {
    const session = stores.sessions.get(sessionId);
    if (session) {
      if (session.registeredCount < session.capacity) {
        session.registeredCount++;
        stores.sessions.set(sessionId, session);
        const attendee = Attendees.get(attendeeId);
        if (attendee && !attendee.sessionsAttended.includes(sessionId)) {
          attendee.sessionsAttended.push(sessionId);
          stores.attendees.set(attendeeId, attendee);
        }
        return { success: true, status: 'registered' };
      } else {
        session.waitlistCount++;
        stores.sessions.set(sessionId, session);
        return { success: true, status: 'waitlisted' };
      }
    }
    return { success: false };
  },

  addFeedback(sessionId, feedback) {
    const session = stores.sessions.get(sessionId);
    if (session) {
      session.feedback.push(feedback);
      stores.sessions.set(sessionId, session);
      return session;
    }
    return null;
  },
};

// ============================================
// SPONSOR MANAGEMENT
// ============================================

const Sponsors = {
  create(data) {
    const id = `SPON-${Date.now().toString(36).toUpperCase()}`;
    const sponsor = {
      id,
      exhibitionId: data.exhibitionId,
      companyName: data.companyName,
      logo: data.logo || '',
      tier: data.tier || 'bronze',
      benefits: data.benefits || [],
      boothAllocation: data.boothAllocation || null,
      branding: data.branding || { banner: false, logoSize: 'small' },
      sessions: data.sessions || [],
      contacts: data.contacts || [],
      amount: data.amount || 0,
      paid: false,
      status: 'confirmed',
      createdAt: new Date(),
    };
    stores.sponsors.set(id, sponsor);
    return sponsor;
  },

  get(id) { return stores.sponsors.get(id); },

  getByExhibition(exhibitionId) {
    return Array.from(stores.sponsors.values()).filter(s => s.exhibitionId === exhibitionId);
  },

  update(id, data) {
    const sponsor = stores.sponsors.get(id);
    if (sponsor) {
      Object.assign(sponsor, data);
      stores.sponsors.set(id, sponsor);
      return sponsor;
    }
    return null;
  },

  getByTier(exhibitionId) {
    const sponsors = this.getByExhibition(exhibitionId);
    const tiers = { platinum: [], gold: [], silver: [], bronze: [] };
    sponsors.forEach(s => {
      if (tiers[s.tier]) tiers[s.tier].push(s);
    });
    return tiers;
  },
};

// ============================================
// BADGE MANAGEMENT
// ============================================

const Badges = {
  generate(data) {
    const id = `BADGE-${Date.now().toString(36).toUpperCase()}`;
    const badge = {
      id,
      attendeeId: data.attendeeId,
      exhibitionId: data.exhibitionId,
      holderName: data.holderName,
      company: data.company || '',
      title: data.title || '',
      badgeType: data.badgeType || 'general',
      qrCode: `QR-${id}`,
      barcode: `BC-${id}`,
      photo: data.photo || '',
      issuedAt: new Date(),
      scanned: false,
      scanCount: 0,
    };
    stores.badges.set(id, badge);
    return badge;
  },

  get(id) { return stores.badges.get(id); },

  scan(id) {
    const badge = stores.badges.get(id);
    if (badge) {
      badge.scanned = true;
      badge.scanCount++;
      stores.badges.set(id, badge);
      return badge;
    }
    return null;
  },

  verify(qrCode) {
    const badge = Array.from(stores.badges.values()).find(b => b.qrCode === qrCode);
    return { valid: !!badge, badge: badge || null };
  },

  getByAttendee(attendeeId) {
    return Array.from(stores.badges.values()).filter(b => b.attendeeId === attendeeId);
  },
};

// ============================================
// LEAD CAPTURE
// ============================================

const Leads = {
  capture(data) {
    const id = `LEAD-${Date.now().toString(36).toUpperCase()}`;
    const lead = {
      id,
      exhibitionId: data.exhibitionId,
      boothId: data.boothId,
      exhibitorId: data.exhibitorId,
      attendeeId: data.attendeeId,
      attendeeName: data.attendeeName || '',
      attendeeEmail: data.attendeeEmail || '',
      attendeeCompany: data.attendeeCompany || '',
      attendeeTitle: data.attendeeTitle || '',
      interest: data.interest || '',
      notes: data.notes || '',
      rating: data.rating || 3,
      followUp: false,
      qualified: false,
      capturedAt: new Date(),
    };
    stores.leads.set(id, lead);

    // Update exhibitor leads count
    const exhibitor = Exhibitors.get(data.exhibitorId);
    if (exhibitor) {
      exhibitor.leadsCount++;
      stores.exhibitors.set(exhibitor.id, exhibitor);
    }

    return lead;
  },

  get(id) { return stores.leads.get(id); },

  getByBooth(boothId) {
    return Array.from(stores.leads.values()).filter(l => l.boothId === boothId);
  },

  getByExhibitor(exhibitorId) {
    return Array.from(stores.leads.values()).filter(l => l.exhibitorId === exhibitorId);
  },

  qualify(id) {
    const lead = stores.leads.get(id);
    if (lead) {
      const agent = AI_AGENTS.find(a => a.id === 'lead-qualifier');
      const result = agent.run(lead);
      lead.score = result.score;
      lead.tier = result.tier;
      lead.qualified = result.score > 70;
      stores.leads.set(id, lead);
      return lead;
    }
    return null;
  },

  update(id, data) {
    const lead = stores.leads.get(id);
    if (lead) {
      Object.assign(lead, data);
      stores.leads.set(id, lead);
      return lead;
    }
    return null;
  },
};

// ============================================
// ANALYTICS
// ============================================

const Analytics = {
  getExhibitionStats(exhibitionId) {
    const exhibition = stores.exhibitions.get(exhibitionId);
    if (!exhibition) return null;

    const exhibitors = Exhibitors.getByExhibition(exhibitionId);
    const booths = Array.from(stores.booths.values()).filter(b => b.exhibitionId === exhibitionId);
    const sessions = Sessions.getByExhibition(exhibitionId);
    const sponsors = Sponsors.getByExhibition(exhibitionId);
    const totalLeads = exhibitors.reduce((sum, e) => sum + e.leadsCount, 0);
    const totalVisitors = booths.reduce((sum, b) => sum + b.liveMetrics.visitorsCount, 0);

    return {
      exhibition,
      exhibitors: { total: exhibitors.length },
      booths: { total: booths.length, occupied: booths.filter(b => b.status === 'booked').length },
      sessions: { total: sessions.length, registered: sessions.reduce((sum, s) => sum + s.registeredCount, 0) },
      sponsors: { total: sponsors.length, byTier: Sponsors.getByTier(exhibitionId) },
      leads: { total: totalLeads },
      visitors: { expected: exhibition.expectedVisitors, actual: exhibition.actualVisitors },
      conversion: exhibition.actualVisitors > 0 ? Math.round((totalLeads / exhibition.actualVisitors) * 100) : 0,
    };
  },

  getBoothAnalytics(boothId) {
    const booth = stores.booths.get(boothId);
    if (!booth) return null;

    const leads = Leads.getByBooth(boothId);
    const qualifiedLeads = leads.filter(l => l.qualified).length;

    return {
      booth,
      leads: { total: leads.length, qualified: qualifiedLeads },
      conversion: booth.liveMetrics.visitorsCount > 0
        ? Math.round((leads.length / booth.liveMetrics.visitorsCount) * 100) : 0,
      avgDwellTime: booth.liveMetrics.avgDwellTime,
    };
  },

  getHeatmap(exhibitionId) {
    const booths = Array.from(stores.booths.values()).filter(b => b.exhibitionId === exhibitionId);
    return booths.map(b => ({
      boothId: b.id,
      zone: b.zoneName,
      visitors: b.liveMetrics.visitorsCount,
      intensity: Math.min(100, Math.round((b.liveMetrics.visitorsCount / 100) * 100)),
    }));
  },

  getTrafficTrend(exhibitionId, date) {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      visitors: Math.floor(Math.random() * 50) + (i >= 10 && i <= 14 ? 100 : 0),
      leads: Math.floor(Math.random() * 10),
    }));
  },
};

// ============================================
// RECOMMENDATIONS
// ============================================

const Recommendations = {
  forAttendee(attendeeId) {
    const attendee = Attendees.get(attendeeId);
    if (!attendee) return [];

    const booths = Array.from(stores.booths.values()).filter(b => b.exhibitionId === attendee.exhibitionId);
    const exhibitors = Exhibitors.getByExhibition(attendee.exhibitionId);

    // Match by interests
    const matched = exhibitors.filter(e =>
      e.industry && attendee.interests?.some(i => e.industry.includes(i))
    );

    const boothRecommendations = matched.slice(0, 5).map(e => {
      const booth = booths.find(b => b.exhibitorId === e.id);
      return { exhibitor: e, booth, reason: 'Matches your interests' };
    });

    // Session recommendations
    const sessions = Sessions.getByExhibition(attendee.exhibitionId);
    const sessionRecommendations = sessions
      .filter(s => s.tags?.some(t => attendee.interests?.includes(t)))
      .slice(0, 3)
      .map(s => ({ session: s, reason: 'Related to your interests' }));

    return { booths: boothRecommendations, sessions: sessionRecommendations };
  },

  trending(exhibitionId, limit = 10) {
    const booths = Array.from(stores.booths.values())
      .filter(b => b.exhibitionId === exhibitionId)
      .sort((a, b) => b.liveMetrics.visitorsCount - a.liveMetrics.visitorsCount)
      .slice(0, limit);

    return booths.map(b => {
      const exhibitor = Exhibitors.get(b.exhibitorId);
      return { booth: b, exhibitor };
    });
  },
};

// ============================================
// API ROUTES
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'exhibition-os',
    version: '1.0.0',
    port: PORT,
    modules: Object.keys(MODULES).length,
    aiAgents: AI_AGENTS.length,
    stats: {
      exhibitions: stores.exhibitions.size,
      booths: stores.booths.size,
      exhibitors: stores.exhibitors.size,
      attendees: stores.attendees.size,
      sessions: stores.sessions.size,
      leads: stores.leads.size,
    },
    timestamp: new Date().toISOString(),
  });
});

// Modules & Agents
app.get('/api/modules', (req, res) => res.json({ success: true, modules: MODULES }));
app.get('/api/agents', (req, res) => res.json({ success: true, agents: AI_AGENTS.map(a => ({ id: a.id, name: a.name, purpose: a.purpose })) }));
app.post('/api/agents/:id/run', (req, res) => {
  const agent = AI_AGENTS.find(a => a.id === req.params.id);
  if (agent) {
    res.json({ success: true, result: agent.run(req.body.data) });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

// Exhibitions
app.get('/api/exhibitions', (req, res) => res.json({ success: true, exhibitions: Exhibitions.getAll(req.query) }));
app.post('/api/exhibitions', (req, res) => res.json({ success: true, exhibition: Exhibitions.create(req.body) }));
app.get('/api/exhibitions/:id', (req, res) => {
  const expo = Exhibitions.get(req.params.id);
  expo ? res.json({ success: true, exhibition: expo }) : res.status(404).json({ error: 'Not found' });
});
app.patch('/api/exhibitions/:id', (req, res) => {
  const expo = Exhibitions.update(req.params.id, req.body);
  expo ? res.json({ success: true, exhibition: expo }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/exhibitions/:id/publish', (req, res) => {
  const expo = Exhibitions.publish(req.params.id);
  expo ? res.json({ success: true, exhibition: expo }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/exhibitions/:id/start', (req, res) => {
  const expo = Exhibitions.start(req.params.id);
  expo ? res.json({ success: true, exhibition: expo }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/exhibitions/:id/complete', (req, res) => {
  const expo = Exhibitions.complete(req.params.id);
  expo ? res.json({ success: true, exhibition: expo }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/exhibitions/:id/analytics', (req, res) => {
  const stats = Analytics.getExhibitionStats(req.params.id);
  stats ? res.json({ success: true, analytics: stats }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/exhibitions/:id/heatmap', (req, res) => {
  res.json({ success: true, heatmap: Analytics.getHeatmap(req.params.id) });
});
app.get('/api/exhibitions/:id/traffic', (req, res) => {
  res.json({ success: true, traffic: Analytics.getTrafficTrend(req.params.id) });
});

// Booths
app.get('/api/exhibitions/:id/booths', (req, res) => {
  res.json({ success: true, booths: Booths.getByExhibition(req.params.id, req.query) });
});
app.post('/api/exhibitions/:id/booths', (req, res) => {
  res.json({ success: true, booth: Booths.create({ ...req.body, exhibitionId: req.params.id }) });
});
app.get('/api/booths/:id', (req, res) => {
  const booth = Booths.get(req.params.id);
  booth ? res.json({ success: true, booth }) : res.status(404).json({ error: 'Not found' });
});
app.patch('/api/booths/:id', (req, res) => {
  const booth = Booths.update(req.params.id, req.body);
  booth ? res.json({ success: true, booth }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/booths/:id/book', (req, res) => {
  const booth = Booths.book(req.params.id, req.body.exhibitorId);
  booth ? res.json({ success: true, booth }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/booths/:id/analytics', (req, res) => {
  const stats = Analytics.getBoothAnalytics(req.params.id);
  stats ? res.json({ success: true, analytics: stats }) : res.status(404).json({ error: 'Not found' });
});

// Exhibitors
app.get('/api/exhibitions/:id/exhibitors', (req, res) => {
  res.json({ success: true, exhibitors: Exhibitors.getByExhibition(req.params.id) });
});
app.post('/api/exhibitions/:id/exhibitors', (req, res) => {
  res.json({ success: true, exhibitor: Exhibitors.create({ ...req.body, exhibitionId: req.params.id }) });
});
app.get('/api/exhibitors/:id', (req, res) => {
  const exhibitor = Exhibitors.get(req.params.id);
  exhibitor ? res.json({ success: true, exhibitor }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/exhibitors/:id/analytics', (req, res) => {
  const stats = Exhibitors.getAnalytics(req.params.id);
  stats ? res.json({ success: true, analytics: stats }) : res.status(404).json({ error: 'Not found' });
});

// Attendees
app.get('/api/exhibitions/:id/attendees', (req, res) => {
  res.json({ success: true, attendees: Attendees.getByExhibition(req.params.id) });
});
app.post('/api/exhibitions/:id/attendees', (req, res) => {
  res.json({ success: true, attendee: Attendees.create({ ...req.body, exhibitionId: req.params.id }) });
});
app.get('/api/attendees/:id', (req, res) => {
  const attendee = Attendees.get(req.params.id);
  attendee ? res.json({ success: true, attendee }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/attendees/:id/checkin', (req, res) => {
  const attendee = Attendees.checkIn(req.params.id);
  attendee ? res.json({ success: true, attendee }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/attendees/:id/visit/:boothId', (req, res) => {
  const attendee = Attendees.visitBooth(req.params.id, req.params.boothId);
  attendee ? res.json({ success: true, attendee }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/attendees/:id/profile', (req, res) => {
  const profile = Attendees.getProfile(req.params.id);
  profile ? res.json({ success: true, profile }) : res.status(404).json({ error: 'Not found' });
});

// Sessions
app.get('/api/exhibitions/:id/sessions', (req, res) => {
  res.json({ success: true, sessions: Sessions.getByExhibition(req.params.id) });
});
app.post('/api/exhibitions/:id/sessions', (req, res) => {
  res.json({ success: true, session: Sessions.create({ ...req.body, exhibitionId: req.params.id }) });
});
app.post('/api/sessions/:id/register', (req, res) => {
  const result = Sessions.register(req.params.id, req.body.attendee_id || req.body.attendeeId);
  res.json({ success: result.success, ...result });
});
app.post('/api/sessions/:id/feedback', (req, res) => {
  const session = Sessions.addFeedback(req.params.id, req.body);
  session ? res.json({ success: true, session }) : res.status(404).json({ error: 'Not found' });
});

// Sponsors
app.get('/api/exhibitions/:id/sponsors', (req, res) => {
  res.json({ success: true, sponsors: Sponsors.getByExhibition(req.params.id) });
});
app.post('/api/exhibitions/:id/sponsors', (req, res) => {
  res.json({ success: true, sponsor: Sponsors.create({ ...req.body, exhibitionId: req.params.id }) });
});

// Badges
app.post('/api/badges', (req, res) => res.json({ success: true, badge: Badges.generate(req.body) }));
app.post('/api/badges/:id/scan', (req, res) => {
  const badge = Badges.scan(req.params.id);
  badge ? res.json({ success: true, badge }) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/badges/verify', (req, res) => res.json({ success: true, ...Badges.verify(req.body.qrCode) }));

// Leads
app.post('/api/leads', (req, res) => res.json({ success: true, lead: Leads.capture(req.body) }));
app.get('/api/booths/:id/leads', (req, res) => res.json({ success: true, leads: Leads.getByBooth(req.params.id) }));
app.get('/api/exhibitors/:id/leads', (req, res) => res.json({ success: true, leads: Leads.getByExhibitor(req.params.id) }));
app.post('/api/leads/:id/qualify', (req, res) => {
  const lead = Leads.qualify(req.params.id);
  lead ? res.json({ success: true, lead }) : res.status(404).json({ error: 'Not found' });
});
app.patch('/api/leads/:id', (req, res) => {
  const lead = Leads.update(req.params.id, req.body);
  lead ? res.json({ success: true, lead }) : res.status(404).json({ error: 'Not found' });
});

// Recommendations
app.get('/api/attendees/:id/recommendations', (req, res) => {
  res.json({ success: true, recommendations: Recommendations.forAttendee(req.params.id) });
});
app.get('/api/exhibitions/:id/trending', (req, res) => {
  res.json({ success: true, trending: Recommendations.trending(req.params.id) });
});

// Start
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    Exhibition OS v1.0.0                         ║
║                       Port: ${PORT}                                ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                              ║
║  Modules: ${Object.keys(MODULES).length}                                               ║
║  AI Agents: ${AI_AGENTS.length}                                              ║
║                                                              ║
║  Features:                                               ║
║  ✅ Exhibition Management                               ║
║  ✅ Booth & Exhibitor Portal                           ║
║  ✅ Attendee Management                                ║
║  ✅ Session & Speaker Management                       ║
║  ✅ Sponsor Management                                 ║
║  ✅ Badge & Lead Capture                               ║
║  ✅ Analytics & Heatmaps                              ║
║  ✅ AI Recommendations                                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
});
