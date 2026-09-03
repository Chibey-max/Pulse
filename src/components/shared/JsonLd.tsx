import { SITE } from "@/lib/seo";
import { GITHUB_URL } from "@/lib/nav";

/*
  Structured data for the marketing pages. Rendered as a script tag with JSON content,
  which React passes through untouched when it is the only child and typed as a string.
*/

const graph = [
  {
    "@type": "Organization",
    "@id": `${SITE.url}#org`,
    name: SITE.name,
    url: SITE.url,
    sameAs: [GITHUB_URL],
  },
  {
    "@type": "WebSite",
    "@id": `${SITE.url}#site`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { "@id": `${SITE.url}#org` },
  },
  {
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: SITE.description,
  },
];

export function JsonLd() {
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });

  return (
    <script
      type="application/ld+json"
      // Server-rendered from a constant, no user input.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
