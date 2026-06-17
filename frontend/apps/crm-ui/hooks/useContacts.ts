'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Contact, ContactFilters, PaginatedResponse, ApiResponse } from '@/lib/types'

interface UseContactsOptions {
  initialFilters?: ContactFilters
  pageSize?: number
}

interface UseContactsReturn {
  contacts: Contact[]
  loading: boolean
  error: Error | null
  filters: ContactFilters
  setFilters: (filters: ContactFilters) => void
  page: number
  setPage: (page: number) => void
  totalPages: number
  total: number
  refetch: () => void
  createContact: (data: Partial<Contact>) => Promise<Contact | null>
  updateContact: (id: string, data: Partial<Contact>) => Promise<Contact | null>
  deleteContact: (id: string) => Promise<boolean>
}

export function useContacts(
  options: UseContactsOptions = {}
): UseContactsReturn {
  const { initialFilters = {}, pageSize = 20 } = options

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFiltersState] = useState<ContactFilters>(initialFilters)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const setFilters = useCallback((newFilters: ContactFilters) => {
    setFiltersState(newFilters)
    setPage(1)
  }, [])

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true)
      setError(null)

      try {
        // Simulated API call - replace with actual API
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Mock data for demonstration
        const mockContacts: Contact[] = [
          {
            id: '1',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@techstart.io',
            phone: '+1 (555) 123-4567',
            company: 'TechStart Inc',
            role: 'VP of Engineering',
            avatar: null,
            status: 'active',
            lastContact: '2026-06-15',
            deals: 3,
            totalValue: 125000,
            tags: ['enterprise', 'hot-lead'],
            createdAt: '2026-01-15',
          },
          {
            id: '2',
            name: 'Michael Chen',
            email: 'mchen@enterprise.co',
            phone: '+1 (555) 234-5678',
            company: 'Enterprise Solutions',
            role: 'CTO',
            avatar: null,
            status: 'active',
            lastContact: '2026-06-14',
            deals: 2,
            totalValue: 89000,
            tags: ['decision-maker'],
            createdAt: '2026-02-20',
          },
          {
            id: '3',
            name: 'Emily Davis',
            email: 'emily.d@globalretail.com',
            phone: '+1 (555) 345-6789',
            company: 'Global Retail Corp',
            role: 'Director of Operations',
            avatar: null,
            status: 'active',
            lastContact: '2026-06-13',
            deals: 4,
            totalValue: 210000,
            tags: ['enterprise', 'priority'],
            createdAt: '2026-03-10',
          },
        ]

        let filteredContacts = mockContacts

        if (filters.search) {
          const search = filters.search.toLowerCase()
          filteredContacts = filteredContacts.filter(
            (c) =>
              c.name.toLowerCase().includes(search) ||
              c.email.toLowerCase().includes(search) ||
              c.company.toLowerCase().includes(search)
          )
        }

        if (filters.status) {
          filteredContacts = filteredContacts.filter((c) => c.status === filters.status)
        }

        if (filters.tags?.length) {
          filteredContacts = filteredContacts.filter((c) =>
            filters.tags!.some((tag) => c.tags.includes(tag))
          )
        }

        setContacts(filteredContacts)
        setTotal(filteredContacts.length)
        setTotalPages(Math.ceil(filteredContacts.length / pageSize))
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch contacts'))
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()
  }, [filters, page, pageSize, refreshKey])

  const createContact = async (data: Partial<Contact>): Promise<Contact | null> => {
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      const newContact: Contact = {
        id: String(Date.now()),
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        role: data.role || '',
        avatar: null,
        status: 'active',
        lastContact: new Date().toISOString().split('T')[0],
        deals: 0,
        totalValue: 0,
        tags: data.tags || [],
        createdAt: new Date().toISOString().split('T')[0],
      }

      setContacts((prev) => [newContact, ...prev])
      refetch()
      return newContact
    } catch (err) {
      console.error('Failed to create contact:', err)
      return null
    }
  }

  const updateContact = async (
    id: string,
    data: Partial<Contact>
  ): Promise<Contact | null> => {
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      const updatedContact = {
        ...contacts.find((c) => c.id === id),
        ...data,
      } as Contact

      setContacts((prev) =>
        prev.map((c) => (c.id === id ? updatedContact : c))
      )
      return updatedContact
    } catch (err) {
      console.error('Failed to update contact:', err)
      return null
    }
  }

  const deleteContact = async (id: string): Promise<boolean> => {
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      setContacts((prev) => prev.filter((c) => c.id !== id))
      return true
    } catch (err) {
      console.error('Failed to delete contact:', err)
      return false
    }
  }

  return {
    contacts,
    loading,
    error,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    total,
    refetch,
    createContact,
    updateContact,
    deleteContact,
  }
}

export function useContact(id: string) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchContact = async () => {
      setLoading(true)
      setError(null)

      try {
        // Simulated API call
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Mock data
        const mockContact: Contact = {
          id,
          name: 'Sarah Johnson',
          email: 'sarah.johnson@techstart.io',
          phone: '+1 (555) 123-4567',
          company: 'TechStart Inc',
          role: 'VP of Engineering',
          avatar: null,
          status: 'active',
          lastContact: '2026-06-15',
          deals: 3,
          totalValue: 125000,
          tags: ['enterprise', 'hot-lead'],
          createdAt: '2026-01-15',
          address: {
            street: '123 Innovation Drive',
            city: 'San Francisco',
            state: 'CA',
            zip: '94105',
            country: 'USA',
          },
          social: {
            linkedin: 'https://linkedin.com/in/sarahjohnson',
          },
          notes: 'Key decision maker for enterprise deal.',
        }

        setContact(mockContact)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch contact'))
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchContact()
    }
  }, [id])

  return { contact, loading, error }
}
