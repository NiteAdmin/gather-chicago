import { generateGoogleCalendarUrl, parseEventDates } from "@/lib/calendar";

export interface WinningDateEmailParams {
  name: string;
  cityName?: string;
  winningDate: string;
  timeWindow?: string;
  venueName: string;
  venueAddress: string;
  ticketUrl?: string;
  customNote?: string;
}

export interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

/**
 * 1. Group A Template: Attendees who voted for the winning date or "Any date".
 */
export function generateWinningDateEmailGroupA(params: WinningDateEmailParams): EmailTemplateResult {
  const city = params.cityName || "Chicago";
  const name = params.name.trim() || "there";
  const winningDate = params.winningDate.trim();
  const timeWindow = params.timeWindow?.trim() || "10:00 AM – 12:00 PM CDT";
  const venueName = params.venueName.trim();
  const venueAddress = params.venueAddress.trim();
  const ticketUrl = params.ticketUrl?.trim();
  const customNote = params.customNote?.trim();

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${venueName} ${venueAddress}`.trim())}`;

  // Parse calendar dates for Google Calendar 1-click button
  const { startIso, endIso } = parseEventDates({
    cityName: city,
    dates: [winningDate],
    times: [timeWindow],
  });

  const googleCalUrl = generateGoogleCalendarUrl({
    title: `Actually, Let's — ${city} Gathering`,
    description: `Confirmed community gathering at ${venueName} (${venueAddress}).${customNote ? `\n\nHost Note: "${customNote}"` : ""}${ticketUrl ? `\n\nTicket / RSVP Link: ${ticketUrl}` : ""}`,
    location: `${venueName}, ${venueAddress}`,
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
          style="display: inline-block; background-color: #C8643F; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(200, 100, 63, 0.35);"
        >
          🎟️ Claim Your Spot / Tickets
        </a>
      </div>`
    : "";

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
              The community has spoken! Your vote helped pick our official date and venue for Actually, Let&apos;s ${city}.
            </p>
          </div>

          <!-- Event Details Elevated Card -->
          <div style="background-color: #F4EEE2; border: 1.5px solid #D8CEBC; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 18px;">📅</span>
              <div>
                <strong style="display: block; font-size: 15px; color: #2B271F;">${winningDate}</strong>
                <span style="font-size: 13px; color: #6A6253;">${timeWindow}</span>
              </div>
            </div>

            <div style="margin-bottom: 12px; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 18px;">📍</span>
              <div>
                <strong style="display: block; font-size: 15px; color: #2B271F;">${venueName}</strong>
                <a href="${mapsUrl}" target="_blank" style="font-size: 13px; color: #C8643F; text-decoration: underline;">
                  ${venueAddress} &rarr; (Open in Google Maps)
                </a>
              </div>
            </div>
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

  const text = `Actually, Let's — ${city}\nWinning Date Confirmed!\n\nHi ${name},\n\nWe've locked in the date for our upcoming gathering!\n\nWhen: ${winningDate} (${timeWindow})\nWhere: ${venueName} - ${venueAddress}\nGoogle Maps: ${mapsUrl}\n${customNote ? `\nHost Note: "${customNote}"\n` : ""}${ticketUrl ? `\nRSVP / Tickets: ${ticketUrl}\n` : ""}\nAdd to Google Calendar:\n${googleCalUrl}\n\nActually, Let's • ${city} • rsvp@actuallylets.com`;

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
  const venueName = params.venueName.trim();
  const venueAddress = params.venueAddress.trim();
  const ticketUrl = params.ticketUrl?.trim();
  const customNote = params.customNote?.trim();

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${venueName} ${venueAddress}`.trim())}`;

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
          style="display: inline-block; background-color: #C8643F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 12px rgba(200, 100, 63, 0.3);"
        >
          View Gathering Details &amp; Tickets
        </a>
      </div>`
    : "";

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
            <div style="margin-bottom: 12px; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 18px;">📅</span>
              <div>
                <strong style="display: block; font-size: 15px; color: #2B271F;">${winningDate}</strong>
                <span style="font-size: 13px; color: #6A6253;">${timeWindow}</span>
              </div>
            </div>

            <div style="margin-bottom: 12px; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 18px;">📍</span>
              <div>
                <strong style="display: block; font-size: 15px; color: #2B271F;">${venueName}</strong>
                <a href="${mapsUrl}" target="_blank" style="font-size: 13px; color: #C8643F; text-decoration: underline;">
                  ${venueAddress} &rarr; (Open in Google Maps)
                </a>
              </div>
            </div>
          </div>

          ${hostNoteHtml}

          ${ticketSectionHtml}

          <!-- Future Gatherings Promise Box -->
          <div style="background-color: #FBF7EE; border: 1px solid #E6DEC8; border-radius: 12px; padding: 16px 18px; margin-top: 20px;">
            <h4 style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-weight: bold; color: #4C5A40; margin: 0 0 6px;">
              You&apos;re at the top of our list! ✨
            </h4>
            <p style="margin: 0; font-size: 13px; color: #6A6253; line-height: 1.45;">
              We have more dates and activities planned throughout the season. We&apos;ll notify you first when the next survey and RSVP list opens!
            </p>
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

  const text = `Actually, Let's — ${city}\nGathering Date Update\n\nHi ${name},\n\nThank you for voting in our survey! The community selected ${winningDate} for our upcoming gathering.\n\nWhen: ${winningDate} (${timeWindow})\nWhere: ${venueName} - ${venueAddress}\nGoogle Maps: ${mapsUrl}\n${customNote ? `\nHost Note: "${customNote}"\n` : ""}${ticketUrl ? `\nDetails & Tickets: ${ticketUrl}\n` : ""}\nWe'll keep you at the top of the list for future gatherings!\n\nActually, Let's • ${city} • rsvp@actuallylets.com`;

  return { subject, html, text };
}
