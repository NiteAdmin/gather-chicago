import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { passcode } = await request.json();

    // Check passcode against environment variable
    if (!passcode || passcode !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized passcode' }, { status: 401 });
    }

    // Fetch responses using client SDK instance on server side
    const snapshot = await getDocs(collection(db, 'responses'));
    const responses = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json({ responses });
  } catch (error: any) {
    console.error('Error fetching admin results:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch results' }, { status: 500 });
  }
}
