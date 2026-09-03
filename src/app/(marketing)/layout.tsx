import type { ReactNode } from "react";
import {
  AmbientBackground,
  Footer,
  JsonLd,
  NavigationBar,
  ScrollProgress,
} from "@/components/shared";

/*
  Marketing route group. No wagmi or wallet code, so the landing page never ships the
  wallet stack. AmbientBackground owns both delegated listeners (pointer, scroll).
*/
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd />
      <AmbientBackground variant="full" />
      <NavigationBar />
      <main id="main" className="flex flex-1 flex-col">
        <ScrollProgress />
        {children}
      </main>
      <Footer variant="marketing" />
    </>
  );
}
