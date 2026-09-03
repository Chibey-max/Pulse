"use client";

import { useEffect, type RefObject } from "react";

/*
  Fires `onOutside` on a pointerdown outside `ref`, or on Escape. `active` gates the
  listeners so closed menus/popovers cost nothing.
*/
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  onOutside: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    const onPointerDown = (event: PointerEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onOutside();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, ref, onOutside]);
}
