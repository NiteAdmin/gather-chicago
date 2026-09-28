import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

function cleanEnvVar(val?: string): string | undefined {
  if (!val) return undefined;
  let str = val.trim();
  while (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str || undefined;
}

function cleanPrivateKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

const projectId = cleanEnvVar(process.env.FIREBASE_PROJECT_ID);
const clientEmail = cleanEnvVar(process.env.FIREBASE_CLIENT_EMAIL);
const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (!projectId || !clientEmail || !privateKey) {
  console.warn(
    "[FIREBASE-ADMIN] Missing service account environment variables:",
    {
      hasProjectId: Boolean(projectId),
      hasClientEmail: Boolean(clientEmail),
      hasPrivateKey: Boolean(privateKey),
    }
  );
}

let app: App | null = null;
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

export const adminDb: Firestore | null = (() => {
  try {
    return app ? getFirestore(app) : null;
  } catch (svcErr) {
    console.error("[FIREBASE-ADMIN] Firestore initialization error:", svcErr);
    return null;
  }
})();

export const adminAuth: Auth | null = (() => {
  try {
    return app ? getAuth(app) : null;
  } catch (svcErr) {
    console.error("[FIREBASE-ADMIN] Auth initialization error:", svcErr);
    return null;
  }
})();
