import type { Metadata } from "next";
import { JudgeMode } from "@/components/app";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Evidence Trace",
  description: "Pulse demo path and on-chain settlement evidence.",
  path: "/judge",
  noIndex: true,
});

export default function JudgePage() {
  return <JudgeMode />;
}
