import { NextResponse } from "next/server";
import { Resend } from "resend";
import { fetchResponses } from "@/lib/firebase";
import { BroadcastPayload } from "@/types/survey";

export async function POST(req: Request) {
  try {
    const body: BroadcastPayload = await req.json();
    const { winningDate, eventDetails, eventLink, adminSecret } = body;

    const expectedSecret = process.env.ADMIN_SECRET || "admin123";
    if (!adminSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Incorrect admin passcode" },
        { status: 401 }
      );
    }

    if (!winningDate || !eventDetails) {
      return NextResponse.json(
        { error: "Winning date and event details are required" },
        { status: 400 }
      );
    }

    const responses = await fetchResponses();
    const emails = Array.from(
      new Set(
        responses
          .map((r) => r.email?.trim())
          .filter((e): e is string => Boolean(e && e.includes("@")))
      )
    );

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "No valid recipient email addresses found in survey responses" },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Server error: RESEND_API_KEY is not configured in environment variables" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2B271F; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #F4EEE2; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #C8643F; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Gather · Chicago</h2>
          <h1 style="color: #2B271F; font-size: 28px; margin: 0;">It's Official! We're Gathering 🎉</h1>
        </div>
        
        <div style="background-color: #FBF7EE; border: 1px solid #D8CEBC; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h3 style="color: #4C5A40; margin-top: 0;">📅 Winning Date:</h3>
          <p style="font-size: 20px; font-weight: bold; color: #C8643F; margin-bottom: 16px;">${winningDate}</p>
          
          <h3 style="color: #4C5A40; margin-top: 0;">✨ Event Details:</h3>
          <p style="white-space: pre-wrap; line-height: 1.6; color: #2B271F;">${eventDetails}</p>
          
          ${
            eventLink
              ? `<div style="margin-top: 24px; text-align: center;">
                  <a href="${eventLink}" target="_blank" style="background-color: #C8643F; color: #F4EEE2; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Get Tickets / RSVP Here →</a>
                </div>`
              : ""
          }
        </div>
        
        <p style="font-size: 13px; color: #6A6253; text-align: center;">
          Thank you for taking part in the community survey. See you soon! 🌿
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Gather Chicago <onboarding@resend.dev>",
      to: emails,
      subject: `🎉 Gathering Date Locked: ${winningDate}!`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      recipientCount: emails.length,
      resendId: emailResponse.data?.id,
    });
  } catch (error: any) {
    console.error("Broadcast route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send broadcast email" },
      { status: 500 }
    );
  }
}
