import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Resend } from "resend";
import { SurveyResponse } from "@/types/survey";

export async function GET(request: NextRequest) {
  return handleCronReminders(request);
}

export async function POST(request: NextRequest) {
  return handleCronReminders(request);
}

async function handleCronReminders(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const queryKey = request.nextUrl.searchParams.get("key");
    const secretHeader = request.headers.get("x-admin-secret");
    const adminSecret = process.env.ADMIN_SECRET;

    const isAuthorized =
      Boolean(adminSecret) &&
      (authHeader === `Bearer ${adminSecret}` ||
        queryKey === adminSecret ||
        secretHeader === adminSecret);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid cron authorization key or secret" },
        { status: 401 }
      );
    }

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
    const targetCity = request.nextUrl.searchParams.get("city")?.toLowerCase();

    // 1. Fetch eligible responses opting into quarterly reminders
    let q = query(
      collection(db, "responses"),
      where("quarterlyReminder", "==", true)
    );

    if (targetCity) {
      q = query(
        collection(db, "responses"),
        where("quarterlyReminder", "==", true),
        where("city", "==", targetCity)
      );
    }

    const querySnapshot = await getDocs(q);
    const allResponses = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as SurveyResponse[];

    // De-duplicate by email & city pair
    const seenMap = new Map<string, SurveyResponse>();
    for (const resp of allResponses) {
      const email = resp.email ? resp.email.trim().toLowerCase() : "";
      const city = (resp.city || "chicago").toLowerCase();
      const key = `${email}:${city}`;
      if (email && !seenMap.has(key)) {
        seenMap.set(key, resp);
      }
    }

    const recipients = Array.from(seenMap.values());

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        totalEligible: recipients.length,
        recipients: recipients.map((r) => ({
          email: r.email,
          name: r.name,
          city: r.city,
          cityName: r.cityName,
        })),
        sampleSubject: "Time to update your seasonal schedule — Actually, Let's",
      });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { success: false, error: "RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const host = request.nextUrl.host || "actuallylets.com";
    const protocol = request.nextUrl.protocol || "https:";
    const baseUrl = `${protocol}//${host}`;

    const batchEmails = recipients.map((r) => {
      const citySlug = (r.city || "chicago").toLowerCase();
      const cityName = r.cityName || (citySlug.charAt(0).toUpperCase() + citySlug.slice(1));
      const surveyUrl = `${baseUrl}/${citySlug}`;

      const html = `
        <div style="background-color: #FBF7EE; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2B271F;">
          <div style="max-width: 580px; margin: 0 auto;">
            <!-- Brand Header -->
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #2B271F; letter-spacing: -0.5px;">Actually, Let&apos;s</h1>
              <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: #C8643F; letter-spacing: 0.5px;">Seasonal Availability Check · ${cityName}</p>
            </div>

            <!-- Main Card -->
            <div style="background-color: #FFFFFF; border: 1px solid #E6DEC8; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 16px rgba(43, 39, 31, 0.05);">
              <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: bold; color: #2B271F; margin: 0 0 12px; line-height: 1.3;">
                Hi ${r.name || "friend"}, time for a quick schedule tune-up! 🌿
              </h2>
              <p style="font-size: 14px; line-height: 1.6; color: #6A6253; margin: 0 0 20px;">
                You asked us to keep your availability active. As we plan our upcoming community gatherings in <strong>${cityName}</strong>, let us know what dates, times, and activities work best for your current routine.
              </p>

              <div style="text-align: center; margin: 26px 0;">
                <a
                  href="${surveyUrl}"
                  target="_blank"
                  style="display: inline-block; background-color: #C8643F; color: #FFFFFF; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; box-shadow: 0 3px 10px rgba(200, 100, 63, 0.35);"
                >
                  Update My Availability for ${cityName} &rarr;
                </a>
              </div>

              <p style="font-size: 12px; color: #8C8270; line-height: 1.5; margin: 20px 0 0; text-align: center; border-top: 1px solid #EFEAD8; padding-top: 16px;">
                Takes less than 30 seconds. Your live calendar subscription will automatically reflect upcoming locked dates!
              </p>
            </div>
          </div>
        </div>
      `;

      return {
        from: "Actually Let's <rsvp@actuallylets.com>",
        to: [r.email],
        replyTo: "admin@actuallylets.com",
        subject: `Time to refresh your availability for Actually, Let's — ${cityName} 📅`,
        html,
        text: `Actually, Let's — ${cityName}\n\nHi ${r.name || "friend"},\n\nTime for a quick schedule tune-up! As we plan our upcoming community gatherings in ${cityName}, let us know what dates and activities work best for your current routine:\n\nUpdate here: ${surveyUrl}\n\nTakes less than 30 seconds!`,
      };
    });

    // Chunk into arrays of <= 100 per Resend batch limits
    const chunkSize = 100;
    let successfulCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < batchEmails.length; i += chunkSize) {
      const chunk = batchEmails.slice(i, i + chunkSize);
      try {
        const result = await resend.batch.send(chunk);
        if (result?.error) {
          console.error('[CRON RESEND ERROR]:', result.error);
          errors.push(result.error);
        } else if (result?.data?.data) {
          successfulCount += result.data.data.length;
        }
      } catch (chunkErr) {
        console.error("Batch dispatch error in cron reminders:", chunkErr);
        errors.push(chunkErr);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      totalEligible: recipients.length,
      dispatched: successfulCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Cron reminders fatal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute quarterly reminder cron" },
      { status: 500 }
    );
  }
}
