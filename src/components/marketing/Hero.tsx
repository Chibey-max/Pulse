import { CtaLink, Reveal, Section } from "@/components/ui";
import { LiveWindowCard } from "@/components/marketing/LiveWindowCard";
import { scaleIn } from "@/lib/motion";
import { SITE } from "@/lib/seo";

// === Component

/*
  The hero thesis is the live window itself: the headline sits beside a read-only window
  module so a visitor understands the product with no wallet connected. The copy cascades
  in line by line; the window card settles in from a slightly different angle so the two
  columns feel composed rather than dropped.
*/
export function Hero() {
  return (
    <Section id="hero" fullHeight spacing="loose" label="Pulse introduction">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Reveal stagger amount={0.2} className="flex flex-col gap-6">
          <Reveal child>
            <p className="text-micro text-signal font-mono tracking-[0.2em] uppercase">
              Pulse · Session Layer for DreamDEX Event Contracts
            </p>
          </Reveal>
          <Reveal child>
            <h1 className="font-display text-display text-text-primary max-w-2xl font-semibold text-balance">
              {SITE.tagline}
            </h1>
          </Reveal>
          <Reveal child>
            <p className="text-lead text-text-secondary max-w-xl text-pretty">
              Trade BTC or ETH Up/Down windows with capped risk, then use session vaults and Somnia
              Reactivity to keep settlement tied to on-chain proof.
            </p>
          </Reveal>
          <Reveal child className="flex flex-wrap items-center gap-3">
            <CtaLink variant="primary" size="lg" href="/app">
              Open app
            </CtaLink>
            <CtaLink variant="secondary" size="lg" href="/#how-it-works">
              See how it works
            </CtaLink>
          </Reveal>
          <Reveal child>
            <p className="text-micro text-text-muted font-mono tracking-wider uppercase">
              Somnia Shannon testnet · DreamDEX markets · user-owned sessions
            </p>
          </Reveal>
        </Reveal>

        <Reveal variants={scaleIn} amount={0.2}>
          <LiveWindowCard />
        </Reveal>
      </div>
    </Section>
  );
}
