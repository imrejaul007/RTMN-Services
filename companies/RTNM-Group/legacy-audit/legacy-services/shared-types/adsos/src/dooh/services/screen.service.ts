/**
 * DOOH - Screen Management Service
 * Manages screens in the network
 */

import type {
  Screen,
  ScreenType,
  ScreenStatus,
  ScreenOSConfig,
  ContentUpdate,
  Playlist,
  ScreenHeartbeat
} from '../types'

/**
 * Screen Manager - Manages DOOH network screens
 */
export class ScreenManager {
  private screens: Map<string, Screen> = new Map()

  register(screen: Screen): void {
    this.screens.set(screen.id, screen)
  }

  get(screenId: string): Screen | undefined {
    return this.screens.get(screenId)
  }

  updateStatus(screenId: string, status: ScreenStatus): void {
    const screen = this.screens.get(screenId)
    if (screen) {
      (screen as any).last_seen = new Date()
      screen.status = status
      this.screens.set(screenId, screen)
    }
  }

  query(filter: ScreenQuery): Screen[] {
    return Array.from(this.screens.values()).filter(screen => {
      if (filter.type && screen.type !== filter.type) return false
      if (filter.city && screen.location.city !== filter.city) return false
      if (filter.status && screen.status !== filter.status) return false
      if (filter.owner_type && screen.owner_type !== filter.owner_type) return false
      return true
    })
  }

  processHeartbeat(heartbeat: ScreenHeartbeat): ContentUpdate | null {
    const screen = this.screens.get(heartbeat.screen_id)
    if (!screen) return null

    ;(screen as any).last_seen = heartbeat.timestamp
    screen.status = heartbeat.status
    ;(screen as any).last_sync = heartbeat.timestamp
    this.screens.set(heartbeat.screen_id, screen)

    if (this.needsPlaylistUpdate(screen, heartbeat)) {
      return this.generateContentUpdate(screen)
    }

    return null
  }

  private needsPlaylistUpdate(screen: Screen, heartbeat: ScreenHeartbeat): boolean {
    const version = (screen as any).playlist_version as number | undefined
    if (!version) return true
    if (heartbeat.playlist_version !== version) return true

    const lastSync = (screen as any).last_sync as Date | undefined
    if (!lastSync) return true

    const syncAge = Date.now() - lastSync.getTime()
    const maxAge = 60 * 60 * 1000
    return syncAge > maxAge
  }

  private generateContentUpdate(screen: Screen): ContentUpdate {
    return {
      screen_id: screen.id,
      playlist: {} as Playlist,
      creatives: [],
      config: this.getScreenConfig(),
      version: ((screen as any).playlist_version as number || 0) + 1,
      timestamp: new Date()
    }
  }

  private getScreenConfig(): ScreenOSConfig {
    return {
      server_url: process.env.DOOH_SERVER_URL || 'https://dooh.rezapp.com',
      api_key: process.env.DOOH_API_KEY || '',
      sync_interval: 300,
      playlist_refresh: 300,
      heartbeat_interval: 60,
      offline_buffer_hours: 24
    }
  }

  getStats(): NetworkStats {
    const screens = Array.from(this.screens.values())
    return {
      total: screens.length,
      active: screens.filter(s => s.status === 'active').length,
      offline: screens.filter(s => s.status === 'offline').length,
      maintenance: screens.filter(s => s.status === 'maintenance').length,
      by_type: this.groupByType(screens),
      by_city: this.groupByCity(screens)
    }
  }

  private groupByType(screens: Screen[]): Record<string, number> {
    const groups: Record<string, number> = {}
    for (const screen of screens) {
      groups[screen.type] = (groups[screen.type] || 0) + 1
    }
    return groups
  }

  private groupByCity(screens: Screen[]): Record<string, number> {
    const groups: Record<string, number> = {}
    for (const screen of screens) {
      groups[screen.location.city] = (groups[screen.location.city] || 0) + 1
    }
    return groups
  }
}

interface ScreenQuery {
  type?: ScreenType
  city?: string
  status?: ScreenStatus
  owner_type?: 'owned' | 'partner' | 'external'
}

interface NetworkStats {
  total: number
  active: number
  offline: number
  maintenance: number
  by_type: Record<string, number>
  by_city: Record<string, number>
}

export function createScreenManager(): ScreenManager {
  return new ScreenManager()
}
