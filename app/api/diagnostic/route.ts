import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics: Record<string, any> = {
    nodeVersion: process.version,
    vercelEnv: process.env.VERCEL_ENV || "none",
    vercelRegion: process.env.VERCEL_REGION || "none",
    envCheck: {
      FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID),
      FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      FIREBASE_PRIVATE_KEY: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
      FIREBASE_PRIVATE_KEY_STARTS_WITH_QUOTE: process.env.FIREBASE_PRIVATE_KEY ? (process.env.FIREBASE_PRIVATE_KEY.startsWith('"') || process.env.FIREBASE_PRIVATE_KEY.startsWith("'")) : false,
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      HOST_NOTIFICATION_EMAIL: Boolean(process.env.HOST_NOTIFICATION_EMAIL),
    },
    importTests: {},
  };

  // Test 1: dynamic import of firebase-admin/app
  try {
    const adminApp = await import("firebase-admin/app");
    diagnostics.importTests.firebaseAdminApp = {
      success: true,
      hasInitializeApp: typeof adminApp.initializeApp === "function",
    };
  } catch (err: any) {
    diagnostics.importTests.firebaseAdminApp = {
      success: false,
      error: err?.message || String(err),
      code: err?.code,
      stack: err?.stack,
    };
  }

  // Test 2: dynamic import of firebase-admin/firestore
  try {
    const adminFs = await import("firebase-admin/firestore");
    diagnostics.importTests.firebaseAdminFirestore = {
      success: true,
      hasGetFirestore: typeof adminFs.getFirestore === "function",
    };
  } catch (err: any) {
    diagnostics.importTests.firebaseAdminFirestore = {
      success: false,
      error: err?.message || String(err),
      code: err?.code,
      stack: err?.stack,
    };
  }

  // Test 3: import lib/firebaseAdmin.ts
  try {
    const fbAdmin = await import("@/lib/firebaseAdmin");
    diagnostics.importTests.libFirebaseAdmin = {
      success: true,
      hasAdminDb: Boolean(fbAdmin.adminDb),
      hasAdminAuth: Boolean(fbAdmin.adminAuth),
    };
  } catch (err: any) {
    diagnostics.importTests.libFirebaseAdmin = {
      success: false,
      error: err?.message || String(err),
      code: err?.code,
      stack: err?.stack,
    };
  }

  return NextResponse.json(diagnostics);
}
