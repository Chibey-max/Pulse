import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { MockBanner, SessionForm } from "@/components/app";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "New session",
  path: "/session/new",
  noIndex: true,
});

export default function NewSessionPage() {
  return (
    <Section id="session-new" spacing="tight">
      <div className="flex max-w-3xl flex-col gap-6">
        <SectionHeading
          id="session-new"
          as="h1"
          title="Open a session"
          description="Set a budget and hard limits. The contract enforces them. One confirm deploys and funds the session."
        />
        <MockBanner />
        <SessionForm />
      </div>
    </Section>
  );
}
