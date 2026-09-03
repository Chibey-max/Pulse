import type { ReactNode } from "react";
import {
  AmbientBackground,
  Footer,
  JsonLd,
  NavigationBar,
  Providers,
  ScrollProgress,
} from "@/components/shared";

/*
  Marketing route group. It uses Providers so live market widgets share the same
  testnet data path as the app. AmbientBackground owns both delegated listeners
  (pointer, scroll).
*/
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <JsonLd />
      <AmbientBackground variant="full" />
      <NavigationBar />
      <main id="main" className="flex flex-1 flex-col">
        <ScrollProgress />
        {children}
      </main>
      <Footer variant="marketing" />
    </Providers>
  );
}
