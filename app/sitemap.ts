import type { MetadataRoute } from "next";
import { SWAP_PAIRS } from "@/lib/pairs";

const BASE_URL = "https://www.dexifier.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = ["", "/about", "/support"].map(
    (path) => ({
      url: `${BASE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: path === "" ? 1 : 0.6,
    }),
  );

  const pairRoutes: MetadataRoute.Sitemap = SWAP_PAIRS.map((p) => ({
    url: `${BASE_URL}/swap/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...pairRoutes];
}
