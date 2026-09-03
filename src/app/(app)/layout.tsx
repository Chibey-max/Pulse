import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AmbientBackground, Footer, Navbar, Providers } from "@/components/shared";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "App",
  path: "/app",
  noIndex: true,
});

/*
  App route group. Owns the wallet stack via Providers, so nothing here may be imported
  by the (marketing) group. Same ambient system as marketing at lower intensity so the
  two read as one product.
*/
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AmbientBackground variant="subtle" />
      <Navbar />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer variant="app" />
    </Providers>
  );
}
