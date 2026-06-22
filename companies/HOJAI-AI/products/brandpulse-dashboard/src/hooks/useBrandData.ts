import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI, reviewAPI } from '../services/api';
import type { Brand, SentimentTrend, RatingDistribution, AspectAnalysis, Alert, Review } from '../types';

export function useBrandData(brandId: string) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrand = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsAPI.getOverview(brandId);
      if (response.success) {
        setBrand(response.data);
      } else {
        setError(response.error || 'Failed to fetch brand');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  return { brand, loading, error, refresh: fetchBrand };
}

export function useSentimentTrend(brandId: string, period: string = 'day') {
  const [trend, setTrend] = useState<SentimentTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrend = useCallback(async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getSentimentTrend(brandId, period, 30);
      if (response.success) {
        setTrend(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [brandId, period]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  return { trend, loading, error, refetch: fetchTrend };
}

export function useRatings(brandId: string) {
  const [ratings, setRatings] = useState<RatingDistribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await analyticsAPI.getRatings(brandId);
        if (response.success) {
          setRatings(response.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [brandId]);

  return { ratings, loading };
}

export function useAspects(brandId: string) {
  const [aspects, setAspects] = useState<AspectAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await analyticsAPI.getAspects(brandId);
        if (response.success) {
          setAspects(response.data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [brandId]);

  return { aspects, loading };
}

export function useAlerts(brandId: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const response = await analyticsAPI.getAlerts(brandId);
      if (response.success) {
        setAlerts(response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [brandId]);

  const acknowledge = async (id: string) => {
    await analyticsAPI.acknowledgeAlert(id, 'dashboard_user');
    await fetch();
  };

  const resolve = async (id: string) => {
    await analyticsAPI.resolveAlert(id, 'dashboard_user');
    await fetch();
  };

  return { alerts, loading, acknowledge, resolve };
}

export function useReviews(brandId: string, initialLimit: number = 10) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });

  const fetch = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const response = await reviewAPI.getReviews(brandId, {
        page: pageNum,
        limit: initialLimit,
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });
      if (response.success) {
        if (pageNum === 1) {
          setReviews(response.data);
        } else {
          setReviews(prev => [...prev, ...response.data]);
        }
        setPagination({
          page: response.pagination?.page || 1,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 0,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(1);
  }, [brandId]);

  const loadMore = () => {
    if (page < pagination.pages && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetch(nextPage);
    }
  };

  return { reviews, loading, pagination, loadMore };
}
