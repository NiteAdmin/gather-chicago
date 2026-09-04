import { NextResponse } from "next/server";
import { Resend } from "resend";
import { fetchBroadcasts, getBroadcastById, BroadcastRecord } from "@/lib/firebase";
import {
  generateWinningDateEmailGroupA,
  generateWinningDateEmailGroupB,
} from "@/lib/emailTemplates";

interface ResendInviteRequestBody {
  contactEmail: string;
  contactName?: string;
  votedDates?: string[] | string;
  broadcastId?: string;
  cityName?: string;
  adminSecret?: string;
}

export async function POST(req: Request) {
  try {
    const body: ResendInviteRequestBody = await req.json().catch(() => ({}));
    const {
      contactEmail,
      contactName,
      votedDates,
      broadcastId,
      cityName,
      adminSecret,
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

    // 2. Input Validation (Single recipient lock)
    if (!contactEmail || typeof contactEmail !== "string" || !contactEmail.includes("@")) {
      return NextResponse.json(
        { error: "A single valid contactEmail string is required" },
        { status: 400 }
      );
    }

    // Disallow batch arrays
    if (Array.isArray(contactEmail)) {
      return NextResponse.json(
        { error: "Batch recipient arrays are disallowed on this endpoint. Use single email address." },
        { status: 400 }
      );
    }

    // 3. Broadcast Lookup
    let broadcast: BroadcastRecord | null = null;
    if (broadcastId && broadcastId.trim()) {
      broadcast = await getBroadcastById(broadcastId.trim());
    }

    if (!broadcast) {
      const citySlug = cityName ? cityName.toLowerCase() : "chicago";
      const broadcasts = await fetchBroadcasts(citySlug);
      if (broadcasts.length > 0) {
        broadcast = broadcasts[0];
      }
    }

    if (!broadcast) {
      return NextResponse.json(
        { error: "No active broadcast record found for this city. Please announce winning date first." },
        { status: 404 }
      );
    }

    // 4. Segmentation & Template Generation
    const rawDates: string[] = Array.isArray(votedDates)
      ? votedDates
      : typeof votedDates === "string"
      ? [votedDates]
      : [];

    const normalizedDates = rawDates.map((d) => d.toLowerCase().trim());
    const winningDateLower = (broadcast.winningDate || "").toLowerCase().trim();

    const isGroupA =
      normalizedDates.includes("any date") ||
      normalizedDates.includes("any") ||
      normalizedDates.includes("either") ||
      normalizedDates.some((d) => d.length > 0 && (winningDateLower.includes(d) || d.includes(winningDateLower)));

    const recipientName = contactName?.trim() || "there";
    const targetCityName = cityName || (broadcast.city ? (broadcast.city.charAt(0).toUpperCase() + broadcast.city.slice(1)) : "Chicago");

    const templateParams = {
      name: recipientName,
      cityName: targetCityName,
      winningDate: broadcast.winningDate,
      timeWindow: broadcast.timeWindow,
      venueName: broadcast.venueName || undefined,
      venueAddress: broadcast.venueAddress || undefined,
      ticketUrl: broadcast.ticketUrl,
      customNote: broadcast.customNote,
    };

    const template = isGroupA
      ? generateWinningDateEmailGroupA(templateParams)
      : generateWinningDateEmailGroupB(templateParams);

    const emailRecipient = contactEmail.trim().toLowerCase();

    // 5. Single Resend Dispatch
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailId = "mock-single-dispatch";

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const res = await resend.emails.send({
        from: "Actually Let's <rsvp@actuallylets.com>",
        to: emailRecipient,
        replyTo: "admin@actuallylets.com",
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (res.error) {
        console.error("[Single Resend Invite Error]:", res.error);
        return NextResponse.json(
          { error: res.error.message || "Failed to dispatch email via Resend" },
          { status: 500 }
        );
      }

      emailId = res.data?.id || "sent";
    } else {
      console.warn("[Single Resend Invite] RESEND_API_KEY not set. Mock dispatch to:", emailRecipient);
    }

    return NextResponse.json({
      success: true,
      emailId,
      recipient: emailRecipient,
      group: isGroupA ? "A" : "B",
    });
  } catch (error: any) {
    console.error("[Resend Invite Route Exception]:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during single invite dispatch" },
      { status: 500 }
    );
  }
}
