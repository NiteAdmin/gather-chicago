import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { responseId, checkedIn } = body;

    const trimmedResponseId =
      typeof responseId === "string" ? responseId.trim() : "";

    if (!trimmedResponseId) {
      return NextResponse.json(
        { error: "responseId is required" },
        { status: 400 }
      );
    }

    if (typeof checkedIn !== "boolean") {
      return NextResponse.json(
        { error: "checkedIn must be a boolean" },
        { status: 400 }
      );
    }

    const updatePayload = {
      checkedIn,
      checkedInAt: checkedIn ? new Date().toISOString() : null,
    };

    if (adminDb) {
      await adminDb
        .collection("responses")
        .doc(trimmedResponseId)
        .set(updatePayload, { merge: true });
    } else {
      const docRef = doc(db, "responses", trimmedResponseId);
      await setDoc(docRef, updatePayload, { merge: true });
    }

    return NextResponse.json(
      { success: true, checkedIn },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in /api/admin/checkin POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update check-in status" },
      { status: 500 }
    );
  }
}
