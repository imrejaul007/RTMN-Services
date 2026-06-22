// Brand Coins API Routes
import { NextRequest, NextResponse } from 'next/server'
import { getAllBrandCoins } from '@/lib/rewards/brandCoins'
import { createClient } from '@/lib/supabase'

// GET /api/brand-coins - Get brand coins
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coins = await getAllBrandCoins()
    return NextResponse.json({ coins })
  } catch (error) {
    console.error('Brand coins API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
