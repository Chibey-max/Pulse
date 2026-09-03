import { CtaLink, Section } from "@/components/ui";
import { WindowCard } from "@/components/marketing/WindowCard";
import { SAMPLE_WINDOW } from "@/lib/sample";

// === Component

/*
  Closes the page back on the live-window decision it opened with.
*/
export function FinalCtaSection() {
  return (
    <Section id="start" panel="deep" overlap spacing="loose">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="font-display text-h1 text-text-primary max-w-xl font-semibold text-balance">
            The best interaction is the one you never have to perform
          </h2>
          <p className="text-lead text-text-secondary max-w-lg">
            Connect on Somnia Shannon testnet, call the next candle, and let settlement pay you.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <CtaLink variant="primary" size="lg" href="/app">
              Open app
            </CtaLink>
            <CtaLink variant="secondary" size="lg" href="/faq">
              Read the FAQ
            </CtaLink>
          </div>
        </div>
        <WindowCard market={SAMPLE_WINDOW} sample />
      </div>
    </Section>
  );
}
