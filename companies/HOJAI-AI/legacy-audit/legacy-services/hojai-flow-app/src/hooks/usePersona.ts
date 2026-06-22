/**
 * usePersona - Persona switching with organization context
 *
 * Handles:
 * - Personal/Organization personas
 * - Founder/Sales/Support/HR personas
 * - Organization sync
 * - Persona permissions
 */

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Persona {
  personaId: string;
  name: string;
  type: 'personal' | 'founder' | 'sales' | 'support' | 'hr';
  voice: { enabled: boolean; style: string; voiceId: string };
  knowledge: { scope: string[]; policies: string[] };
  permissions: {
    canSendMessages: boolean;
    canMakeCalls: boolean;
    canSpendBudget: boolean;
  };
  org?: { orgId: string; name: string };
  isActive: boolean;
}

interface PersonaState {
  activePersona: Persona | null;
  personas: Persona[];
  loading: boolean;
  error: string | null;
}

/**
 * Persona hook - Full persona management
 */
export function usePersona() {
  const [state, setState] = useState<PersonaState>({
    personas: [],
    activePersona: null,
    loading: false,
    error: null,
  });

  /**
   * Load personas from storage + API
   */
  const loadPersonas = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));

    try {
      // Load from storage
      const stored = await AsyncStorage.getItem('personas');
      const personas: Persona[] = stored ? JSON.parse(stored) : [];

      // Add default personal persona
      if (personas.length === 0) {
        personas.push({
          personaId: 'personal',
          name: 'My Voice',
          type: 'personal',
          voice: { enabled: true, style: 'professional', voiceId: 'default' },
          knowledge: { scope: ['personal'], policies: [] },
          permissions: { canSendMessages: true, canMakeCalls: false, canSpendBudget: false },
          isActive: true,
        });
      }

      // Find active
      const active = personas.find((p) => p.isActive) || personas[0];
      setState({ personas, activePersona: active, loading: false });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: 'Failed to load' }));
    }
  }, []);

  /**
   * Switch persona
   */
  const switchPersona = useCallback(
    async (personaId: string) => {
      const updated = state.personas.map((p) => ({
        ...p,
        isActive: p.personaId === personaId,
      }));
      const active = updated.find((p) => p.personaId === personaId) || null;

      setState((s) => ({
        ...s,
        personas: updated,
        activePersona: active,
      }));

      await AsyncStorage.setItem('personas', JSON.stringify(updated));
    },
    [state.personas]
  );

  /**
   * Add organization persona
   */
  const addOrgPersona = useCallback(
    async (org: { orgId: string; name: string; personas: Persona[] }) => {
      const orgPersonas = org.personas.map((p) => ({
        ...p,
        org: { orgId: org.orgId, name: org.name },
      }));

      const updated = [...state.personas, ...orgPersonas];
      setState((s) => ({ ...s, personas: updated }));

      await AsyncStorage.setItem('personas', JSON.stringify(updated));
    },
    [state.personas]
  );

  /**
   * Get persona context for AI
   */
  const getContext = useCallback(() => {
    const p = state.activePersona;
    if (!p) return null;

    return {
      voice: p.voice,
      knowledge: p.knowledge,
      permissions: p.permissions,
      org: p.org,
    };
  }, [state.activePersona]);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  return {
    ...state,
    switchPersona,
    addOrgPersona,
    getContext,
    loadPersonas,
  };
}

/**
 * Organization sync hook
 */
export function useOrgSync(orgId: string) {
  const [syncState, setSyncState] = useState({
    org: null,
    personas: [],
    synced: false,
  });

  const sync = useCallback(async () => {
    // Fetch org from API
    // Wire to /api/organizations/:id/persona-context
    // Return org personas
    console.log('[OrgSync] Syncing org:', orgId);
  }, [orgId]);

  useEffect(() => {
    if (orgId) sync();
  }, [orgId, sync]);

  return syncState;
}

/**
 * Permission check hook
 */
export function usePermissions() {
  const { activePersona } = usePersona();

  return {
    canSendMessages: activePersona?.permissions.canSendMessages ?? false,
    canMakeCalls: activePersona?.permissions.canMakeCalls ?? false,
    canSpendBudget: activePersona?.permissions.canSpendBudget ?? false,
    isFounder: activePersona?.type === 'founder',
    isSales: activePersona?.type === 'sales',
    isSupport: activePersona?.type === 'support',
    isPersonal: activePersona?.type === 'personal',
  };
}
