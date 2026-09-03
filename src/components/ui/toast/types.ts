// === Types

export type ToastVariant = "pending" | "success" | "error" | "info";

export interface ToastAction {
  label: string;
  /* External tx-hash links open in a new tab; internal links route in place. */
  href: string;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  /* Milliseconds before auto-dismiss. Ignored for `pending`, which stays until updated. */
  duration?: number;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  action?: ToastAction;
  duration?: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => string;
  update: (id: string, patch: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
}
