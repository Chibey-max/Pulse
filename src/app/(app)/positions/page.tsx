import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { ClaimPanel, PositionsList } from "@/components/app";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Positions",
  path: "/positions",
  noIndex: true,
});

export default function PositionsPage() {
  return (
    <Section id="positions" spacing="tight">
      <div className="flex flex-col gap-6">
        <SectionHeading
          id="positions"
          as="h1"
          title="Positions"
          description="Wallet-held and session-held, across open, locked, unclaimed, and claimed."
        />
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <PositionsList />
          <div className="flex flex-col gap-2">
            <h2 className="text-micro text-text-muted font-mono tracking-wider uppercase">
              Claim all (direct mode)
            </h2>
            <ClaimPanel />
          </div>
        </div>
      </div>
    </Section>
  );
}
