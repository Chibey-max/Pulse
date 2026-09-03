import { MdBlock, MdVpnKey, MdLink, MdLockOpen } from "react-icons/md";
import { Reveal, Section, SectionHeading } from "@/components/ui";

// === Data

const GUARANTEES = [
  {
    icon: MdVpnKey,
    title: "Self-controlled funds",
    body: "No path in the contract moves value to anyone but you.",
  },
  {
    icon: MdLockOpen,
    title: "Withdrawals never locked",
    body: "Disarm or withdraw mid-window, after expiry, at any point in a run.",
  },
  {
    icon: MdLink,
    title: "Every action is a hash",
    body: "Placed, filled, settled, redeemed, rolled, withdrawn. Each links to the explorer.",
  },
  {
    icon: MdBlock,
    title: "No keeper bot",
    body: "No polling service, no cron, no backend. Settlement runs onchain.",
  },
] as const;

// === Component

export function TrustSection() {
  return (
    <Section id="security" background="border-t border-border">
      <div className="flex flex-col gap-10">
        <SectionHeading
          id="security"
          eyebrow="Security and control"
          title="Technical proof is the social proof"
          description="No testimonials, no volume numbers, no partner logos. What Pulse claims maps to a contract, a tx hash, or a passing test."
        />

        <Reveal stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map((item) => {
            const Icon = item.icon;
            return (
              <Reveal child key={item.title}>
                <div className="border-border bg-bg-panel flex h-full flex-col gap-2 rounded-lg border p-4">
                  <span className="bg-bg-elevated text-up flex size-8 items-center justify-center rounded-md">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <h3 className="text-body text-text-primary font-medium">{item.title}</h3>
                  <p className="text-caption text-text-secondary">{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </Reveal>
      </div>
    </Section>
  );
}
