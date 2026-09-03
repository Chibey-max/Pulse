import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { MockBanner } from "@/components/app";
import { MarketsGrid } from "./MarketsGrid";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Markets",
  path: "/markets",
  noIndex: true,
});

export default function MarketsPage() {
  return (
    <Section id="markets" spacing="tight">
      <div className="flex flex-col gap-6">
        <SectionHeading
          id="markets"
          as="h1"
          title="Live windows"
          description="Every BTC and ETH Up/Down window on 15m and 1h. Status and countdown lead."
        />
        <MockBanner />
        <MarketsGrid />
      </div>
    </Section>
  );
}
