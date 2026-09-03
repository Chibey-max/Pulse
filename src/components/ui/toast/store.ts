"use client";

import { useSyncExternalStore } from "react";
import type { Toast, ToastApi, ToastOptions } from "./types";

/*
  A module-level store rather than a context provider: toasts are fired from hooks
  (useCall, useClaimAll) that sit anywhere under the app tree, and a flat store sidesteps
  every provider-ordering question. `<Toaster />` is the sole subscriber.
*/

// === State

const DEFAULT_DURATION = 5_000;

let toasts: Toast[] = [];
const EMPTY: Toast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

let counter = 0;

function nextId(): string {
  counter += 1;
  return `toast-${Date.now()}-${counter}`;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function clearTimer(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function scheduleDismiss(toast: Toast): void {
  clearTimer(toast.id);
  if (toast.variant === "pending") return;
  const duration = toast.duration ?? DEFAULT_DURATION;
  timers.set(
    toast.id,
    setTimeout(() => dismiss(toast.id), duration),
  );
}

// === Store subscription

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Toast[] {
  return toasts;
}

function getServerSnapshot(): Toast[] {
  return EMPTY;
}

// === Mutations

function show(options: ToastOptions): string {
  const toast: Toast = {
    id: nextId(),
    title: options.title,
    description: options.description,
    variant: options.variant ?? "info",
    action: options.action,
    duration: options.duration,
  };
  toasts = [...toasts, toast];
  scheduleDismiss(toast);
  emit();
  return toast.id;
}

function update(id: string, patch: Partial<ToastOptions>): void {
  let updated: Toast | undefined;
  toasts = toasts.map((toast) => {
    if (toast.id !== id) return toast;
    updated = {
      ...toast,
      ...patch,
      variant: patch.variant ?? toast.variant,
    };
    return updated;
  });
  if (updated) scheduleDismiss(updated);
  emit();
}

function dismiss(id: string): void {
  clearTimer(id);
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

// === Public API

const api: ToastApi = { show, update, dismiss };

/* Returns a stable `{ show, update, dismiss }` — the store is a singleton. */
export function useToast(): ToastApi {
  return api;
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
