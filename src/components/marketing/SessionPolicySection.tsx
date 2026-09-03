import { Card, Section, SectionHeading } from "@/components/ui";
import { SAMPLE_SESSION } from "@/lib/sample";

// === Data

const FIELDS = [
  { label: "Budget", value: `${SAMPLE_SESSION.budget} tUSDC`, note: "Absolute maximum loss" },
  { label: "Max per window", value: `${SAMPLE_SESSION.maxPerWindow} tUSDC`, note: "Reverts above" },
  { label: "Windows", value: `${SAMPLE_SESSION.windows}`, note: "Then autopilot disarms" },
  { label: "Rule", value: SAMPLE_SESSION.rule, note: "Deterministic, stated in plain words" },
] as const;

// === Component

/*
  Session policy is set by the user at open and enforced onchain. The card states the cap
  first, always.
*/
export function SessionPolicySection() {
  return (
    <Section id="session" background="border-t border-border">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <SectionHeading
          id="session"
          eyebrow="Limits you set"
          title="The policy is the product"
          description="You pick a budget and hard limits at the start. The contract enforces them. Disarm and withdraw are always available."
        />

        <Card className="flex flex-col gap-4 p-6">
          <p className="text-caption text-text-secondary font-mono">
            {SAMPLE_SESSION.budget} budget · {SAMPLE_SESSION.maxPerWindow} max per window ·{" "}
            {SAMPLE_SESSION.windows} {SAMPLE_SESSION.pair} windows ·{" "}
            {SAMPLE_SESSION.rule.toLowerCase()}
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
          <p className="text-micro text-text-muted font-mono tracking-wider uppercase">
            Sample policy · not live performance
          </p>
        </Card>
      </div>
    </Section>
  );
}
