import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Terms",
  path: "/terms",
  description: "Terms of use for the Pulse testnet application.",
});

export default function TermsPage() {
  return (
    <Section id="terms" spacing="loose">
      <div className="flex max-w-2xl flex-col gap-6">
        <SectionHeading id="terms" as="h1" title="Terms of use" />
        <div className="text-body text-text-secondary flex flex-col gap-4">
          <p>
            Pulse is a non-custodial interface to DreamDEX Event Contracts on the Somnia Shannon
            testnet. It is provided as is, for evaluation, with no warranty.
          </p>
          <p>
            Testnet collateral (tUSDC) has no monetary value. Pulse does not custody funds, does not
            execute trades on your behalf outside the limits you set onchain, and makes no
            representation about outcomes. You can only lose the stake you commit.
          </p>
          <p>
            You are responsible for the security of your wallet and for complying with the laws that
            apply to you. Do not use Pulse where prohibited.
          </p>
          <p>
            This is a hackathon build. Terms may change without notice while it is under active
            development.
          </p>
        </div>
      </div>
    </Section>
  );
}
