import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PollVotePayload {
  pollId: string;
  userId?: string | null;
  email?: string | null;
  selectedOptionId: string;
  preferredDate?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: PollVotePayload = await request.json().catch(() => ({}));
    const { pollId, userId, email, selectedOptionId, preferredDate } = body;

    const trimmedPollId = typeof pollId === "string" ? pollId.trim() : "";
    if (!trimmedPollId) {
      return NextResponse.json(
        { error: "pollId is required" },
        { status: 400 }
      );
    }

    const trimmedOption = typeof selectedOptionId === "string" ? selectedOptionId.trim() : "";
    if (!trimmedOption) {
      return NextResponse.json(
        { error: "selectedOptionId is required" },
        { status: 400 }
      );
    }

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanUserId = typeof userId === "string" ? userId.trim() : "";

    if (!cleanEmail && !cleanUserId) {
      return NextResponse.json(
        { error: "email or userId is required" },
        { status: 400 }
      );
    }

    // Stable voter identifier for deduplication
    const voterKey = (cleanUserId || cleanEmail).replace(/[^a-zA-Z0-9_-]/g, "_");

    const voteRecord = {
      pollId: trimmedPollId,
      userId: cleanUserId || null,
      email: cleanEmail || null,
      selectedOptionId: trimmedOption,
      selectedStudio: trimmedOption, // alias for backwards compatibility
      preferredDate: preferredDate || null,
      dateWindow: preferredDate || null,
      voterKey,
    };

    if (adminDb) {
      // 1. Write vote under communityPolls/{pollId}/votes/{voterKey}
      const voteDocRef = adminDb
        .collection("communityPolls")
        .doc(trimmedPollId)
        .collection("votes")
        .doc(voterKey);

      await voteDocRef.set(
        {
          ...voteRecord,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Also write root summary / flat doc for query convenience
      const flatDocRef = adminDb
        .collection("communityPolls")
        .doc(`${voterKey}_${trimmedPollId}`);

      await flatDocRef.set(
        {
          ...voteRecord,
          communityVote: {
            pollId: trimmedPollId,
            selectedStudio: trimmedOption,
            preferredDate: preferredDate || null,
            dateWindow: preferredDate || null,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      // Client SDK fallback if adminDb is not initialized
      const flatDocRef = doc(db, "communityPolls", `${voterKey}_${trimmedPollId}`);
      await setDoc(
        flatDocRef,
        {
          ...voteRecord,
          communityVote: {
            pollId: trimmedPollId,
            selectedStudio: trimmedOption,
            preferredDate: preferredDate || null,
            dateWindow: preferredDate || null,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      pollId: trimmedPollId,
      voterKey,
    });
  } catch (error: any) {
    console.error("[POLL_VOTE_ROUTE_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record community poll vote" },
      { status: 500 }
    );
  }
}
