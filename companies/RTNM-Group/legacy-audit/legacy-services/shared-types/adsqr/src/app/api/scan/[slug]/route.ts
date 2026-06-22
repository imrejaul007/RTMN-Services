// Updated Scan API with Fraud Detection
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getFraudDetector, FraudCheckRequest } from '@/lib/fraud/detection'

// GET /api/scan/[slug] - Record scan
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://adsqr.rezapp.com'

  // Extract fraud detection data from headers and body
  const deviceId = req.headers.get('x-device-id') || ''
  const deviceFingerprint = req.headers.get('x-device-fingerprint') || ''
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const latitude = parseFloat(req.headers.get('x-latitude') || '0') || undefined
  const longitude = parseFloat(req.headers.get('x-longitude') || '0') || undefined

  // Find QR code
  const { data: qr } = await supabase
    .from('qr_codes')
    .select('*, campaigns(*)')
    .eq('qr_slug', slug)
    .single()

  if (!qr) return NextResponse.redirect(`${appUrl}/scan/not-found`)
  if (!qr.is_active) return NextResponse.redirect(`${appUrl}/scan/inactive`)

  // Get user from auth header (if present)
  const authHeader = req.headers.get('authorization') ?? ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  let userId = null
  let user = null

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken)
    userId = data.user?.id
    user = data.user
  }

  // Perform fraud check BEFORE recording scan
  const fraudRequest: FraudCheckRequest = {
    deviceId,
    deviceFingerprint,
    ip,
    userAgent,
    scanLocation: latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
    timestamp: new Date().toISOString(),
    qrId: qr.id,
    campaignId: qr.campaign_id,
    userId: userId || undefined
  }

  const fraudDetector = getFraudDetector()
  const fraudResult = await fraudDetector.check(fraudRequest)

  // Log the fraud check result
  logger.info(Fraud check for device ${deviceId}: ${fraudResult.result} (score: ${fraudResult.riskScore})`)

  // If fraud is BLOCKED, still redirect but don't credit coins
  if (fraudResult.result === 'block') {
    console.warn(`Blocked fraudulent scan from device ${deviceId}`, fraudResult.reasons)

    // Update QR stats anyway (for analytics)
    await supabase.rpc('increment_scan_count', { qr_id: qr.id })

    // Redirect to landing page with fraud indicator
    return NextResponse.redirect(`${appUrl}/scan/${slug}?blocked=true&reason=fraud_detected`)
  }

  // If flagged, allow scan but don't credit immediately (manual review queue)
  const shouldCredit = fraudResult.result === 'pass'

  // Record scan event
  const { data: scanEvent } = await supabase
    .from('scan_events')
    .insert({
      qr_id: qr.id,
      campaign_id: qr.campaign_id,
      user_id: userId,
      device_id: deviceId || null,
      device_fingerprint: deviceFingerprint || null,
      ip_address: ip,
      latitude: latitude,
      longitude: longitude,
      fraud_check_result: fraudResult.result,
      fraud_risk_score: fraudResult.riskScore,
      coins_credited: shouldCredit && !!userId,
      coins_amount: shouldCredit && userId ? qr.campaigns.scan_reward : 0,
      fraud_flagged: fraudResult.result === 'flag'
    })
    .select()
    .single()

  // Update QR stats
  await supabase.rpc('increment_scan_count', { qr_id: qr.id })

  // If user authenticated and passed fraud check, credit coins
  if (userId && qr.campaigns.scan_reward > 0 && shouldCredit) {
    // Credit coins to user
    await supabase.from('coin_transactions').insert({
      campaign_id: qr.campaign_id,
      user_id: userId,
      amount: qr.campaigns.scan_reward,
      coin_type: 'rez',
      reason: 'scan',
      scan_event_id: scanEvent?.id
    })

    // Update campaign coins used
    await supabase.rpc('increment_coins_used', {
      campaign_id: qr.campaign_id,
      amount: qr.campaigns.scan_reward
    })
  }

  // Handle flagged scans - add to review queue
  if (fraudResult.result === 'flag' && userId) {
    await supabase.from('fraud_review_queue').insert({
      scan_event_id: scanEvent?.id,
      device_id: deviceId,
      user_id: userId,
      risk_score: fraudResult.riskScore,
      reasons: fraudResult.reasons,
      status: 'pending',
      created_at: new Date().toISOString()
    })
  }

  // Build redirect URL with scan info
  let redirectUrl = `${appUrl}/scan/${slug}?scanned=true`
  if (fraudResult.result === 'flag') {
    redirectUrl += '&flagged=true'
  }
  if (userId) {
    redirectUrl += `&credited=${shouldCredit}`
  }

  return NextResponse.redirect(redirectUrl)
}

// POST /api/scan/[slug] - Manual scan submission (with full fraud check)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createClient()

  try {
    const body = await req.json()
    const {
      deviceId,
      deviceFingerprint,
      latitude,
      longitude,
      timestamp
    } = body

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Find QR code
    const { data: qr } = await supabase
      .from('qr_codes')
      .select('*, campaigns(*)')
      .eq('qr_slug', slug)
      .single()

    if (!qr) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 })
    }

    if (!qr.is_active) {
      return NextResponse.json({ error: 'QR code is inactive' }, { status: 400 })
    }

    // Get user
    const authHeader = req.headers.get('authorization') ?? ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    let userId = null

    if (accessToken) {
      const { data } = await supabase.auth.getUser(accessToken)
      userId = data.user?.id
    }

    // Perform fraud check
    const fraudRequest: FraudCheckRequest = {
      deviceId: deviceId || '',
      deviceFingerprint: deviceFingerprint || '',
      ip,
      userAgent,
      scanLocation: latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
      timestamp: timestamp || new Date().toISOString(),
      qrId: qr.id,
      campaignId: qr.campaign_id,
      userId: userId || undefined
    }

    const fraudDetector = getFraudDetector()
    const fraudResult = await fraudDetector.check(fraudRequest)

    const shouldCredit = fraudResult.result === 'pass' && !!userId

    // Record scan
    const { data: scanEvent } = await supabase
      .from('scan_events')
      .insert({
        qr_id: qr.id,
        campaign_id: qr.campaign_id,
        user_id: userId,
        device_id: deviceId || null,
        device_fingerprint: deviceFingerprint || null,
        ip_address: ip,
        latitude: latitude,
        longitude: longitude,
        fraud_check_result: fraudResult.result,
        fraud_risk_score: fraudResult.riskScore,
        coins_credited: shouldCredit,
        coins_amount: shouldCredit ? qr.campaigns.scan_reward : 0,
        fraud_flagged: fraudResult.result === 'flag'
      })
      .select()
      .single()

    // Update stats
    await supabase.rpc('increment_scan_count', { qr_id: qr.id })

    // Credit coins if appropriate
    if (shouldCredit && userId && qr.campaigns.scan_reward > 0) {
      await supabase.from('coin_transactions').insert({
        campaign_id: qr.campaign_id,
        user_id: userId,
        amount: qr.campaigns.scan_reward,
        coin_type: 'rez',
        reason: 'scan',
        scan_event_id: scanEvent?.id
      })

      await supabase.rpc('increment_coins_used', {
        campaign_id: qr.campaign_id,
        amount: qr.campaigns.scan_reward
      })
    }

    return NextResponse.json({
      success: true,
      scanId: scanEvent?.id,
      credited: shouldCredit,
      coinsAwarded: shouldCredit ? qr.campaigns.scan_reward : 0,
      fraudResult: {
        result: fraudResult.result,
        riskScore: fraudResult.riskScore
      }
    })
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
