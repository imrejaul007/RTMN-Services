export * from './queryKeys';
export { useDashboardStats, useRecentActivity } from './useDashboard';
export {
  useMerchants,
  useMerchant,
  useMerchantWalletStats,
  usePendingWithdrawals,
  useMerchantWallet,
} from './useMerchants';
export { useAdminOrders, useAdminOrder, useOrderStats } from './useOrders';
export { useFraudReports, useFraudQueue, useFraudConfig } from './useFraud';
export { useFeatureFlags, useFeatureFlag } from './useFeatureFlags';
export { useMerchantCampaignRules, useMerchantCampaignRuleStats } from './useMerchantCampaigns';
export {
  useApproveMerchant,
  useRejectMerchant,
  useSuspendMerchant,
  useReactivateMerchant,
  useToggleStoreProgram,
  useUpdateStoreSettings,
  useCreateMerchant,
} from './useMerchantMutations';
export { useSuspendUser, useUnsuspendUser, useResetStreak } from './useUserMutations';
export { useCreateVoucher, useUpdateVoucher, useDeleteVoucher } from './useVoucherMutations';
export {
  useCreateCampaign,
  useUpdateCampaign,
  useToggleCampaignStatus,
  useDeleteCampaign,
  useDuplicateCampaign,
  useAddDeal,
  useRemoveDeal,
} from './useCampaignMutations';

export {
  useCampaignsList,
  useCampaignsStats,
  useCampaignStores,
  useCampaignsRefresh,
} from './useCampaignsList';
export {
  useCurrentUser,
  useChangePassword,
  useLogoutAllDevices,
} from './useSettings';
export {
  useSystemConfigs,
  useMerchantPlans,
  useUpdateSystemConfig,
  useAddSystemConfig,
  useUpdateMerchantPlan,
} from './usePlatformConfig';
export {
  useBonusCampaigns,
  useBonusZoneDashboard,
  useBonusCampaignAnalytics,
  useBonusCampaignClaims,
  useBonusFraudAlerts,
  useCreateBonusCampaign,
  useUpdateBonusCampaign,
  useDeleteBonusCampaign,
  useUpdateBonusCampaignStatus,
  useFundBonusCampaign,
  useDuplicateBonusCampaign,
  useRejectBonusClaim,
} from './useBonusZone';

// ── New query hooks (12 domains) ─────────────────────────────────────────────

export {
  useOffersList,
  useOffer,
  useOfferStats,
  usePendingOffers,
  useOfferStores,
} from './useOffers';

export {
  useVoucherBrands,
  useCoupons,
  useCouponStores,
  useDoubleCampaigns,
  useCoinDrops,
  useCoinDropStores,
  useAffiliateAnalytics,
} from './useCashStore';

export { useStoresList, useStore } from './useStores';

export {
  useLoyaltyUsers,
  useLoyaltyStats,
  useLoyaltyUser,
} from './useLoyalty';

export {
  useChallengesList,
  useChallenge,
  useChallengeStats,
  useChallengeTemplates,
  useChallengeAnalytics,
} from './useChallenges';

export {
  useAchievementsList,
  useAchievement,
  useAchievementStats,
  useAchievementMetrics,
} from './useAchievements';

export {
  useGameConfigs,
  useGameConfigsByType,
  useGameAnalytics,
  useUserGameHistory,
} from './useGameConfig';

export {
  useSocialImpactEvents,
  useSocialImpactEvent,
  usePendingSocialImpactEvents,
  useSocialImpactParticipants,
  useSocialImpactSponsors,
  useSocialImpactSponsor,
  useSponsorEvents,
  useSponsorAnalytics,
  useSponsorBudget,
  useSponsorLedger,
} from './useSocialImpact';

export {
  useFlashSalesList,
  useFlashSale,
} from './useFlashSales';

export {
  useTravelDashboard,
  useTravelCategories,
  useTravelServices,
  useTravelBookings,
  useTravelBooking,
} from './useTravel';

export {
  useSystemHealth,
  useReconciliation,
  useScheduledJobs,
} from './useSystemHealth';

export {
  useAdminWalletSummary,
  useAdminWalletTransactions,
  useAdminWalletBreakdown,
} from './useAdminWallet';

// ── 13 new query hooks (events, extraRewards, homepageDeals, bankOffers, tournaments,
//    supportTickets, membership, payroll, explore, creators, leaderboard,
//    adminActions, fraudReports) ───────────────────────────────────────────────

export {
  useEventsList,
  useEvent,
  useEventCategories,
  useEventBookings,
  useEventAnalytics,
  useEventRewardConfigs,
  useGlobalRewardConfig,
} from './useEvents';

export {
  useDoubleCampaignsList,
  useDoubleCampaign,
  useCoinDropsList,
  useCoinDrop,
  useExtraRewardsStores,
} from './useExtraRewards';

export {
  useHomepageDealsConfig,
  useHomepageDealsItems,
  useHomepageDealsItem,
  useHomepageDealsStats,
} from './useHomepageDeals';

export {
  useBankOffersList,
  useBankOffer,
} from './useBankOffers';

export {
  useTournamentsList,
  useTournament,
  useTournamentParticipants,
} from './useTournaments';

export {
  useSupportTicketsList,
  useSupportTicket,
  useSupportTicketStatistics,
  useSupportAgents,
} from './useSupportTickets';

export {
  useMembershipPlans,
  useSubscribersList,
} from './useMembership';

export {
  usePayrollOverview,
  usePayrollStaff,
  usePayrollAttendance,
  usePayrollHistory,
} from './usePayroll';

export {
  useExploreStats,
  useExploreVideoStats,
  useExploreVideos,
  useExploreVideo,
  useFeaturedReviews,
  useEligibleReviews,
  useFeaturedComparisons,
} from './useExplore';

export {
  useCreatorProgramStats,
  useCreatorApplications,
  useCreatorPicks,
  useCreatorConversions,
  useCreatorConfig,
} from './useCreators';

export {
  useLeaderboardConfigs,
  useLeaderboardConfig,
  useLeaderboardStats,
  useLeaderboardAnalytics,
  useLeaderboardPrizeHistory,
} from './useLeaderboard';

export {
  usePendingActions,
  useActionHistory,
  useApprovalThreshold,
} from './useAdminActions';

export {
  useFraudReportsList,
  useFraudReport,
} from './useFraudReports';

export {
  useExperiencesList,
  useExperienceStats,
  useExperience,
  useExperienceCategories,
  useExperienceTags,
  usePreviewStores,
  useSearchAssignableStores,
  useSuggestedStores,
  useAssignedStores,
  useCreateExperience,
  useUpdateExperience,
  useDeleteExperience,
  useToggleExperience,
  useToggleFeatured,
  useAssignStore,
  useRemoveStore,
  useRefreshStoreCount,
  useReorderExperiences,
} from './useExperiences';
