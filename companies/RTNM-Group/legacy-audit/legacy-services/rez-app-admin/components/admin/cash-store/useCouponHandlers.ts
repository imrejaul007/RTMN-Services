import { useState } from 'react';
import { showAlert } from '../../../utils/alert';

export interface CouponFormState {
  title: string;
  code: string;
  discount: string;
  expiry: string;
  isActive: boolean;
}

export const DEFAULT_COUPON_FORM: CouponFormState = {
  title: '',
  code: '',
  discount: '',
  expiry: '',
  isActive: true,
};

export function useCouponHandlers(initialForm?: Partial<CouponFormState>) {
  const [form, setForm] = useState<CouponFormState>({ ...DEFAULT_COUPON_FORM, ...initialForm });

  const updateField = (field: keyof CouponFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    if (!form.title) {
      showAlert('Error', 'Title is required');
      return;
    }
    showAlert('Success', 'Coupon saved');
  };

  const deleteCoupon = async (_id: string) => {
    showAlert('Deleted', 'Coupon deleted');
  };
  const toggleActive = async (_id: string) => {};
  const openForm = (item?: any) => {
    setForm(item ? { ...item } : { ...DEFAULT_COUPON_FORM });
  };

  return { form, updateField, save, deleteCoupon, toggleActive, openForm, setForm };
}
