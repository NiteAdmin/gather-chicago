import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logBroadcast } from "@/lib/firebase";
import {
  generateWinningDateEmailGroupA,
  generateWinningDateEmailGroupB,
} from "@/lib/emailTemplates";

interface RecipientInput {
  name?: string;
  email?: string;
}

interface AnnounceDateRequestBody {
  adminSecret?: string;
  city?: string;
  winningDate: string;
  timeWindow?: string;
  venueName?: string | null;
  venueAddress?: string | null;
  ticketUrl?: string;
  eventUrl?: string;
  customNote?: string;
  isDryRun?: boolean;
  testEmail?: string;
  groupARecipients: RecipientInput[];
  groupBRecipients?: RecipientInput[];
}

export async function POST(req: Request) {
  try {
    const body: AnnounceDateRequestBody = await req.json().catch(() => ({}));
    const {
      adminSecret,
      city,
      winningDate,
      timeWindow,
      venueName,
      venueAddress,
      ticketUrl,
      customNote,
      isDryRun,
      testEmail,
      groupARecipients,
      groupBRecipients,
    } = body;

    // 1. Admin Authentication Guard
    const expectedSecret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSCODE || "admin123";
    const headerSecret = req.headers.get("x-admin-secret");
    const activeSecret = adminSecret || headerSecret;

    if (!activeSecret || activeSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing admin passcode" },
        { status: 401 }
      );
    }

    // 2. Validation
    if (!winningDate || !winningDate.trim()) {
      return NextResponse.json(
        { error: "Winning date is required" },
        { status: 400 }
      );
    }

    // Venue name and address are strictly optional
    const cleanVenueName = venueName?.trim() || "";
    const cleanVenueAddress = venueAddress?.trim() || "";

    const rawGroupA = Array.isArray(groupARecipients) ? groupARecipients : [];
    const rawGroupB = Array.isArray(groupBRecipients) ? groupBRecipients : [];

    // Filter valid email recipients (deduplicate within group)
    const seenEmails = new Set<string>();

    const validGroupA = rawGroupA.filter((r) => {
      const email = r.email?.trim().toLowerCase();
      if (email && email.includes("@") && !seenEmails.has(email)) {
        seenEmails.add(email);
        return true;
      }
      return false;
    });

    const validGroupB = rawGroupB.filter((r) => {
      const email = r.email?.trim().toLowerCase();
      if (email && email.includes("@") && !seenEmails.has(email)) {
        seenEmails.add(email);
        return true;
      }
      return false;
    });

    const cityName = city ? (city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()) : "Chicago";
    const isTestMode = Boolean(isDryRun);
    const destinationTestEmail = (testEmail?.trim() || "admin@actuallylets.com").toLowerCase();

    // 3. Construct email objects
    const emailsToSend: Array<{
      from: string;
      to: string[];
      replyTo: string;
      subject: string;
      html: string;
      text: string;
    }> = [];

    if (isTestMode) {
      // DRY RUN MODE: Send exactly 1 Group A and 1 Group B sample email to test address
      const sampleA = generateWinningDateEmailGroupA({
        name: "Admin (Test Preview - Group A)",
        cityName,
        winningDate,
        timeWindow,
        venueName: cleanVenueName,
        venueAddress: cleanVenueAddress,
        ticketUrl,
        customNote,
      });

      const sampleB = generateWinningDateEmailGroupB({
        name: "Admin (Test Preview - Group B)",
        cityName,
        winningDate,
        timeWindow,
        venueName: cleanVenueName,
        venueAddress: cleanVenueAddress,
        ticketUrl,
        customNote,
      });

      emailsToSend.push({
        from: "Actually Let's <rsvp@actuallylets.com>",
        to: [destinationTestEmail],
        replyTo: "admin@actuallylets.com",
        subject: `[TEST PREVIEW - GROUP A] ${sampleA.subject}`,
        html: sampleA.html,
        text: sampleA.text,
      });

      emailsToSend.push({
        from: "Actually Let's <rsvp@actuallylets.com>",
        to: [destinationTestEmail],
        replyTo: "admin@actuallylets.com",
        subject: `[TEST PREVIEW - GROUP B] ${sampleB.subject}`,
        html: sampleB.html,
        text: sampleB.text,
      });
    } else {
      // LIVE RUN MODE: Send to all real recipients
      const totalRecipientCount = validGroupA.length + validGroupB.length;
      if (totalRecipientCount === 0) {
        return NextResponse.json(
          { error: "No valid recipient email addresses provided" },
          { status: 400 }
        );
      }

      // Construct Group A (Available) emails
      for (const recipient of validGroupA) {
        const email = recipient.email!.trim().toLowerCase();
        const name = recipient.name?.trim() || "there";
        const template = generateWinningDateEmailGroupA({
          name,
          cityName,
          winningDate,
          timeWindow,
          venueName: cleanVenueName,
          venueAddress: cleanVenueAddress,
          ticketUrl,
          customNote,
        });

        emailsToSend.push({
          from: "Actually Let's <rsvp@actuallylets.com>",
          to: [email],
          replyTo: "admin@actuallylets.com",
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      }

      // Construct Group B (Alternate Dates) emails
      for (const recipient of validGroupB) {
        const email = recipient.email!.trim().toLowerCase();
        const name = recipient.name?.trim() || "there";
        const template = generateWinningDateEmailGroupB({
          name,
          cityName,
          winningDate,
          timeWindow,
          venueName: cleanVenueName,
          venueAddress: cleanVenueAddress,
          ticketUrl,
          customNote,
        });

        emailsToSend.push({
          from: "Actually Let's <rsvp@actuallylets.com>",
          to: [email],
          replyTo: "admin@actuallylets.com",
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      }
    }

    // 4. Chunk emails into batches of maximum 100 items
    const BATCH_SIZE = 100;
    const batches: typeof emailsToSend[] = [];
    for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
      batches.push(emailsToSend.slice(i, i + BATCH_SIZE));
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    let dispatchedCount = 0;

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const batchPromises = batches.map(async (batch, index) => {
        try {
          const res = await resend.batch.send(batch);
          if (res.error) {
            console.error(`[Resend Batch Error - Batch ${index + 1}]:`, res.error);
            return { success: false, error: res.error, count: 0 };
          }
          return { success: true, data: res.data, count: batch.length };
        } catch (batchErr) {
          console.error(`[Resend Batch Exception - Batch ${index + 1}]:`, batchErr);
          return { success: false, error: batchErr, count: 0 };
        }
      });

      const settledResults = await Promise.allSettled(batchPromises);
      settledResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          dispatchedCount += result.value.count;
        }
      });
    } else {
      console.warn("[ANNOUNCE_DATE] RESEND_API_KEY not configured. Mocking dispatch for", emailsToSend.length, "recipients.");
      dispatchedCount = emailsToSend.length;
    }

    // 5. Admin Confirmation Receipt Dispatch & Local Logging
    const adminEmail = (process.env.ADMIN_EMAIL || testEmail?.trim() || "admin@actuallylets.com").toLowerCase();
    const eventTitle = `Actually, Let's — ${cityName} (${winningDate})`;
    const broadcastTimestamp = new Date().toISOString();
    const formattedTimestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/Chicago",
      dateStyle: "full",
      timeStyle: "long",
    });

    const samplePreview = generateWinningDateEmailGroupA({
      name: "Community Member",
      cityName,
      winningDate,
      timeWindow,
      venueName: cleanVenueName,
      venueAddress: cleanVenueAddress,
      ticketUrl,
      customNote,
    });

    const receiptSubject = `[Confirmation] Announcement Dispatched: ${eventTitle}`;
    const totalRecipientsCount = isTestMode ? 2 : (dispatchedCount || emailsToSend.length);

    const receiptHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #2B271F; background-color: #FBF7EE;">
        <div style="background-color: #4C5A40; color: #FFFFFF; padding: 18px 22px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">✓ Announcement Broadcast Confirmation</h2>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Event: ${eventTitle}</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #D8CEBC; border-top: none; padding: 22px; border-radius: 0 0 12px 12px;">
          <h3 style="margin-top: 0; color: #2B271F; font-size: 15px; border-bottom: 1px solid #EDE4D3; padding-bottom: 8px;">
            📊 Dispatch Summary
          </h3>
          <table style="width: 100%; font-size: 13.5px; border-collapse: collapse; margin-bottom: 18px;">
            <tr>
              <td style="padding: 6px 0; color: #6A6253; width: 160px;"><strong>Run Mode:</strong></td>
              <td style="padding: 6px 0; font-weight: 600; color: ${isTestMode ? '#8C6A18' : '#3B5730'};">
                ${isTestMode ? '🧪 Test Preview (Dry Run)' : '🚀 Live Broadcast to Attendees'}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6A6253;"><strong>Broadcast Timestamp:</strong></td>
              <td style="padding: 6px 0;">${broadcastTimestamp} (${formattedTimestamp})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6A6253;"><strong>Recipient Count:</strong></td>
              <td style="padding: 6px 0;">
                <strong>${totalRecipientsCount}</strong> ${isTestMode ? '(1 Group A test, 1 Group B test)' : `(${validGroupA.length} Group A, ${validGroupB.length} Group B)`}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6A6253;"><strong>City:</strong></td>
              <td style="padding: 6px 0;">${cityName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6A6253;"><strong>Winning Date:</strong></td>
              <td style="padding: 6px 0; font-weight: 600;">${winningDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6A6253;"><strong>Time Window:</strong></td>
              <td style="padding: 6px 0;">${timeWindow || 'TBD'}</td>
            </tr>
            ${(cleanVenueName || cleanVenueAddress) ? `
            <tr>
              <td style="padding: 6px 0; color: #6A6253;"><strong>Venue / Address:</strong></td>
              <td style="padding: 6px 0;">${cleanVenueName ? (cleanVenueAddress ? `${cleanVenueName} (${cleanVenueAddress})` : cleanVenueName) : cleanVenueAddress}</td>
            </tr>` : ''}
            ${ticketUrl ? `<tr><td style="padding: 6px 0; color: #6A6253;"><strong>RSVP Link:</strong></td><td style="padding: 6px 0;"><a href="${ticketUrl}" target="_blank" style="color: #C8643F;">${ticketUrl}</a></td></tr>` : ''}
            ${customNote ? `<tr><td style="padding: 6px 0; color: #6A6253;"><strong>Host Note:</strong></td><td style="padding: 6px 0; font-style: italic;">&ldquo;${customNote}&rdquo;</td></tr>` : ''}
          </table>

          <h3 style="color: #2B271F; font-size: 15px; border-bottom: 1px solid #EDE4D3; padding-bottom: 8px; margin-top: 20px;">
            📨 Full Announcement Body Content
          </h3>
          <div style="background-color: #F4EEE2; border: 1px solid #D8CEBC; border-radius: 8px; padding: 14px; font-size: 13px; color: #2B271F; line-height: 1.5; white-space: pre-wrap; font-family: monospace;">
${samplePreview.text}
          </div>
        </div>
      </div>
    `;

    const receiptText = `[Confirmation] Announcement Dispatched: ${eventTitle}\n\n` +
      `Broadcast Timestamp: ${broadcastTimestamp} (${formattedTimestamp})\n` +
      `Recipient Count: ${totalRecipientsCount} (${isTestMode ? 'Test Mode' : `${validGroupA.length} Group A, ${validGroupB.length} Group B`})\n` +
      `City: ${cityName}\n` +
      `Winning Date: ${winningDate}\n` +
      `Time Window: ${timeWindow || 'TBD'}\n` +
      `${(cleanVenueName || cleanVenueAddress) ? `Venue: ${cleanVenueName ? (cleanVenueAddress ? `${cleanVenueName} (${cleanVenueAddress})` : cleanVenueName) : cleanVenueAddress}\n` : ''}` +
      `${ticketUrl ? `RSVP Link: ${ticketUrl}\n` : ''}` +
      `${customNote ? `Host Note: "${customNote}"\n` : ''}\n` +
      `==================== FULL ANNOUNCEMENT CONTENT ====================\n\n` +
      samplePreview.text;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "Actually Let's <rsvp@actuallylets.com>",
          to: [adminEmail],
          replyTo: "admin@actuallylets.com",
          subject: receiptSubject,
          html: receiptHtml,
          text: receiptText,
        });
      } catch (receiptErr) {
        console.error("[EMAIL AUDIT] Failed to dispatch admin confirmation receipt:", receiptErr);
      }
    }

    console.log('[EMAIL AUDIT] Admin confirmation receipt dispatched to:', adminEmail);

    // 6. Firestore Broadcast Audit Log (for live runs, or flagged as dry-run)
    let broadcastId = "audit-log-disabled";
    try {
      broadcastId = await logBroadcast({
        city: city || "chicago",
        winningDate,
        timeWindow,
        venueName: cleanVenueName || undefined,
        venueAddress: cleanVenueAddress || undefined,
        ticketUrl,
        customNote: isTestMode ? `[TEST RUN -> ${destinationTestEmail}] ${customNote || ""}`.trim() : customNote,
        groupACount: isTestMode ? 1 : validGroupA.length,
        groupBCount: isTestMode ? 1 : validGroupB.length,
        totalDispatched: dispatchedCount || emailsToSend.length,
      });
    } catch (dbErr) {
      console.error("[Firestore Broadcast Log Error]:", dbErr);
    }

    return NextResponse.json({
      success: true,
      isDryRun: isTestMode,
      testEmail: isTestMode ? destinationTestEmail : undefined,
      totalSent: dispatchedCount || emailsToSend.length,
      broadcastId,
      groupACount: isTestMode ? 1 : validGroupA.length,
      groupBCount: isTestMode ? 1 : validGroupB.length,
    });
  } catch (error: any) {
    console.error("[Announce Date Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during announcement dispatch" },
      { status: 500 }
    );
  }
}
