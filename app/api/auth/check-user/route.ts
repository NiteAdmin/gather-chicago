import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");

    if (!emailParam || !emailParam.includes("@")) {
      return NextResponse.json({ exists: false, error: "Valid email is required" }, { status: 400 });
    }

    const trimmedEmail = emailParam.trim().toLowerCase();

    // 1. Check Firebase Admin Auth
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUserByEmail(trimmedEmail);
        if (userRecord && userRecord.uid) {
          return NextResponse.json({ exists: true });
        }
      } catch (authErr: any) {
        if (
          authErr?.code !== "auth/user-not-found" &&
          authErr?.errorInfo?.code !== "auth/user-not-found"
        ) {
          console.warn("[CHECK-USER] adminAuth error:", authErr);
        }
      }
    }

    // 2. Check Firestore 'users' collection
    if (adminDb) {
      try {
        const userDoc = await adminDb
          .collection("users")
          .where("email", "==", trimmedEmail)
          .limit(1)
          .get();

        if (!userDoc.empty) {
          return NextResponse.json({ exists: true });
        }
      } catch (dbErr: any) {
        console.warn("[CHECK-USER] adminDb error:", dbErr);
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("[CHECK-USER] Unexpected server error:", error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailParam = body?.email;

    if (!emailParam || typeof emailParam !== "string" || !emailParam.includes("@")) {
      return NextResponse.json({ exists: false, error: "Valid email is required" }, { status: 400 });
    }

    const trimmedEmail = emailParam.trim().toLowerCase();

    // 1. Check Firebase Admin Auth
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUserByEmail(trimmedEmail);
        if (userRecord && userRecord.uid) {
          return NextResponse.json({ exists: true });
        }
      } catch (authErr: any) {
        if (
          authErr?.code !== "auth/user-not-found" &&
          authErr?.errorInfo?.code !== "auth/user-not-found"
        ) {
          console.warn("[CHECK-USER] adminAuth error:", authErr);
        }
      }
    }

    // 2. Check Firestore 'users' collection
    if (adminDb) {
      try {
        const userDoc = await adminDb
          .collection("users")
          .where("email", "==", trimmedEmail)
          .limit(1)
          .get();

        if (!userDoc.empty) {
          return NextResponse.json({ exists: true });
        }
      } catch (dbErr: any) {
        console.warn("[CHECK-USER] adminDb error:", dbErr);
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("[CHECK-USER] Unexpected server error:", error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
