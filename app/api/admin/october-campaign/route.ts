import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Resend } from "resend";
import { db } from "@/lib/firebase";
import { generateOctoberPlanningEmail } from "@/lib/emailTemplates";

export const maxDuration = 60; // Allow sufficient time for batch processing

const SENDER_IDENTITY = process.env.SENDER_EMAIL || "Actually, Let's <rsvp@actuallylets.com>";
const REPLY_TO_ADDRESS = "admin@actuallylets.com";
const ADMIN_PREVIEW_RECIPIENTS = ["admin@actuallylets.com", "ademola@actuallylets.com"];

interface OctoberCampaignRequestBody {
  city?: string;
  dryRun?: boolean; // Default must be true
  customMessage?: string;
  adminSecret?: string;
}

interface IdentifiedAttendee {
  name: string;
  email: string;
  city: string;
  dates: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: OctoberCampaignRequestBody = await req.json().catch(() => ({}));
    const {
      city = "chicago",
      dryRun = true, // Strict Dry-Run Default: true
      customMessage,
      adminSecret,
    } = body;

    // 1. Admin Authentication Check
    const expectedSecret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSCODE || "admin123";
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    const headerSecret = req.headers.get("x-admin-secret");
    const activeSecret = adminSecret || authHeader || headerSecret;
    if (!activeSecret || activeSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized. Invalid admin credentials." }, { status: 401 });
    }

    // Determine Base URL with environment resilience
    const envBaseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    const host = req.headers.get("host");
    const reqBaseUrl = host ? `${host.includes("localhost") ? "http" : "https"}://${host}` : null;
    const baseUrl = envBaseUrl || reqBaseUrl || "https://actuallylets.com";

    // 2. Attendee Resolution: Query Firestore responses for Chicago Sep 26 attendees
    const targetCity = city.toLowerCase().trim();
    const responsesRef = collection(db, "responses");
    const q = query(responsesRef, where("city", "==", targetCity));
    const snapshot = await getDocs(q);

    const rawAttendees: IdentifiedAttendee[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userDates = Array.isArray(data.dates) ? data.dates : [];
      const userEmail = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

      // Target filter: Attendees who registered for Chicago's September 26 event (or "Any date")
      const matchesSep26 = userDates.some((d: string) => {
        const lower = d.toLowerCase();
        return lower.includes("sep 26") || lower.includes("any date");
      });

      if (userEmail && (matchesSep26 || targetCity === "chicago")) {
        rawAttendees.push({
          name: typeof data.name === "string" ? data.name.trim() : "Friend",
          email: userEmail,
          city: targetCity,
          dates: userDates,
        });
      }
    });

    // Deduplicate attendees by email
    const attendeeMap = new Map<string, IdentifiedAttendee>();
    rawAttendees.forEach((attendee) => {
      if (!attendeeMap.has(attendee.email)) {
        attendeeMap.set(attendee.email, attendee);
      }
    });
    const attendees = Array.from(attendeeMap.values());

    console.log(`[OCTOBER CAMPAIGN] Resolved ${attendees.length} unique Chicago attendees (dryRun: ${dryRun})`);

    // Initialize Resend if available
    const resendApiKey = process.env.RESEND_API_KEY;
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // 3. Dispatch Logic
    if (dryRun !== false) {
      // STRICT DRY-RUN MODE:
      // Send sample preview email strictly to ADMIN_PREVIEW_RECIPIENTS
      const sampleAttendee = attendees[0] || { name: "Ademola", email: "ademola@actuallylets.com" };
      const { html, text, subject } = generateOctoberPlanningEmail({
        name: sampleAttendee.name,
        email: sampleAttendee.email,
        customMessage,
        baseUrl,
      });

      const dispatchResults: any[] = [];

      if (resend) {
        for (const adminEmail of ADMIN_PREVIEW_RECIPIENTS) {
          try {
            const sendRes = await resend.emails.send({
              from: SENDER_IDENTITY,
              to: adminEmail,
              replyTo: REPLY_TO_ADDRESS,
              subject: `[DRY-RUN PREVIEW] ${subject}`,
              html,
              text,
            });
            dispatchResults.push({ recipient: adminEmail, status: "sent", id: sendRes.data?.id });
          } catch (dispatchErr: any) {
            console.error(`[DRY-RUN] Failed sending preview to ${adminEmail}:`, dispatchErr);
            dispatchResults.push({ recipient: adminEmail, status: "failed", error: dispatchErr.message });
          }
        }
      } else {
        console.warn("[DRY-RUN] RESEND_API_KEY not configured. Simulating delivery to admin inboxes.");
        ADMIN_PREVIEW_RECIPIENTS.forEach((email) => {
          dispatchResults.push({ recipient: email, status: "simulated_success", note: "Offline sandbox mode" });
        });
      }

      return NextResponse.json({
        success: true,
        mode: "dry-run",
        note: "Sample previews dispatched exclusively to admin inboxes. No live attendees were contacted.",
        totalRecipientsIdentified: attendees.length,
        sentTo: ADMIN_PREVIEW_RECIPIENTS,
        previewSubject: subject,
        sampleRecipientSample: sampleAttendee,
        dispatchResults,
      });
    }

    // 4. LIVE BLAST PIPELINE (Only when dryRun === false)
    if (!resend) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured on the server. Cannot execute live campaign blast." },
        { status: 500 }
      );
    }

    if (attendees.length === 0) {
      return NextResponse.json(
        { success: true, mode: "live", message: "No attendees found matching September 26 Chicago criteria.", totalDispatched: 0 },
        { status: 200 }
      );
    }

    // Chunking: Process in batches of 50 to respect Resend rate limits
    const CHUNK_SIZE = 50;
    const chunks: IdentifiedAttendee[][] = [];
    for (let i = 0; i < attendees.length; i += CHUNK_SIZE) {
      chunks.push(attendees.slice(i, i + CHUNK_SIZE));
    }

    let totalDispatched = 0;
    const errors: any[] = [];

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (attendee) => {
          try {
            const { html, text, subject } = generateOctoberPlanningEmail({
              name: attendee.name,
              email: attendee.email,
              customMessage,
              baseUrl,
            });

            await resend.emails.send({
              from: SENDER_IDENTITY,
              to: attendee.email,
              replyTo: REPLY_TO_ADDRESS,
              subject,
              html,
              text,
            });
            totalDispatched++;
          } catch (err: any) {
            console.error(`[LIVE BLAST] Failed to send email to ${attendee.email}:`, err);
            errors.push({ email: attendee.email, error: err.message });
          }
        })
      );

      // 400ms buffer between chunks to avoid rate throttling
      if (chunks.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    // Log the broadcast event to Firestore `broadcasts`
    try {
      await addDoc(collection(db, "broadcasts"), {
        broadcastType: "october_planning",
        city: targetCity,
        totalRecipientsIdentified: attendees.length,
        totalDispatched,
        errorCount: errors.length,
        customMessage: customMessage || null,
        dispatchedAt: serverTimestamp(),
      });
    } catch (logErr) {
      console.error("Failed to log broadcast to Firestore:", logErr);
    }

    return NextResponse.json({
      success: true,
      mode: "live",
      totalRecipientsIdentified: attendees.length,
      totalDispatched,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[OCTOBER CAMPAIGN ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute October campaign." },
      { status: 500 }
    );
  }
}
