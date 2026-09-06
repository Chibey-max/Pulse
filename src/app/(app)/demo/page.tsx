import type { Metadata } from "next";
import { JudgeMode } from "@/components/app";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Evidence Trace",
  description: "Pulse verified on-chain settlement evidence.",
  path: "/demo",
  noIndex: true,
});

export default function DemoPage() {
  return <JudgeMode />;
}
