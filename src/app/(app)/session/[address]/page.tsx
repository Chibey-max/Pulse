import type { Metadata } from "next";
import { Card, Section, SectionHeading } from "@/components/ui";
import { MockBanner } from "@/components/app";
import { SETTLEMENT_PROOF, SESSION_POLICY_VIEW } from "./data";
import { truncateHex } from "@/lib/format";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Session",
  path: "/session",
  noIndex: true,
});

export default async function SessionProofPage({ params }: PageProps<"/session/[address]">) {
  const { address } = await params;

  return (
    <Section id="session-proof" spacing="tight" label="Public session proof">
      <div className="flex max-w-3xl flex-col gap-6">
        <SectionHeading
          id="session-proof"
          as="h1"
          eyebrow="Public proof surface"
          title={`Session ${truncateHex(address)}`}
          description="Read-only. Shows the policy, the balance, the window history, and which actions required no signature."
        />
        <MockBanner />

        <Card className="grid gap-3 p-6 sm:grid-cols-2">
          {SESSION_POLICY_VIEW.map((field) => (
            <div
              key={field.label}
              className="border-border bg-bg-elevated flex flex-col gap-1 rounded-lg border p-3"
            >
              <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                {field.label}
              </span>
              <span className="text-body font-mono-numbers text-text-primary font-mono">
                {field.value}
              </span>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
            Window history
          </span>
          <ul className="divide-border flex flex-col divide-y">
            {SETTLEMENT_PROOF.map((row) => (
              <li key={row.txHash} className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption text-text-primary">{row.action}</span>
                  <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                    {row.by}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {row.signed ? (
                    <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                      signed
                    </span>
                  ) : (
                    <span className="rounded-pill border-signal/50 bg-signal/10 text-micro text-signal border px-2.5 py-1 font-mono tracking-wider uppercase">
                      no signature
                    </span>
                  )}
                  <span className="text-micro font-mono-numbers text-text-secondary font-mono">
                    {truncateHex(row.txHash)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Section>
  );
}
