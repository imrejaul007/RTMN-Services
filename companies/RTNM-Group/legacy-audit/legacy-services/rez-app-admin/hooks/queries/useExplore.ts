/**
 * useExplore — React Query data layer for the Explore content admin module.
 *
 * Covers Explore dashboard stats, video management, featured reviews, and
 * featured comparisons. Supports bulk operations and moderation workflows.
 *
 * Usage:
 *   const { stats } = useExploreStats();
 *   const { videos } = useExploreVideos({ page: 1, limit: 20, status: 'published' });
 *   const { video } = useExploreVideo('videoId123');
 *   const { featuredReviews } = useFeaturedReviews({ page: 1, limit: 20 });
 */
import { useQuery } from '@tanstack/react-query';
import { exploreService } from '@/services/api/explore';
import type {
  Video,
  VideoStats,
  ExploreStats,
  VideosResponse,
} from '@/services/api/explore';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export interface ExploreVideosFilters {
  page?: number;
  limit?: number;
  status?: string;
  contentType?: string;
  featured?: boolean;
  trending?: boolean;
  search?: string;
}

export interface FeaturedReviewsFilters {
  page?: number;
  limit?: number;
  minRating?: number;
}

// ── Explore stats ──────────────────────────────────────────────────────────────

export function useExploreStats() {
  const { user } = useAuth();
  return useQuery<ExploreStats>({
    queryKey: queryKeys.explore.stats(),
    queryFn: () => exploreService.getStats(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Video stats ───────────────────────────────────────────────────────────────

export function useExploreVideoStats() {
  const { user } = useAuth();
  return useQuery<VideoStats>({
    queryKey: [...queryKeys.explore.stats(), 'videos'] as const,
    queryFn: () => exploreService.getVideoStats(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Videos ─────────────────────────────────────────────────────────────────────

export function useExploreVideos(filters: ExploreVideosFilters = {}) {
  const { user } = useAuth();
  return useQuery<VideosResponse>({
    queryKey: queryKeys.explore.videos(filters),
    queryFn: () =>
      exploreService.getVideos(
        filters.page ?? 1,
        filters.limit ?? 20,
        filters.status,
        filters.contentType,
        filters.featured,
        filters.trending,
        filters.search
      ),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useExploreVideo(videoId: string) {
  const { user } = useAuth();
  return useQuery<Video>({
    queryKey: [...queryKeys.explore.videos(), 'detail', videoId] as const,
    queryFn: () => exploreService.getVideo(videoId),
    enabled: !!user && !!videoId,
    ...queryConfig.adminList,
  });
}

// ── Featured reviews ────────────────────────────────────────────────────────────

export function useFeaturedReviews(filters: FeaturedReviewsFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.explore.featuredReviews(),
    queryFn: () => exploreService.getFeaturedReviews(filters.page ?? 1, filters.limit ?? 20),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useEligibleReviews(filters: FeaturedReviewsFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.explore.featuredReviews(), 'eligible'] as const,
    queryFn: () =>
      exploreService.getEligibleReviews(
        filters.page ?? 1,
        filters.limit ?? 20,
        filters.minRating ?? 4
      ),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Featured comparisons ───────────────────────────────────────────────────────

export function useFeaturedComparisons(page = 1, limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.explore.featuredComparisons(),
    queryFn: () => exploreService.getFeaturedComparisons(page, limit),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}
