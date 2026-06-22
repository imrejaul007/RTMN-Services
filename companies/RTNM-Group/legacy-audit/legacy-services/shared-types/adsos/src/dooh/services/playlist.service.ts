/**
 * DOOH - Playlist Generation Service
 * Creates optimized playlists for screens
 */

import type {
  Playlist,
  PlaylistSlot,
  PlaylistRequest,
  Screen,
  DOOHCampaign,
  Creative,
  TimeSlot,
  AudienceProfile,
  AudienceSegment
} from '../types'

export class PlaylistGenerator {
  private maxRepeatGap = 2

  generatePlaylist(
    request: PlaylistRequest,
    screen: Screen,
    activeCampaigns: DOOHCampaign[]
  ): Playlist {
    const eligible = this.filterCampaigns(activeCampaigns, screen, request)
    const scored = this.scoreCampaigns(eligible, request, screen)
    const slots = this.buildSlots(scored, request)
    const totalDuration = slots.reduce((sum, slot) => sum + slot.duration, 0)

    return {
      id: `pl_${screen.id}_${Date.now()}`,
      screen_id: request.screen_id,
      date: request.date,
      slots,
      total_duration: totalDuration,
      generated_at: new Date(),
      version: 1
    }
  }

  private filterCampaigns(
    campaigns: DOOHCampaign[],
    screen: Screen,
    request: PlaylistRequest
  ): DOOHCampaign[] {
    return campaigns.filter(campaign => {
      if (campaign.status !== 'active') return false
      const now = new Date()
      if (now < campaign.start_date || now > campaign.end_date) return false
      if (campaign.spent >= campaign.budget) return false

      if (campaign.targeting.cities?.length) {
        if (!campaign.targeting.cities.includes(screen.location.city)) {
          return false
        }
      }

      if (campaign.targeting.screen_types?.length) {
        if (!campaign.targeting.screen_types.includes(screen.type)) {
          return false
        }
      }

      return true
    })
  }

  private scoreCampaigns(
    campaigns: DOOHCampaign[],
    request: PlaylistRequest,
    screen: Screen
  ): ScoredCampaign[] {
    return campaigns.map(campaign => {
      let score = 100

      const budgetRatio = campaign.spent / campaign.budget
      if (budgetRatio > 0.8) score *= 1.5
      if (budgetRatio < 0.3) score *= 0.8

      return {
        campaign,
        score,
        creative: campaign.creatives[0]
      }
    }).sort((a, b) => b.score - a.score)
  }

  private buildSlots(
    scored: ScoredCampaign[],
    request: PlaylistRequest
  ): PlaylistSlot[] {
    const slots: PlaylistSlot[] = []
    let position = 0
    let remainingDuration = request.duration
    const lastCampaignIds: string[] = []

    while (remainingDuration > 0 && scored.length > 0) {
      const campaign = this.pickCampaign(scored, lastCampaignIds)
      if (!campaign) break

      const creative = campaign.campaign.creatives[0]
      if (!creative) continue

      const duration = Math.min(creative.duration, remainingDuration)
      slots.push({
        position: position++,
        campaign_id: campaign.campaign.id,
        creative_id: creative.id,
        start_time: this.calculateStartTime(position),
        duration,
        scheduled_impressions: this.estimateImpressions(duration, campaign)
      })

      remainingDuration -= duration
      lastCampaignIds.push(campaign.campaign.id)
      if (lastCampaignIds.length > this.maxRepeatGap) {
        lastCampaignIds.shift()
      }
    }

    return slots
  }

  private pickCampaign(
    scored: ScoredCampaign[],
    excludeRecent: string[]
  ): ScoredCampaign | undefined {
    for (const item of scored) {
      if (!excludeRecent.includes(item.campaign.id)) {
        return item
      }
    }
    return scored[0]
  }

  private calculateStartTime(position: number): string {
    const baseHour = 9 + Math.floor(position / 10)
    const minutes = (position % 10) * 6
    return `${baseHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
  }

  private estimateImpressions(
    duration: number,
    scored: ScoredCampaign
  ): number {
    const baseRate = 100
    const durationMinutes = duration / 60
    const audienceMultiplier = scored.score / 100
    return Math.round(baseRate * durationMinutes * audienceMultiplier)
  }
}

interface ScoredCampaign {
  campaign: DOOHCampaign
  score: number
  creative: Creative
}

export function createPlaylistGenerator(): PlaylistGenerator {
  return new PlaylistGenerator()
}
