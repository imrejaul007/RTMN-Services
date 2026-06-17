/**
 * Community Routes - Local Events & Community Intelligence
 * Manages community events, gatherings, and local engagement
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AxomProfile, axomProfileStore, LocalEvent } from '../models/AxomProfile';
import { logger } from '../index';

const router = Router();

// Create community event
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { profileId, title, description, eventType, location, startDate, endDate, maxAttendees, isPublic, tags } =
      req.body;

    if (!profileId || !title || !eventType || !location || !startDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const profile = axomProfileStore.get(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const event: LocalEvent = {
      eventId: uuidv4(),
      title,
      description: description || '',
      eventType,
      location,
      hostId: profileId,
      hostName: profile.displayName,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      attendees: 1, // Host
      maxAttendees,
      isPublic: isPublic ?? true,
      tags: tags || [],
      engagementScore: 50
    };

    profile.localEvents.push(event);
    profile.stats.eventsHosted += 1;
    profile.updatedAt = new Date();
    axomProfileStore.set(profileId, profile);

    logger.info(`Community event created: ${event.eventId}`, { profileId, eventType });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Error creating community event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get events in area
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { areaId, eventType, upcoming = 'true', limit = 20, offset = 0 } = req.query;

    const events: Array<{ event: LocalEvent; hostProfile: AxomProfile }> = [];

    axomProfileStore.forEach((profile) => {
      profile.localEvents.forEach((event) => {
        if (areaId && event.location.areaId !== areaId) return;
        if (eventType && event.eventType !== eventType) return;
        if (upcoming === 'true' && event.startDate < new Date()) return;

        events.push({ event, hostProfile: profile });
      });
    });

    // Sort by date
    events.sort((a, b) => a.event.startDate.getTime() - b.event.startDate.getTime());

    const paginatedEvents = events.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: paginatedEvents,
      pagination: {
        total: events.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    let foundEvent: { event: LocalEvent; hostProfile: AxomProfile } | null = null;

    axomProfileStore.forEach((profile) => {
      const event = profile.localEvents.find((e) => e.eventId === eventId);
      if (event) {
        foundEvent = { event, hostProfile: profile };
      }
    });

    if (!foundEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      success: true,
      data: foundEvent
    });
  } catch (error) {
    logger.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// RSVP to event
router.post('/events/:eventId/rsvp', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { profileId, action } = req.body;

    if (!profileId || !action) {
      return res.status(400).json({ error: 'Missing profileId or action' });
    }

    let updated = false;
    axomProfileStore.forEach((profile) => {
      const event = profile.localEvents.find((e) => e.eventId === eventId);
      if (event) {
        if (action === 'attend' && (!event.maxAttendees || event.attendees < event.maxAttendees)) {
          event.attendees += 1;
          event.engagementScore = Math.min(100, event.engagementScore + 5);
        } else if (action === 'cancel' && event.attendees > 0) {
          event.attendees -= 1;
          event.engagementScore = Math.max(0, event.engagementScore - 5);
        }
        updated = true;
      }
    });

    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }

    logger.info(`Event RSVP: ${action} on ${eventId}`, { profileId });

    res.json({
      success: true,
      message: `RSVP ${action} successful`
    });
  } catch (error) {
    logger.error('Error processing RSVP:', error);
    res.status(500).json({ error: 'Failed to process RSVP' });
  }
});

// Get community insights
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const { areaId } = req.query;

    let profiles: AxomProfile[] = [];
    axomProfileStore.forEach((profile) => {
      if (!areaId || profile.primaryLocation.areaId === areaId) {
        profiles.push(profile);
      }
    });

    const insights = {
      totalMembers: profiles.length,
      totalPosts: profiles.reduce((sum, p) => sum + p.stats.postsCount, 0),
      totalEvents: profiles.reduce((sum, p) => sum + p.stats.eventsHosted, 0),
      totalAttendees: profiles.reduce((sum, p) => sum + p.stats.eventsAttended, 0),
      averageEngagement: profiles.length > 0 ? profiles.reduce((sum, p) => sum + p.stats.engagementRate, 0) / profiles.length : 0,
      topInfluencers: profiles
        .sort((a, b) => b.stats.influenceScore - a.stats.influenceScore)
        .slice(0, 5)
        .map((p) => ({
          profileId: p.profileId,
          name: p.displayName,
          influenceScore: p.stats.influenceScore,
          followers: p.stats.followers
        })),
      topInterests: getTopInterests(profiles),
      eventTypes: getEventTypeBreakdown(profiles),
      activityByDay: getActivityByDay(profiles)
    };

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Error fetching community insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// Get community members
router.get('/members', async (req: Request, res: Response) => {
  try {
    const { areaId, segment, tier, limit = 20, offset = 0 } = req.query;

    let members: AxomProfile[] = [];
    axomProfileStore.forEach((profile) => {
      if (areaId && profile.primaryLocation.areaId !== areaId) return;
      if (segment && profile.customerSegment !== segment) return;
      if (tier && profile.engagementTier !== tier) return;
      members.push(profile);
    });

    // Sort by influence score
    members.sort((a, b) => b.stats.influenceScore - a.stats.influenceScore);

    const paginatedMembers = members.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: paginatedMembers.map((m) => ({
        profileId: m.profileId,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        location: m.primaryLocation,
        stats: m.stats,
        segment: m.customerSegment,
        tier: m.engagementTier
      })),
      pagination: {
        total: members.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Helper functions
function getTopInterests(profiles: AxomProfile[]): Array<{ tag: string; count: number }> {
  const tagCounts = new Map<string, number>();
  profiles.forEach((profile) => {
    profile.interests.forEach((interest) => {
      const count = tagCounts.get(interest.tag) || 0;
      tagCounts.set(interest.tag, count + 1);
    });
  });
  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getEventTypeBreakdown(profiles: AxomProfile[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  profiles.forEach((profile) => {
    profile.localEvents.forEach((event) => {
      breakdown[event.eventType] = (breakdown[event.eventType] || 0) + 1;
    });
  });
  return breakdown;
}

function getActivityByDay(profiles: AxomProfile[]): Record<string, number> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activity: Record<string, number> = {};
  days.forEach((day) => (activity[day] = 0));

  profiles.forEach((profile) => {
    profile.buzzContent.forEach((content) => {
      const day = days[content.createdAt.getDay()];
      activity[day]++;
    });
  });

  return activity;
}

export default router;
