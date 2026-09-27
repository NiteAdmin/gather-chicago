import { NextRequest, NextResponse } from "next/server";
import { getEventById } from "@/lib/eventsConfig";
import { getEventDateTimes, getCommunityEventPhase } from "@/lib/eventStatus";
import { adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { eventId, userId, status } = body;

    const trimmedEventId = typeof eventId === "string" ? eventId.trim() : "";
    if (!trimmedEventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const targetEvent = getEventById(trimmedEventId);
    if (!targetEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Temporal lockout evaluation
    const { startIso } = getEventDateTimes(targetEvent);
    const startMs = new Date(startIso).getTime();
    const phase = getCommunityEventPhase(targetEvent);

    if ((!isNaN(startMs) && startMs < Date.now()) || phase === "afterglow" || phase === "archived") {
      return NextResponse.json(
        { error: "Cannot RSVP for a past gathering" },
        { status: 400 }
      );
    }

    const newStatus = status === "open" ? "open" : "attending";

    // Persist to Firestore if user identifier is provided
    if (userId && typeof userId === "string" && userId.trim()) {
      const cleanUserId = userId.trim();
      try {
        if (adminDb) {
          const userRef = adminDb.collection("users").doc(cleanUserId);
          const snap = await userRef.get();
          const existing = snap.data() || {};
          let rsvpEventIds: string[] = Array.isArray(existing.rsvpEventIds)
            ? existing.rsvpEventIds
            : [];
          let declinedEventIds: string[] = Array.isArray(existing.declinedEventIds)
            ? existing.declinedEventIds
            : [];

          if (newStatus === "attending") {
            rsvpEventIds = Array.from(new Set([...rsvpEventIds, trimmedEventId]));
            declinedEventIds = declinedEventIds.filter((id) => id !== trimmedEventId);
          } else {
            rsvpEventIds = rsvpEventIds.filter((id) => id !== trimmedEventId);
            declinedEventIds = Array.from(new Set([...declinedEventIds, trimmedEventId]));
          }

          await userRef.set(
            {
              rsvpEventIds,
              declinedEventIds,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } else {
          const userRef = doc(db, "users", cleanUserId);
          const snap = await getDoc(userRef);
          const existing = snap.data() || {};
          let rsvpEventIds: string[] = Array.isArray(existing.rsvpEventIds)
            ? existing.rsvpEventIds
            : [];
          let declinedEventIds: string[] = Array.isArray(existing.declinedEventIds)
            ? existing.declinedEventIds
            : [];

          if (newStatus === "attending") {
            rsvpEventIds = Array.from(new Set([...rsvpEventIds, trimmedEventId]));
            declinedEventIds = declinedEventIds.filter((id) => id !== trimmedEventId);
          } else {
            rsvpEventIds = rsvpEventIds.filter((id) => id !== trimmedEventId);
            declinedEventIds = Array.from(new Set([...declinedEventIds, trimmedEventId]));
          }

          await setDoc(
            userRef,
            {
              rsvpEventIds,
              declinedEventIds,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (dbErr) {
        console.warn("Could not persist RSVP to Firestore in /api/rsvp:", dbErr);
      }
    }

    return NextResponse.json(
      { success: true, eventId: trimmedEventId, status: newStatus },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in /api/rsvp POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process RSVP" },
      { status: 500 }
    );
  }
}
