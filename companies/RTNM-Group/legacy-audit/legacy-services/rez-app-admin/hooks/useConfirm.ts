import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

export interface ConfirmConfig {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger' | 'warning';
}

/**
 * Hook for managing confirmation dialog state
 * Replaces standalone showConfirm() utility for component-scoped confirmations
 */
export const useConfirm = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ConfirmConfig>({
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'default',
  });

  const show = useCallback((cfg: Partial<ConfirmConfig>) => {
    setConfig((prev) => ({
      ...prev,
      title: cfg.title || prev.title,
      message: cfg.message || prev.message,
      onConfirm: cfg.onConfirm || prev.onConfirm,
      onCancel: cfg.onCancel || prev.onCancel,
      confirmText: cfg.confirmText || 'Confirm',
      cancelText: cfg.cancelText || 'Cancel',
      type: cfg.type || 'default',
    }));
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      await Promise.resolve(config.onConfirm());
      close();
    } catch (error) {
      logger.error('Confirm action failed', error);
    }
  }, [config, close]);

  const handleCancel = useCallback(() => {
    config.onCancel?.();
    close();
  }, [config, close]);

  return {
    visible,
    title: config.title,
    message: config.message,
    confirmText: config.confirmText,
    cancelText: config.cancelText,
    type: config.type,
    show,
    close,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };
};
