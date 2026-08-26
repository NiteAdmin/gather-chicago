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
  venueName: string;
  venueAddress: string;
  ticketUrl?: string;
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

    if (!venueName || !venueName.trim() || !venueAddress || !venueAddress.trim()) {
      return NextResponse.json(
        { error: "Venue name and address are required" },
        { status: 400 }
      );
    }

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
        venueName,
        venueAddress,
        ticketUrl,
        customNote,
      });

      const sampleB = generateWinningDateEmailGroupB({
        name: "Admin (Test Preview - Group B)",
        cityName,
        winningDate,
        timeWindow,
        venueName,
        venueAddress,
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
          venueName,
          venueAddress,
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
          venueName,
          venueAddress,
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

    // 5. Firestore Broadcast Audit Log (for live runs, or flagged as dry-run)
    let broadcastId = "audit-log-disabled";
    try {
      broadcastId = await logBroadcast({
        city: city || "chicago",
        winningDate,
        timeWindow,
        venueName,
        venueAddress,
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
