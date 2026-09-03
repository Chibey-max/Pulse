import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// === cn

/*
  Merge conditional class lists and let later Tailwind utilities win over earlier ones,
  so a component's base classes can always be overridden by a `className` prop without
  specificity fights.
*/
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
