import { MdArrowDownward, MdOpenInNew } from "react-icons/md";
import { Card, Section, SectionHeading } from "@/components/ui";

// === Data

const ROWS = [
  {
    label: "Market settlement",
    hash: "0x9f2c...41ab",
    by: "Somnia validators",
    signed: true,
  },
  {
    label: "Winnings redeemed to your session",
    hash: "0x3d81...c0e7",
    by: "Reactivity precompile 0x0100",
    signed: false,
  },
] as const;

// === Component

/*
  The activity-tape moment: the settlement tx and the redemption tx side by side, with
  the redemption marked "no signature required". Hashes are sample design content.
*/
export function SettlementProofSection() {
  return (
    <Section id="proof" background="border-t border-border">
      <div className="flex flex-col gap-10">
        <SectionHeading
          id="proof"
          eyebrow="The proof"
          title="Two transactions. You signed neither of the second."
          description="When the window resolves, the redemption appears in your activity tape on its own hash. Sample data shown."
        />

        <Card className="divide-border flex flex-col divide-y">
          {ROWS.map((row, index) => (
            <div
              key={row.hash}
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <span className="text-body text-text-primary flex items-center gap-2">
                  {index === 1 ? (
                    <MdArrowDownward size={14} aria-hidden="true" className="text-signal" />
                  ) : null}
                  {row.label}
                </span>
                <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                  {row.by}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {row.signed ? null : (
                  <span className="rounded-pill border-signal/50 bg-signal/10 text-micro text-signal border px-2.5 py-1 font-mono tracking-wider uppercase">
                    No signature required
                  </span>
                )}
                <span className="text-caption font-mono-numbers text-text-secondary flex items-center gap-1 font-mono">
                  {row.hash}
                  <MdOpenInNew size={12} aria-hidden="true" />
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </Section>
  );
}
