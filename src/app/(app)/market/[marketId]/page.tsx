import type { Metadata } from "next";
import { Section } from "@/components/ui";
import { HeroCard, MockBanner } from "@/components/app";
import { MarketActivity } from "./MarketActivity";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Market",
  path: "/market",
  noIndex: true,
});

export default async function MarketDetailPage({ params }: PageProps<"/market/[marketId]">) {
  const { marketId } = await params;

  return (
    <Section id="market" spacing="tight" label="Market detail">
      <div className="flex flex-col gap-6">
        <MockBanner />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <HeroCard marketId={marketId} />
          <MarketActivity marketId={marketId} />
        </div>
      </div>
    </Section>
  );
}
