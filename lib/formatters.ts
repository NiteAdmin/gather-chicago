/**
 * Brand & Display Formatters
 * Ensures consistent "Actually, Let's™" brand styling and title parsing across all displays.
 */

export interface SplitTitleResult {
  brandPrefix: string;
  eventName: string;
}

/**
 * Parses an event title string to isolate the "Actually, Let's™" brand prefix
 * from the specific event name so that the brand never runs inline into the title.
 *
 * Examples:
 * - "Actually, Let’s Stretch & Sip — Moksha Yoga" -> brand: "Actually, Let's™", eventName: "Stretch & Sip — Moksha Yoga"
 * - "Actually, Let's — Chicago Gathering" -> brand: "Actually, Let's™", eventName: "Chicago Gathering"
 * - "Family Night — Pizza" -> brand: "Actually, Let's™", eventName: "Family Night — Pizza"
 * - "Morning Walk" -> brand: "Actually, Let's™", eventName: "Morning Walk"
 */
export function splitEventTitle(
  rawTitle?: string | null,
  customBrandPrefix: string = "Actually, Let's™"
): SplitTitleResult {
  if (!rawTitle) {
    return { brandPrefix: customBrandPrefix, eventName: "" };
  }

  // Remove leading variations of "Actually, Let's" with dashes, colons, quotes, or trademark symbols
  const cleaned = rawTitle
    .replace(/^actually,?\s*let['’]?s(?:\s*™|\s*\(tm\))?\s*[-—–:]*\s*/i, "")
    .trim();

  return {
    brandPrefix: customBrandPrefix,
    eventName: cleaned || rawTitle,
  };
}
