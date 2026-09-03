import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Privacy",
  path: "/privacy",
  description: "How the Pulse testnet application handles data.",
});

export default function PrivacyPage() {
  return (
    <Section id="privacy" spacing="loose">
      <div className="flex max-w-2xl flex-col gap-6">
        <SectionHeading id="privacy" as="h1" title="Privacy" />
        <div className="text-body text-text-secondary flex flex-col gap-4">
          <p>
            Pulse runs in your browser. It has no accounts and no server that stores personal data.
          </p>
          <p>
            Your wallet address and on-chain activity are public by nature of the blockchain. Pulse
            reads them to render your positions and tape; it does not transmit them anywhere else.
          </p>
          <p>
            Local storage is used only for lightweight preferences such as the last market, the last
            size preset, and a wallet-scoped tape cache. Clearing site data removes them.
          </p>
          <p>
            Wallet connectors (for example WalletConnect) are third-party services with their own
            privacy terms when you choose to use them.
          </p>
        </div>
      </div>
    </Section>
  );
}
