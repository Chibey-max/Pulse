"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = (): (() => void) => () => {};

/*
  False during SSR and the first client render, true afterwards. The hydration-safe way
  to gate UI that must not differ between server and client (theme icon, portal targets)
  without a setState-in-effect.
*/
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
