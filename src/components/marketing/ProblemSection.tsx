import { Card, Reveal, Section, SectionHeading } from "@/components/ui";

// === Data

const SCATTERED = [
  { window: "ETH · 15m", result: "Won", amount: "+18.40" },
  { window: "BTC · 1h", result: "Won", amount: "+42.00" },
  { window: "ETH · 15m", result: "Void", amount: "+12.50" },
  { window: "ETH · 15m", result: "Won", amount: "+9.75" },
];

// === Component

/*
  The gap Pulse closes: settlement does not pay you. After a few windows the wallet looks
  empty while the P&L is scattered across finished markets you have to go find.
*/
export function ProblemSection() {
  return (
    <Section id="problem" background="border-t border-border">
      <div className="flex flex-col gap-10">
        <SectionHeading
          id="problem"
          eyebrow="The gap"
          title="Settlement does not pay you"
          description="Event contracts settle onchain, but a resolved market just leaves winnings sitting as redeemable tokens until you claim each one by hand."
        />

        <Reveal stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SCATTERED.map((entry, index) => (
            <Reveal child key={index}>
              <Card className="flex flex-col gap-2 p-4">
                <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                  {entry.window}
                </span>
                <span className="text-caption text-text-secondary">
                  {entry.result} · not claimed
                </span>
                <span className="text-body font-mono-numbers text-up font-mono">
                  {entry.amount} tUSDC
                </span>
              </Card>
            </Reveal>
          ))}
        </Reveal>

        <p className="text-body text-text-secondary max-w-2xl">
          That is not a UI complaint. It is a mechanical property of the primitive, and it is the
          single biggest drop-off in the experience. Pulse fixes it at the layer where it lives:
          onchain.
        </p>
      </div>
    </Section>
  );
}
