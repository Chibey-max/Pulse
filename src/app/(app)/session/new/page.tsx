import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui";
import { SessionForm } from "@/components/app";
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
          description="Set a budget and hard limits. Setup takes 3 wallet transactions: deploy, approve tUSDC, and fund the session."
        />
        <SessionForm />
      </div>
    </Section>
  );
}
