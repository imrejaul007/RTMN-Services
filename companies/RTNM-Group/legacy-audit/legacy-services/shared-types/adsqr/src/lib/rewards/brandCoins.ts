/**
 * Brand Coins Reward System
 * Handles brand-specific coin creation, distribution, and balance management
 */

import { creditCoinsToUser } from '../rezWallet';
import { createClient } from '../supabase';

// Types
export interface BrandCoin {
  id: string;
  name: string;
  symbol: string;
  brandId: string;
  brandName: string;
  color: string;
  logo?: string;
  conversionRate: number; // to REZ coins
  createdAt: string;
}

export interface BrandCoinBalance {
  brandCoinId: string;
  brandName: string;
  symbol: string;
  balance: number;
  color: string;
}

export interface BrandCoinDistribution {
  userId: string;
  brandCoinId: string;
  amount: number;
  reason: string;
  campaignId?: string;
}

export interface CreateBrandCoinParams {
  name: string;
  symbol: string;
  brandId: string;
  brandName: string;
  color: string;
  logo?: string;
  conversionRate?: number;
}

/**
 * Create a new brand coin
 */
export async function createBrandCoin(params: CreateBrandCoinParams): Promise<{
  success: boolean;
  brandCoin?: BrandCoin;
  message?: string;
}> {
  try {
    const supabase = createClient();

    // Check if brand already has a coin
    const { data: existing } = await supabase
      .from('brand_coins')
      .select('*')
      .eq('brand_id', params.brandId)
      .single();

    if (existing) {
      return { success: false, message: 'Brand already has a coin' };
    }

    const brandCoin: BrandCoin = {
      id: `bc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      symbol: params.symbol.toUpperCase(),
      brandId: params.brandId,
      brandName: params.brandName,
      color: params.color,
      logo: params.logo,
      conversionRate: params.conversionRate || 1,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('brand_coins').insert(brandCoin);

    if (error) {
      console.error('Create brand coin error:', error);
      return { success: false, message: 'Failed to create brand coin' };
    }

    return { success: true, brandCoin };
  } catch (error) {
    console.error('Create brand coin error:', error);
    return { success: false, message: 'Failed to create brand coin' };
  }
}

/**
 * Get brand coin by ID
 */
export async function getBrandCoin(brandCoinId: string): Promise<BrandCoin | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('brand_coins')
      .select('*')
      .eq('id', brandCoinId)
      .single();

    if (error || !data) return null;
    return data as BrandCoin;
  } catch (error) {
    console.error('Get brand coin error:', error);
    return null;
  }
}

/**
 * Get brand coin by brand ID
 */
export async function getBrandCoinByBrand(brandId: string): Promise<BrandCoin | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('brand_coins')
      .select('*')
      .eq('brand_id', brandId)
      .single();

    if (error || !data) return null;
    return data as BrandCoin;
  } catch (error) {
    console.error('Get brand coin by brand error:', error);
    return null;
  }
}

/**
 * Get all brand coins
 */
export async function getAllBrandCoins(): Promise<BrandCoin[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('brand_coins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as BrandCoin[];
  } catch (error) {
    console.error('Get all brand coins error:', error);
    return [];
  }
}

/**
 * Get user's brand coin balances
 */
export async function getUserBrandCoinBalances(userId: string): Promise<BrandCoinBalance[]> {
  try {
    const supabase = createClient();

    // Get all brand coin balances for user
    const { data: balances, error } = await supabase
      .from('brand_coin_balances')
      .select('*, brand_coins(*)')
      .eq('user_id', userId)
      .gt('balance', 0);

    if (error || !balances) return [];

    return balances.map(b => ({
      brandCoinId: b.brand_coin_id,
      brandName: (b.brand_coins as BrandCoin)?.brandName || '',
      symbol: (b.brand_coins as BrandCoin)?.symbol || '',
      balance: b.balance,
      color: (b.brand_coins as BrandCoin)?.color || '#6366f1',
    }));
  } catch (error) {
    console.error('Get user brand coin balances error:', error);
    return [];
  }
}

/**
 * Distribute brand coins to users
 */
export async function distributeBrandCoins(
  distribution: BrandCoinDistribution
): Promise<{
  success: boolean;
  transactionId?: string;
  message?: string;
}> {
  try {
    const supabase = createClient();

    // Get brand coin details
    const brandCoin = await getBrandCoin(distribution.brandCoinId);
    if (!brandCoin) {
      return { success: false, message: 'Brand coin not found' };
    }

    // Credit to wallet as branded coin type
    const result = await creditCoinsToUser(
      distribution.userId,
      distribution.amount,
      'branded',
      `brand_${brandCoin.brandId}`,
      `${brandCoin.name}: ${distribution.reason}`,
      {
        merchantId: distribution.campaignId,
        idempotencyKey: `brand_${distribution.brandCoinId}_${distribution.userId}_${Date.now()}`,
      }
    );

    if (result.success) {
      // Update local balance
      await updateBrandCoinBalance(distribution.userId, distribution.brandCoinId, distribution.amount);

      // Record distribution
      await supabase.from('brand_coin_distributions').insert({
        user_id: distribution.userId,
        brand_coin_id: distribution.brandCoinId,
        amount: distribution.amount,
        reason: distribution.reason,
        campaign_id: distribution.campaignId,
        created_at: new Date().toISOString(),
      });
    }

    return {
      success: result.success,
      transactionId: result.transactionId,
      message: result.success
        ? `Credited ${distribution.amount} ${brandCoin.symbol}!`
        : result.message,
    };
  } catch (error) {
    console.error('Distribute brand coins error:', error);
    return { success: false, message: 'Failed to distribute brand coins' };
  }
}

/**
 * Update brand coin balance in local DB
 */
async function updateBrandCoinBalance(
  userId: string,
  brandCoinId: string,
  amount: number
): Promise<void> {
  try {
    const supabase = createClient();

    // Check if balance record exists
    const { data: existing } = await supabase
      .from('brand_coin_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('brand_coin_id', brandCoinId)
      .single();

    if (existing) {
      await supabase
        .from('brand_coin_balances')
        .update({ balance: existing.balance + amount })
        .eq('id', existing.id);
    } else {
      await supabase.from('brand_coin_balances').insert({
        user_id: userId,
        brand_coin_id: brandCoinId,
        balance: amount,
      });
    }
  } catch (error) {
    console.error('Update brand coin balance error:', error);
  }
}

/**
 * Convert brand coins to REZ coins
 */
export async function convertToRezCoins(
  userId: string,
  brandCoinId: string,
  amount: number
): Promise<{
  success: boolean;
  rezCoinsReceived?: number;
  message?: string;
}> {
  try {
    const supabase = createClient();

    // Get brand coin details
    const brandCoin = await getBrandCoin(brandCoinId);
    if (!brandCoin) {
      return { success: false, message: 'Brand coin not found' };
    }

    // Check balance
    const { data: balance } = await supabase
      .from('brand_coin_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('brand_coin_id', brandCoinId)
      .single();

    if (!balance || balance.balance < amount) {
      return { success: false, message: 'Insufficient balance' };
    }

    // Calculate REZ coins
    const rezCoinsReceived = Math.floor(amount * brandCoin.conversionRate);

    // Debit brand coins
    await supabase
      .from('brand_coin_balances')
      .update({ balance: balance.balance - amount })
      .eq('id', balance.id);

    // Credit REZ coins
    const result = await creditCoinsToUser(
      userId,
      rezCoinsReceived,
      'rez',
      'conversion',
      `Converted ${amount} ${brandCoin.symbol} to REZ coins`,
      { idempotencyKey: `convert_${brandCoinId}_${userId}_${Date.now()}` }
    );

    if (result.success) {
      // Record conversion
      await supabase.from('brand_coin_conversions').insert({
        user_id: userId,
        brand_coin_id: brandCoinId,
        brand_coins_spent: amount,
        rez_coins_received: rezCoinsReceived,
        conversion_rate: brandCoin.conversionRate,
        created_at: new Date().toISOString(),
      });
    }

    return {
      success: result.success,
      rezCoinsReceived: result.success ? rezCoinsReceived : undefined,
      message: result.success
        ? `Converted to ${rezCoinsReceived} REZ coins!`
        : result.message,
    };
  } catch (error) {
    console.error('Convert to REZ coins error:', error);
    return { success: false, message: 'Failed to convert coins' };
  }
}

/**
 * Get brand coin transaction history
 */
export async function getBrandCoinHistory(
  userId: string,
  brandCoinId?: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  brandCoinId: string;
  brandName: string;
  symbol: string;
  amount: number;
  type: 'credit' | 'debit';
  reason: string;
  createdAt: string;
}>> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('brand_coin_distributions')
      .select('*, brand_coins(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (brandCoinId) {
      query = query.eq('brand_coin_id', brandCoinId);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      brandCoinId: d.brand_coin_id,
      brandName: (d.brand_coins as BrandCoin)?.brandName || '',
      symbol: (d.brand_coins as BrandCoin)?.symbol || '',
      amount: d.amount,
      type: 'credit' as const,
      reason: d.reason,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error('Get brand coin history error:', error);
    return [];
  }
}
