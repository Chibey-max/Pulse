import type { Metadata } from "next";
import { Card, Section, SectionHeading } from "@/components/ui";
import { ActivityTape } from "@/components/app";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Activity",
  path: "/activity",
  noIndex: true,
});

export default function ActivityPage() {
  return (
    <Section id="activity" spacing="tight">
      <div className="flex flex-col gap-6">
        <SectionHeading
          id="activity"
          as="h1"
          title="Activity"
          description="Placed, filled, cancelled, locked, resolved, auto-claimed, auto-rolled, withdrawn. Handler rows include their own tx hash."
        />
        <Card className="px-5">
          <ActivityTape />
        </Card>
      </div>
    </Section>
  );
}
