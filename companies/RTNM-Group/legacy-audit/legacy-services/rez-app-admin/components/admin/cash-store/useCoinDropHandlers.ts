import { useState } from 'react';
import { showAlert } from '../../../utils/alert';

export interface CoinDropFormState {
  title: string;
  amount: string;
  distribution: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export const DEFAULT_COINDROP_FORM: CoinDropFormState = {
  title: '',
  amount: '',
  distribution: 'random',
  startDate: '',
  endDate: '',
  isActive: true,
};

export function useCoinDropHandlers(initialForm?: Partial<CoinDropFormState>) {
  const [form, setForm] = useState<CoinDropFormState>({ ...DEFAULT_COINDROP_FORM, ...initialForm });

  const updateField = (field: keyof CoinDropFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    if (!form.title) {
      showAlert('Error', 'Title is required');
      return;
    }
    showAlert('Success', 'Coin Drop saved');
  };

  const deleteCoinDrop = async (_id: string) => {
    showAlert('Deleted', 'Coin Drop deleted');
  };
  const toggleActive = async (_id: string) => {};
  const openForm = (item?: any) => {
    setForm(item ? { ...item } : { ...DEFAULT_COINDROP_FORM });
  };

  return { form, updateField, save, deleteCoinDrop, toggleActive, openForm, setForm };
}
