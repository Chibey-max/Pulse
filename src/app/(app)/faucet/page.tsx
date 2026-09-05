import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { FaucetCard } from "@/components/app";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Faucet",
  path: "/faucet",
  noIndex: true,
});

export default function FaucetPage() {
  return (
    <Section id="faucet" spacing="tight">
      <div className="flex max-w-5xl flex-col gap-6">
        <SectionHeading
          id="faucet"
          as="h1"
          title="Faucet"
          description="A testnet funding station for Pulse. STT pays gas; tUSDC is fake collateral for calls and sessions."
        />
        <FaucetCard always />
      </div>
    </Section>
  );
}
