import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  console.log('--- CONFIRM EMAIL REQUEST RECEIVED ---');
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, phoneNumber, smsOptIn = false, dates = [], gatherings = [] } = body;

    // Sanitize phone number by stripping non-digit characters so only digits remain
    const sanitizedPhone = typeof phoneNumber === "string" && phoneNumber.trim()
      ? phoneNumber.replace(/\D/g, "")
      : undefined;
    const sanitizedSmsOptIn = Boolean(smsOptIn);

    console.log('Incoming Payload:', {
      name,
      email,
      phoneNumber: sanitizedPhone,
      smsOptIn: sanitizedSmsOptIn,
      dates,
      gatherings,
    });

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";

    if (!trimmedName || !trimmedEmail || !trimmedEmail.includes("@")) {
      console.error('Validation failed: Name or email missing');
      return NextResponse.json(
        { error: "Name and a valid email address are required" },
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

    const emailResponse = await resend.emails.send({
      from: "Gather Chicago <onboarding@resend.dev>",
      to: [trimmedEmail],
      subject: "Got your availability for Gather Chicago! 🎉",
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error('Resend Error:', emailResponse.error);
    } else {
      console.log('Confirmation email sent successfully:', emailResponse.data);
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
