import { useState } from 'react';
import { showAlert } from '../../../utils/alert';

export interface VoucherFormState {
  title: string;
  code: string;
  discount: string;
  expiry: string;
  isActive: boolean;
}

export const DEFAULT_VOUCHER_FORM: VoucherFormState = {
  title: '',
  code: '',
  discount: '',
  expiry: '',
  isActive: true,
};

export function useVoucherHandlers(initialForm?: Partial<VoucherFormState>) {
  const [form, setForm] = useState<VoucherFormState>({ ...DEFAULT_VOUCHER_FORM, ...initialForm });

  const updateField = (field: keyof VoucherFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    if (!form.title) {
      showAlert('Error', 'Title is required');
      return;
    }
    showAlert('Success', 'Voucher saved');
  };

  const deleteVoucher = async (_id: string) => {
    showAlert('Deleted', 'Voucher deleted');
  };
  const toggleActive = async (_id: string) => {};
  const openForm = (item?: any) => {
    setForm(item ? { ...item } : { ...DEFAULT_VOUCHER_FORM });
  };

  return { form, updateField, save, deleteVoucher, toggleActive, openForm, setForm };
}
