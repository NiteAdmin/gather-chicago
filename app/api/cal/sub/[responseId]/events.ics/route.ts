import { fetchBroadcasts, getResponseById } from "@/lib/firebase";
import { formatIsoForCalendar, parseEventDates } from "@/lib/calendar";

export async function GET(
  request: Request,
  context: { params: Promise<{ responseId: string }> }
) {
  try {
    const { responseId } = await context.params;

    // 1. Resolve respondent document if available
    let respondent = null;
    if (responseId && responseId !== "sample" && responseId !== "default") {
      respondent = await getResponseById(responseId);
    }

    const citySlug = (respondent?.city || "chicago").toLowerCase();
    const cityName =
      respondent?.cityName ||
      citySlug.charAt(0).toUpperCase() + citySlug.slice(1);

    // 2. Fetch latest broadcast for the city
    const broadcasts = await fetchBroadcasts(citySlug);
    const latestBroadcast = broadcasts.length > 0 ? broadcasts[0] : null;

    let summary = `Actually, Let's — ${cityName} Community Gathering`;
    let location = `${cityName} (Venue TBD)`;
    let description = "";
    let status = "TENTATIVE";
    let sequence = 0;
    let startIso: string;
    let endIso: string;

    const broadcastEventUrl = latestBroadcast?.eventUrl || latestBroadcast?.ticketUrl;

    if (latestBroadcast) {
      // Broadcast announced: Locked confirmed date & venue
      status = "CONFIRMED";
      sequence = 1;
      const winningDate = latestBroadcast.winningDate;
      const timeWindow = latestBroadcast.timeWindow || "10:00 AM – 12:00 PM CDT";
      const cleanVenueName = latestBroadcast.venueName?.trim() || "";
      const cleanVenueAddress = latestBroadcast.venueAddress?.trim() || "";
      const hasVenue = Boolean(cleanVenueName || cleanVenueAddress);
      const venueParts = [cleanVenueName, cleanVenueAddress].filter(Boolean);
      location = hasVenue ? venueParts.join(", ") : cityName;

      const rsvpPrefix = broadcastEventUrl ? `Event details & RSVP: ${broadcastEventUrl}\n\n` : "";
      const venueLine = hasVenue ? `\nVenue: ${venueParts.join(" - ")}` : "";
      description = `${rsvpPrefix}Official locked community gathering!\n\nDate: ${winningDate} (${timeWindow})${venueLine}`;
      if (latestBroadcast.customNote) {
        description += `\n\nHost Note: "${latestBroadcast.customNote}"`;
      }
      if (broadcastEventUrl) {
        description += `\n\nTickets / RSVP Link: ${broadcastEventUrl}`;
      }

      const parsed = parseEventDates({
        cityName,
        dates: [winningDate],
        times: [timeWindow],
      });
      startIso = parsed.startIso;
      endIso = parsed.endIso;
    } else {
      // Pending vote: Tentative placeholder based on respondent's preferences
      status = "TENTATIVE";
      sequence = 0;
      summary = `Actually, Let's — ${cityName} (Voting in Progress)`;
      description = `Community survey responses are currently being tallied. This live calendar entry will automatically update with the winning date, locked time, and venue as soon as they are announced!`;

      const parsed = parseEventDates({
        cityName,
        dates: respondent?.dates || [],
        times: respondent?.times || [],
        customDate: respondent?.customDate || null,
        customTime: respondent?.customTime || null,
      });
      startIso = parsed.startIso;
      endIso = parsed.endIso;
    }

    const escapeIcs = (str: string) =>
      (str || "")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r\n|\r|\n/g, "\\n");

    const nowIso = formatIsoForCalendar(new Date());
    const uid = `actuallylets-${responseId || "schedule"}-${citySlug}@actuallylets.com`;
    const cleanStartIso = startIso.endsWith('Z') ? startIso : `${startIso}Z`;
    const cleanEndIso = endIso.endsWith('Z') ? endIso : `${endIso}Z`;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Actually Lets//Live Gathering Webcal//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeIcs("Actually Let's " + cityName)}`,
      "X-WR-TIMEZONE:America/Chicago",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      "X-PUBLISHED-TTL:PT1H",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowIso}`,
      `SEQUENCE:${sequence}`,
      `DTSTART:${cleanStartIso}`,
      `DTEND:${cleanEndIso}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `LOCATION:${escapeIcs(location)}`,
      ...(broadcastEventUrl ? [`URL:${escapeIcs(broadcastEventUrl)}`] : []),
      `STATUS:${status}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Disposition": 'inline; filename="actuallylets-schedule.ics"',
      },
    });
  } catch (error: any) {
    console.error("Webcal feed generation error:", error);
    return new Response("Error generating calendar feed", { status: 500 });
  }
}
