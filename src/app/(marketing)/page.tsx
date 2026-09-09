import type { Metadata } from "next";
import {
  FaqSection,
  FinalCtaSection,
  Hero,
  ModesSection,
  ProblemSection,
  PulseTimeline,
  SessionPolicySection,
  SettlementProofSection,
  TrustSection,
} from "@/components/marketing";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Session Layer for DreamDEX Event Contracts",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <PulseTimeline />
      <ModesSection />
      <SessionPolicySection />
      <SettlementProofSection />
      <TrustSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
