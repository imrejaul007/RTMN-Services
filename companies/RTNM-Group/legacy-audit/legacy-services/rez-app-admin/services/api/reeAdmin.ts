/**
 * REE Admin Service
 *
 * Controls REE settings from Admin Dashboard
 */

import { logger } from '@/utils/logger';

const REE_URL = process.env.REE_URL || 'http://localhost:4000/api'

export interface REEFeatureFlags {
  userTiers: UserTier[]
  merchantTiers: MerchantTier[]
  coinConfigs: CoinConfig[]
  fraudRules: FraudRule[]
}

export interface UserTier {
  name: string
  minSpend: number
  benefits: {
    cashbackPercent: number
    socialSharePercent: number
    maxSharesPerDay: number
    features: string[]
  }
}

export interface MerchantTier {
  name: string
  monthlyFee: number
  benefits: {
    commissionRate: number
    maxQRCodes: number
    hasAnalytics: boolean
    features: string[]
  }
}

export interface CoinConfig {
  coinType: string
  earningRules: Array<{
    source: string
    percent: number
  }>
  usageRules: Array<{
    type: string
    maxDiscount?: number
  }>
  expiryDays: number
  adminApproval: boolean
}

export interface FraudRule {
  name: string
  thresholds: Record<string, number>
  action: string
  severity: string
  isActive: boolean
}

// ============================================
// REE API Client
// ============================================

class REEAdminClient {
  private timeout = 10000
  private apiKey: string

  constructor() {
    this.apiKey = process.env.REE_ADMIN_KEY || 'admin-dev-key'
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${REE_URL}/admin/${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': this.apiKey,
        },
        ...(body && { body: JSON.stringify(body) }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        logger.error(`[REE Admin] Request failed: ${response.status}`)
        return null
      }

      return response.json()
    } catch (error) {
      logger.error('[REE Admin] Request error:', error)
      return null
    }
  }

  // ============================================
  // USER TIERS
  // ============================================

  async getUserTiers(): Promise<UserTier[]> {
    const result = await this.request<{ tiers: UserTier[] }>('GET', 'features/tiers/user')
    return result?.tiers || []
  }

  async updateUserTier(
    tierName: string,
    updates: Partial<UserTier>
  ): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('PUT', `features/tiers/user/${tierName}`, updates as Record<string, unknown>)
    return result?.success || false
  }

  // ============================================
  // MERCHANT TIERS
  // ============================================

  async getMerchantTiers(): Promise<MerchantTier[]> {
    const result = await this.request<{ tiers: MerchantTier[] }>('GET', 'features/tiers/merchant')
    return result?.tiers || []
  }

  async updateMerchantTier(
    tierName: string,
    updates: Partial<MerchantTier>
  ): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('PUT', `features/tiers/merchant/${tierName}`, updates as Record<string, unknown>)
    return result?.success || false
  }

  // ============================================
  // COIN CONFIGS
  // ============================================

  async getCoinConfigs(): Promise<CoinConfig[]> {
    const types = ['rez', 'branded', 'promo', 'prive', 'karma']
    const configs: CoinConfig[] = []

    for (const coinType of types) {
      const result = await this.request<CoinConfig>('GET', `coins/${coinType}`)
      if (result) configs.push(result)
    }

    return configs
  }

  async updateCoinConfig(
    coinType: string,
    updates: Partial<CoinConfig>
  ): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('PUT', `coins/${coinType}`, updates as Record<string, unknown>)
    return result?.success || false
  }

  // ============================================
  // FRAUD RULES
  // ============================================

  async getFraudRules(): Promise<FraudRule[]> {
    const result = await this.request<{ rules: FraudRule[] }>('GET', 'fraud/rules')
    return result?.rules || []
  }

  async updateFraudRule(
    ruleName: string,
    updates: Partial<FraudRule>
  ): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('PUT', `fraud/rules/${ruleName}`, updates as Record<string, unknown>)
    return result?.success || false
  }

  async toggleFraudRule(ruleName: string, active: boolean): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('PATCH', `fraud/rules/${ruleName}`, { isActive: active })
    return result?.success || false
  }

  // ============================================
  // BUSINESS RULES
  // ============================================

  async getBusinessRules(category?: string): Promise<Record<string, unknown>[]> {
    const endpoint = category ? `rules?category=${category}` : 'rules'
    const result = await this.request<{ rules: Record<string, unknown>[] }>('GET', endpoint)
    return result?.rules || []
  }

  async createBusinessRule(rule: Record<string, unknown>): Promise<string | null> {
    const result = await this.request<{ id: string }>('POST', 'rules', rule)
    return result?.id || null
  }

  async updateBusinessRule(
    ruleId: string,
    updates: Record<string, unknown>
  ): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('PUT', `rules/${ruleId}`, updates)
    return result?.success || false
  }

  async deleteBusinessRule(ruleId: string): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('DELETE', `rules/${ruleId}`)
    return result?.success || false
  }

  // ============================================
  // SIMULATION
  // ============================================

  async simulateRuleChange(
    ruleId: string,
    newParams: Record<string, unknown>
  ): Promise<{
    projectedCost: number
    projectedRevenue: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  } | null> {
    const result = await this.request<{
      projectedCost: number
      projectedRevenue: number
      riskLevel: string
    }>('POST', 'simulate/rule', {
      ruleId,
      newRule: newParams,
    })
    if (!result) return null
    return {
      projectedCost: result.projectedCost,
      projectedRevenue: result.projectedRevenue,
      riskLevel: result.riskLevel as 'low' | 'medium' | 'high' | 'critical',
    }
  }
}

export const reeAdmin = new REEAdminClient()
export default reeAdmin
