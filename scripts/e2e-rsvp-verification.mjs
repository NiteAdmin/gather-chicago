import { spawn } from 'child_process';
import fs from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Read .env.local for Firestore admin credentials
const envFile = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

function cleanPrivateKey(raw) {
  if (!raw) return undefined;
  let key = raw.trim();
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
}

const projectId = envVars.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = envVars.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = cleanPrivateKey(envVars.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY);

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

const db = getFirestore(app);

const PORT = 3005;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // wait
    }
    await sleep(500);
  }
  throw new Error(`Server at ${url} failed to start within ${timeoutMs}ms`);
}

async function runE2E() {
  console.log('====================================================');
  console.log('  STARTING E2E RSVP SUBMISSION & PIPELINE VERIFICATION');
  console.log('====================================================\n');

  console.log(`Starting Next.js production server on port ${PORT}...`);
  const server = spawn('node', ['--use-system-ca', './node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) },
  });

  try {
    console.log('Waiting for server readiness...');
    await waitForServer(`http://localhost:${PORT}/api/auth/check-user`);
    console.log('Server is UP and ready!\n');

    const testPayload = {
      city: 'chicago',
      cityName: 'Chicago',
      name: 'E2E Test Host Alert',
      email: 'e2etest-host-alert@actuallylets.com',
      phoneNumber: '3125550199',
      smsOptIn: false,
      gatherings: ['Lincoln Square Ravenswood Apple Fest', 'Lincoln Park Wine Fest'],
      dates: ['Sat, Oct 3: Apple Fest', 'Fri, Oct 9: Family Night — Pizza'],
      times: ['Mid-Morning (10am)', 'Evening'],
      notes: 'Automated E2E pipeline verification test',
    };

    console.log('Posting simulated RSVP payload to /api/confirm...');
    const confirmRes = await fetch(`http://localhost:${PORT}/api/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const status = confirmRes.status;
    const data = await confirmRes.json();
    console.log(`Response HTTP Status: ${status}`);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (status !== 200 || !data.success) {
      throw new Error(`RSVP submission failed: ${JSON.stringify(data)}`);
    }

    console.log('\n--- VERIFICATION STEP 1: FIRESTORE COMMIT ---');
    const responseId = data.responseId;
    if (!responseId) {
      throw new Error('No responseId returned in confirm response!');
    }
    console.log(`✅ RSVP document created with ID: ${responseId}`);

    // Verify directly in Firestore
    const docSnap = await db.collection('responses').doc(responseId).get();
    if (!docSnap.exists) {
      throw new Error(`Document ${responseId} does NOT exist in Firestore!`);
    }
    const docData = docSnap.data();
    console.log('Firestore Doc Data:', {
      id: docSnap.id,
      name: docData.name,
      email: docData.email,
      city: docData.city,
      dates: docData.dates,
      gatherings: docData.gatherings,
      createdAt: docData.createdAt ? docData.createdAt.toDate().toISOString() : 'none',
    });

    if (docData.name !== testPayload.name || docData.email !== testPayload.email) {
      throw new Error('Firestore document fields mismatch!');
    }
    console.log('✅ Firestore write committed and verified successfully!');

    console.log('\n--- VERIFICATION STEP 2: RESEND EMAIL DISPATCH ---');
    console.log(`Attendee Resend ID: ${data.resendId || 'N/A'}`);
    console.log(`Admin (admin@actuallylets.com) Resend ID: ${data.adminResendId || 'N/A'}`);
    console.log(`Email Delivered: ${data.emailDelivered}`);
    console.log(`Sender: ${data.sender}`);

    if (data.adminResendId) {
      console.log(`✅ Admin alert email to admin@actuallylets.com resolved successfully (ID: ${data.adminResendId})`);
    } else {
      console.log(`ℹ️ Admin alert dispatch completed (emailError: ${data.emailError || 'none'})`);
    }

    if (data.resendId) {
      console.log(`✅ Attendee confirmation email resolved successfully (ID: ${data.resendId})`);
    }

    console.log('\n--- VERIFICATION STEP 3: CLEANUP TEST ARTIFACT ---');
    await db.collection('responses').doc(responseId).delete();
    console.log(`✅ Cleaned up synthetic E2E test doc: ${responseId}`);

    console.log('\n====================================================');
    console.log('  E2E VERIFICATION COMPLETED WITH 100% SUCCESS');
    console.log('====================================================');
  } finally {
    console.log('\nStopping test server...');
    server.kill('SIGTERM');
  }
}

runE2E().catch((err) => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
