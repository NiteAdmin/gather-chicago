import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Resend } from "resend";
import { formatPhoneNumber } from "@/lib/formatPhone";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      city,
      fullName,
      email,
      phone,
      phoneNumber,
      concept,
      communitySize,
      tier,
      availability,
      customRequirementsNotes,
      notes,
      websiteHoneypot,
    } = body;

    // 1. Anti-Spam Honeypot Trap
    if (websiteHoneypot && typeof websiteHoneypot === "string" && websiteHoneypot.trim().length > 0) {
      console.log("[HOST APPLY] Honeypot triggered. Silently rejecting bot submission.");
      return NextResponse.json({ success: true, id: "bot-trap-handled" });
    }

    // 2. Validation
    const trimmedCity = typeof city === "string" ? city.trim() : "";
    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const rawPhone = phone || phoneNumber;
    const trimmedPhone = typeof rawPhone === "string" ? rawPhone.trim() : "";
    const trimmedConcept = typeof concept === "string" ? concept.trim() : "";
    const trimmedSize = typeof communitySize === "string" && communitySize.trim() ? communitySize.trim() : "15–50 members";
    const selectedTier: "standard" | "custom" = tier === "custom" ? "custom" : "standard";
    const cleanAvailability = typeof availability === "string" && availability.trim() ? availability.trim() : null;
    const cleanCustomReqNotes = typeof customRequirementsNotes === "string" && customRequirementsNotes.trim() ? customRequirementsNotes.trim() : null;
    const trimmedNotes = typeof notes === "string" ? notes.trim() : "";

    if (!trimmedCity || !trimmedName || !trimmedEmail || !trimmedConcept) {
      return NextResponse.json(
        { error: "Please fill out all required fields (City, Name, Email, Concept)." },
        { status: 400 }
      );
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // 3. Save to Firestore collection `host_applications`
    const docRef = await addDoc(collection(db, "host_applications"), {
      city: trimmedCity,
      fullName: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone || null,
      concept: trimmedConcept,
      communitySize: trimmedSize,
      tier: selectedTier,
      availability: cleanAvailability,
      customRequirementsNotes: cleanCustomReqNotes,
      notes: trimmedNotes || null,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    console.log(`[HOST APPLY] Saved host application ${docRef.id} with tier: ${selectedTier}`);

    // 4. Send internal notification email to admin@actuallylets.com
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const adminSender = process.env.RESEND_FROM_EMAIL || "Actually Let's System <rsvp@actuallylets.com>";
        const isCustom = selectedTier === "custom";

        const subject = isCustom
          ? `[Host Application - DISCOVERY CALL REQUIRED] ${trimmedName} (${trimmedCity}) - Custom Dashboard`
          : `[Host Application - Standard] ${trimmedName} (${trimmedCity}) - Standard Host Dashboard`;

        const planBadgeHtml = isCustom
          ? `<div style="background-color: #FDF2F0; border: 1px solid #F5C2BA; color: #A63A24; padding: 14px 18px; border-radius: 10px; font-weight: 700; margin-bottom: 20px;">
               <span style="font-size: 15px;">🚨 ACTION REQUIRED: 1-ON-1 DISCOVERY CALL REQUIRED</span><br>
               <span style="font-weight: 400; font-size: 13px; color: #782615; margin-top: 4px; display: block;">
                 Applicant selected the <strong>Custom Dashboard</strong> plan (tailored feature set & custom branding). Please reach out to schedule their 20-minute discovery consultation.
               </span>
             </div>`
          : `<div style="background-color: #EBF2EA; border: 1px solid #C4D7C2; color: #355034; padding: 14px 18px; border-radius: 10px; font-weight: 700; margin-bottom: 20px;">
               <span style="font-size: 15px;">✦ STANDARD HOST DASHBOARD (TURNKEY PLATFORM)</span><br>
               <span style="font-weight: 400; font-size: 13px; color: #233622; margin-top: 4px; display: block;">
                 Applicant selected the standard operating plan. Monthly platform fee begins upon chapter approval.
               </span>
             </div>`;

        const adminEmailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #2B271F; background-color: #FBF7EE;">
            <div style="max-width: 620px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D8CEBC; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
              <h2 style="margin: 0 0 16px 0; color: #C8643F; font-size: 20px; font-weight: 700;">
                ${isCustom ? "🗓️ Host Application: Custom Dashboard (Discovery Call Needed)" : "🌿 New Host Application: Standard Operating Plan"}
              </h2>
              ${planBadgeHtml}
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                <tbody>
                  <tr style="border-bottom: 1px solid #EFEAD8;">
                    <th style="padding: 10px 8px; color: #6A6253; width: 170px; font-weight: 600;">Selected Plan</th>
                    <td style="padding: 10px 8px; color: #2B271F; font-weight: 700;">
                      ${isCustom ? "Custom Dashboard (Consultation & Custom Build)" : "Standard Host Dashboard (Turnkey Platform)"}
                    </td>
                  </tr>
                  ${isCustom && cleanAvailability ? `
                  <tr style="border-bottom: 1px solid #EFEAD8; background-color: #FAF6F0;">
                    <th style="padding: 10px 8px; color: #C8643F; font-weight: 700;">Meeting Availability</th>
                    <td style="padding: 10px 8px; color: #2B271F; font-weight: 600;">${cleanAvailability}</td>
                  </tr>` : ""}
                  <tr style="border-bottom: 1px solid #EFEAD8;">
                    <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Applicant Name</th>
                    <td style="padding: 10px 8px; color: #2B271F; font-weight: 600;">${trimmedName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #EFEAD8;">
                    <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Email</th>
                    <td style="padding: 10px 8px; color: #2B271F;"><a href="mailto:${trimmedEmail}" style="color: #C8643F; text-decoration: underline;">${trimmedEmail}</a></td>
                  </tr>
                  <tr style="border-bottom: 1px solid #EFEAD8;">
                    <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Phone</th>
                    <td style="padding: 10px 8px; color: #2B271F;">${trimmedPhone ? formatPhoneNumber(trimmedPhone) : "N/A"}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #EFEAD8;">
                    <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">City / Metro</th>
                    <td style="padding: 10px 8px; color: #2B271F;">${trimmedCity}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #EFEAD8;">
                    <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Gathering Concept</th>
                    <td style="padding: 10px 8px; color: #2B271F;">${trimmedConcept}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #EFEAD8;">
                    <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Community Size</th>
                    <td style="padding: 10px 8px; color: #2B271F;">${trimmedSize}</td>
                  </tr>
                  ${cleanCustomReqNotes ? `
                  <tr style="border-bottom: 1px solid #EFEAD8;">
                    <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Custom Requirements</th>
                    <td style="padding: 10px 8px; color: #2B271F;">${cleanCustomReqNotes}</td>
                  </tr>` : ""}
                  ${trimmedNotes ? `
                  <tr>
                    <th style="padding: 10px 8px; color: #6A6253; font-weight: 600;">Notes & Vision</th>
                    <td style="padding: 10px 8px; color: #2B271F; font-style: italic;">"${trimmedNotes}"</td>
                  </tr>` : ""}
                </tbody>
              </table>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #EFEAD8; font-size: 12px; color: #8C8270; text-align: center;">
                Actually, Let's Host Application Dispatch · <a href="mailto:${trimmedEmail}" style="color: #C8643F;">Reply to ${trimmedName}</a>
              </div>
            </div>
          </div>
        `;

        const adminEmailText = `New Host Application (${isCustom ? "DISCOVERY CALL REQUIRED" : "Standard Plan"})\n\nName: ${trimmedName}\nEmail: ${trimmedEmail}\nPhone: ${trimmedPhone || "N/A"}\nCity: ${trimmedCity}\nOperating Plan: ${isCustom ? "Custom Dashboard (Consultation & Build)" : "Standard Host Dashboard"}${isCustom && cleanAvailability ? `\nMeeting Availability: ${cleanAvailability}` : ""}\nConcept: ${trimmedConcept}\nCommunity Size: ${trimmedSize}${cleanCustomReqNotes ? `\nCustom Requirements: ${cleanCustomReqNotes}` : ""}${trimmedNotes ? `\nNotes: "${trimmedNotes}"` : ""}`;

        await resend.emails.send({
          from: adminSender,
          to: ["admin@actuallylets.com"],
          replyTo: trimmedEmail,
          subject,
          html: adminEmailHtml,
          text: adminEmailText,
        });
        console.log(`[HOST APPLY] Internal alert dispatched to admin@actuallylets.com (Tier: ${selectedTier})`);
      } catch (emailErr) {
        console.error("[HOST APPLY] Failed to dispatch internal notification email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      tier: selectedTier,
    });
  } catch (error: any) {
    console.error("[HOST APPLY] Server error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit host application" },
      { status: 500 }
    );
  }
}
