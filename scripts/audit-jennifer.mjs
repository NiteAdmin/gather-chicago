import fs from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Read .env.local
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

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin credentials in .env.local');
  process.exit(1);
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

const db = getFirestore(app);

async function runAudit() {
  console.log('Fetching responses from Firestore...');
  const snapshot = await db.collection('responses').get();
  console.log(`Total responses in collection: ${snapshot.size}`);

  const jenniferMatches = [];
  const dateRangeMatches = [];
  const allDocs = [];

  const startRange = new Date('2026-09-26T00:00:00.000Z');
  const endRange = new Date('2026-09-29T00:00:00.000Z');

  snapshot.forEach(doc => {
    const data = doc.data();
    const docInfo = { id: doc.id, ...data };
    allDocs.push(docInfo);

    // Check name
    const name = String(data.name || '');
    if (name.toLowerCase().includes('jennifer')) {
      jenniferMatches.push(docInfo);
    }

    // Check created date
    let createdAtDate = null;
    if (data.createdAt) {
      if (typeof data.createdAt.toDate === 'function') {
        createdAtDate = data.createdAt.toDate();
      } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
        createdAtDate = new Date(data.createdAt);
      }
    } else if (data.submittedAt) {
      if (typeof data.submittedAt.toDate === 'function') {
        createdAtDate = data.submittedAt.toDate();
      } else {
        createdAtDate = new Date(data.submittedAt);
      }
    } else if (data.timestamp) {
      if (typeof data.timestamp.toDate === 'function') {
        createdAtDate = data.timestamp.toDate();
      } else {
        createdAtDate = new Date(data.timestamp);
      }
    }

    if (createdAtDate && createdAtDate >= startRange && createdAtDate <= endRange) {
      dateRangeMatches.push({ ...docInfo, _parsedCreatedAt: createdAtDate });
    }
  });

  console.log('\n--- JENNIFER SEARCH RESULTS ---');
  if (jenniferMatches.length > 0) {
    console.log(`Found ${jenniferMatches.length} record(s) matching "Jennifer":`);
    jenniferMatches.forEach((rec, i) => {
      console.log(`\nMatch #${i + 1}:`);
      console.log(JSON.stringify(rec, null, 2));
    });
  } else {
    console.log('No records found with name containing "Jennifer" (case-insensitive).');
  }

  console.log('\n--- RECORDS CREATED BETWEEN SEPT 26, 2026 AND SEPT 28, 2026 ---');
  console.log(`Found ${dateRangeMatches.length} record(s) in this date range.`);
  dateRangeMatches.forEach((rec, i) => {
    console.log(`\nRange Match #${i + 1}: ID: ${rec.id}, Name: ${rec.name}, Email: ${rec.email}, Phone: ${rec.phoneNumber || rec.phone}, CreatedAt: ${rec._parsedCreatedAt}`);
    console.log('Full record:', JSON.stringify(rec, null, 2));
  });

  console.log('\n--- ALL RECENT RESPONSES (SUMMARY) ---');
  allDocs.forEach((d) => {
    let createdStr = 'Unknown';
    if (d.createdAt && typeof d.createdAt.toDate === 'function') {
      createdStr = d.createdAt.toDate().toISOString();
    } else if (d.createdAt) {
      createdStr = JSON.stringify(d.createdAt);
    }
    console.log(`Doc ID: ${d.id} | Name: ${d.name} | Email: ${d.email} | Phone: ${d.phoneNumber || d.phone || 'none'} | City: ${d.city} | CreatedAt: ${createdStr}`);
  });
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
