import { Card, CtaLink, Section, SectionHeading } from "@/components/ui";
import { SOMNIA_REACTIVITY_PRECOMPILE, getCollateral } from "@/lib/chain";
import { MARKET_ADAPTER_ADDRESS, SESSION_FACTORY_ADDRESS } from "@/lib/app-data/config";
import { truncateHex } from "@/lib/format";

// === Data

const FIELDS = [
  {
    label: "Factory",
    value: truncateHex(SESSION_FACTORY_ADDRESS),
    note: "Creates one session per wallet",
  },
  {
    label: "Adapter",
    value: truncateHex(MARKET_ADAPTER_ADDRESS),
    note: "Routes calls into Event Contracts",
  },
  {
    label: "Collateral",
    value: getCollateral().symbol,
    note: "Funded and withdrawn onchain",
  },
  {
    label: "Reactivity",
    value: truncateHex(SOMNIA_REACTIVITY_PRECOMPILE),
    note: "Settlement callback caller",
  },
] as const;

// === Component

/*
  Session policy is set by the user at open and enforced onchain. The card states the cap
  first, always.
*/
export function SessionPolicySection() {
  return (
    <Section id="session" panel="tint" overlap>
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <SectionHeading
          id="session"
          eyebrow="Limits you set"
          title="The policy is the product"
          description="You pick a budget and hard limits at the start. The contract enforces them. Disarm and withdraw are always available."
        />

        <Card className="flex flex-col gap-4 p-6">
          <p className="text-caption text-text-secondary font-mono">
            The values you choose in the live session form are encoded into the session policy and
            enforced by the deployed contract.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div
                key={field.label}
                className="border-border bg-bg-elevated flex flex-col gap-1 rounded-lg border p-3"
              >
                <dt className="text-micro text-text-muted font-mono tracking-wider uppercase">
                  {field.label}
                </dt>
                <dd className="text-body font-mono-numbers text-text-primary font-mono">
                  {field.value}
                </dd>
                <dd className="text-micro text-text-muted">{field.note}</dd>
              </div>
            ))}
          </dl>
          <CtaLink href="/session/new" variant="secondary">
            Configure a live session
          </CtaLink>
        </Card>
      </div>
    </Section>
  );
}
