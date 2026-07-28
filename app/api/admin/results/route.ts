import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { passcode, city } = await request.json().catch(() => ({}));

    // Check passcode against environment variable
    if (!passcode || passcode !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized passcode' }, { status: 401 });
    }

    // Fetch responses using client SDK instance on server side
    const snapshot = await getDocs(collection(db, 'responses'));
    let responses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by city if specified and not 'all'
    if (city && typeof city === 'string' && city.toLowerCase() !== 'all') {
      const targetCity = city.toLowerCase();
      responses = responses.filter((r: any) => {
        // Fallback unassigned/legacy documents to 'chicago'
        const docCity = (r.city || 'chicago').toLowerCase();
        return docCity === targetCity;
      });
    }

    return NextResponse.json({ responses });
  } catch (error: any) {
    console.error('Error fetching admin results:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch results' }, { status: 500 });
  }
}
