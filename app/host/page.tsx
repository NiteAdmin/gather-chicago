"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Sparkles, Users, Calendar, HeartHandshake } from "lucide-react";
import { formatPhoneNumber } from "@/lib/formatPhone";
import UserNavButton from "@/components/nav/UserNavButton";

export default function HostApplicationPage() {
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [concept, setConcept] = useState("Social & Casual Dinners");
  const [communitySize, setCommunitySize] = useState("15–50 members");
  const [tier, setTier] = useState<"standard" | "custom">("standard");
  const [availability, setAvailability] = useState("");
  const [notes, setNotes] = useState("");
  const [websiteHoneypot, setWebsiteHoneypot] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedTier, setSubmittedTier] = useState<"standard" | "custom">("standard");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedCity = city.trim();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedCity || !trimmedName || !trimmedEmail || !concept) {
      setErrorMsg("Please fill out all required fields (Name, Email, City, and Gathering Type).");
      return;
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setErrorMsg("Please provide a valid email address.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/host-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          phone: phone.trim() || undefined,
          city: trimmedCity,
          concept,
          communitySize,
          tier,
          availability: tier === "custom" && availability.trim() ? availability.trim() : undefined,
          notes: notes.trim() || undefined,
          websiteHoneypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit host application.");
      }

      setSubmittedTier(tier);
      setSuccess(true);
      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setCity("");
      setTier("standard");
      setAvailability("");
      setNotes("");
    } catch (err: any) {
      console.error("Host application error:", err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2B271F] font-sans-hanken antialiased flex flex-col">
      <style jsx global>{`
        .font-serif-fraunces {
          font-family: 'Fraunces', var(--font-fraunces), Georgia, serif;
        }
        .font-sans-hanken {
          font-family: 'Hanken Grotesk', var(--font-hanken-grotesk), -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      {/* HEADER / NAVIGATION */}
      <header className="border-b border-[#D8CEBC]/60 bg-[#F4EEE2]/80 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90 shrink-0"
          >
            <span className="font-serif-fraunces font-black text-xl sm:text-2xl text-[#2B271F] tracking-tight">
              Actually, Let&apos;s
            </span>
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest bg-[#EDE4D3] text-[#4C5A40] px-2 py-0.5 rounded-full font-bold">
              SERIES
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-[#6A6253]">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 hover:text-[#2B271F] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <UserNavButton />
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-14">
        {/* HERO INTRO */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FBF7EE] text-[#C8643F] border border-[#D8CEBC] text-[11px] sm:text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>HOST ADMIN ACCESS</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-serif-fraunces text-[#2B271F] tracking-tight leading-tight">
            Lead Actually, Let&apos;s in Your City
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#6A6253] max-w-xl mx-auto leading-relaxed">
            Turn messy group chats into effortless, recurring gatherings. Apply to lead your city chapter or coordinate your community meetups with our host tools.
          </p>

          {/* BENEFIT PILLS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 max-w-2xl mx-auto text-left">
            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#EDE4D3] text-[#C8643F] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2B271F]">Consensus Engine</h4>
                <p className="text-[11px] text-[#6A6253] mt-0.5">Let members vote on vibes &amp; dates without group-chat debates.</p>
              </div>
            </div>

            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#EDE4D3] text-[#4C5A40] shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2B271F]">Automated Invites</h4>
                <p className="text-[11px] text-[#6A6253] mt-0.5">Live calendar syncs, email dispatches, and SMS reminders.</p>
              </div>
            </div>

            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#EDE4D3] text-[#6E7F5E] shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2B271F]">Community Impact</h4>
                <p className="text-[11px] text-[#6A6253] mt-0.5">Every series supports local non-profits and sustainable city projects.</p>
              </div>
            </div>
          </div>
        </div>

        {/* APPLICATION FORM OR CONFIRMATION CARD */}
        {success ? (
          <div className="bg-[#FBF7EE] border-2 border-[#6E7F5E] rounded-3xl p-8 sm:p-12 text-center shadow-lg animate-fade-in max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#EDE4D3] text-[#4C5A40] mx-auto flex items-center justify-center mb-5 text-3xl shadow-inner">
              🎉
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#4C5A40]">
              APPLICATION RECEIVED
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
              Welcome to the Host Community!
            </h2>
            {submittedTier === "custom" ? (
              <p className="text-sm text-[#6A6253] mt-3 leading-relaxed">
                Thank you for applying to host with <strong>Actually, Let&apos;s</strong>. We received your request for a <strong>Custom Dashboard</strong> and will reach out via email shortly to schedule your 20-minute discovery consultation.
              </p>
            ) : (
              <p className="text-sm text-[#6A6253] mt-3 leading-relaxed">
                Thank you for applying to host with <strong>Actually, Let&apos;s</strong>. We&apos;ll review your concept and reach out via email with your Host Admin workspace access and onboarding steps.
              </p>
            )}

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto bg-[#2B271F] hover:bg-[#C8643F] text-[#FBF7EE] text-xs font-semibold py-3 px-6 rounded-xl transition-colors text-center"
              >
                ← Return to Home
              </Link>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="w-full sm:w-auto text-xs text-[#C8643F] hover:text-[#b05230] font-bold py-3 px-6 rounded-xl border border-[#D8CEBC] hover:border-[#C8643F] bg-white transition-all cursor-pointer"
              >
                Submit another inquiry
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-6 sm:p-10 shadow-md">
            <div className="mb-6 pb-6 border-b border-[#D8CEBC]/60">
              <h2 className="text-xl sm:text-2xl font-bold font-serif-fraunces text-[#2B271F]">
                Host Application Form
              </h2>
              <p className="text-xs sm:text-sm text-[#6A6253] mt-1">
                Tell us about yourself and the gathering experiences you&apos;d love to cultivate.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-[#FDF2F0] border border-[#F5C2BA] text-[#A63A24] text-xs font-semibold rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Anti-spam Honeypot */}
              <div style={{ display: "none" }} aria-hidden="true">
                <input
                  type="text"
                  name="websiteHoneypot"
                  value={websiteHoneypot}
                  onChange={(e) => setWebsiteHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Row 1: Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    Full Name <span className="text-[#C8643F]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jordan Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    Email Address <span className="text-[#C8643F]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jordan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Phone & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    Phone Number <span className="text-[11px] font-normal text-[#8C8270]">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(312) 555-0198"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    City / Metro Area <span className="text-[#C8643F]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chicago, IL or Denver, CO"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                  />
                </div>
              </div>

              {/* Row 3: Preferred Gathering Type & Community Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    Preferred Gathering Type <span className="text-[#C8643F]">*</span>
                  </label>
                  <select
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors cursor-pointer"
                  >
                    <option value="Social & Casual Dinners">Social &amp; Casual Dinners</option>
                    <option value="Outdoor & Active">Outdoor &amp; Active (Hiking, Paddling, Running)</option>
                    <option value="Wellness & Movement">Wellness &amp; Movement (Yoga, Mindfulness)</option>
                    <option value="Creative / Tech">Creative / Tech / Founders</option>
                    <option value="Family Friendly">Family Friendly &amp; Parents</option>
                    <option value="Bespoke / Other">Bespoke / Social Club</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    Estimated Group Size
                  </label>
                  <select
                    value={communitySize}
                    onChange={(e) => setCommunitySize(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors cursor-pointer"
                  >
                    <option value="1–15 members">1–15 members (Intimate circles &amp; dinners)</option>
                    <option value="15–50 members">15–50 members (Mid-sized community chapters)</option>
                    <option value="50+ members">50+ members (Large scale events &amp; clubs)</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Experience / Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                  Experience, Vision &amp; Notes <span className="text-[11px] font-normal text-[#8C8270]">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us a little about your community, gathering ideas, or types of venues you'd love to partner with..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors resize-y"
                />
              </div>

              {/* Row 5: Host Operating Plan (Tier Selection) */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253]">
                  SELECT HOST OPERATING PLAN <span className="text-[#C8643F]">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card A: Standard Host Dashboard */}
                  <button
                    type="button"
                    onClick={() => setTier("standard")}
                    className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      tier === "standard"
                        ? "bg-[#FBF7EE] border-[#C8643F] ring-2 ring-[#E07A5F] shadow-sm"
                        : "bg-white border-[#D8CEBC] hover:border-[#C8643F]/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-bold text-base text-[#2B271F] font-serif-fraunces">
                          Standard Host Dashboard
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDE4D3] text-[#4C5A40] shrink-0">
                          Turnkey Platform
                        </span>
                      </div>
                      <p className="text-xs text-[#6A6253] leading-relaxed">
                        Full access to our standard Chapter Admin suite: dynamic member directory, calendar scheduling, automated RSVP tracking, and broadcast tooling.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#D8CEBC]/50 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#4C5A40]">
                        Monthly platform fee upon approval
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                          tier === "standard"
                            ? "border-[#C8643F] bg-[#C8643F]"
                            : "border-[#D8CEBC] bg-white"
                        }`}
                      >
                        {tier === "standard" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                    </div>
                  </button>

                  {/* Card B: Custom Dashboard */}
                  <button
                    type="button"
                    onClick={() => setTier("custom")}
                    className={`relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      tier === "custom"
                        ? "bg-[#FBF7EE] border-[#C8643F] ring-2 ring-[#E07A5F] shadow-sm"
                        : "bg-white border-[#D8CEBC] hover:border-[#C8643F]/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-bold text-base text-[#2B271F] font-serif-fraunces">
                          Custom Dashboard
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5E6E1] text-[#C8643F] shrink-0">
                          Consultation &amp; Custom Build
                        </span>
                      </div>
                      <p className="text-xs text-[#6A6253] leading-relaxed">
                        Tailored feature set, custom branding, specialized member intake workflows, and custom integrations.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#D8CEBC]/50 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#C8643F]">
                        Includes a 1-on-1 discovery call to scope your chapter requirements.
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                          tier === "custom"
                            ? "border-[#C8643F] bg-[#C8643F]"
                            : "border-[#D8CEBC] bg-white"
                        }`}
                      >
                        {tier === "custom" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Conditional Discovery Step (If "Custom" is selected) */}
                {tier === "custom" && (
                  <div className="p-4 bg-[#EDE4D3]/50 border border-[#D8CEBC] rounded-2xl space-y-3 animate-fade-in mt-3">
                    <div className="flex items-start gap-2.5 text-xs text-[#2B271F]">
                      <Sparkles className="w-4 h-4 text-[#E07A5F] shrink-0 mt-0.5" />
                      <p className="font-medium leading-relaxed">
                        We&apos;ll schedule a 20-minute discovery session right after submission to map out your custom tools.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                        Preferred meeting availability / timezone <span className="text-[11px] font-normal text-[#8C8270]">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Weekdays after 2 PM CST, or Fridays anytime"
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#C8643F] hover:bg-[#b05230] text-white py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <span>Submit Host Application →</span>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-[#8C8270] text-center pt-2 leading-relaxed">
                ✦ Host Admin Beta includes automated calendar availability polling, broadcast alerts, and dynamic event feeds.
              </p>
            </form>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#D8CEBC]/70 py-8 text-center text-xs text-[#6A6253] bg-[#EDE4D3]/40">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center items-center gap-3 sm:gap-4">
          <Link href="/" className="hover:text-[#2B271F] transition-colors">
            Home
          </Link>
          <span>▪</span>
          <Link href="/chicago" className="hover:text-[#2B271F] transition-colors">
            Chicago Series
          </Link>
          <span>▪</span>
          <Link href="/privacy" className="hover:text-[#2B271F] transition-colors">
            Privacy Policy
          </Link>
          <span>▪</span>
          <Link href="/terms" className="hover:text-[#2B271F] transition-colors">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
