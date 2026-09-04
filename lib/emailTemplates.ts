import { generateGoogleCalendarUrl, parseEventDates } from "@/lib/calendar";

export interface WinningDateEmailParams {
  name: string;
  cityName?: string;
  winningDate: string;
  timeWindow?: string;
  venueName?: string | null;
  venueAddress?: string | null;
  ticketUrl?: string;
  customNote?: string;
}

export interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

function renderLocationHtml(venueName: string, venueAddress: string, mapsUrl: string | null): string {
  const hasVenue = Boolean(venueName?.trim() || venueAddress?.trim());
  if (!hasVenue) {
    return "";
  }

  const cleanVenueName = venueName?.trim();
  const cleanVenueAddress = venueAddress?.trim();

  if (cleanVenueName && !cleanVenueAddress) {
    return `
      <div style="margin-top: 12px; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 18px;">📍</span>
        <div>
          <strong style="display: block; font-size: 15px; color: #2B271F;">${cleanVenueName}</strong>
        </div>
      </div>
    `;
  }

  if (!cleanVenueName && cleanVenueAddress) {
    return `
      <div style="margin-top: 12px; display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 18px;">📍</span>
        <div>
          <a href="${mapsUrl || '#'}" target="_blank" style="font-size: 13px; color: #C8643F; text-decoration: underline;">
            ${cleanVenueAddress} &rarr; (Open in Google Maps)
          </a>
        </div>
      </div>
    `;
  }

  return `
    <div style="margin-top: 12px; display: flex; align-items: flex-start; gap: 10px;">
      <span style="font-size: 18px;">📍</span>
      <div>
        <strong style="display: block; font-size: 15px; color: #2B271F;">${cleanVenueName}</strong>
        <a href="${mapsUrl || '#'}" target="_blank" style="font-size: 13px; color: #C8643F; text-decoration: underline;">
          ${cleanVenueAddress} &rarr; (Open in Google Maps)
        </a>
      </div>
    </div>
  `;
}

/**
 * 1. Group A Template: Attendees who voted for the winning date or "Any date".
 */
export function generateWinningDateEmailGroupA(params: WinningDateEmailParams): EmailTemplateResult {
  const city = params.cityName || "Chicago";
  const name = params.name.trim() || "there";
  const winningDate = params.winningDate.trim();
  const timeWindow = params.timeWindow?.trim() || "10:00 AM – 12:00 PM CDT";
  const venueName = params.venueName?.trim() || "";
  const venueAddress = params.venueAddress?.trim() || "";
  const hasVenue = Boolean(params.venueName?.trim() || params.venueAddress?.trim());
  const ticketUrl = params.ticketUrl?.trim();
  const customNote = params.customNote?.trim();

  const mapsSearchQuery = `${venueName} ${venueAddress}`.trim();
  const mapsUrl = mapsSearchQuery ? `https://maps.google.com/?q=${encodeURIComponent(mapsSearchQuery)}` : null;

  // Parse calendar dates for Google Calendar 1-click button
  const { startIso, endIso } = parseEventDates({
    cityName: city,
    dates: [winningDate],
    times: [timeWindow],
  });

  const calLocation = hasVenue
    ? (venueName ? (venueAddress ? `${venueName}, ${venueAddress}` : venueName) : venueAddress)
    : city;

  const googleCalUrl = generateGoogleCalendarUrl({
    title: `Actually, Let's — ${city} Gathering`,
    description: `Confirmed community gathering in ${city}.${hasVenue ? `\nLocation: ${venueName ? (venueAddress ? `${venueName} (${venueAddress})` : venueName) : venueAddress}` : ""}${customNote ? `\n\nHost Note: "${customNote}"` : ""}${ticketUrl ? `\n\nTicket / RSVP Link: ${ticketUrl}` : ""}`,
    location: calLocation,
    startIso,
    endIso,
  });

  const subject = `We've Locked in the Date! See You at Actually, Let's — ${city}`;

  const hostNoteHtml = customNote
    ? `<div style="background-color: #EDE4D3; border: 1px solid #D8CEBC; padding: 14px 18px; border-radius: 12px; font-size: 14px; color: #2B271F; margin: 18px 0; font-style: italic; line-height: 1.5;">
        &ldquo;${customNote}&rdquo;
        <div style="font-style: normal; font-weight: 700; font-size: 12px; color: #6E7F5E; margin-top: 6px;">— Host Note</div>
      </div>`
    : "";

  const ticketButtonHtml = ticketUrl
    ? `<div style="text-align: center; margin: 16px 0;">
        <a
          href="${ticketUrl}"
          target="_blank"
          style="display: inline-block; background-color: #c25e3e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0; font-size: 14px; box-shadow: 0 4px 12px rgba(194, 94, 62, 0.35);"
        >
          RSVP &amp; Claim Your Spot &rarr;
        </a>
      </div>`
    : "";

  const locationHtml = renderLocationHtml(venueName, venueAddress, mapsUrl);

  const html = `
    <div style="background-color: #FBF7EE; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2B271F;">
      <div style="max-width: 580px; margin: 0 auto;">
        
        <!-- Brand Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; letter-spacing: -0.5px;">Actually, Let&apos;s</h1>
          <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: #C8643F; letter-spacing: 0.5px;">Community Gathering · ${city}</p>
        </div>

        <!-- Main Card -->
        <div style="background-color: #FFFFFF; border: 1px solid #E6DEC8; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 16px rgba(43, 39, 31, 0.05);">
          
          <div style="text-align: center; border-bottom: 1px solid #EFEAD8; padding-bottom: 20px; margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6E7F5E; display: block; margin-bottom: 6px;">
              🎉 WINNING DATE CONFIRMED
            </span>
            <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; margin: 0; line-height: 1.25;">
              Hi ${name}, we&apos;re doing this! 🌿
            </h2>
            <p style="font-size: 14px; line-height: 1.5; color: #6A6253; margin: 10px 0 0;">
              The community has spoken! Your vote helped pick our official date for Actually, Let&apos;s ${city}.
            </p>
          </div>

          <!-- Event Details Elevated Card -->
          <div style="background-color: #F4EEE2; border: 1.5px solid #D8CEBC; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 18px;">📅</span>
              <div>
                <strong style="display: block; font-size: 15px; color: #2B271F;">${winningDate}</strong>
                <span style="font-size: 13px; color: #6A6253;">${timeWindow}</span>
              </div>
            </div>

            ${locationHtml}
          </div>

          ${hostNoteHtml}

          ${ticketButtonHtml}

          <!-- Add to Calendar Button Section -->
          <div style="text-align: center; margin: 20px 0 16px; padding: 18px; background-color: #FBF7EE; border: 1px solid #E6DEC8; border-radius: 12px;">
            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #4C5A40;">
              Add this gathering to your calendar:
            </p>
            <a
              href="${googleCalUrl}"
              target="_blank"
              style="display: inline-block; background-color: #4C5A40; color: #FFFFFF; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-weight: bold; font-size: 13px; box-shadow: 0 3px 8px rgba(76, 90, 64, 0.3);"
            >
              📅 Add to Google Calendar
            </a>
          </div>

          <div style="background-color: #FAF7F2; border: 1px solid #E6DEC8; border-radius: 12px; padding: 14px 16px; margin-top: 18px; font-size: 13px; color: #6A6253; line-height: 1.45;">
            <strong>What to bring:</strong> Comfortable clothing for stretching, a yoga mat or blanket if you have one, and your favorite hydration or morning beverage!
          </div>

        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #8C8270; line-height: 1.5;">
          <p style="margin: 0 0 4px; font-weight: 500;">
            Actually, Let&apos;s &bull; ${city === "Chicago" ? "Chicago, IL" : city} &bull; <a href="mailto:admin@actuallylets.com" style="color: #C8643F; text-decoration: underline;">rsvp@actuallylets.com</a>
          </p>
          <p style="margin: 0;">
            A portion of every ticket supports local community building and sustainability nonprofits.
          </p>
        </div>

      </div>
    </div>
  `;

  const whereText = hasVenue
    ? (venueName
        ? (venueAddress ? `\nWhere: ${venueName} - ${venueAddress}${mapsUrl ? `\nGoogle Maps: ${mapsUrl}` : ''}` : `\nWhere: ${venueName}`)
        : `\nWhere: ${venueAddress}${mapsUrl ? `\nGoogle Maps: ${mapsUrl}` : ''}`)
    : "";

  const text = `Actually, Let's — ${city}\nWinning Date Confirmed!\n\nHi ${name},\n\nWe've locked in the date for our upcoming gathering!\n\nWhen: ${winningDate} (${timeWindow})${whereText}\n${customNote ? `\nHost Note: "${customNote}"\n` : ""}${ticketUrl ? `\nRSVP / Tickets: ${ticketUrl}\n` : ""}\nAdd to Google Calendar:\n${googleCalUrl}\n\nActually, Let's • ${city} • rsvp@actuallylets.com`;

  return { subject, html, text };
}

/**
 * 2. Group B Template: Attendees who voted only for alternate dates.
 */
export function generateWinningDateEmailGroupB(params: WinningDateEmailParams): EmailTemplateResult {
  const city = params.cityName || "Chicago";
  const name = params.name.trim() || "there";
  const winningDate = params.winningDate.trim();
  const timeWindow = params.timeWindow?.trim() || "10:00 AM – 12:00 PM CDT";
  const venueName = params.venueName?.trim() || "";
  const venueAddress = params.venueAddress?.trim() || "";
  const hasVenue = Boolean(params.venueName?.trim() || params.venueAddress?.trim());
  const ticketUrl = params.ticketUrl?.trim();
  const customNote = params.customNote?.trim();

  const mapsSearchQuery = `${venueName} ${venueAddress}`.trim();
  const mapsUrl = mapsSearchQuery ? `https://maps.google.com/?q=${encodeURIComponent(mapsSearchQuery)}` : null;

  const subject = `Actually, Let's ${city} — Gathering Date Update`;

  const hostNoteHtml = customNote
    ? `<div style="background-color: #EDE4D3; border: 1px solid #D8CEBC; padding: 14px 18px; border-radius: 12px; font-size: 14px; color: #2B271F; margin: 18px 0; font-style: italic; line-height: 1.5;">
        &ldquo;${customNote}&rdquo;
      </div>`
    : "";

  const ticketSectionHtml = ticketUrl
    ? `<div style="text-align: center; margin: 20px 0;">
        <p style="font-size: 13px; color: #6A6253; margin-bottom: 10px;">If your schedule opens up, we&apos;d still love to have you:</p>
        <a
          href="${ticketUrl}"
          target="_blank"
          style="display: inline-block; background-color: #c25e3e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 13px; margin: 12px 0; box-shadow: 0 4px 12px rgba(194, 94, 62, 0.3);"
        >
          RSVP &amp; Claim Your Spot &rarr;
        </a>
      </div>`
    : "";

  const locationHtml = renderLocationHtml(venueName, venueAddress, mapsUrl);

  const html = `
    <div style="background-color: #FBF7EE; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2B271F;">
      <div style="max-width: 580px; margin: 0 auto;">
        
        <!-- Brand Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; letter-spacing: -0.5px;">Actually, Let&apos;s</h1>
          <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: #C8643F; letter-spacing: 0.5px;">Community Gathering · ${city}</p>
        </div>

        <!-- Main Card -->
        <div style="background-color: #FFFFFF; border: 1px solid #E6DEC8; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 16px rgba(43, 39, 31, 0.05);">
          
          <div style="text-align: center; border-bottom: 1px solid #EFEAD8; padding-bottom: 20px; margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #C8643F; display: block; margin-bottom: 6px;">
              GATHERING UPDATE
            </span>
            <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; margin: 0; line-height: 1.25;">
              Hi ${name}, here&apos;s our upcoming date! 🌿
            </h2>
            <p style="font-size: 14px; line-height: 1.5; color: #6A6253; margin: 10px 0 0;">
              Thank you so much for taking our community survey! While the community vote landed on a date you didn&apos;t select, we wanted to share the final details with you.
            </p>
          </div>

          <!-- Event Details Elevated Card -->
          <div style="background-color: #F4EEE2; border: 1.5px solid #D8CEBC; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 18px;">📅</span>
              <div>
                <strong style="display: block; font-size: 15px; color: #2B271F;">${winningDate}</strong>
                <span style="font-size: 13px; color: #6A6253;">${timeWindow}</span>
              </div>
            </div>

            ${locationHtml}
          </div>

          ${hostNoteHtml}

          ${ticketSectionHtml}

        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #8C8270; line-height: 1.5;">
          <p style="margin: 0 0 4px; font-weight: 500;">
            Actually, Let&apos;s &bull; ${city === "Chicago" ? "Chicago, IL" : city} &bull; <a href="mailto:admin@actuallylets.com" style="color: #C8643F; text-decoration: underline;">rsvp@actuallylets.com</a>
          </p>
          <p style="margin: 0;">
            A portion of every ticket supports local community building and sustainability nonprofits.
          </p>
        </div>

      </div>
    </div>
  `;

  const whereText = hasVenue
    ? (venueName
        ? (venueAddress ? `\nWhere: ${venueName} - ${venueAddress}${mapsUrl ? `\nGoogle Maps: ${mapsUrl}` : ''}` : `\nWhere: ${venueName}`)
        : `\nWhere: ${venueAddress}${mapsUrl ? `\nGoogle Maps: ${mapsUrl}` : ''}`)
    : "";

  const text = `Actually, Let's — ${city}\nGathering Date Update\n\nHi ${name},\n\nThank you for voting in our survey! The community selected ${winningDate} for our upcoming gathering.\n\nWhen: ${winningDate} (${timeWindow})${whereText}\n${customNote ? `\nHost Note: "${customNote}"\n` : ""}${ticketUrl ? `\nDetails & Tickets: ${ticketUrl}\n` : ""}\nActually, Let's • ${city} • rsvp@actuallylets.com`;

  return { subject, html, text };
}
