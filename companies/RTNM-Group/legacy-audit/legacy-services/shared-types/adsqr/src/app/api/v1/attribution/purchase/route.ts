import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// POST /api/v1/attribution/purchase
// Record a purchase event and credit rewards

interface PurchaseEvent {
  scanEventId?: string
  amount: number
  currency: string
  transactionId: string
  items: string[]
  userId?: string
  merchantId?: string
  merchantName?: string
  storeId?: string
  posLocation?: string
}

const ATTRIBUTION_RATE = 0.05 // 5% of purchase attributed to QR

export async function POST(req: NextRequest) {
  try {
    const body: PurchaseEvent = await req.json()
    const {
      scanEventId,
      amount,
      currency = 'INR',
      transactionId,
      items = [],
      userId,
      merchantId,
      merchantName,
      storeId,
      posLocation,
    } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'amount is required and must be positive' },
        { status: 400 }
      )
    }

    if (!transactionId) {
      return NextResponse.json(
        { error: 'transactionId is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check for duplicate transaction
    const { data: existingPurchase } = await supabase
      .from('purchase_events')
      .select('id')
      .eq('transaction_id', transactionId)
      .single()

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Purchase already recorded', purchaseId: existingPurchase.id },
        { status: 409 }
      )
    }

    // Get scan event and campaign info if scanEventId provided
    let campaignId: string | null = null
    let campaign: { name?: string; purchase_reward?: number; brand_coins_reward?: number } | null = null

    if (scanEventId) {
      const { data: scanEvent } = await supabase
        .from('scan_events')
        .select(`
          campaign_id,
          campaigns (
            id,
            name,
            purchase_reward,
            brand_coins_reward
          )
        `)
        .eq('id', scanEventId)
        .single()

      if (scanEvent?.campaigns) {
        campaignId = scanEvent.campaign_id
        campaign = scanEvent.campaigns as typeof campaign
      }
    }

    // Calculate attributed revenue
    const attributedRevenue = amount * ATTRIBUTION_RATE

    // Calculate rewards
    const purchaseRewardAmount = campaign?.purchase_reward || 0
    const brandCoinsAmount = campaign?.brand_coins_reward || 0
    const totalReward = purchaseRewardAmount + brandCoinsAmount

    // Determine attribution source
    let attributionSource = 'direct'
    if (scanEventId) {
      // Check if there's a visit event linked to this scan
      const { data: visitEvent } = await supabase
        .from('visit_events')
        .select('id')
        .eq('scan_event_id', scanEventId)
        .single()

      attributionSource = visitEvent ? 'visit' : 'qr'
    }

    // Create purchase event
    const { data: purchaseEvent, error: purchaseError } = await supabase
      .from('purchase_events')
      .insert({
        scan_event_id: scanEventId || null,
        campaign_id: campaignId,
        user_id: userId || null,
        purchase_amount: amount,
        currency,
        transaction_id: transactionId,
        items,
        purchase_reward_amount: purchaseRewardAmount,
        brand_coins_credited: brandCoinsAmount,
        attribution_source: attributionSource,
        attributed_revenue: attributedRevenue,
        purchase_reward_credited: false,
        merchant_id: merchantId || null,
        merchant_name: merchantName || null,
        pos_location: posLocation || null,
        store_id: storeId || null,
      })
      .select()
      .single()

    if (purchaseError) {
      console.error('[attribution/purchase] insert error:', purchaseError)
      return NextResponse.json(
        { error: 'Failed to record purchase' },
        { status: 500 }
      )
    }

    // Update campaign coins used if reward applies
    if (totalReward > 0 && campaignId) {
      await supabase.rpc('increment_campaign_coins', {
        p_campaign_id: campaignId,
        p_amount: totalReward,
      })
    }

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchaseEvent.id,
        amount,
        attributedRevenue,
        rewards: {
          purchaseReward: purchaseRewardAmount,
          brandCoins: brandCoinsAmount,
          total: totalReward,
        },
        credited: false, // Will be credited by background job
      },
      attribution: {
        source: attributionSource,
        rate: ATTRIBUTION_RATE,
        campaignName: campaign?.name || null,
      },
      metadata: {
        transactionId,
        itemsCount: items.length,
        merchantName: merchantName || null,
      },
    })
  } catch (e) {
    console.error('[attribution/purchase] error:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/v1/attribution/purchase
// Get purchase history with optional filters
export async function GET(req: NextRequest) {
  const supabase = createClient()

  const searchParams = req.nextUrl.searchParams
  const campaignId = searchParams.get('campaign_id')
  const userId = searchParams.get('user_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('purchase_events')
    .select(`
      *,
      campaigns (name, brand_id),
      scan_events (id, scanned_at),
      visit_events (id, visited_at)
    `, { count: 'exact' })

  if (campaignId) {
    query = query.eq('campaign_id', campaignId)
  }
  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: purchases, count, error } = await query
    .order('purchased_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[attribution/purchase] fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    purchases,
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}
