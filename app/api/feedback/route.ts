import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type AllowedReaction = "Energizing" | "Relaxed" | "Deep Talk";

const VALID_REACTIONS: AllowedReaction[] = ["Energizing", "Relaxed", "Deep Talk"];

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

    const memberId =
      memberPhoneOrEmail && typeof memberPhoneOrEmail === "string" && memberPhoneOrEmail.trim()
        ? memberPhoneOrEmail.trim()
        : "anonymous";

    const cleanCity =
      city && typeof city === "string" && city.trim()
        ? city.trim().toLowerCase()
        : "chicago";

    const feedbackRecord = {
      eventId: trimmedEventId,
      reaction: cleanReaction,
      createdAt: new Date().toISOString(),
      memberId,
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
