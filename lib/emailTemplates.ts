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

export interface OctoberPlanningEmailParams {
  name: string;
  email: string;
  customMessage?: string;
  baseUrl?: string;
}

/**
 * 3. October Planning Campaign Template: Re-engaging Chicago September 26 attendees
 * with the confirmed October lineup, Member Dashboard claim CTA, and November survey teaser.
 */
export function generateOctoberPlanningEmail(params: OctoberPlanningEmailParams): EmailTemplateResult {
  const name = params.name?.trim() || "there";
  const email = params.email?.trim() || "";
  const customMessage = params.customMessage?.trim();
  const envBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://actuallylets.com");
  const baseUrl = (params.baseUrl || envBaseUrl).replace(/\/$/, "");
  const dashboardUrl = `${baseUrl}/dashboard`;
  const subject = "Actually, let's make a plan for October 🍂";

  const customMessageHtml = customMessage
    ? `
      <div style="background-color: #F4EEE2; border-left: 4px solid #C8643F; padding: 14px 18px; border-radius: 8px; margin: 18px 0 22px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #2B271F; font-style: italic;">
          &ldquo;${customMessage}&rdquo;
        </p>
        <span style="display: block; font-size: 11px; font-weight: 700; color: #C8643F; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.8px;">
          Note from Actually, Let's Chicago
        </span>
      </div>
    `
    : "";

  const html = `
    <div style="background-color: #FBF7EE; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2B271F;">
      <div style="max-width: 580px; margin: 0 auto;">
        
        <!-- Brand Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: bold; color: #2B271F; letter-spacing: -0.5px;">Actually, Let&apos;s</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #C8643F; letter-spacing: 1.2px;">Community Gatherings · Chicago Chapter</p>
        </div>

        <!-- Main Card Container -->
        <div style="background-color: #FFFFFF; border: 1px solid #E6DEC8; border-radius: 20px; padding: 32px 24px; box-shadow: 0 4px 16px rgba(43, 39, 31, 0.05);">
          
          <!-- Title & Greeting -->
          <div style="text-align: center; border-bottom: 1px solid #EFEAD8; padding-bottom: 20px; margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #C8643F; display: block; margin-bottom: 6px;">
              ✦ OCTOBER 2026 LINEUP
            </span>
            <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 25px; font-weight: bold; color: #2B271F; margin: 0; line-height: 1.25;">
              Actually, let&apos;s make a plan for October
            </h2>
            <p style="font-size: 14px; line-height: 1.5; color: #6A6253; margin: 10px 0 0;">
              Hi ${name}, thank you for being part of our Chicago community! We tallied everyone&apos;s votes, and here is what is locked in for October.
            </p>
          </div>

          ${customMessageHtml}

          <!-- October Event Highlights -->
          <div style="margin-bottom: 26px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8C8270; display: block; margin-bottom: 12px;">
              Featured October Gatherings
            </span>

            <!-- Event 1: Pizza Night -->
            <div style="background-color: #FDF2EC; border: 1px solid #F5C2BA; border-radius: 14px; padding: 16px; margin-bottom: 12px;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 26px; line-height: 1;">🍕</span>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px;">
                    <strong style="font-size: 15px; color: #2B271F;">Family Night — Pizza</strong>
                    <span style="font-size: 11px; font-weight: 700; color: #C8643F; background-color: #FFFFFF; padding: 2px 8px; border-radius: 10px; border: 1px solid #F5C2BA;">Fri, Oct 9</span>
                  </div>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #6A6253; line-height: 1.4;">
                    6:00 PM – 8:30 PM CDT &bull; Homeslice Pizza &amp; Patio (Lincoln Park)
                  </p>
                </div>
              </div>
            </div>

            <!-- Event 2: Morning Walk -->
            <div style="background-color: #EEF5EB; border: 1px solid #C5DEC0; border-radius: 14px; padding: 16px; margin-bottom: 12px;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 26px; line-height: 1;">👟</span>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px;">
                    <strong style="font-size: 15px; color: #2B271F;">Morning Walk</strong>
                    <span style="font-size: 11px; font-weight: 700; color: #3D5634; background-color: #FFFFFF; padding: 2px 8px; border-radius: 10px; border: 1px solid #C5DEC0;">Sat, Oct 17</span>
                  </div>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #6A6253; line-height: 1.4;">
                    9:30 AM – 11:00 AM CDT &bull; Lincoln Park Conservatory &amp; Nature Boardwalk
                  </p>
                </div>
              </div>
            </div>

            <!-- Event 3: Coffee Connect -->
            <div style="background-color: #F5F1E8; border: 1px solid #D8CEBC; border-radius: 14px; padding: 16px; margin-bottom: 12px;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <span style="font-size: 26px; line-height: 1;">☕</span>
                <div style="flex: 1;">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px;">
                    <strong style="font-size: 15px; color: #2B271F;">Coffee &amp; Casual Conversations</strong>
                    <span style="font-size: 11px; font-weight: 700; color: #5A5040; background-color: #FFFFFF; padding: 2px 8px; border-radius: 10px; border: 1px solid #D8CEBC;">Sat, Oct 24</span>
                  </div>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #6A6253; line-height: 1.4;">
                    10:00 AM – 12:00 PM CDT &bull; Colectivo Coffee Lincoln Park
                  </p>
                </div>
              </div>
            </div>

            <p style="margin: 8px 0 0; font-size: 12px; color: #8C8270; text-align: center;">
              Plus <strong>Fall Nature Stroll (Sun, Oct 25)</strong> &amp; <strong>Community Fall Social (Sat, Oct 31)</strong>.
            </p>
          </div>

          <!-- Primary CTA Box: Dashboard & Account Setup -->
          <div style="background-color: #F4EEE2; border: 1.5px solid #D8CEBC; border-radius: 16px; padding: 24px 20px; text-align: center; margin-bottom: 24px;">
            <h3 style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: bold; color: #2B271F; margin: 0 0 8px;">
              Your Member Dashboard &amp; Calendar Are Live
            </h3>
            <p style="font-size: 13px; line-height: 1.5; color: #6A6253; margin: 0 0 18px; max-width: 440px; margin-left: auto; margin-right: auto;">
              Log in or set your password with <strong>${email || "your email"}</strong> to see your confirmed RSVP status, view the interactive October calendar, and access private event details.
            </p>

            <a href="${dashboardUrl}" target="_blank" style="display: inline-block; background-color: #C8643F; color: #FFFFFF; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 12px; letter-spacing: 0.3px; box-shadow: 0 4px 10px rgba(200, 100, 63, 0.25);">
              Claim Your Account &amp; View Calendar &rarr;
            </a>

            <span style="display: block; font-size: 11px; color: #8C8270; margin-top: 10px;">
              No password yet? Click above and select &ldquo;Create Account&rdquo; with your email.
            </span>
          </div>

          <!-- Early November Teaser -->
          <div style="border-top: 1px solid #EFEAD8; padding-top: 18px; text-align: left;">
            <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #6A6253;">
              🍂 <strong>Looking Ahead to November:</strong> We&apos;re already curating indoor venues, social club dinners, and holiday meetups. Reply directly to this email with ideas or check your dashboard for early voting!
            </p>
          </div>

        </div>

        <!-- Brand Footer -->
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #8C8270; line-height: 1.5;">
          <p style="margin: 0 0 4px; font-weight: 500;">
            Actually, Let&apos;s &bull; Chicago, IL &bull; <a href="mailto:admin@actuallylets.com" style="color: #C8643F; text-decoration: underline;">admin@actuallylets.com</a>
          </p>
          <p style="margin: 0;">
            A portion of every gathering supports local community building initiatives and sustainability.
          </p>
        </div>

      </div>
    </div>
  `;

  const text = `Actually, Let's — Chicago Community Gatherings\nOctober Planning Update\n\nHi ${name},\n\nThank you for being part of our Chicago community! We tallied everyone's votes, and here is what is on deck for October:\n\n${customMessage ? `Host Note: "${customMessage}"\n\n` : ""}OCTOBER GATHERINGS LINEUP:\n- Fri, Oct 9 (6:00 PM – 8:30 PM): Family Night — Pizza @ Homeslice Pizza & Patio\n- Sat, Oct 17 (9:30 AM – 11:00 AM): Morning Walk @ Lincoln Park Conservatory & Boardwalk\n- Sat, Oct 24 (10:00 AM – 12:00 PM): Coffee & Casual Conversations @ Colectivo Coffee Lincoln Park\n- Sun, Oct 25: Fall Nature Stroll @ North Park Village Nature Center\n- Sat, Oct 31: Community Fall Social @ Half Acre Beer Co Balmoral Garden\n\nYOUR MEMBER DASHBOARD IS LIVE:\nLog in or set your password with ${email} to view your confirmed RSVP status, access live calendar sync, and view private venue details:\n${dashboardUrl}\n\nLOOKING AHEAD TO NOVEMBER:\nReply directly to this email with venue ideas or gathering concepts you'd love to see next month!\n\nActually, Let's • Chicago, IL • admin@actuallylets.com`;

  return { subject, html, text };
}

