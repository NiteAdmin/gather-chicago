import { NextResponse } from "next/server";
import { Resend } from "resend";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendSms } from "@/lib/twilio";
import { formatPhoneNumber } from "@/lib/formatPhone";

// In-memory sliding window IP rate limiter (25 requests per 15 minutes to accommodate community testers & shared Wi-Fi)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;
const ipRequestMap = new Map<string, number[]>();

interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds?: number;
}

function checkRateLimit(ip: string): RateLimitResult {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.BYPASS_RATE_LIMIT === "true" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost"
  ) {
    return { limited: false };
  }
  const now = Date.now();
  const timestamps = (ipRequestMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestTimestamp = timestamps[0] || now;
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp));
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return { limited: true, retryAfterSeconds };
  }

  timestamps.push(now);
  ipRequestMap.set(ip, timestamps);
  return { limited: false };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  console.log('--- CONFIRM EMAIL REQUEST RECEIVED ---');

  // Extract client IP address
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // IP Rate Limiting Check
  const rateLimitStatus = checkRateLimit(ip);
  if (rateLimitStatus.limited) {
    const retryMinutes = Math.max(1, Math.ceil((rateLimitStatus.retryAfterSeconds || 60) / 60));
    console.warn(`Rate limit exceeded for IP: ${ip} (retry in ${retryMinutes}m)`);
    return NextResponse.json(
      {
        error: `Too many RSVP requests from this connection. Please try again in about ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`,
        retryAfter: rateLimitStatus.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitStatus.retryAfterSeconds || 60),
        },
      }
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
      eventIds = [],
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

    // Enforce Cloudflare Turnstile
    if (!turnstileToken || typeof turnstileToken !== "string" || !turnstileToken.trim()) {
      console.warn("[CONFIRM API] Missing Turnstile bot verification token.");
      return NextResponse.json(
        { error: "Turnstile bot verification token is required" },
        { status: 400 }
      );
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      console.error("[CONFIRM API] TURNSTILE_SECRET_KEY is not configured in environment variables.");
      return NextResponse.json(
        { error: "Server security configuration error" },
        { status: 500 }
      );
    }

    try {
      const verifyFormData = new URLSearchParams();
      verifyFormData.append("secret", turnstileSecret);
      verifyFormData.append("response", turnstileToken.trim());
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
        console.warn("[CONFIRM API] Turnstile verification failed:", verifyOutcome);
        return NextResponse.json(
          { error: "Turnstile bot verification failed or token is invalid" },
          { status: 400 }
        );
      }
    } catch (tsError: any) {
      console.error("[CONFIRM API] Turnstile verification API error:", tsError);
      return NextResponse.json(
        { error: "Failed to verify Turnstile token" },
        { status: 400 }
      );
    }

    const trimmedName = typeof name === "string" ? name.trim().slice(0, 100) : "";
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase().slice(0, 150) : "";
    const trimmedCustomGathering = typeof body.customGathering === "string" ? body.customGathering.trim().slice(0, 200) : null;
    const trimmedCustomDate = typeof body.customDate === "string" ? body.customDate.trim().slice(0, 200) : null;
    const trimmedCustomTime = typeof body.customTime === "string" ? body.customTime.trim().slice(0, 100) : null;
    const trimmedNotes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : null;

    // Sanitize phone number by stripping non-digit characters
    const sanitizedPhone =
      typeof phoneNumber === "string" && phoneNumber.trim()
        ? phoneNumber.replace(/\D/g, "").slice(0, 15)
        : undefined;
    const sanitizedSmsOptIn = Boolean(smsOptIn);

    console.log('Incoming RSVP Payload:', {
      name: trimmedName,
      email: trimmedEmail,
      phoneNumber: sanitizedPhone,
      smsOptIn: sanitizedSmsOptIn,
      dates,
      gatherings,
      customGathering: trimmedCustomGathering,
      turnstileVerified: true,
    });

    if (!trimmedName || !trimmedEmail || !trimmedEmail.includes("@")) {
      console.error('[CONFIRM API] Validation failed: Name or email missing');
      return NextResponse.json(
        { error: "Name and a valid email address are required" },
        { status: 400 }
      );
    }

    // Verify Firebase Admin SDK initialization
    if (!adminDb) {
      console.error("[CONFIRM API] Firebase Admin SDK is not initialized.");
      return NextResponse.json(
        { success: false, error: "Server database configuration error" },
        { status: 500 }
      );
    }
    const db = adminDb;

    const persistedCitySlug = (typeof city === "string" ? city.trim().slice(0, 50) : "chicago").toLowerCase();
    const persistedCityName = typeof cityName === "string" ? cityName.slice(0, 50) : (persistedCitySlug.charAt(0).toUpperCase() + persistedCitySlug.slice(1));

    const surveyDocData = {
      city: persistedCitySlug,
      cityName: persistedCityName,
      name: trimmedName,
      email: trimmedEmail,
      phoneNumber: sanitizedPhone ? sanitizedPhone : null,
      smsOptIn: sanitizedSmsOptIn,
      dates: Array.isArray(dates) ? dates.slice(0, 50).map((d) => String(d).slice(0, 100)) : [],
      eventIds: Array.isArray(eventIds) ? eventIds.slice(0, 50).map((e) => String(e).slice(0, 100)) : [],
      gatherings: Array.isArray(gatherings) ? gatherings.slice(0, 50).map((g) => String(g).slice(0, 100)) : [],
      customGathering: trimmedCustomGathering,
      customDate: trimmedCustomDate,
      times: Array.isArray(body.times) ? body.times.slice(0, 20).map((t: any) => String(t).slice(0, 100)) : [],
      customTime: trimmedCustomTime,
      dayPref: typeof body.dayPref === "string" ? body.dayPref.trim().slice(0, 50) : null,
      guests: typeof body.guests === "string" ? body.guests.trim().slice(0, 50) : null,
      drink: typeof body.drink === "string" ? body.drink.trim().slice(0, 50) : null,
      notes: trimmedNotes,
      quarterlyReminder: typeof body.quarterlyReminder === "boolean" ? body.quarterlyReminder : true,
    };

    // Save to Firestore using Firebase Admin SDK (Eliminating silent data loss: fail-closed on error or timeout)
    let savedResponseId: string;
    try {
      const dbSaveTask = async (): Promise<string> => {
        // Idempotent duplicate check: If a response exists for (email, city), update it
        const existingQuery = await db
          .collection("responses")
          .where("email", "==", trimmedEmail)
          .where("city", "==", persistedCitySlug)
          .limit(1)
          .get();

        if (!existingQuery.empty) {
          const docDoc = existingQuery.docs[0];
          await docDoc.ref.update({
            ...surveyDocData,
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`[CONFIRM API] Idempotently updated existing response ${docDoc.id} for ${trimmedEmail}`);
          return docDoc.id;
        }

        const newDocRef = await db.collection("responses").add({
          ...surveyDocData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[CONFIRM API] Persisted new response ${newDocRef.id} for ${trimmedEmail}`);
        return newDocRef.id;
      };

      // Strict timeout: Fail closed if Firestore write does not complete within 5000ms
      const timeoutTask = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore write timed out after 5000ms")), 5000)
      );

      savedResponseId = await Promise.race([dbSaveTask(), timeoutTask]);
    } catch (dbErr: any) {
      console.error("[CONFIRM API] Critical database failure. Failing closed to prevent silent data loss:", dbErr);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to persist survey response to database. Please try again.",
          details: dbErr?.message || "Database operation rejected or timed out",
        },
        { status: 500 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('[RESEND CONFIG WARNING]: RESEND_API_KEY is not configured in environment variables. Email delivery will be skipped.');
    }

    const customGatheringHtml = trimmedCustomGathering
      ? `<li style="margin-bottom: 4px; color: #2B271F;"><strong>Suggested Idea:</strong> ${escapeHtml(trimmedCustomGathering)}</li>`
      : "";

    const hasGatherings = Array.isArray(gatherings) && gatherings.length > 0;
    const gatheringsListHtml =
      hasGatherings || customGatheringHtml
        ? `<ul style="margin: 6px 0 0 18px; padding: 0; color: #2B271F; font-size: 14px; line-height: 1.55;">
            ${hasGatherings ? gatherings.map((g: string) => `<li style="margin-bottom: 4px;">${escapeHtml(String(g).slice(0, 100))}</li>`).join("") : ""}
            ${customGatheringHtml}
          </ul>`
        : `<p style="color: #8C8270; font-size: 14px; font-style: italic; margin: 6px 0 0;">None selected</p>`;

    const customDateHtml = trimmedCustomDate
      ? `<li style="margin-bottom: 4px; color: #2B271F;"><strong>Suggested Date:</strong> ${escapeHtml(trimmedCustomDate)}</li>`
      : "";

    const hasDates = Array.isArray(dates) && dates.length > 0;
    const datesListHtml =
      hasDates || customDateHtml
        ? `<ul style="margin: 6px 0 0 18px; padding: 0; color: #2B271F; font-size: 14px; line-height: 1.55;">
            ${hasDates ? dates.map((d: string) => `<li style="margin-bottom: 4px;">${escapeHtml(String(d).slice(0, 100))}</li>`).join("") : ""}
            ${customDateHtml}
          </ul>`
        : `<p style="color: #8C8270; font-size: 14px; font-style: italic; margin: 6px 0 0;">None selected</p>`;

    const timesList = Array.isArray(body.times) ? body.times : [];
    const customTimeStr = trimmedCustomTime;

    const timesItemsHtml = [
      ...timesList.map((t: string) => `<li style="margin-bottom: 4px;">${escapeHtml(String(t).slice(0, 100))}</li>`),
      customTimeStr
        ? `<li style="margin-bottom: 4px;"><strong>Suggested Time:</strong> ${escapeHtml(customTimeStr)}</li>`
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

    const notesSectionHtml = trimmedNotes
      ? `<div style="margin-bottom: 20px;">
          <h3 style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: bold; color: #4C5A40; margin: 0 0 8px;">
            💬 Your write-in notes / requests:
          </h3>
          <div style="background-color: #EDE4D3; border: 1px solid #D8CEBC; padding: 12px 16px; border-radius: 10px; font-size: 14px; color: #2B271F; font-style: italic; line-height: 1.45;">
            &ldquo;${escapeHtml(trimmedNotes)}&rdquo;
          </div>
        </div>`
      : "";

    const targetCityName = typeof cityName === "string" ? cityName.slice(0, 50) : "Chicago";
    const safeName = escapeHtml(trimmedName);
    const safeTargetCityName = escapeHtml(targetCityName);

    const emailHtml = `
      <div style="background-color: #FBF7EE; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2B271F;">
        <div style="max-width: 580px; margin: 0 auto;">
          <!-- Brand Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; letter-spacing: -0.5px;">Actually, Let&apos;s<span style="font-size: 0.65em; min-font-size: 9px; font-family: sans-serif; font-weight: normal; position: relative; top: -0.45em; margin-left: 1.5px; user-select: none; color: #78716c;">™</span></h1>
            <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: #C8643F; letter-spacing: 0.5px;">Community Series · ${safeTargetCityName}</p>
          </div>

          <!-- Main Elevated Card -->
          <div style="background-color: #FFFFFF; border: 1px solid #E6DEC8; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 16px rgba(43, 39, 31, 0.05);">
            
            <!-- Greeting Header -->
            <div style="text-align: center; border-bottom: 1px solid #EFEAD8; padding-bottom: 20px; margin-bottom: 24px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #C8643F; display: block; margin-bottom: 6px;">
                ${escapeHtml(targetCityName.toUpperCase())} · PREFERENCES RECEIVED
              </span>
              <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; margin: 0; line-height: 1.25;">
                Thanks for your input, ${safeName}! 🌿
              </h1>
              <p style="font-size: 14px; line-height: 1.5; color: #6A6253; margin: 10px 0 0;">
                We received your availability and preferences for the upcoming Actually, Let&apos;s ${safeTargetCityName} community series.
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
            <div style="background-color: #F4EEE2; border: 1px solid #E6DEC8; border-radius: 12px; padding: 16px 18px; margin-top: 16px;">
              <h4 style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-weight: bold; color: #4C5A40; margin: 0 0 4px;">
                What happens next?
              </h4>
              <p style="margin: 0; font-size: 13px; color: #6A6253; line-height: 1.45;">
                We&apos;ve logged your preferences and will follow up with the locked activity, venue, and date once voting closes!
              </p>
            </div>

          </div>

          <!-- Clean Footer -->
          <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #8C8270; line-height: 1.5;">
            <p style="margin: 0 0 4px; font-weight: 500;">
              Actually, Let&apos;s<span style="font-size: 0.65em; min-font-size: 9px; font-family: sans-serif; font-weight: normal; position: relative; top: -0.45em; margin-left: 1.5px; user-select: none; color: #78716c;">™</span> Series · Community-led gatherings
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

    const emailText = `Actually, Let's™\nCommunity Series · ${targetCityName}\n---\n${targetCityName} · PREFERENCES RECEIVED\n\nThanks for your input, ${trimmedName}! 🌿\n\nWe received your availability and preferences for the upcoming Actually, Let's™ ${targetCityName} community series.\n\nGatherings you'd attend:\n${gatheringsText}\n\nDates that work for you:\n${datesText}${timesSectionText}${notesText}\n\nWhat happens next?\nWe've logged your preferences and will follow up with the locked activity, venue, and date once voting closes!\n\nA portion of every ticket supports local community building and sustainability efforts.`;

    const primarySender = "Actually Let's <rsvp@actuallylets.com>";
    const adminSender = "Actually Let's System <rsvp@actuallylets.com>";

    const allGatheringsStr = [
      ...(Array.isArray(gatherings) ? gatherings : []),
      ...(body.customGathering && typeof body.customGathering === "string" && body.customGathering.trim() ? [`Write-in: "${body.customGathering.trim()}"`] : []),
    ].join(', ') || 'None selected';

    const allDatesStr = [
      ...(Array.isArray(dates) ? dates : []),
      ...(body.customDate && typeof body.customDate === "string" && body.customDate.trim() ? [`Write-in: "${body.customDate.trim()}"`] : []),
    ].join(', ') || 'None selected';

    const allTimesStr = [
      ...(Array.isArray(body.times) ? body.times : []),
      ...(body.customTime && typeof body.customTime === "string" && body.customTime.trim() ? [`Write-in: "${body.customTime.trim()}"`] : []),
    ].join(', ') || 'None selected';

    const adminEmailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #2B271F; background-color: #FBF7EE;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D8CEBC; border-radius: 12px; padding: 24px;">
          <h2 style="margin: 0 0 16px 0; color: #C8643F; font-size: 18px; font-weight: 700;">
            📝 New Intake Submission: ${safeName} (${safeTargetCityName})
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
            <tbody>
              <tr style="border-bottom: 1px solid #EFEAD8;">
                <th style="padding: 10px 8px; color: #6A6253; width: 140px; font-weight: 600;">Name</th>
                <td style="padding: 10px 8px; color: #2B271F; font-weight: 600;">${safeName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #EFEAD8;">
                <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Email</th>
                <td style="padding: 10px 8px; color: #2B271F;"><a href="mailto:${escapeHtml(trimmedEmail)}" style="color: #C8643F; text-decoration: underline;">${escapeHtml(trimmedEmail)}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #EFEAD8;">
                <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Phone</th>
                <td style="padding: 10px 8px; color: #2B271F;">${sanitizedPhone ? escapeHtml(formatPhoneNumber(sanitizedPhone)) : "N/A"}${sanitizedSmsOptIn ? ' (SMS Opted In)' : ''}</td>
              </tr>
              <tr style="border-bottom: 1px solid #EFEAD8;">
                <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Concepts</th>
                <td style="padding: 10px 8px; color: #2B271F;">${escapeHtml(allGatheringsStr)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #EFEAD8;">
                <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Voted Availability</th>
                <td style="padding: 10px 8px; color: #2B271F;">${escapeHtml(allDatesStr)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #EFEAD8;">
                <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Preferred Times</th>
                <td style="padding: 10px 8px; color: #2B271F;">${escapeHtml(allTimesStr)}</td>
              </tr>
              ${trimmedNotes ? `
              <tr>
                <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Notes</th>
                <td style="padding: 10px 8px; color: #2B271F; font-style: italic;">"${escapeHtml(trimmedNotes)}"</td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const adminEmailText = `New intake submission received for Actually, Let's ${targetCityName}:

Name: ${trimmedName}
Email: ${trimmedEmail}
Phone: ${sanitizedPhone ? formatPhoneNumber(sanitizedPhone) : "N/A"}${sanitizedSmsOptIn ? ' (SMS Opted In)' : ''}
Concepts: ${allGatheringsStr}
Voted Availability: ${allDatesStr}
Preferred Times: ${allTimesStr}${body.notes && typeof body.notes === "string" && body.notes.trim() ? `\nNotes: "${body.notes.trim()}"` : ''}`;

    let resendId: string | undefined = undefined;
    let adminResendId: string | undefined = undefined;
    let emailError: string | undefined = !resendApiKey ? "RESEND_API_KEY is not configured" : undefined;

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      try {
        console.log(`[EMAIL DISPATCH] Triggering attendee confirmation (${trimmedEmail}) & admin alert...`);
        const [attendeeResult, adminResult] = await Promise.allSettled([
          resend.emails.send({
            from: primarySender,
            to: [trimmedEmail],
            replyTo: "admin@actuallylets.com",
            subject: `Got your preferences for Actually, Let's ${targetCityName}! 🎉`,
            html: emailHtml,
            text: emailText,
          }),
          resend.emails.send({
            from: adminSender,
            to: ["admin@actuallylets.com"],
            replyTo: trimmedEmail,
            subject: `New intake submission from ${trimmedName} (${targetCityName})`,
            html: adminEmailHtml,
            text: adminEmailText,
          }),
        ]);

        if (attendeeResult.status === "fulfilled") {
          const emailResponse = attendeeResult.value;
          console.log("Attendee Resend API Result:", emailResponse);
          if (emailResponse.error) {
            console.error('[ATTENDEE RESEND ERROR]:', emailResponse.error);
            emailError = emailResponse.error.message || "Failed to send confirmation email";
          } else {
            console.log('[ATTENDEE RESEND SUCCESS]:', emailResponse.data);
            resendId = emailResponse.data?.id;
          }
        } else {
          console.error('[ATTENDEE RESEND REJECTION]:', attendeeResult.reason);
          emailError = attendeeResult.reason?.message || "Attendee email dispatch rejected";
        }

        if (adminResult.status === "fulfilled") {
          const adminResponse = adminResult.value;
          console.log("Admin Alert Resend API Result:", adminResponse);
          if (adminResponse.error) {
            console.error('[ADMIN ALERT RESEND ERROR]:', adminResponse.error);
          } else {
            console.log('[ADMIN ALERT RESEND SUCCESS]:', adminResponse.data);
            adminResendId = adminResponse.data?.id;
          }
        } else {
          console.error('[ADMIN ALERT RESEND REJECTION]:', adminResult.reason);
        }
      } catch (resendErr: any) {
        console.error('[RESEND DISPATCH EXCEPTION]:', resendErr);
        emailError = resendErr?.message || "Resend dispatch exception";
      }
    }

    // Send automated Twilio SMS if user opted in and provided a valid 10-digit phone number
    if (sanitizedSmsOptIn && sanitizedPhone && sanitizedPhone.length === 10) {
      try {
        const formattedE164 = `+1${sanitizedPhone}`;
        const targetCityName = typeof cityName === "string" ? cityName : "Chicago";

        // Plain-text SMS template (No URLs/links) to bypass carrier spam filters
        const smsMessage = `Actually Let's: Hi ${trimmedName}, your preferences for ${targetCityName} are received! Reply STOP to opt out.`;

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
      responseId: savedResponseId,
      resendId: resendId,
      adminResendId: adminResendId,
      emailDelivered: Boolean(resendId),
      emailError: emailError || undefined,
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
