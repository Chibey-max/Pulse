import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The app is a wallet-gated instrument with nothing to rank for.
      disallow: ["/app", "/markets", "/market/", "/positions", "/activity", "/session/"],
    },
    sitemap: new URL("/sitemap.xml", SITE.url).toString(),
  };
}
