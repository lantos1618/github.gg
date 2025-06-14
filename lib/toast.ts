import { toast as sonnerToast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'default';

type ToastOptions = {
  type?: ToastType;
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export const toast = (message: string, options: ToastOptions = {}) => {
  const { type = 'default', duration = 5000, description, action } = options;

  const baseConfig = {
    duration,
    ...(description && { description }),
    ...(action && {
      action: {
        label: action.label,
        onClick: action.onClick,
      },
    }),
  };

  switch (type) {
    case 'success':
      return sonnerToast.success(message, baseConfig);
    case 'error':
      return sonnerToast.error(message, baseConfig);
    case 'info':
      return sonnerToast.info(message, baseConfig);
    case 'warning':
      return sonnerToast.warning(message, baseConfig);
    default:
      return sonnerToast(message, baseConfig);
  }
};

// Export all from sonner for direct access if needed
export * from 'sonner';
