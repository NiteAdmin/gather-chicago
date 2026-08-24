import { NextResponse } from "next/server";
import { Resend } from "resend";
import { fetchResponses, saveResponse } from "@/lib/firebase";
import { sendSms } from "@/lib/twilio";

// In-memory sliding window IP rate limiter (3 requests per 15 minutes)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const ipRequestMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true; // Rate limited
  }

  timestamps.push(now);
  ipRequestMap.set(ip, timestamps);
  return false;
}

export async function POST(req: Request) {
  console.log('--- CONFIRM EMAIL REQUEST RECEIVED ---');

  // Extract client IP address
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // IP Rate Limiting Check
  if (checkRateLimit(ip)) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      { error: "Too many RSVP requests from this IP. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      city,
      cityName,
      name,
      email,
      phoneNumber,
      smsOptIn = false,
      dates = [],
      gatherings = [],
      customGathering,
      website_url,
      turnstileToken,
    } = body;

    // Honeypot check: If visually hidden website_url field is filled, silently return success
    if (website_url && typeof website_url === "string" && website_url.trim().length > 0) {
      console.warn("Honeypot triggered! Silently rejecting bot submission.");
      return NextResponse.json({ success: true, botTrapped: true });
    }

    // Cloudflare Turnstile Server-Side Token Verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || "0x4AAAAAAEHoBK71fRuK8Zu2";
    if (turnstileToken && turnstileSecret) {
      try {
        const verifyFormData = new URLSearchParams();
        verifyFormData.append("secret", turnstileSecret);
        verifyFormData.append("response", turnstileToken);
        if (ip) verifyFormData.append("remoteip", ip);

        const verifyRes = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            body: verifyFormData,
          }
        );

        const verifyOutcome = await verifyRes.json();
        if (!verifyOutcome.success) {
          console.warn("Turnstile verification failed:", verifyOutcome);
          return NextResponse.json(
            { error: "Turnstile bot verification failed. Please try again." },
            { status: 403 }
          );
        }
      } catch (tsError) {
        console.error("Turnstile verification API error:", tsError);
      }
    }

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Sanitize phone number by stripping non-digit characters
    const sanitizedPhone =
      typeof phoneNumber === "string" && phoneNumber.trim()
        ? phoneNumber.replace(/\D/g, "")
        : undefined;
    const sanitizedSmsOptIn = Boolean(smsOptIn);

    console.log('Incoming RSVP Payload:', {
      name: trimmedName,
      email: trimmedEmail,
      phoneNumber: sanitizedPhone,
      smsOptIn: sanitizedSmsOptIn,
      dates,
      gatherings,
      customGathering,
      turnstileVerified: Boolean(turnstileToken),
    });

    if (!trimmedName || !trimmedEmail || !trimmedEmail.includes("@")) {
      console.error('Validation failed: Name or email missing');
      return NextResponse.json(
        { error: "Name and a valid email address are required" },
        { status: 400 }
      );
    }

    // Duplicate Check: Log re-submission / update instead of bailing out with 400
    const existingResponses = await fetchResponses();
    const isDuplicate = existingResponses.some((r) => {
      const existingEmail = r.email ? r.email.trim().toLowerCase() : "";
      const existingPhone = r.phoneNumber ? r.phoneNumber.replace(/\D/g, "") : "";

      const emailMatch = existingEmail && existingEmail === trimmedEmail;
      const phoneMatch =
        sanitizedPhone && sanitizedPhone.length > 0 && existingPhone && existingPhone === sanitizedPhone;

      return emailMatch || phoneMatch;
    });

    if (isDuplicate) {
      console.log(`[RSVP UPDATE]: Existing RSVP detected for email: ${trimmedEmail}. Saving updated response and triggering confirmation email.`);
    }

    // Save to Firestore with sanitized payload (mapping all undefined values to null or arrays)
    try {
      await saveResponse({
        city: typeof city === "string" ? city : "chicago",
        cityName: typeof cityName === "string" ? cityName : "Chicago",
        name: trimmedName,
        email: trimmedEmail,
        phoneNumber: sanitizedPhone ? sanitizedPhone : null,
        smsOptIn: sanitizedSmsOptIn,
        dates: Array.isArray(dates) ? dates : [],
        gatherings: Array.isArray(gatherings) ? gatherings : [],
        customGathering: typeof body.customGathering === "string" ? body.customGathering.trim() : null,
        customDate: typeof body.customDate === "string" ? body.customDate.trim() : null,
        times: Array.isArray(body.times) ? body.times : [],
        customTime: typeof body.customTime === "string" ? body.customTime.trim() : null,
        dayPref: typeof body.dayPref === "string" ? body.dayPref.trim() : null,
        guests: typeof body.guests === "string" ? body.guests.trim() : null,
        drink: typeof body.drink === "string" ? body.drink.trim() : null,
        notes: typeof body.notes === "string" ? body.notes.trim() : null,
      });
    } catch (dbErr) {
      console.error("Firestore server-side save error:", dbErr);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[RESEND CONFIG ERROR]: RESEND_API_KEY is not configured in environment variables');
      return NextResponse.json(
        { success: false, error: "Server error: RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    const customGatheringHtml =
      body.customGathering && typeof body.customGathering === "string" && body.customGathering.trim()
        ? `<li style="margin-bottom: 4px; color: #2B271F;"><strong>Suggested Idea:</strong> ${body.customGathering.trim()}</li>`
        : "";

    const hasGatherings = Array.isArray(gatherings) && gatherings.length > 0;
    const gatheringsListHtml =
      hasGatherings || customGatheringHtml
        ? `<ul style="margin: 6px 0 0 18px; padding: 0; color: #2B271F; font-size: 14px; line-height: 1.55;">
            ${hasGatherings ? gatherings.map((g: string) => `<li style="margin-bottom: 4px;">${g}</li>`).join("") : ""}
            ${customGatheringHtml}
          </ul>`
        : `<p style="color: #8C8270; font-size: 14px; font-style: italic; margin: 6px 0 0;">None selected</p>`;

    const customDateHtml =
      body.customDate && typeof body.customDate === "string" && body.customDate.trim()
        ? `<li style="margin-bottom: 4px; color: #2B271F;"><strong>Suggested Date:</strong> ${body.customDate.trim()}</li>`
        : "";

    const hasDates = Array.isArray(dates) && dates.length > 0;
    const datesListHtml =
      hasDates || customDateHtml
        ? `<ul style="margin: 6px 0 0 18px; padding: 0; color: #2B271F; font-size: 14px; line-height: 1.55;">
            ${hasDates ? dates.map((d: string) => `<li style="margin-bottom: 4px;">${d}</li>`).join("") : ""}
            ${customDateHtml}
          </ul>`
        : `<p style="color: #8C8270; font-size: 14px; font-style: italic; margin: 6px 0 0;">None selected</p>`;

    const timesList = Array.isArray(body.times) ? body.times : [];
    const customTimeStr =
      typeof body.customTime === "string" && body.customTime.trim()
        ? body.customTime.trim()
        : null;

    const timesItemsHtml = [
      ...timesList.map((t: string) => `<li style="margin-bottom: 4px;">${t}</li>`),
      customTimeStr
        ? `<li style="margin-bottom: 4px;"><strong>Suggested Time:</strong> ${customTimeStr}</li>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const timesSectionHtml =
      timesItemsHtml.length > 0
        ? `<div style="margin-bottom: 20px;">
            <h3 style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: bold; color: #4C5A40; margin: 0 0 8px;">
              ⏰ Times that work for you:
            </h3>
            <ul style="margin: 6px 0 0 18px; padding: 0; color: #2B271F; font-size: 14px; line-height: 1.55;">
              ${timesItemsHtml}
            </ul>
          </div>`
        : "";

    const notesSectionHtml =
      body.notes && typeof body.notes === "string" && body.notes.trim()
        ? `<div style="margin-bottom: 20px;">
            <h3 style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: bold; color: #4C5A40; margin: 0 0 8px;">
              💬 Your write-in notes / requests:
            </h3>
            <div style="background-color: #EDE4D3; border: 1px solid #D8CEBC; padding: 12px 16px; border-radius: 10px; font-size: 14px; color: #2B271F; font-style: italic; line-height: 1.45;">
              &ldquo;${body.notes.trim()}&rdquo;
            </div>
          </div>`
        : "";

    const targetCityName = typeof cityName === "string" ? cityName : "Chicago";

    const emailHtml = `
      <div style="background-color: #FBF7EE; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2B271F;">
        <div style="max-width: 580px; margin: 0 auto;">
          <!-- Brand Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; letter-spacing: -0.5px;">Actually, Let&apos;s</h1>
            <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: #C8643F; letter-spacing: 0.5px;">Stretch &amp; Sip</p>
          </div>

          <!-- Main Elevated Card -->
          <div style="background-color: #FFFFFF; border: 1px solid #E6DEC8; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 16px rgba(43, 39, 31, 0.05);">
            
            <!-- Greeting Header -->
            <div style="text-align: center; border-bottom: 1px solid #EFEAD8; padding-bottom: 20px; margin-bottom: 24px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #C8643F; display: block; margin-bottom: 6px;">
                ${targetCityName.toUpperCase()} · RSVP CONFIRMED
              </span>
              <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; margin: 0; line-height: 1.25;">
                Thanks for your input, ${trimmedName}! 🌿
              </h1>
              <p style="font-size: 14px; line-height: 1.5; color: #6A6253; margin: 10px 0 0;">
                We received your availability and preferences for the upcoming Actually, Let&apos;s ${targetCityName} community series.
              </p>
            </div>

            <!-- 1. Gatherings Section -->
            <div style="margin-bottom: 20px;">
              <h3 style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: bold; color: #4C5A40; margin: 0 0 8px;">
                ✨ Gatherings you'd attend:
              </h3>
              ${gatheringsListHtml}
            </div>

            <!-- 2. Dates Section -->
            <div style="margin-bottom: 20px;">
              <h3 style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: bold; color: #4C5A40; margin: 0 0 8px;">
                📅 Dates that work for you:
              </h3>
              ${datesListHtml}
            </div>

            <!-- 3. Times Section (if present) -->
            ${timesSectionHtml}

            <!-- 4. Write-In Notes Callout Block (if present) -->
            ${notesSectionHtml}

            <!-- 5. What Happens Next Card -->
            <div style="background-color: #FBF7EE; border: 1px solid #E6DEC8; border-radius: 12px; padding: 16px 18px; margin-top: 24px;">
              <h4 style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-weight: bold; color: #4C5A40; margin: 0 0 4px;">
                What happens next?
              </h4>
              <p style="margin: 0; font-size: 13px; color: #6A6253; line-height: 1.45;">
                Once survey responses close, we'll tally the winning date and email you an official invite details &amp; ticket RSVP link!
              </p>
            </div>

          </div>

          <!-- Clean Footer -->
          <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #8C8270; line-height: 1.5;">
            <p style="margin: 0 0 4px; font-weight: 500;">
              Actually, Let&apos;s Series · Community-led gatherings
            </p>
            <p style="margin: 0;">
              A portion of every ticket supports local community building and sustainability efforts.
            </p>
          </div>

        </div>
      </div>
    `;

    const customGatheringText =
      body.customGathering && typeof body.customGathering === "string" && body.customGathering.trim()
        ? `- Suggested Idea: ${body.customGathering.trim()}`
        : "";

    const gatheringsText =
      [
        ...(Array.isArray(gatherings) ? gatherings.map((g: string) => `- ${g}`) : []),
        ...(customGatheringText ? [customGatheringText] : []),
      ].join("\n") || "None selected";

    const customDateText =
      body.customDate && typeof body.customDate === "string" && body.customDate.trim()
        ? `- Suggested Date: ${body.customDate.trim()}`
        : "";

    const datesText =
      [
        ...(Array.isArray(dates) ? dates.map((d: string) => `- ${d}`) : []),
        ...(customDateText ? [customDateText] : []),
      ].join("\n") || "None selected";

    const customTimeText =
      body.customTime && typeof body.customTime === "string" && body.customTime.trim()
        ? `- Suggested Time: ${body.customTime.trim()}`
        : "";

    const timesText =
      [
        ...(Array.isArray(body.times) ? body.times.map((t: string) => `- ${t}`) : []),
        ...(customTimeText ? [customTimeText] : []),
      ].join("\n");

    const timesSectionText = timesText
      ? `\n\nTimes that work for you:\n${timesText}`
      : "";

    const notesText =
      body.notes && typeof body.notes === "string" && body.notes.trim()
        ? `\n\nYour write-in notes / requests:\n"${body.notes.trim()}"`
        : "";

    const emailText = `Actually, Let's\nStretch & Sip\n---\n${targetCityName} · RSVP CONFIRMED\n\nThanks for your input, ${trimmedName}! 🌿\n\nWe received your availability and preferences for the upcoming Actually, Let's ${targetCityName} community series.\n\nGatherings you'd attend:\n${gatheringsText}\n\nDates that work for you:\n${datesText}${timesSectionText}${notesText}\n\nWhat happens next?\nOnce survey responses close, we'll tally the winning date and email you an official invite details & ticket RSVP link!\n\nA portion of every ticket supports local community building and sustainability efforts.`;

    const primarySender = "Actually Let's <rsvp@actuallylets.com>";

    let resendId: string | undefined = undefined;

    try {
      console.log(`Attempting to send confirmation to: ${trimmedEmail} via ${primarySender}...`);
      const emailResponse = await resend.emails.send({
        from: primarySender,
        to: [trimmedEmail],
        subject: `Got your availability for Actually, Let's Stretch & Sip! 🎉`,
        html: emailHtml,
        text: emailText,
      });

      console.log("Resend API Result:", emailResponse);

      if (emailResponse.error) {
        console.error('[RESEND DISPATCH ERROR]:', emailResponse.error);
      } else {
        console.log('[RESEND SUCCESS]:', emailResponse.data);
        resendId = emailResponse.data?.id;
      }
    } catch (resendErr: any) {
      console.error('[RESEND EXCEPTION]:', resendErr);
    }

    // Send automated Twilio SMS if user opted in and provided a valid 10-digit phone number
    if (sanitizedSmsOptIn && sanitizedPhone && sanitizedPhone.length === 10) {
      try {
        const formattedE164 = `+1${sanitizedPhone}`;
        const targetCityName = typeof cityName === "string" ? cityName : "Chicago";

        // Plain-text SMS template (No URLs/links) to bypass carrier spam filters
        const smsMessage = `Actually Let's: Hi ${trimmedName}, your RSVP for ${targetCityName} is confirmed! Reply STOP to opt out.`;

        console.log(`Triggering Twilio confirmation SMS to ${formattedE164}...`);
        const message = await sendSms(formattedE164, smsMessage);

        if (message) {
          console.log(`[TWILIO DIAGNOSTIC] SID: ${message.sid} | Status: ${message.status} | ErrorCode: ${message.errorCode || 'None'} | ErrorMsg: ${message.errorMessage || 'None'}`);
        }
      } catch (twilioError: any) {
        console.error('[TWILIO API ERROR]', twilioError.code, twilioError.message);
      }
    }

    return NextResponse.json({
      success: true,
      resendId: resendId,
      sender: primarySender,
    });
  } catch (error: any) {
    console.error('Fatal Confirm API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process RSVP confirmation" },
      { status: 500 }
    );
  }
}
