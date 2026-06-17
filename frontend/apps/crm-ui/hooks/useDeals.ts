'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Deal, DealFilters, DealStage } from '@/lib/types'

interface UseDealsOptions {
  initialFilters?: DealFilters
  pageSize?: number
}

interface UseDealsReturn {
  deals: Deal[]
  loading: boolean
  error: Error | null
  filters: DealFilters
  setFilters: (filters: DealFilters) => void
  page: number
  setPage: (page: number) => void
  totalPages: number
  total: number
  totalValue: number
  refetch: () => void
  createDeal: (data: Partial<Deal>) => Promise<Deal | null>
  updateDeal: (id: string, data: Partial<Deal>) => Promise<Deal | null>
  updateDealStage: (id: string, stage: DealStage) => Promise<Deal | null>
  deleteDeal: (id: string) => Promise<boolean>
}

export function useDeals(options: UseDealsOptions = {}): UseDealsReturn {
  const { initialFilters = {}, pageSize = 20 } = options

  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFiltersState] = useState<DealFilters>(initialFilters)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const setFilters = useCallback((newFilters: DealFilters) => {
    setFiltersState(newFilters)
    setPage(1)
  }, [])

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true)
      setError(null)

      try {
        // Simulated API call - replace with actual API
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Mock data
        const mockDeals: Deal[] = [
          {
            id: '1',
            title: 'Enterprise License - Acme Corp',
            value: 85000,
            contact: 'Sarah Johnson',
            company: 'TechStart Inc',
            stage: 'proposal',
            probability: 60,
            expectedClose: '2026-06-30',
            daysInStage: 5,
            createdAt: '2026-06-01',
            assignedTo: 'John Smith',
          },
          {
            id: '2',
            title: 'Annual Subscription - Global Retail',
            value: 120000,
            contact: 'Emily Davis',
            company: 'Global Retail Corp',
            stage: 'negotiation',
            probability: 80,
            expectedClose: '2026-06-25',
            daysInStage: 8,
            createdAt: '2026-05-15',
            assignedTo: 'John Smith',
          },
          {
            id: '3',
            title: 'Starter Package - StartupXYZ',
            value: 15000,
            contact: 'James Wilson',
            company: 'StartupXYZ',
            stage: 'qualification',
            probability: 30,
            expectedClose: '2026-07-15',
            daysInStage: 3,
            createdAt: '2026-06-05',
            assignedTo: 'Sarah Lee',
          },
          {
            id: '4',
            title: 'Pro Plan - TechInnovate',
            value: 45000,
            contact: 'David Kim',
            company: 'TechInnovate',
            stage: 'discovery',
            probability: 20,
            expectedClose: '2026-08-01',
            daysInStage: 12,
            createdAt: '2026-05-20',
            assignedTo: 'Mike Johnson',
          },
          {
            id: '5',
            title: 'Enterprise Suite - Enterprise Solutions',
            value: 200000,
            contact: 'Michael Chen',
            company: 'Enterprise Solutions',
            stage: 'closed_won',
            probability: 100,
            expectedClose: '2026-06-10',
            daysInStage: 0,
            createdAt: '2026-04-01',
            assignedTo: 'John Smith',
          },
        ]

        let filteredDeals = mockDeals

        if (filters.search) {
          const search = filters.search.toLowerCase()
          filteredDeals = filteredDeals.filter(
            (d) =>
              d.title.toLowerCase().includes(search) ||
              d.company.toLowerCase().includes(search) ||
              d.contact.toLowerCase().includes(search)
          )
        }

        if (filters.stage) {
          filteredDeals = filteredDeals.filter((d) => d.stage === filters.stage)
        }

        if (filters.minValue) {
          filteredDeals = filteredDeals.filter((d) => d.value >= filters.minValue!)
        }

        if (filters.maxValue) {
          filteredDeals = filteredDeals.filter((d) => d.value <= filters.maxValue!)
        }

        if (filters.assignedTo) {
          filteredDeals = filteredDeals.filter((d) => d.assignedTo === filters.assignedTo)
        }

        setDeals(filteredDeals)
        setTotal(filteredDeals.length)
        setTotalPages(Math.ceil(filteredDeals.length / pageSize))
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch deals'))
      } finally {
        setLoading(false)
      }
    }

    fetchDeals()
  }, [filters, page, pageSize, refreshKey])

  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0)

  const createDeal = async (data: Partial<Deal>): Promise<Deal | null> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const newDeal: Deal = {
        id: String(Date.now()),
        title: data.title || '',
        value: data.value || 0,
        contact: data.contact || '',
        company: data.company || '',
        stage: data.stage || 'discovery',
        probability: data.probability || 10,
        expectedClose: data.expectedClose || '',
        daysInStage: 0,
        createdAt: new Date().toISOString().split('T')[0],
        assignedTo: data.assignedTo,
        description: data.description,
        nextSteps: data.nextSteps,
      }

      setDeals((prev) => [newDeal, ...prev])
      refetch()
      return newDeal
    } catch (err) {
      console.error('Failed to create deal:', err)
      return null
    }
  }

  const updateDeal = async (
    id: string,
    data: Partial<Deal>
  ): Promise<Deal | null> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const updatedDeal = {
        ...deals.find((d) => d.id === id),
        ...data,
      } as Deal

      setDeals((prev) =>
        prev.map((d) => (d.id === id ? updatedDeal : d))
      )
      return updatedDeal
    } catch (err) {
      console.error('Failed to update deal:', err)
      return null
    }
  }

  const updateDealStage = async (
    id: string,
    stage: DealStage
  ): Promise<Deal | null> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))

      const updatedDeal = {
        ...deals.find((d) => d.id === id),
        stage,
        daysInStage: 0,
      } as Deal

      setDeals((prev) =>
        prev.map((d) => (d.id === id ? updatedDeal : d))
      )
      return updatedDeal
    } catch (err) {
      console.error('Failed to update deal stage:', err)
      return null
    }
  }

  const deleteDeal = async (id: string): Promise<boolean> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setDeals((prev) => prev.filter((d) => d.id !== id))
      return true
    } catch (err) {
      console.error('Failed to delete deal:', err)
      return false
    }
  }

  return {
    deals,
    loading,
    error,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    total,
    totalValue,
    refetch,
    createDeal,
    updateDeal,
    updateDealStage,
    deleteDeal,
  }
}

export function useDeal(id: string) {
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchDeal = async () => {
      setLoading(true)
      setError(null)

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        const mockDeal: Deal = {
          id,
          title: 'Enterprise License - Acme Corp',
          value: 85000,
          contact: 'Sarah Johnson',
          contactId: '1',
          company: 'TechStart Inc',
          companyId: 'c1',
          stage: 'proposal',
          probability: 60,
          expectedClose: '2026-06-30',
          daysInStage: 5,
          createdAt: '2026-06-01',
          assignedTo: 'John Smith',
          description: 'Enterprise license deal for TechStart Inc.',
          nextSteps: 'Send revised proposal with volume discount',
          tags: ['enterprise', 'hot-lead'],
        }

        setDeal(mockDeal)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch deal'))
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchDeal()
    }
  }, [id])

  return { deal, loading, error }
}

export function usePipeline() {
  const [pipelineData, setPipelineData] = useState<Record<DealStage, Deal[]>>({
    discovery: [],
    qualification: [],
    proposal: [],
    negotiation: [],
    closed_won: [],
    closed_lost: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchPipeline = async () => {
      setLoading(true)
      setError(null)

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        const mockDeals: Deal[] = [
          {
            id: '1',
            title: 'Enterprise License - Acme Corp',
            value: 85000,
            contact: 'Sarah Johnson',
            company: 'TechStart Inc',
            stage: 'proposal',
            probability: 60,
            expectedClose: '2026-06-30',
            daysInStage: 5,
            createdAt: '2026-06-01',
          },
          {
            id: '2',
            title: 'Annual Subscription - Global Retail',
            value: 120000,
            contact: 'Emily Davis',
            company: 'Global Retail Corp',
            stage: 'negotiation',
            probability: 80,
            expectedClose: '2026-06-25',
            daysInStage: 8,
            createdAt: '2026-05-15',
          },
          {
            id: '3',
            title: 'Starter Package - StartupXYZ',
            value: 15000,
            contact: 'James Wilson',
            company: 'StartupXYZ',
            stage: 'qualification',
            probability: 30,
            expectedClose: '2026-07-15',
            daysInStage: 3,
            createdAt: '2026-06-05',
          },
          {
            id: '4',
            title: 'Pro Plan - TechInnovate',
            value: 45000,
            contact: 'David Kim',
            company: 'TechInnovate',
            stage: 'discovery',
            probability: 20,
            expectedClose: '2026-08-01',
            daysInStage: 12,
            createdAt: '2026-05-20',
          },
          {
            id: '5',
            title: 'Enterprise Suite - Enterprise Solutions',
            value: 200000,
            contact: 'Michael Chen',
            company: 'Enterprise Solutions',
            stage: 'closed_won',
            probability: 100,
            expectedClose: '2026-06-10',
            daysInStage: 0,
            createdAt: '2026-04-01',
          },
        ]

        const grouped: Record<DealStage, Deal[]> = {
          discovery: [],
          qualification: [],
          proposal: [],
          negotiation: [],
          closed_won: [],
          closed_lost: [],
        }

        mockDeals.forEach((deal) => {
          grouped[deal.stage].push(deal)
        })

        setPipelineData(grouped)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pipeline'))
      } finally {
        setLoading(false)
      }
    }

    fetchPipeline()
  }, [])

  const totalValue = Object.values(pipelineData)
    .flat()
    .reduce((sum, deal) => sum + deal.value, 0)

  const getStageStats = (stage: DealStage) => {
    const deals = pipelineData[stage]
    return {
      count: deals.length,
      value: deals.reduce((sum, d) => sum + d.value, 0),
    }
  }

  return { pipelineData, loading, error, totalValue, getStageStats }
}
