import { NextResponse } from "next/server";
import { Resend } from "resend";
import { logBroadcast } from "@/lib/firebase";
import {
  generateWinningDateEmailGroupA,
  generateWinningDateEmailGroupB,
} from "@/lib/emailTemplates";

// Enforce 60s execution ceiling for serverless environments (e.g. Vercel)
export const maxDuration = 60;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENDER_IDENTITY = "Actually, Let's <rsvp@actuallylets.com>";
const REPLY_TO_ADDRESS = "admin@actuallylets.com";

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
  forceResend?: boolean;
  totalSurveysFound?: number;
  groupARecipients: RecipientInput[];
  groupBRecipients?: RecipientInput[];
  eventId?: string;
  eventTitle?: string;
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
      forceResend,
      totalSurveysFound,
      groupARecipients,
      groupBRecipients,
      eventId,
      eventTitle,
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

    // 3. Strict Pre-Batch Validation, Sanitization & Deduplication
    const failures: Array<{ email: string; reason: string }> = [];
    const seenEmails = new Set<string>();

    const sanitizeAndValidate = (list: RecipientInput[], groupLabel: string) => {
      const validList: Array<{ name: string; email: string }> = [];
      for (const r of list) {
        const rawEmail = r.email ? String(r.email).trim().toLowerCase() : "";
        const name = r.name?.trim() || "there";

        if (!rawEmail) {
          failures.push({ email: "(empty)", reason: `Missing email address in ${groupLabel}` });
          continue;
        }

        if (!EMAIL_REGEX.test(rawEmail)) {
          failures.push({ email: rawEmail, reason: `Malformed email format in ${groupLabel}` });
          continue;
        }

        if (seenEmails.has(rawEmail)) {
          // Skip duplicates across or within groups
          continue;
        }

        seenEmails.add(rawEmail);
        validList.push({ name, email: rawEmail });
      }
      return validList;
    };

    const validGroupA = sanitizeAndValidate(rawGroupA, "Group A");
    const validGroupB = sanitizeAndValidate(rawGroupB, "Group B");

    const cityName = city ? (city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()) : "Chicago";
    const isTestMode = Boolean(isDryRun);
    const destinationTestEmail = (testEmail?.trim() || "admin@actuallylets.com").toLowerCase();

    // 4. Construct email objects
    const emailsToSend: Array<{
      from: string;
      to: string[];
      replyTo: string;
      subject: string;
      html: string;
      text: string;
    }> = [];

    if (isTestMode) {
      // DRY RUN / TEST PREVIEW: Deliver sample Group A & Group B previews to dual test recipients
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

      // Target BOTH dual admins and any custom testEmail provided
      const targetTestEmails = Array.from(
        new Set(
          [
            destinationTestEmail,
            "admin@actuallylets.com",
            "ademola@actuallylets.com",
          ]
            .filter(Boolean)
            .map((e) => e.trim().toLowerCase())
            .filter((e) => EMAIL_REGEX.test(e))
        )
      );

      for (const testAddr of targetTestEmails) {
        emailsToSend.push({
          from: SENDER_IDENTITY,
          to: [testAddr],
          replyTo: REPLY_TO_ADDRESS,
          subject: `[TEST PREVIEW - GROUP A] ${sampleA.subject}`,
          html: sampleA.html,
          text: sampleA.text,
        });

        emailsToSend.push({
          from: SENDER_IDENTITY,
          to: [testAddr],
          replyTo: REPLY_TO_ADDRESS,
          subject: `[TEST PREVIEW - GROUP B] ${sampleB.subject}`,
          html: sampleB.html,
          text: sampleB.text,
        });
      }
    } else {
      // LIVE RUN MODE: Send to all real, validated recipients
      const totalRecipientCount = validGroupA.length + validGroupB.length;
      if (totalRecipientCount === 0) {
        return NextResponse.json(
          {
            error: "No valid recipient email addresses provided after sanitization",
            failures,
          },
          { status: 400 }
        );
      }

      // Construct Group A (Available) emails
      for (const recipient of validGroupA) {
        const template = generateWinningDateEmailGroupA({
          name: recipient.name,
          cityName,
          winningDate,
          timeWindow,
          venueName: cleanVenueName,
          venueAddress: cleanVenueAddress,
          ticketUrl,
          customNote,
        });

        emailsToSend.push({
          from: SENDER_IDENTITY,
          to: [recipient.email],
          replyTo: REPLY_TO_ADDRESS,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      }

      // Construct Group B (Alternate Dates) emails
      for (const recipient of validGroupB) {
        const template = generateWinningDateEmailGroupB({
          name: recipient.name,
          cityName,
          winningDate,
          timeWindow,
          venueName: cleanVenueName,
          venueAddress: cleanVenueAddress,
          ticketUrl,
          customNote,
        });

        emailsToSend.push({
          from: SENDER_IDENTITY,
          to: [recipient.email],
          replyTo: REPLY_TO_ADDRESS,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      }
    }

    // 5. Chunk emails into batches of maximum 100 items
    const BATCH_SIZE = 100;
    const batches: typeof emailsToSend[] = [];
    for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
      batches.push(emailsToSend.slice(i, i + BATCH_SIZE));
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    let dispatchedCount = 0;
    let batchesDispatched = 0;

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const batchPromises = batches.map(async (batch, index) => {
        try {
          const res = await resend.batch.send(batch);
          if (res.error) {
            console.error(`[Resend Batch Error - Batch ${index + 1}]:`, res.error);
            batch.forEach((item) => {
              item.to.forEach((addr) =>
                failures.push({ email: addr, reason: res.error?.message || "Batch rejected by Resend" })
              );
            });
            return { success: false, error: res.error, count: 0 };
          }
          return { success: true, data: res.data, count: batch.length };
        } catch (batchErr: any) {
          console.error(`[Resend Batch Exception - Batch ${index + 1}]:`, batchErr);
          batch.forEach((item) => {
            item.to.forEach((addr) =>
              failures.push({ email: addr, reason: batchErr?.message || "Batch dispatch network error" })
            );
          });
          return { success: false, error: batchErr, count: 0 };
        }
      });

      const settledResults = await Promise.allSettled(batchPromises);
      settledResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          dispatchedCount += result.value.count;
          batchesDispatched += 1;
        }
      });
    } else {
      console.warn("[ANNOUNCE_DATE] RESEND_API_KEY not configured. Mocking dispatch for", emailsToSend.length, "recipients.");
      dispatchedCount = emailsToSend.length;
      batchesDispatched = batches.length;
    }

    // 6. Isolated Dual Admin Confirmation Receipts
    const effectiveEventTitle = eventTitle ? `${eventTitle} (${cityName})` : `Actually, Let's — ${cityName} (${winningDate})`;
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

    const receiptSubject = `[Confirmation] Announcement Dispatched: ${effectiveEventTitle}`;
    const totalRecipientsCount = isTestMode ? emailsToSend.length : (dispatchedCount || emailsToSend.length);

    const receiptHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #2B271F; background-color: #FBF7EE;">
        <div style="background-color: #4C5A40; color: #FFFFFF; padding: 18px 22px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">✓ Announcement Broadcast Confirmation</h2>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Event: ${effectiveEventTitle}</p>
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
                <strong>${totalRecipientsCount}</strong> ${isTestMode ? `(${emailsToSend.length} sample previews sent)` : `(${validGroupA.length} Group A, ${validGroupB.length} Group B)`}
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
            <tr>
              <td style="padding: 6px 0; color: #6A6253;"><strong>Re-Announcement Flag:</strong></td>
              <td style="padding: 6px 0;">${forceResend ? 'Yes (forceResend: true)' : 'Standard'}</td>
            </tr>
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

    const receiptText = `[Confirmation] Announcement Dispatched: ${effectiveEventTitle}\n\n` +
      `Broadcast Timestamp: ${broadcastTimestamp} (${formattedTimestamp})\n` +
      `Recipient Count: ${totalRecipientsCount} (${isTestMode ? 'Test Mode' : `${validGroupA.length} Group A, ${validGroupB.length} Group B`})\n` +
      `City: ${cityName}\n` +
      `Winning Date: ${winningDate}\n` +
      `Time Window: ${timeWindow || 'TBD'}\n` +
      `${(cleanVenueName || cleanVenueAddress) ? `Venue: ${cleanVenueName ? (cleanVenueAddress ? `${cleanVenueName} (${cleanVenueAddress})` : cleanVenueName) : cleanVenueAddress}\n` : ''}` +
      `${ticketUrl ? `RSVP Link: ${ticketUrl}\n` : ''}` +
      `${customNote ? `Host Note: "${customNote}"\n` : ''}\n` +
      `Re-Announcement Flag: ${forceResend ? 'Yes (forceResend: true)' : 'Standard'}\n\n` +
      `==================== FULL ANNOUNCEMENT CONTENT ====================\n\n` +
      samplePreview.text;

    // Dual-admin recipient list: guaranteed delivery to both admin@actuallylets.com and ademola@actuallylets.com
    const dualAdminList = Array.from(
      new Set(
        [
          "admin@actuallylets.com",
          "ademola@actuallylets.com",
          process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : "",
        ]
          .filter(Boolean)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => EMAIL_REGEX.test(e))
      )
    );

    const adminConfirmations: Array<{
      email: string;
      status: "sent" | "failed";
      id?: string;
      error?: string;
    }> = [];

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // Send isolated individual dispatches to each admin mailbox
      await Promise.allSettled(
        dualAdminList.map(async (adminAddr) => {
          try {
            const receiptRes = await resend.emails.send({
              from: SENDER_IDENTITY,
              to: [adminAddr],
              replyTo: REPLY_TO_ADDRESS,
              subject: receiptSubject,
              html: receiptHtml,
              text: receiptText,
            });

            if (receiptRes.error) {
              console.error(`[EMAIL AUDIT] Failed to dispatch admin confirmation receipt to ${adminAddr}:`, receiptRes.error);
              adminConfirmations.push({
                email: adminAddr,
                status: "failed",
                error: receiptRes.error.message || "Failed to send confirmation receipt",
              });
            } else {
              const resendId = receiptRes.data?.id;
              console.log(`[EMAIL AUDIT] Admin confirmation receipt dispatched to ${adminAddr} (ID: ${resendId})`);
              adminConfirmations.push({
                email: adminAddr,
                status: "sent",
                id: resendId,
              });
            }
          } catch (receiptErr: any) {
            console.error(`[EMAIL AUDIT] Exception dispatching admin confirmation receipt to ${adminAddr}:`, receiptErr);
            adminConfirmations.push({
              email: adminAddr,
              status: "failed",
              error: receiptErr?.message || "Exception during admin receipt dispatch",
            });
          }
        })
      );
    } else {
      dualAdminList.forEach((email) => {
        adminConfirmations.push({
          email,
          status: "sent",
          id: "mock-admin-receipt-id",
        });
      });
    }

    // 7. Firestore Broadcast Audit Log
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
        groupACount: isTestMode ? (emailsToSend.length / 2) : validGroupA.length,
        groupBCount: isTestMode ? (emailsToSend.length / 2) : validGroupB.length,
        totalDispatched: dispatchedCount || emailsToSend.length,
        forceResend: Boolean(forceResend),
        eventId: eventId || undefined,
        eventTitle: eventTitle || undefined,
      });
    } catch (dbErr) {
      console.error("[Firestore Broadcast Log Error]:", dbErr);
    }

    // 8. Granular API Response Telemetry
    return NextResponse.json({
      success: true,
      isDryRun: isTestMode,
      forceResend: Boolean(forceResend),
      totalSurveysFound: totalSurveysFound ?? (rawGroupA.length + rawGroupB.length),
      validUniqueRecipients: validGroupA.length + validGroupB.length,
      groupACount: isTestMode ? (emailsToSend.length / 2) : validGroupA.length,
      groupBCount: isTestMode ? (emailsToSend.length / 2) : validGroupB.length,
      batchesDispatched,
      totalSent: dispatchedCount || emailsToSend.length,
      broadcastId,
      adminConfirmations,
      failures,
    });
  } catch (error: any) {
    console.error("[Announce Date Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during announcement dispatch" },
      { status: 500 }
    );
  }
}
