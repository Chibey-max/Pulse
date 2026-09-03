"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/*
  Dark by default, OS preference deliberately ignored (`enableSystem={false}`), so the
  ThemeToggle is the only thing that ever changes theme. `attribute="class"` makes
  next-themes add `dark` / `light` to <html>, which the token blocks in globals.css and
  the `dark:` custom variant both key off.
*/
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark", "light"]}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
