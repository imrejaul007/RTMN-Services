/**
 * DOOH - Digital Out of Home Advertising Network
 * Screen management, ad delivery, playlist generation
 */

// Re-export types
export * from './types'

// Re-export services
export { PlaylistGenerator, createPlaylistGenerator } from './services/playlist.service'
export { DeliveryEngine, RevenueCalculator, createDeliveryEngine } from './services/delivery.service'
export { ScreenManager, createScreenManager } from './services/screen.service'

// Main orchestrator class
import { Screen, DOOHCampaign, DeliveryRequest, DeliveryContext, Playlist } from './types'
import { createDeliveryEngine } from './services/delivery.service'
import { createPlaylistGenerator } from './services/playlist.service'
import { createScreenManager } from './services/screen.service'

/**

* DOOH Network Orchestrator
* Connects all DOOH services
*/
export class DOOHNetwork {
  private delivery: ReturnType<typeof createDeliveryEngine>
  private playlist: ReturnType<typeof createPlaylistGenerator>
  private screens: ReturnType<typeof createScreenManager>

  constructor() {
    this.delivery = createDeliveryEngine()
    this.playlist = createPlaylistGenerator()
    this.screens = createScreenManager()
  }

  /**
   * Get ads for a screen
   */
  getAds(screenId: string, campaigns: DOOHCampaign[]): ReturnType<ReturnType<typeof createDeliveryEngine>['getAdsForScreen'] {
    const screen = this.screens.get(screenId)
    if (!screen) throw new Error('Screen not found')

    const request: DeliveryRequest = {
      screen_id: screenId,
      available_slots: 10, // Would be calculated
      context: this.buildContext()
    }

    return this.delivery.getAdsForScreen(request, screen, campaigns)
  }

  /**
   * Generate playlist for a screen
   */
  generatePlaylist(screenId: string, campaigns: DOOHCampaign[]): Playlist {
    const screen = this.screens.get(screenId)
    if (!screen) throw new Error('Screen not found')

    return this.playlist.generatePlaylist({
      screen_id: screenId,
      date: new Date(),
      duration: 3600, // 1 hour
      time_slots: [{
        start: '09:00',
        end: '22:00',
        slot_type: 'standard'
      }]
    }, screen, campaigns)
  }

  /**
   * Build delivery context from ReZ Mind signals
   */
  private buildContext(): DeliveryContext {
    // Would integrate with ReZ Mind for real signals
    return {
      time: new Date().toISOString(),
      day_type: this.isWeekend() ? 'weekend' : 'weekday',
      audience: {
        primary: [],
        peak_hours: [],
        avg_dwell_time: 300
      }
    }
  }

  private isWeekend(): boolean {
    const day = new Date().getDay()
    return day === 0 || day === 6
  }

  /**
   * Get network statistics
   */
  getStats() {
    return this.screens.getStats()
  }
}

/**
 * Factory function
 */
export function createDOOHNetwork(): DOOHNetwork {
  return new DOOHNetwork()
}
