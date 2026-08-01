import { NextResponse } from "next/server";
import { fetchResponses } from "@/lib/firebase";
import { sendSms } from "@/lib/twilio";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, adminSecret, city } = body;

    // Verify Admin Passcode
    const expectedSecret = process.env.ADMIN_SECRET || "admin123";
    if (!adminSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Incorrect admin passcode" },
        { status: 401 }
      );
    }

    // Validate SMS message length (max 160 characters)
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    if (!trimmedMessage) {
      return NextResponse.json(
        { error: "SMS message text is required." },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 160) {
      return NextResponse.json(
        { error: "SMS message exceeds maximum length of 160 characters." },
        { status: 400 }
      );
    }

    // Fetch all Firestore survey responses
    const allResponses = await fetchResponses();

    // Filter responses where smsOptIn === true and valid phoneNumber exists
    const targetCity = typeof city === "string" ? city.toLowerCase() : "all";

    const optedInResponses = allResponses.filter((r) => {
      const matchesSmsOptIn = Boolean(r.smsOptIn);
      const sanitizedPhone = r.phoneNumber ? r.phoneNumber.replace(/\D/g, "") : "";
      const hasValidPhone = sanitizedPhone.length >= 10;

      if (!matchesSmsOptIn || !hasValidPhone) return false;

      if (targetCity !== "all") {
        const docCity = (r.city || "chicago").toLowerCase();
        return docCity === targetCity;
      }

      return true;
    });

    // Extract unique 10-digit phone numbers
    const uniquePhones = Array.from(
      new Set(
        optedInResponses
          .map((r) => r.phoneNumber?.replace(/\D/g, "").slice(-10))
          .filter((p): p is string => Boolean(p && p.length === 10))
      )
    );

    if (uniquePhones.length === 0) {
      return NextResponse.json(
        { error: "No opted-in SMS recipients with valid phone numbers found for this city selection." },
        { status: 400 }
      );
    }

    console.log(`Broadcasting SMS to ${uniquePhones.length} recipients...`);

    // Send SMS texts in parallel using Twilio
    const sendResults = await Promise.allSettled(
      uniquePhones.map((phone) => {
        const e164Phone = `+1${phone}`;
        return sendSms(e164Phone, trimmedMessage);
      })
    );

    const sentCount = sendResults.filter(
      (res) => res.status === "fulfilled" && res.value !== null
    ).length;

    const failedCount = uniquePhones.length - sentCount;

    return NextResponse.json({
      success: true,
      recipientCount: uniquePhones.length,
      sentCount,
      failedCount,
    });
  } catch (error: any) {
    console.error("Admin SMS broadcast route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send SMS broadcast" },
      { status: 500 }
    );
  }
}
