import { CtaLink, Faq, Section, SectionHeading } from "@/components/ui";
import { FAQS } from "@/lib/faqs";

// === Config

const PREVIEW_COUNT = 5;

// === Component

/*
  Landing preview of the FAQ. The full list lives at /faq; this shows the first few with
  a link out. FAQS is the single source of truth for both.
*/
export function FaqSection() {
  return (
    <Section id="faq" background="border-t border-border">
      <div className="flex flex-col gap-8">
        <SectionHeading
          id="faq"
          eyebrow="Questions"
          title="The parts people ask about first"
          description="Capped risk, self-custody, voided markets, and what autopilot is allowed to decide."
        />
        <Faq items={FAQS.slice(0, PREVIEW_COUNT)} />
        <CtaLink variant="secondary" href="/faq" className="self-start">
          View all questions
        </CtaLink>
      </div>
    </Section>
  );
}
