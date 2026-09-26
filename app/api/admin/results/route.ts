import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { adminDb } from '@/lib/firebaseAdmin';
import { collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { passcode, city } = await request.json().catch(() => ({}));

    // Check passcode against environment variable
    const expectedSecret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSCODE;
    if (!passcode || passcode !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized passcode' }, { status: 401 });
    }

    // Fetch responses using adminDb if available, fallback to client db
    let responses: any[] = [];
    if (adminDb) {
      const snap = await adminDb.collection('responses').get();
      responses = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      const snapshot = await getDocs(collection(db, 'responses'));
      responses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    // Filter by city if specified and not 'all'
    if (city && typeof city === 'string' && city.toLowerCase() !== 'all') {
      const targetCity = city.toLowerCase();
      responses = responses.filter((r: any) => {
        // Fallback unassigned/legacy documents to 'chicago'
        const docCity = (r.city || 'chicago').toLowerCase();
        return docCity === targetCity;
      });
    }

    // Strict filter to exclude deleted, archived, or orphaned test entries
    responses = responses.filter((r: any) => {
      if (!r) return false;
      if (r.deleted === true || r.isDeleted === true || r.archived === true) return false;
      if (r._orphaned === true || r._deleted === true) return false;
      if (
        typeof r.status === 'string' &&
        ['deleted', 'archived', 'cancelled', 'canceled'].includes(r.status.toLowerCase())
      ) {
        return false;
      }
      // Exclude empty orphaned test entries lacking identification
      if (!r.email && !r.name && !r.phoneNumber) return false;
      return true;
    });

    // Fetch registered users to hydrate active event RSVPs
    let users: any[] = [];
    try {
      if (adminDb) {
        const usersSnap = await adminDb.collection('users').get();
        users = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } else {
        const usersSnap = await getDocs(collection(db, 'users'));
        users = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      // Filter out deleted or archived user documents
      users = users.filter((u: any) => {
        if (!u) return false;
        if (u.deleted === true || u.isDeleted === true || u.archived === true) return false;
        if (u._orphaned === true || u._deleted === true) return false;
        if (
          typeof u.status === 'string' &&
          ['deleted', 'archived', 'cancelled', 'canceled'].includes(u.status.toLowerCase())
        ) {
          return false;
        }
        return true;
      });
    } catch (usersErr) {
      console.warn('Could not fetch users in admin results route:', usersErr);
    }

    return NextResponse.json(
      { responses, users },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching admin results:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch results' }, { status: 500 });
  }
}
