import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function cleanEnvVar(val?: string): string | undefined {
  if (!val) return undefined;
  let str = val.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str || undefined;
}

function cleanPrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\\n/g, "\n");
}

const projectId = cleanEnvVar(process.env.FIREBASE_PROJECT_ID);
const clientEmail = cleanEnvVar(process.env.FIREBASE_CLIENT_EMAIL);
const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (!projectId || !clientEmail || !privateKey) {
  console.warn("[FIREBASE-ADMIN] Missing service account environment variables.");
}

let app: any = null;
try {
  if (getApps().length > 0) {
    app = getApps()[0];
  } else if (projectId && clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
} catch (initErr) {
  console.error("[FIREBASE-ADMIN] Initialization error:", initErr);
  app = null;
}

export const adminDb = app ? getFirestore(app) : null;
export const adminAuth = app ? getAuth(app) : null;
