import type { SourceReport } from "./types.ts";

export const STATIC_UNUSED_SOURCES: SourceReport[] = [
  {
    id: "skyblock-finance",
    label: "skyblock.finance",
    role: "Supplementary prices",
    status: "unused",
    fetchedAt: null,
    detail:
      "Not queried. The host did not resolve when the desk was built, so there is no structured feed to prefer over Hypixel.",
    href: "https://skyblock.finance",
  },
  {
    id: "skyblock-bz",
    label: "skyblock.bz",
    role: "Supplementary prices",
    status: "unused",
    fetchedAt: null,
    detail:
      "Not queried at runtime. The site responds, but no public JSON API was available at the usual bazaar paths. HTML scraping is intentionally not used.",
    href: "https://www.skyblock.bz",
  },
];
