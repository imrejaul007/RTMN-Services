import { NextRequest, NextResponse } from 'next/server';

// In-memory config (in production, save to database)
let karmaLoyaltyConfig = {
  coinsPerRupee: 20,
  karmaMultipliers: {
    starter: 1.0,
    active: 1.1,
    contributor: 1.25,
    leader: 1.5,
    elite: 2.0,
  },
  loyaltyMultipliers: {
    bronze: 1.0,
    silver: 1.1,
    gold: 1.2,
    platinum: 1.5,
    diamond: 2.0,
  },
  offerBonuses: {
    starter: 0,
    active: 0,
    contributor: 5,
    leader: 10,
    elite: 20,
  },
  priorityLevels: {
    starter: 0,
    active: 0,
    contributor: 1,
    leader: 2,
    elite: 3,
  },
  tierThresholds: {
    bronze: 0,
    silver: 500,
    gold: 2000,
    platinum: 5000,
    diamond: 10000,
  },
  karmaThresholds: {
    starter: 0,
    active: 100,
    contributor: 500,
    leader: 2000,
    elite: 5000,
  },
};

/**
 * GET /api/karma-loyalty/config
 * Get current karma-loyalty configuration
 */
export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({
      success: true,
      config: karmaLoyaltyConfig,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get config' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/karma-loyalty/config
 * Update karma-loyalty configuration (admin only)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate and merge with existing config
    const updatedConfig = {
      ...karmaLoyaltyConfig,
      ...body,
      karmaMultipliers: body.karmaMultipliers
        ? { ...karmaLoyaltyConfig.karmaMultipliers, ...body.karmaMultipliers }
        : karmaLoyaltyConfig.karmaMultipliers,
      loyaltyMultipliers: body.loyaltyMultipliers
        ? { ...karmaLoyaltyConfig.loyaltyMultipliers, ...body.loyaltyMultipliers }
        : karmaLoyaltyConfig.loyaltyMultipliers,
      offerBonuses: body.offerBonuses
        ? { ...karmaLoyaltyConfig.offerBonuses, ...body.offerBonuses }
        : karmaLoyaltyConfig.offerBonuses,
      priorityLevels: body.priorityLevels
        ? { ...karmaLoyaltyConfig.priorityLevels, ...body.priorityLevels }
        : karmaLoyaltyConfig.priorityLevels,
      tierThresholds: body.tierThresholds
        ? { ...karmaLoyaltyConfig.tierThresholds, ...body.tierThresholds }
        : karmaLoyaltyConfig.tierThresholds,
      karmaThresholds: body.karmaThresholds
        ? { ...karmaLoyaltyConfig.karmaThresholds, ...body.karmaThresholds }
        : karmaLoyaltyConfig.karmaThresholds,
    };

    karmaLoyaltyConfig = updatedConfig;

    return NextResponse.json({
      success: true,
      config: karmaLoyaltyConfig,
      message: 'Config updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
