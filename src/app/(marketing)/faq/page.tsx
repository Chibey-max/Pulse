import type { Metadata } from "next";
import { Faq, Section, SectionHeading } from "@/components/ui";
import { FAQS } from "@/lib/faqs";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "FAQ",
  path: "/faq",
  description:
    "Event contracts, capped risk, self-custody, voided markets, autopilot rules, and why Pulse is testnet only.",
});

export default function FaqPage() {
  return (
    <Section id="faq" spacing="loose">
      <div className="flex flex-col gap-8">
        <SectionHeading
          id="faq"
          as="h1"
          eyebrow="Reference"
          title="Frequently asked questions"
          description="Everything a first-time visitor and a hackathon judge tends to ask, answered against the product spec."
        />
        <Faq items={FAQS} defaultOpen={null} />
      </div>
    </Section>
  );
}
