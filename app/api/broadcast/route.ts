import { NextResponse } from "next/server";
import { Resend } from "resend";
import { fetchResponses } from "@/lib/firebase";
import { BroadcastPayload } from "@/types/survey";

export async function POST(req: Request) {
  try {
    const body: BroadcastPayload = await req.json();
    const { winningDate, eventDetails, eventLink, adminSecret, city } = body;

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
    const targetCity = typeof city === "string" ? city.toLowerCase() : "all";

    const filteredResponses = responses.filter((r) => {
      if (targetCity !== "all") {
        const docCity = (r.city || "chicago").toLowerCase();
        return docCity === targetCity;
      }
      return true;
    });

    const emails = Array.from(
      new Set(
        filteredResponses
          .map((r) => r.email?.trim().toLowerCase())
          .filter((e): e is string => Boolean(e && e.includes("@")))
      )
    );

    if (emails.length === 0) {
      return NextResponse.json(
        { error: `No valid recipient email addresses found for target selection (${targetCity})` },
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
          <h2 style="color: #C8643F; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Actually Let’s Series</h2>
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

    const primarySender = "Actually Let's <rsvp@actuallylets.com>";

    // Send emails individually to avoid batch restrictions or address exposure
    const results = await Promise.allSettled(
      emails.map(async (email) => {
        const res = await resend.emails.send({
          from: primarySender,
          to: [email],
          subject: `🎉 Gathering Date Locked: ${winningDate}!`,
          html: emailHtml,
        });

        if (res.error) {
          console.error(`[RESEND BROADCAST DISPATCH ERROR for ${email}]:`, res.error);
          throw new Error(res.error.message || `Failed to send email to ${email}`);
        }

        return { email, id: res.data?.id, sender: primarySender };
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");

    if (successful.length === 0 && emails.length > 0) {
      const firstError = (failed[0] as PromiseRejectedResult)?.reason?.message || "Failed to dispatch broadcast emails";
      return NextResponse.json(
        { error: `Broadcast email delivery failed: ${firstError}` },
        { status: 500 }
      );
    }

    // Admin Confirmation Receipt Dispatch & Local Logging
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@actuallylets.com").toLowerCase();
    const eventTitle = `Actually, Let's — ${typeof city === "string" ? (city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()) : "Community"} (${winningDate})`;
    const broadcastTimestamp = new Date().toISOString();

    try {
      await resend.emails.send({
        from: primarySender,
        to: [adminEmail],
        replyTo: "admin@actuallylets.com",
        subject: `[Confirmation] Announcement Dispatched: ${eventTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2B271F;">
            <div style="background-color: #4C5A40; color: #FFFFFF; padding: 16px 20px; border-radius: 10px 10px 0 0;">
              <h2 style="margin: 0; font-size: 18px;">✓ Announcement Dispatch Confirmation</h2>
              <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Event: ${eventTitle}</p>
            </div>
            <div style="background-color: #FBF7EE; border: 1px solid #D8CEBC; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">
              <p><strong>Broadcast Timestamp:</strong> ${broadcastTimestamp}</p>
              <p><strong>Recipients:</strong> ${successful.length} sent (${failed.length} failed, ${emails.length} total)</p>
              <hr style="border: 0; border-top: 1px solid #D8CEBC; margin: 16px 0;" />
              <h3>Email Body Preview:</h3>
              <div style="background-color: #FFFFFF; border: 1px solid #E6DEC8; border-radius: 8px; padding: 14px;">
                ${emailHtml}
              </div>
            </div>
          </div>
        `,
        text: `[Confirmation] Announcement Dispatched: ${eventTitle}\nBroadcast Timestamp: ${broadcastTimestamp}\nRecipient Count: ${successful.length} sent (${failed.length} failed, ${emails.length} total)\n\nEvent Details:\n${eventDetails}${eventLink ? `\nEvent Link: ${eventLink}` : ''}`,
      });
    } catch (receiptErr) {
      console.error("[EMAIL AUDIT] Failed to dispatch admin confirmation receipt in /api/broadcast:", receiptErr);
    }

    console.log('[EMAIL AUDIT] Admin confirmation receipt dispatched to:', adminEmail);

    return NextResponse.json({
      success: true,
      recipientCount: emails.length,
      sentCount: successful.length,
      failedCount: failed.length,
    });
  } catch (error: any) {
    console.error("Broadcast route exception:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send broadcast email" },
      { status: 500 }
    );
  }
}
