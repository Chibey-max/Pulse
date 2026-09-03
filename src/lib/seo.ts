import type { Metadata } from "next";

// === Site constants

export const SITE = {
  name: "Pulse",
  tagline: "Your winnings come to you.",
  description:
    "Pulse turns a sequence of BTC and ETH Up/Down event-contract windows into one continuous, capped-risk session on Somnia. Call the next candle; validators redeem your winnings when it resolves, with no signature.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulse.somnia.network",
  author: "Pulse",
} as const;

export const BASE_KEYWORDS: readonly string[] = [
  "Pulse",
  "Somnia",
  "DreamDEX",
  "Event Contracts",
  "prediction markets",
  "Somnia Reactivity",
  "onchain settlement",
];

// === Helper

interface CreateMetadataOptions {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
}

/*
  Per-page metadata. The root layout owns the title template and every inherited field,
  so a page only declares what is genuinely its own.
*/
export function createMetadata({
  title,
  description = SITE.description,
  path = "/",
  keywords = [],
  noIndex = false,
}: CreateMetadataOptions): Metadata {
  const url = new URL(path, SITE.url).toString();

  return {
    title,
    description,
    keywords: [...BASE_KEYWORDS, ...keywords],
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE.name}`,
      description,
      url,
      siteName: SITE.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE.name}`,
      description,
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
