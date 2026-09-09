import { NextResponse } from 'next/server';
import { fetchBroadcasts, logBroadcast } from '@/lib/firebase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || undefined;
    const querySecret = searchParams.get('secret');
    const headerSecret = req.headers.get('x-admin-secret');

    const expectedSecret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSCODE || 'admin123';
    const activeSecret = headerSecret || querySecret;

    if (!activeSecret || activeSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin passcode' },
        { status: 401 }
      );
    }

    const broadcasts = await fetchBroadcasts(city);
    return NextResponse.json({ success: true, broadcasts });
  } catch (error: any) {
    console.error('Error in GET /api/admin/broadcasts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      adminSecret,
      city,
      winningDate,
      timeWindow,
      venueName,
      venueAddress,
      ticketUrl,
      eventUrl,
      customNote,
      groupACount = 0,
      groupBCount = 0,
      totalDispatched = 0,
    } = body;

    const expectedSecret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSCODE || 'admin123';
    const headerSecret = req.headers.get('x-admin-secret');
    const activeSecret = adminSecret || headerSecret;

    if (!activeSecret || activeSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin passcode' },
        { status: 401 }
      );
    }

    if (!winningDate || !venueName || !venueAddress) {
      return NextResponse.json(
        { error: 'Missing required broadcast parameters (winningDate, venueName, venueAddress)' },
        { status: 400 }
      );
    }

    const effectiveEventUrl = eventUrl || ticketUrl;

    const broadcastId = await logBroadcast({
      city: city || 'chicago',
      winningDate,
      timeWindow: timeWindow || '10:00 AM – 12:00 PM CDT',
      venueName,
      venueAddress,
      ticketUrl: effectiveEventUrl,
      eventUrl: effectiveEventUrl,
      customNote,
      groupACount: Number(groupACount) || 0,
      groupBCount: Number(groupBCount) || 0,
      totalDispatched: Number(totalDispatched) || 0,
    });

    return NextResponse.json({
      success: true,
      broadcastId,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/broadcasts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log broadcast' },
      { status: 500 }
    );
  }
}
