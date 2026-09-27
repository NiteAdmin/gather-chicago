import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getEventById } from "@/lib/eventsConfig";
import { checkEventDateMatch } from "@/lib/userEvents";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type AllowedReaction = "Energizing" | "Relaxed" | "Deep Talk";

export function normalizeReaction(raw: any): AllowedReaction | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "Energizing" || trimmed.endsWith("Energizing")) return "Energizing";
  if (trimmed === "Relaxed" || trimmed.endsWith("Relaxed")) return "Relaxed";
  if (trimmed === "Deep Talk" || trimmed.endsWith("Deep Talk")) return "Deep Talk";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { eventId, reaction, memberPhoneOrEmail, city } = body;

    const trimmedEventId = typeof eventId === "string" ? eventId.trim() : "";
    const cleanReaction = normalizeReaction(reaction);

    if (!trimmedEventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    if (!cleanReaction) {
      return NextResponse.json(
        { error: "reaction must be one of: 'Energizing', 'Relaxed', 'Deep Talk'" },
        { status: 400 }
      );
    }

    const rawIdentifier =
      typeof memberPhoneOrEmail === "string" ? memberPhoneOrEmail.trim() : "";

    if (!rawIdentifier || rawIdentifier.toLowerCase() === "anonymous") {
      return NextResponse.json(
        { error: "Member did not attend this event" },
        { status: 403 }
      );
    }

    const targetEvent = getEventById(trimmedEventId);
    if (
      !targetEvent ||
      targetEvent.isPolledOption === true ||
      targetEvent.title.includes("(Polled Gathering)") ||
      targetEvent.id.includes("legacy") ||
      targetEvent.id.includes("polled") ||
      targetEvent.categoryLabel?.toLowerCase().includes("polled")
    ) {
      return NextResponse.json(
        { error: "Member did not attend this event" },
        { status: 403 }
      );
    }

    // Server-side verification: Query responses and users to confirm an authentic RSVP exists
    let isAttendeeVerified = false;
    const normalizedEmail = rawIdentifier.toLowerCase();
    const rawDigits = rawIdentifier.replace(/\D/g, "");
    const phoneDigits = rawDigits.length >= 7 ? rawDigits.slice(-10) : "";

    // 1. Check responses collection in Firestore
    try {
      let responsesDocs: any[] = [];
      if (adminDb) {
        const snap = await adminDb.collection("responses").get();
        responsesDocs = snap.docs.map((d) => d.data());
      } else {
        const snap = await getDocs(collection(db, "responses"));
        responsesDocs = snap.docs.map((d) => d.data());
      }

      for (const r of responsesDocs) {
        if (!r) continue;
        if (
          r.deleted === true ||
          r.isDeleted === true ||
          r.archived === true ||
          r._orphaned === true
        ) {
          continue;
        }
        const rEmail = (r.email || "").trim().toLowerCase();
        const rPhoneDigits = (r.phoneNumber || "").replace(/\D/g, "");
        const emailMatches = Boolean(normalizedEmail && rEmail && rEmail === normalizedEmail);
        const phoneMatches = Boolean(phoneDigits && rPhoneDigits && rPhoneDigits.endsWith(phoneDigits));

        if (emailMatches || phoneMatches) {
          if (Array.isArray(r.eventIds) && r.eventIds.includes(trimmedEventId)) {
            isAttendeeVerified = true;
            break;
          }
          const userDates = [
            ...(Array.isArray(r.dates) ? r.dates : typeof r.dates === "string" ? [r.dates] : []),
            ...(r.customDate ? [r.customDate] : []),
          ];
          if (checkEventDateMatch(targetEvent, userDates)) {
            isAttendeeVerified = true;
            break;
          }
        }
      }
    } catch (err) {
      console.warn("Could not query responses for feedback attendee verification:", err);
    }

    // 2. Check users collection in Firestore (for direct dashboard registered RSVPs)
    if (!isAttendeeVerified) {
      try {
        let usersDocs: any[] = [];
        if (adminDb) {
          const snap = await adminDb.collection("users").get();
          usersDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } else {
          const snap = await getDocs(collection(db, "users"));
          usersDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        for (const u of usersDocs) {
          if (!u) continue;
          if (
            u.deleted === true ||
            u.isDeleted === true ||
            u.archived === true ||
            u._orphaned === true
          ) {
            continue;
          }
          const uEmail = (u.email || "").trim().toLowerCase();
          const uPhoneDigits = (u.phoneNumber || "").replace(/\D/g, "");
          const idMatches = Boolean(u.id && u.id === rawIdentifier);
          const emailMatches = Boolean(normalizedEmail && uEmail && uEmail === normalizedEmail);
          const phoneMatches = Boolean(phoneDigits && uPhoneDigits && uPhoneDigits.endsWith(phoneDigits));

          if (idMatches || emailMatches || phoneMatches) {
            const isDeclined = Array.isArray(u.declinedEventIds) && u.declinedEventIds.includes(trimmedEventId);
            const isRsvpd = Array.isArray(u.rsvpEventIds) && u.rsvpEventIds.includes(trimmedEventId);
            if (isRsvpd && !isDeclined) {
              isAttendeeVerified = true;
              break;
            }
          }
        }
      } catch (err) {
        console.warn("Could not query users for feedback attendee verification:", err);
      }
    }

    if (!isAttendeeVerified) {
      return NextResponse.json(
        { error: "Member did not attend this event" },
        { status: 403 }
      );
    }

    const cleanCity =
      city && typeof city === "string" && city.trim()
        ? city.trim().toLowerCase()
        : "chicago";

    const feedbackRecord = {
      eventId: trimmedEventId,
      reaction: cleanReaction,
      createdAt: new Date().toISOString(),
      memberId: rawIdentifier,
      city: cleanCity,
    };

    if (adminDb) {
      await adminDb.collection("event_feedback").add(feedbackRecord);
    } else {
      await addDoc(collection(db, "event_feedback"), feedbackRecord);
    }

    return NextResponse.json(
      { success: true, reaction: cleanReaction },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in /api/feedback POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record event feedback" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId")?.trim();

    let docs: any[] = [];

    if (adminDb) {
      let ref: any = adminDb.collection("event_feedback");
      if (eventId) {
        ref = ref.where("eventId", "==", eventId);
      }
      const snap = await ref.get();
      docs = snap.docs.map((doc: any) => doc.data());
    } else {
      const colRef = collection(db, "event_feedback");
      if (eventId) {
        const q = query(colRef, where("eventId", "==", eventId));
        const snap = await getDocs(q);
        docs = snap.docs.map((doc) => doc.data());
      } else {
        const snap = await getDocs(colRef);
        docs = snap.docs.map((doc) => doc.data());
      }
    }

    const counts: Record<AllowedReaction, number> = {
      Energizing: 0,
      Relaxed: 0,
      "Deep Talk": 0,
    };

    for (const d of docs) {
      const r = normalizeReaction(d.reaction);
      if (r && counts[r] !== undefined) {
        counts[r]++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        eventId: eventId || null,
        counts,
        total: docs.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("Error in /api/feedback GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
