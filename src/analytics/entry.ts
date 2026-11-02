import type { EventProperties } from "./schema";

type EntrySource = EventProperties<"onboarding.started">["entry_source"];

const PAID_MEDIUMS = ["cpc", "ppc", "paid", "paid_social", "paidsocial", "display"];
const SEARCH_ENGINES = ["google.", "bing.", "duckduckgo.", "yahoo.", "ecosia."];

/**
 * Classifies where a session came from without sending raw campaign strings.
 * Only the category and whether UTM parameters were present are tracked.
 */
export function entrySource(url: URL, referrer: string): { entry_source: EntrySource; has_utm: boolean } {
  const utmKeys = [...url.searchParams.keys()].filter((key) => key.startsWith("utm_"));
  const has_utm = utmKeys.length > 0;
  const medium = url.searchParams.get("utm_medium")?.toLowerCase() ?? "";

  if (PAID_MEDIUMS.includes(medium)) return { entry_source: "paid", has_utm };

  let referrerHost = "";
  try {
    referrerHost = referrer ? new URL(referrer).hostname : "";
  } catch {
    referrerHost = "";
  }
  if (referrerHost && referrerHost !== url.hostname) {
    const isSearch = SEARCH_ENGINES.some((engine) => referrerHost.includes(engine));
    return { entry_source: isSearch ? "organic" : "referral", has_utm };
  }

  if (has_utm) return { entry_source: "other", has_utm };
  return { entry_source: "direct", has_utm };
}
