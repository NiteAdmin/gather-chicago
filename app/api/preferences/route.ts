import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { responseId, userId, email, city, dates = [], gatherings = [], deletedDate } = body;

    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const targetUserId = typeof userId === "string" ? userId.trim() : "";
    const cleanDates = Array.isArray(dates)
      ? dates.slice(0, 50).map((d) => String(d).trim().slice(0, 100)).filter(Boolean)
      : [];
    const cleanGatherings = Array.isArray(gatherings)
      ? gatherings.slice(0, 50).map((g) => String(g).trim().slice(0, 100)).filter(Boolean)
      : [];
    const cleanCity = typeof city === "string" ? city.trim().toLowerCase() : "";

    if (!adminDb) {
      console.error("[PREFERENCES API ERROR] adminDb is not initialized");
      return NextResponse.json(
        { error: "Database service unavailable" },
        { status: 503 }
      );
    }

    let updated = false;
    let targetResponseId = responseId || "";

    // 1. If responseId provided, update document directly
    if (responseId && typeof responseId === "string" && responseId.trim()) {
      try {
        const docRef = adminDb.collection("responses").doc(responseId.trim());
        const snap = await docRef.get();
        if (snap.exists) {
          const updatePayload: Record<string, any> = {
            dates: cleanDates,
            availabilityDates: cleanDates,
            gatherings: cleanGatherings,
            updatedAt: FieldValue.serverTimestamp(),
          };
          const data = snap.data();
          if (data?.customDate && (!cleanDates.includes(data.customDate) || data.customDate === deletedDate)) {
            updatePayload.customDate = FieldValue.delete();
          }
          await docRef.update(updatePayload);
          updated = true;
          targetResponseId = docRef.id;
        }
      } catch (err) {
        console.warn("[PREFERENCES API] Could not update response by responseId:", err);
      }
    }

    // 2. Query ALL response documents by email to prevent stale responses resurrecting purged dates
    if (trimmedEmail) {
      try {
        let query: FirebaseFirestore.Query = adminDb.collection("responses").where("email", "==", trimmedEmail);
        if (cleanCity) {
          query = query.where("city", "==", cleanCity);
        }
        let snap = await query.get();
        if (snap.empty && cleanCity) {
          // Fallback to email query without city filter if city casing differed
          snap = await adminDb.collection("responses").where("email", "==", trimmedEmail).get();
        }
        if (!snap.empty) {
          for (const doc of snap.docs) {
            const data = doc.data();
            const updatePayload: Record<string, any> = {
              dates: cleanDates,
              availabilityDates: cleanDates,
              gatherings: cleanGatherings,
              updatedAt: FieldValue.serverTimestamp(),
            };
            if (data?.customDate && (!cleanDates.includes(data.customDate) || data.customDate === deletedDate)) {
              updatePayload.customDate = FieldValue.delete();
            }
            await doc.ref.update(updatePayload);
          }
          updated = true;
          if (!targetResponseId) {
            targetResponseId = snap.docs[0].id;
          }
        }
      } catch (err) {
        console.warn("[PREFERENCES API] Could not update response by email:", err);
      }
    }

    // 3. Update user document(s) in 'users' collection (sync preferredDates and availabilityDates)
    const userPayload = {
      preferredDates: cleanDates,
      availabilityDates: cleanDates,
      dates: cleanDates,
      vibes: cleanGatherings,
      preferredVibes: cleanGatherings,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (targetUserId) {
      try {
        await adminDb.collection("users").doc(targetUserId).set(userPayload, { merge: true });
        updated = true;
      } catch (uidErr) {
        console.warn("[PREFERENCES API] Could not update user by userId:", uidErr);
      }
    }

    if (trimmedEmail) {
      try {
        const userQuery = await adminDb.collection("users").where("email", "==", trimmedEmail).get();
        if (!userQuery.empty) {
          for (const userDoc of userQuery.docs) {
            await userDoc.ref.set(userPayload, { merge: true });
          }
          updated = true;
        }
      } catch (userErr) {
        console.warn("[PREFERENCES API] Could not update user document preferences by email:", userErr);
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      responseId: targetResponseId || undefined,
      dates: cleanDates,
      gatherings: cleanGatherings,
    });
  } catch (error: any) {
    console.error("[PREFERENCES API FATAL EXCEPTION]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update preferences" },
      { status: 500 }
    );
  }
}
