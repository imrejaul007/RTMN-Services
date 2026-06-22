import { useState, useCallback } from 'react';

export interface AlertMessage {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

/**
 * Hook for managing alert dialog state
 * Replaces standalone showAlert() utility for component-scoped alerts
 */
export const useAlert = () => {
  const [visible, setVisible] = useState(false);
  const [alertData, setAlertData] = useState<AlertMessage>({
    title: '',
    message: '',
    type: 'info',
  });

  const show = useCallback((title: string, message: string, type?: 'info' | 'success' | 'error' | 'warning') => {
    setAlertData({ title, message, type: type || 'info' });
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    ...alertData,
    show,
    close,
  };
};
