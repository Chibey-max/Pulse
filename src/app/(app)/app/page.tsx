import { Reveal, Section } from "@/components/ui";
import { FaucetCard, HeroCard, SessionCard, TapeSummary } from "@/components/app";

export default function AppHomePage() {
  return (
    <Section id="app-home" spacing="tight" label="Pulse trading home">
      <Reveal stagger tight className="flex flex-col gap-6">
        {/* Renders itself only when the connected wallet holds no tUSDC. */}
        <Reveal child>
          <FaucetCard />
        </Reveal>
        <Reveal child>
          <TapeSummary />
        </Reveal>
        <Reveal child className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <HeroCard />
          <SessionCard />
        </Reveal>
      </Reveal>
    </Section>
  );
}
