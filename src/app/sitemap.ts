import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/*
  Only the public marketing surface is indexable. Every /app route is behind a wallet
  connection and carries `robots: noIndex` in its own metadata.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  ): MetadataRoute.Sitemap[number] => ({
    url: new URL(path, SITE.url).toString(),
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    entry("/", 1, "weekly"),
    entry("/faq", 0.7, "monthly"),
    entry("/terms", 0.2, "yearly"),
    entry("/privacy", 0.2, "yearly"),
  ];
}
