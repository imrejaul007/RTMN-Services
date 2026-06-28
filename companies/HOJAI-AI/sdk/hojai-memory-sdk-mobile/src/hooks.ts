/**
 * MemoryOS React Hook
 *
 * Easy integration with React / React Native apps
 */

import { useState, useEffect, useCallback } from 'react';
import { MemoryOSMobile, type Memory, type MemoryOSConfig } from './index.js';

/**
 * useMemoryOS - Main hook for MemoryOS
 */
export function useMemoryOS(config: MemoryOSConfig) {
  const [memory, setMemory] = useState<MemoryOSMobile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = new MemoryOSMobile(config);
    setMemory(client);

    // Check connectivity
    const checkHealth = async () => {
      try {
        await client.healthCheck();
        setIsOnline(true);
        setError(null);
      } catch {
        setIsOnline(false);
      }
      setIsLoading(false);
    };

    checkHealth();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [config.baseUrl]);

  const store = useCallback(async (twinId: string, content: string, options?: Parameters<MemoryOSMobile['store']>[2]) => {
    if (!memory) return null;
    try {
      return await memory.store(twinId, content, options);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to store memory');
      return null;
    }
  }, [memory]);

  const search = useCallback(async (query: string, twinId?: string) => {
    if (!memory) return [];
    try {
      const result = await memory.search({ query, twinId });
      return result.results;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search');
      return [];
    }
  }, [memory]);

  const getContext = useCallback(async (twinId: string) => {
    if (!memory) return null;
    try {
      return await memory.getContext(twinId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get context');
      return null;
    }
  }, [memory]);

  return {
    memory,
    isLoading,
    isOnline,
    error,
    store,
    search,
    getContext
  };
}

/**
 * useMemory - Hook for managing a single memory
 */
export function useMemory(twinId: string, initialContent?: string) {
  const [content, setContent] = useState(initialContent || '');
  const [memory, setMemory] = useState<Memory | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const client = new MemoryOSMobile({ baseUrl: 'http://localhost:4703' });

  const save = useCallback(async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      const saved = await client.store(twinId, content);
      setMemory(saved);
    } finally {
      setIsSaving(false);
    }
  }, [twinId, content, client]);

  return { content, setContent, memory, isSaving, save };
}

/**
 * useMemorySearch - Hook for searching memories
 */
export function useMemorySearch(twinId: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Memory[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const client = new MemoryOSMobile({ baseUrl: 'http://localhost:4703' });

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await client.search({ query: searchQuery, twinId });
      setResults(result.results);
    } finally {
      setIsSearching(false);
    }
  }, [twinId, client]);

  useEffect(() => {
    const debounce = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounce);
  }, [query, search]);

  return { query, setQuery, results, isSearching };
}

/**
 * useMemoryContext - Hook for getting unified context
 */
export function useMemoryContext(twinId: string) {
  const [context, setContext] = useState<{
    personalMemories: Memory[];
    organizationalContext?: unknown;
    departmentContext?: unknown;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const client = new MemoryOSMobile({ baseUrl: 'http://localhost:4703' });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const ctx = await client.getContext(twinId);
        setContext(ctx);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [twinId, client]);

  return { context, isLoading };
}