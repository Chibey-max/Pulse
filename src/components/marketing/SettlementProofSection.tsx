import { MdArrowForward } from "react-icons/md";
import { Card, CtaLink, Section, SectionHeading } from "@/components/ui";

// === Component

/*
  The activity-tape moment: the settlement tx and the redemption tx side by side. The
  live activity feed carries the actual testnet hashes after a connected wallet has
  activity.
*/
export function SettlementProofSection() {
  return (
    <Section id="proof" panel="deep" overlap>
      <div className="flex flex-col gap-10">
        <SectionHeading
          id="proof"
          eyebrow="The proof"
          title="Every automatic claim needs a hash"
          description="When a handler redemption is observed, it appears in your activity tape on its own explorer hash. No marketing hashes are fabricated."
        />

        <Card className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-body text-text-primary flex items-center gap-2">
              Live activity appears after wallet connection
              <MdArrowForward size={14} aria-hidden="true" className="text-signal" />
            </span>
            <span className="text-caption text-text-secondary">
              The app activity tape reads indexed testnet order history and session-triggered rows
              for the connected wallet.
            </span>
          </div>
          <CtaLink href="/activity" variant="secondary" className="shrink-0">
            Open live activity
          </CtaLink>
        </Card>
      </div>
    </Section>
  );
}
