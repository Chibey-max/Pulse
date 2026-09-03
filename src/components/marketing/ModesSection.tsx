import { MdAccountBalanceWallet, MdVerifiedUser } from "react-icons/md";
import { Card, Reveal, Section, SectionHeading } from "@/components/ui";

// === Data

const MODES = [
  {
    key: "direct",
    icon: MdAccountBalanceWallet,
    name: "Direct mode",
    summary: "Positions stay in your own wallet.",
    points: [
      "Call with size presets, marketable and IOC by default",
      "Claim all across every redeemable market in one confirm",
      "Nothing new to deploy",
    ],
  },
  {
    key: "session",
    icon: MdVerifiedUser,
    name: "Session mode",
    summary: "A per-user vault you own and only you can withdraw from.",
    points: [
      "Deposit a budget and set hard limits enforced onchain",
      "Validators redeem winnings on settlement, no signature",
      "Disarm or withdraw at any time, never blocked by policy",
    ],
  },
] as const;

// === Component

export function ModesSection() {
  return (
    <Section id="modes" panel="tint-signal" overlap>
      <div className="flex flex-col gap-10">
        <SectionHeading
          id="modes"
          eyebrow="Two modes, one instrument"
          title="Keep custody in your wallet, or in a vault you control"
          description="Both settle onchain. The difference is where positions sit and whether redemption needs you."
        />

        <Reveal stagger className="grid gap-4 lg:grid-cols-2">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Reveal child key={mode.key}>
                <Card className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-center gap-3">
                    <span className="bg-bg-elevated text-signal flex size-9 items-center justify-center rounded-md">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-h3 text-text-primary font-semibold">
                      {mode.name}
                    </h3>
                  </div>
                  <p className="text-body text-text-secondary">{mode.summary}</p>
                  <ul className="flex flex-col gap-2">
                    {mode.points.map((point) => (
                      <li key={point} className="text-caption text-text-secondary flex gap-2">
                        <span aria-hidden="true" className="text-up font-mono">
                          &rarr;
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            );
          })}
        </Reveal>
      </div>
    </Section>
  );
}
