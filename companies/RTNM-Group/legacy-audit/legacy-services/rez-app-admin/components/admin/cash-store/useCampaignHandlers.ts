import { useState } from 'react';
import { showAlert } from '../../../utils/alert';

export interface CampaignFormState {
  title: string;
  budget: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export const DEFAULT_CAMPAIGN_FORM: CampaignFormState = {
  title: '',
  budget: '',
  startDate: '',
  endDate: '',
  isActive: true,
};

export function useCampaignHandlers(initialForm?: Partial<CampaignFormState>) {
  const [form, setForm] = useState<CampaignFormState>({ ...DEFAULT_CAMPAIGN_FORM, ...initialForm });

  const updateField = (field: keyof CampaignFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    if (!form.title) {
      showAlert('Error', 'Title is required');
      return;
    }
    showAlert('Success', 'Campaign saved');
  };

  const deleteCampaign = async (_id: string) => {
    showAlert('Deleted', 'Campaign deleted');
  };
  const toggleActive = async (_id: string) => {};
  const openForm = (item?: any) => {
    setForm(item ? { ...item } : { ...DEFAULT_CAMPAIGN_FORM });
  };
  const addStore = async (_storeId: string) => {};
  const removeStore = async (_storeId: string) => {};
  const generateCode = async () => {
    // CRITICAL FIX: Remove Math.random fallback entirely for campaign codes.
    // Math.random is not a CSPRNG; V8's XorShift state can be derived from
    // a handful of outputs, making generated campaign codes predictable.
    // Use Web Crypto API only (via react-native-get-random-values polyfill).
    const bytes = new Uint8Array(4);
    try {
      const webCrypto = (globalThis as unknown as { crypto: Crypto }).crypto;
      if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
        webCrypto.getRandomValues(bytes);
      } else {
        throw new Error('Web Crypto API not available');
      }
    } catch (_err) {
      // Error is thrown below with user-friendly message
      throw new Error(
        'Campaign code generation requires Web Crypto API. Please use a modern browser or mobile app.'
      );
    }
    const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 6)
      .toUpperCase();
    return 'GEN' + suffix;
  };
  const tagToggle = async (_tag: string) => {};

  return {
    form,
    updateField,
    save,
    deleteCampaign,
    toggleActive,
    openForm,
    setForm,
    addStore,
    removeStore,
    generateCode,
    tagToggle,
  };
}
