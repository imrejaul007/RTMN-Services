// NEW-A-H1 FIX: Typed filter parameters instead of `any`.
// Previously, `filters` objects were passed directly as array elements, which
// stringifies to '[object Object]' — causing all filter combinations to share
// the same query key and React Query to return the same cached result regardless
// of the actual filter values. Using JSON.stringify produces unique keys per filter.

export type FilterOptions = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  category?: string;
  type?: string;
  period?: string;
  days?: number;
};

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'recentActivity'] as const,
  },

  merchants: {
    all: ['merchants'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.merchants.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.merchants.all, 'detail', id] as const,
    wallets: () => [...queryKeys.merchants.all, 'wallets'] as const,
    withdrawals: () => [...queryKeys.merchants.all, 'withdrawals'] as const,
    flags: (id: string) => [...queryKeys.merchants.all, 'flags', id] as const,
  },

  orders: {
    all: ['orders'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.orders.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
    stats: () => [...queryKeys.orders.all, 'stats'] as const,
  },

  users: {
    all: ['users'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.users.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
    wallet: (id: string) => [...queryKeys.users.all, 'wallet', id] as const,
  },

  fraud: {
    all: ['fraud'] as const,
    reports: (filters?: FilterOptions) => [...queryKeys.fraud.all, 'reports', filters ? JSON.stringify(filters) : ''] as const,
    queue: () => [...queryKeys.fraud.all, 'queue'] as const,
    config: () => [...queryKeys.fraud.all, 'config'] as const,
    alerts: () => [...queryKeys.fraud.all, 'alerts'] as const,
  },

  featureFlags: {
    all: ['featureFlags'] as const,
    list: () => [...queryKeys.featureFlags.all, 'list'] as const,
    detail: (key: string) => [...queryKeys.featureFlags.all, 'detail', key] as const,
  },

  campaigns: {
    all: ['campaigns'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.campaigns.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.campaigns.all, 'detail', id] as const,
    stats: () => [...queryKeys.campaigns.all, 'stats'] as const,
  },

  // Voucher (VoucherBrand) admin namespace — matches `admin/vouchers/*`
  // endpoints shared between vouchers.ts and cashStore.ts services.
  vouchers: {
    all: ['vouchers'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.vouchers.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.vouchers.all, 'detail', id] as const,
  },

  coins: {
    all: ['coins'] as const,
    rewards: (filters?: FilterOptions) => [...queryKeys.coins.all, 'rewards', filters ? JSON.stringify(filters) : ''] as const,
    drops: (filters?: FilterOptions) => [...queryKeys.coins.all, 'drops', filters ? JSON.stringify(filters) : ''] as const,
    gifts: () => [...queryKeys.coins.all, 'gifts'] as const,
    economy: () => [...queryKeys.coins.all, 'economy'] as const,
  },

  // User wallet query namespace — any mutation that changes a user wallet
  // should invalidate the matching key so the relevant list/detail refetches.
  wallet: {
    all: ['wallet'] as const,
    userAll: () => [...queryKeys.wallet.all, 'user'] as const,
    user: (userId: string) => [...queryKeys.wallet.all, 'user', userId] as const,
  },

  // Maker-checker admin action namespace used by wallet adjustments that
  // exceed the approval threshold (they land in the pending-approval queue).
  adminActions: {
    all: ['adminActions'] as const,
    pending: () => [...queryKeys.adminActions.all, 'pending'] as const,
    history: () => [...queryKeys.adminActions.all, 'history'] as const,
  },

  // Shared transactions namespace — cashback reversals land here.
  transactions: {
    all: ['transactions'] as const,
  },

  // Disputes namespace — refunds can spawn dispute records.
  disputes: {
    all: ['disputes'] as const,
  },

  // Offers management namespace
  offers: {
    all: ['offers'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.offers.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.offers.all, 'detail', id] as const,
    stats: () => [...queryKeys.offers.all, 'stats'] as const,
    pending: (filters?: FilterOptions) => [...queryKeys.offers.all, 'pending', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Cash Store (vouchers, coupons, double cashback, coin drops) namespace
  cashStore: {
    all: ['cashStore'] as const,
    voucherBrands: (filters?: FilterOptions) => [...queryKeys.cashStore.all, 'voucherBrands', filters ? JSON.stringify(filters) : ''] as const,
    coupons: (filters?: FilterOptions) => [...queryKeys.cashStore.all, 'coupons', filters ? JSON.stringify(filters) : ''] as const,
    doubleCampaigns: (filters?: FilterOptions) => [...queryKeys.cashStore.all, 'doubleCampaigns', filters ? JSON.stringify(filters) : ''] as const,
    coinDrops: (filters?: FilterOptions) => [...queryKeys.cashStore.all, 'coinDrops', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Stores management namespace
  stores: {
    all: ['stores'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.stores.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.stores.all, 'detail', id] as const,
  },

  // Loyalty program namespace
  loyalty: {
    all: ['loyalty'] as const,
    users: (filters?: FilterOptions) => [...queryKeys.loyalty.all, 'users', filters ? JSON.stringify(filters) : ''] as const,
    stats: () => [...queryKeys.loyalty.all, 'stats'] as const,
  },

  // Challenges (missions) namespace
  challenges: {
    all: ['challenges'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.challenges.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.challenges.all, 'detail', id] as const,
    stats: () => [...queryKeys.challenges.all, 'stats'] as const,
    analytics: (filters?: FilterOptions) => [...queryKeys.challenges.all, 'analytics', filters ? JSON.stringify(filters) : ''] as const,
    templates: () => [...queryKeys.challenges.all, 'templates'] as const,
  },

  // Achievements namespace
  achievements: {
    all: ['achievements'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.achievements.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.achievements.all, 'detail', id] as const,
    stats: () => [...queryKeys.achievements.all, 'stats'] as const,
  },

  // Game Config namespace
  gameConfig: {
    all: ['gameConfig'] as const,
    list: () => [...queryKeys.gameConfig.all, 'list'] as const,
    analytics: (filters?: FilterOptions) => [...queryKeys.gameConfig.all, 'analytics', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Social Impact (events & sponsors) namespace
  socialImpact: {
    all: ['socialImpact'] as const,
    events: (filters?: FilterOptions) => [...queryKeys.socialImpact.all, 'events', filters ? JSON.stringify(filters) : ''] as const,
    eventDetail: (id: string) => [...queryKeys.socialImpact.all, 'eventDetail', id] as const,
    sponsors: (filters?: FilterOptions) => [...queryKeys.socialImpact.all, 'sponsors', filters ? JSON.stringify(filters) : ''] as const,
    sponsorDetail: (id: string) => [...queryKeys.socialImpact.all, 'sponsorDetail', id] as const,
    participants: (eventId: string) => [...queryKeys.socialImpact.all, 'participants', eventId] as const,
    pending: (filters?: FilterOptions) => [...queryKeys.socialImpact.all, 'pending', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Flash Sales namespace
  flashSales: {
    all: ['flashSales'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.flashSales.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.flashSales.all, 'detail', id] as const,
  },

  // Travel (OTA) namespace
  travel: {
    all: ['travel'] as const,
    dashboard: () => [...queryKeys.travel.all, 'dashboard'] as const,
    categories: () => [...queryKeys.travel.all, 'categories'] as const,
    services: (filters?: FilterOptions) => [...queryKeys.travel.all, 'services', filters ? JSON.stringify(filters) : ''] as const,
    bookings: (filters?: FilterOptions) => [...queryKeys.travel.all, 'bookings', filters ? JSON.stringify(filters) : ''] as const,
    bookingDetail: (id: string) => [...queryKeys.travel.all, 'bookingDetail', id] as const,
  },

  // System health namespace (extends existing)
  system: {
    all: ['system'] as const,
    health: () => [...queryKeys.system.all, 'health'] as const,
    reconciliation: () => [...queryKeys.system.all, 'reconciliation'] as const,
    jobs: () => [...queryKeys.system.all, 'jobs'] as const,
  },

  // Admin Wallet namespace
  adminWallet: {
    all: ['adminWallet'] as const,
    summary: () => [...queryKeys.adminWallet.all, 'summary'] as const,
    transactions: (filters?: FilterOptions) => [...queryKeys.adminWallet.all, 'transactions', filters ? JSON.stringify(filters) : ''] as const,
    breakdown: (filters?: FilterOptions) => [...queryKeys.adminWallet.all, 'breakdown', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Settings namespace — admin profile, password, session management.
  settings: {
    all: ['settings'] as const,
    currentUser: () => [...queryKeys.settings.all, 'currentUser'] as const,
  },

  // Platform config namespace — system-config and merchant-plans.
  platformConfig: {
    all: ['platformConfig'] as const,
    configs: () => [...queryKeys.platformConfig.all, 'configs'] as const,
    merchantPlans: () => [...queryKeys.platformConfig.all, 'merchantPlans'] as const,
  },

  // Bonus Zone namespace — campaigns, analytics, claims, fraud alerts.
  bonusZone: {
    all: ['bonusZone'] as const,
    campaigns: (filters?: any) =>
      [...queryKeys.bonusZone.all, 'campaigns', filters ? JSON.stringify(filters) : ''] as const,
    dashboard: () => [...queryKeys.bonusZone.all, 'dashboard'] as const,
    campaignAnalytics: (id: string) =>
      [...queryKeys.bonusZone.all, 'analytics', id] as const,
    campaignClaims: (id: string, filters?: any) =>
      [...queryKeys.bonusZone.all, 'claims', id, filters ? JSON.stringify(filters) : ''] as const,
    fraudAlerts: (limit?: number) =>
      [...queryKeys.bonusZone.all, 'fraudAlerts', limit ?? 'all'] as const,
  },

  // Events namespace — event listings, categories, bookings, analytics, reward configs.
  events: {
    all: ['events'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.events.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
    categories: () => [...queryKeys.events.all, 'categories'] as const,
    bookings: (eventId: string) => [...queryKeys.events.all, 'bookings', eventId] as const,
    analytics: (eventId: string) => [...queryKeys.events.all, 'analytics', eventId] as const,
    rewardConfigs: () => [...queryKeys.events.all, 'rewardConfigs'] as const,
  },

  // Extra Rewards namespace — double cashback campaigns and coin drops.
  extraRewards: {
    all: ['extraRewards'] as const,
    campaigns: (filters?: FilterOptions) => [...queryKeys.extraRewards.all, 'campaigns', filters ? JSON.stringify(filters) : ''] as const,
    coinDrops: (filters?: FilterOptions) => [...queryKeys.extraRewards.all, 'coinDrops', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Homepage Deals namespace — section config, deal items, and stats.
  homepageDeals: {
    all: ['homepageDeals'] as const,
    config: () => [...queryKeys.homepageDeals.all, 'config'] as const,
    items: (filters?: FilterOptions) => [...queryKeys.homepageDeals.all, 'items', filters ? JSON.stringify(filters) : ''] as const,
    stats: () => [...queryKeys.homepageDeals.all, 'stats'] as const,
  },

  // Bank Offers namespace — bank offer listings and detail.
  bankOffers: {
    all: ['bankOffers'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.bankOffers.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.bankOffers.all, 'detail', id] as const,
  },

  // Tournaments namespace — tournament configs, detail, and participant management.
  tournaments: {
    all: ['tournaments'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.tournaments.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.tournaments.all, 'detail', id] as const,
    participants: (id: string) => [...queryKeys.tournaments.all, 'participants', id] as const,
  },

  // Support Tickets namespace — ticket lists, detail, statistics, and agent roster.
  supportTickets: {
    all: ['supportTickets'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.supportTickets.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.supportTickets.all, 'detail', id] as const,
    statistics: () => [...queryKeys.supportTickets.all, 'statistics'] as const,
    agents: () => [...queryKeys.supportTickets.all, 'agents'] as const,
  },

  // Membership namespace — subscription tier plans and subscriber lists.
  membership: {
    all: ['membership'] as const,
    plans: () => [...queryKeys.membership.all, 'plans'] as const,
    subscribers: (filters?: FilterOptions) => [...queryKeys.membership.all, 'subscribers', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Payroll namespace — overview stats, staff listing, attendance, and run history.
  payroll: {
    all: ['payroll'] as const,
    overview: () => [...queryKeys.payroll.all, 'overview'] as const,
    staff: (filters?: FilterOptions) => [...queryKeys.payroll.all, 'staff', filters ? JSON.stringify(filters) : ''] as const,
    history: (filters?: FilterOptions) => [...queryKeys.payroll.all, 'history', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Explore namespace — dashboard stats, video management, featured reviews, comparisons.
  explore: {
    all: ['explore'] as const,
    stats: () => [...queryKeys.explore.all, 'stats'] as const,
    videos: (filters?: FilterOptions) => [...queryKeys.explore.all, 'videos', filters ? JSON.stringify(filters) : ''] as const,
    featuredReviews: () => [...queryKeys.explore.all, 'featuredReviews'] as const,
    featuredComparisons: () => [...queryKeys.explore.all, 'featuredComparisons'] as const,
  },

  // Creators namespace — creator applications, picks, conversions, stats, and config.
  creators: {
    all: ['creators'] as const,
    applications: (filters?: FilterOptions) => [...queryKeys.creators.all, 'applications', filters ? JSON.stringify(filters) : ''] as const,
    stats: () => [...queryKeys.creators.all, 'stats'] as const,
    picks: (filters?: FilterOptions) => [...queryKeys.creators.all, 'picks', filters ? JSON.stringify(filters) : ''] as const,
    conversions: (filters?: FilterOptions) => [...queryKeys.creators.all, 'conversions', filters ? JSON.stringify(filters) : ''] as const,
    config: () => [...queryKeys.creators.all, 'config'] as const,
  },

  // Leaderboard namespace — leaderboard configs, analytics, prize history, and stats.
  leaderboard: {
    all: ['leaderboard'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.leaderboard.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.leaderboard.all, 'detail', id] as const,
    stats: () => [...queryKeys.leaderboard.all, 'stats'] as const,
    analytics: (id: string) => [...queryKeys.leaderboard.all, 'analytics', id] as const,
    prizeHistory: (filters?: FilterOptions) => [...queryKeys.leaderboard.all, 'prizeHistory', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Experiences (store experiences) namespace
  experiences: {
    all: ['experiences'] as const,
    list: (filters?: FilterOptions) => [...queryKeys.experiences.all, 'list', filters ? JSON.stringify(filters) : ''] as const,
    detail: (id: string) => [...queryKeys.experiences.all, 'detail', id] as const,
    stats: () => [...queryKeys.experiences.all, 'stats'] as const,
    categories: () => [...queryKeys.experiences.all, 'categories'] as const,
    tags: () => [...queryKeys.experiences.all, 'tags'] as const,
    preview: (criteria: object, limit: number) => [...queryKeys.experiences.all, 'preview', JSON.stringify(criteria), limit] as const,
    searchStores: (query: string) => [...queryKeys.experiences.all, 'searchStores', query] as const,
    suggestedStores: () => [...queryKeys.experiences.all, 'suggestedStores'] as const,
    assignedStores: (id: string) => [...queryKeys.experiences.all, 'assignedStores', id] as const,
  },

  // Karma Admin namespace — events, bookings, leaderboard, badges, CSR partners, and communities.
  karma: {
    all: ['karma'] as const,
    events: (filters?: FilterOptions) => [...queryKeys.karma.all, 'events', filters ? JSON.stringify(filters) : ''] as const,
    eventDetail: (id: string) => [...queryKeys.karma.all, 'eventDetail', id] as const,
    bookings: (filters?: FilterOptions) => [...queryKeys.karma.all, 'bookings', filters ? JSON.stringify(filters) : ''] as const,
    bookingDetail: (id: string) => [...queryKeys.karma.all, 'bookingDetail', id] as const,
    leaderboard: (filters?: FilterOptions) => [...queryKeys.karma.all, 'leaderboard', filters ? JSON.stringify(filters) : ''] as const,
    badges: (filters?: FilterOptions) => [...queryKeys.karma.all, 'badges', filters ? JSON.stringify(filters) : ''] as const,
    userBadges: (userId?: string) => [...queryKeys.karma.all, 'userBadges', userId || 'me'] as const,
    csrPartners: (filters?: FilterOptions) => [...queryKeys.karma.all, 'csrPartners', filters ? JSON.stringify(filters) : ''] as const,
    csrDashboard: (partnerId?: string) => [...queryKeys.karma.all, 'csrDashboard', partnerId || 'overview'] as const,
    communities: (filters?: FilterOptions) => [...queryKeys.karma.all, 'communities', filters ? JSON.stringify(filters) : ''] as const,
    microActions: () => [...queryKeys.karma.all, 'microActions'] as const,
    stats: () => [...queryKeys.karma.all, 'stats'] as const,
  },
};
