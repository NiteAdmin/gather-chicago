import { NextResponse } from "next/server";
import { Resend } from "resend";
import { fetchResponses } from "@/lib/firebase";
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
      website_url,
      turnstileToken,
    } = body;

    // Honeypot check: If visually hidden website_url field is filled, silently return success
    if (website_url && typeof website_url === "string" && website_url.trim().length > 0) {
      console.warn("Honeypot triggered! Silently rejecting bot submission.");
      return NextResponse.json({ success: true, botTrapped: true });
    }

    // Cloudflare Turnstile Server-Side Token Verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
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

    console.log('Incoming Payload:', {
      name: trimmedName,
      email: trimmedEmail,
      phoneNumber: sanitizedPhone,
      smsOptIn: sanitizedSmsOptIn,
      dates,
      gatherings,
      turnstileVerified: Boolean(turnstileToken),
    });

    if (!trimmedName || !trimmedEmail || !trimmedEmail.includes("@")) {
      console.error('Validation failed: Name or email missing');
      return NextResponse.json(
        { error: "Name and a valid email address are required" },
        { status: 400 }
      );
    }

    // Duplicate Uniqueness Check in Firestore responses
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
      console.warn(`Duplicate RSVP detected for email: ${trimmedEmail} or phone: ${sanitizedPhone}`);
      return NextResponse.json(
        { error: "This phone number or email has already RSVP'd for this event!" },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('Resend Error: RESEND_API_KEY is not configured in environment variables');
      return NextResponse.json(
        { error: "Server error: RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    const gatheringsListHtml =
      Array.isArray(gatherings) && gatherings.length > 0
        ? `<ul style="margin: 8px 0 16px 20px; padding: 0; color: #2B271F;">
            ${gatherings.map((g: string) => `<li style="margin-bottom: 4px;">${g}</li>`).join("")}
          </ul>`
        : `<p style="color: #6A6253; italic;">None selected</p>`;

    const datesListHtml =
      Array.isArray(dates) && dates.length > 0
        ? `<ul style="margin: 8px 0 16px 20px; padding: 0; color: #2B271F;">
            ${dates.map((d: string) => `<li style="margin-bottom: 4px;">${d}</li>`).join("")}
          </ul>`
        : `<p style="color: #6A6253; italic;">Custom date specified</p>`;

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2B271F; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #F4EEE2; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #C8643F; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Gather · Chicago</h2>
          <h1 style="color: #2B271F; font-size: 26px; margin: 0;">Thanks for your input, ${trimmedName}! 🌿</h1>
        </div>
        
        <div style="background-color: #FBF7EE; border: 1px solid #D8CEBC; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <p style="font-size: 16px; line-height: 1.5; color: #2B271F; margin-top: 0;">
            We received your availability and preferences for the upcoming Gather Chicago community series.
          </p>
          
          <h3 style="color: #4C5A40; margin: 16px 0 4px;">✨ Gatherings you'd attend:</h3>
          ${gatheringsListHtml}

          <h3 style="color: #4C5A40; margin: 16px 0 4px;">📅 Dates that work for you:</h3>
          ${datesListHtml}

          <div style="background-color: #EDE4D3; padding: 14px; border-radius: 8px; margin-top: 16px;">
            <p style="margin: 0; font-size: 14px; color: #4C5A40; font-weight: bold;">
              What happens next?
            </p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #6A6253; line-height: 1.4;">
              Once survey responses close, we'll tally the winning date and email you an official invite details & ticket RSVP link!
            </p>
          </div>
        </div>

        <p style="font-size: 13px; color: #6A6253; text-align: center; margin: 0;">
          A portion of every ticket supports the Institute of Cultural Affairs (ICA) in Chicago.
        </p>
      </div>
    `;

    const resendFromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const emailText = `Gather · Chicago\n\nThanks for your input, ${trimmedName}! 🌿\n\nWe received your availability and preferences for the upcoming Gather Chicago community series.\n\nGatherings you'd attend:\n${
      Array.isArray(gatherings) && gatherings.length > 0
        ? gatherings.map((g: string) => `- ${g}`).join("\n")
        : "None selected"
    }\n\nDates that work for you:\n${
      Array.isArray(dates) && dates.length > 0
        ? dates.map((d: string) => `- ${d}`).join("\n")
        : "Custom date specified"
    }\n\nWhat happens next?\nOnce survey responses close, we'll tally the winning date and email you an official invite details & ticket RSVP link!\n\nA portion of every ticket supports the Institute of Cultural Affairs (ICA) in Chicago.`;

    const emailResponse = await resend.emails.send({
      from: resendFromEmail,
      to: [trimmedEmail],
      subject: "Got your availability for Gather Chicago! 🎉",
      html: emailHtml,
      text: emailText,
    });

    if (emailResponse.error) {
      console.error('Resend Error:', emailResponse.error);
    } else {
      console.log('Confirmation email sent successfully:', emailResponse.data);
    }

    // Send automated Twilio SMS if user opted in and provided a valid 10-digit phone number
    if (sanitizedSmsOptIn && sanitizedPhone && sanitizedPhone.length === 10) {
      try {
        const formattedE164 = `+1${sanitizedPhone}`;
        const targetCitySlug = typeof city === "string" ? city.toLowerCase() : "chicago";
        const targetCityName = typeof cityName === "string" ? cityName : "Chicago";

        const smsMessage = `You're in! Thanks for RSVPing to Actually ${targetCityName}. Updates & details: actuallylets.com/${targetCitySlug}`;

        console.log(`Triggering Twilio confirmation SMS to ${formattedE164}...`);
        await sendSms(formattedE164, smsMessage);
      } catch (smsError) {
        console.error("Twilio SMS send error caught gracefully:", smsError);
      }
    }

    return NextResponse.json({
      success: true,
      resendId: emailResponse.data?.id,
    });
  } catch (error: any) {
    console.error('Resend Error:', error);
    return NextResponse.json(
      { error: error.message || "Failed to send confirmation email" },
      { status: 500 }
    );
  }
}
