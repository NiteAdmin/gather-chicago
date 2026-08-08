'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function IntroPage() {
  // Cycler text state for Hero headline
  const rotatingActivities = [
    'rooftop mocktails',
    'yoga mornings',
    'ladies’ nights',
    'family-friendly parks',
    'new parent brunches',
  ];
  const [activityIndex, setActivityIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % rotatingActivities.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [rotatingActivities.length]);

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2B271F] selection:bg-[#E08A63]/30">
      {/* Dynamic Keyframes & Brand CSS Variables */}
      <style jsx global>{`
        :root {
          --cream: #F4EEE2;
          --cream-2: #EDE4D3;
          --sage: #6E7F5E;
          --sage-deep: #4C5A40;
          --terra: #C8643F;
          --terra-soft: #E08A63;
          --ink: #2B271F;
          --ink-soft: #6A6253;
          --line: #D8CEBC;
          --card: #FBF7EE;
          --shadow: 0 18px 40px -22px rgba(43, 39, 31, 0.22);
          --shadow-hover: 0 24px 50px -18px rgba(43, 39, 31, 0.32);
        }

        html {
          scroll-behavior: smooth;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-fade-in-delayed {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
          opacity: 0;
        }

        .animate-fade-in-delayed-2 {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
          opacity: 0;
        }

        .font-serif-fraunces {
          font-family: 'Fraunces', var(--font-fraunces), Georgia, serif;
        }

        .font-sans-hanken {
          font-family: 'Hanken Grotesk', var(--font-hanken-grotesk), -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      {/* TOP NAVIGATION BAR (WITH RESPONSIVE FLEX SPACING & ZERO OVERLAP) */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto px-4 sm:px-8 py-4 font-sans-hanken">
        <Link href="/" className="group flex items-center gap-2 text-decoration-none shrink-0">
          <span className="font-serif-fraunces text-xl font-bold tracking-tight text-[#2B271F] group-hover:text-[#C8643F] transition-colors">
            Actually Let’s
          </span>
          <span className="rounded-full bg-[#EFEAD8] px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-[#C8643F] uppercase border border-[#D8CEBC]/60">
            SERIES
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium text-[#6A6253]">
          <a
            href="#cities"
            className="hover:text-[#2B271F] transition-colors hidden md:inline"
          >
            Cities
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#2B271F] transition-colors hidden sm:inline"
          >
            How It Works
          </a>
          <Link
            href="/chicago"
            className="bg-[#2B271F] hover:bg-[#C8643F] text-[#FBF7EE] text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-semibold tracking-wide transition-all shadow-sm hover:shadow whitespace-nowrap shrink-0"
          >
            Chicago RSVP →
          </Link>
        </nav>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-20 sm:pb-24 font-sans-hanken">
        {/* 1. HERO SECTION (CARD DECK STYLE) */}
        <section className="text-center pt-6 sm:pt-10 pb-12 sm:pb-14 animate-fade-in">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FBF7EE] text-[#4C5A40] border border-[#D8CEBC] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-sm">
            <span>✦</span>
            <span>CONSENSUS-DRIVEN COMMUNITY</span>
          </div>

          {/* Headline with Text Cycler */}
          <h1 className="text-4xl sm:text-6xl font-bold font-serif-fraunces text-[#2B271F] leading-[1.1] tracking-tight max-w-3xl mx-auto">
            Let’s make time for{' '}
            <span className="inline-block text-[#C8643F] transition-all duration-300 font-serif-fraunces underline decoration-[#E08A63]/50 decoration-wavy underline-offset-8">
              {rotatingActivities[activityIndex]}
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-6 text-base sm:text-lg text-[#6A6253] max-w-2xl mx-auto leading-relaxed">
            We replace guesswork with community consensus. Vote on your preferred gatherings and dates, and we&apos;ll coordinate the rest.
          </p>

          {/* City Cards Row */}
          <div id="cities" className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {/* Chicago Active Card */}
            <Link
              href="/chicago"
              className="bg-[#FBF7EE] hover:bg-white border-2 border-[#C8643F] p-5 rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                  Chicago
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#6E7F5E] animate-pulse" />
              </div>
              <p className="text-xs text-[#6A6253] mb-3 leading-relaxed">
                Fall Series survey open. Voting in progress across Lincoln Park, Lakeview, and West Loop.
              </p>
              <div className="text-xs font-bold text-[#C8643F] flex items-center gap-1 group-hover:gap-2 transition-all">
                <span>Enter RSVP</span>
                <span>→</span>
              </div>
            </Link>

            {/* Austin Teaser Card */}
            <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-5 rounded-2xl opacity-80">
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                  Austin
                </span>
                <span className="text-[10px] bg-[#D8CEBC] text-[#6A6253] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  SOON
                </span>
              </div>
              <p className="text-xs text-[#6A6253] leading-relaxed">
                Waitlist opening soon for South Congress &amp; East Austin community circles.
              </p>
            </div>

            {/* New York Teaser Card */}
            <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-5 rounded-2xl opacity-80">
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                  New York
                </span>
                <span className="text-[10px] bg-[#D8CEBC] text-[#6A6253] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  2027
                </span>
              </div>
              <p className="text-xs text-[#6A6253] leading-relaxed">
                Brooklyn &amp; Manhattan gatherings launching in the next phase.
              </p>
            </div>
          </div>

          {/* Smooth Scroll Indicator */}
          <div className="mt-10">
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#6A6253] hover:text-[#2B271F] transition-colors py-2 px-4 rounded-full border border-transparent hover:border-[#D8CEBC]"
            >
              <span>Explore how it works</span>
              <span className="text-base animate-bounce">↓</span>
            </a>
          </div>
        </section>

        {/* 2. HOW IT WORKS SECTION (CARD DECK STYLE FULL-WIDTH STACK) */}
        <section id="how-it-works" className="pt-14 sm:pt-16 pb-12 animate-fade-in-delayed">
          <div className="text-center mb-10">
            <span className="text-xs uppercase tracking-widest font-bold text-[#4C5A40]">
              THE EXPERIENCE DECK
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-1.5">
              How It Works
            </h2>
          </div>

          <div className="space-y-4">
            {/* Card 1 */}
            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#C8643F] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                1
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Vote on vibes &amp; dates
                </h3>
                <p className="text-sm text-[#6A6253] mt-1 leading-relaxed">
                  Pick the gatherings you&apos;d actually show up for — yoga mornings, mimosa brunches, ladies&apos; nights, couples dates — and mark the days and times that fit your real calendar.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#4C5A40] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                2
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  We find the winning time
                </h3>
                <p className="text-sm text-[#6A6253] mt-1 leading-relaxed">
                  We tally everyone&apos;s availability and lock in the slot that works for the most people. No more &lsquo;when&apos;s good for you?&rsquo; bouncing around a group chat for three weeks.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#6E7F5E] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                3
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Watch for your invite
                </h3>
                <p className="text-sm text-[#6A6253] mt-1 leading-relaxed">
                  Once the date&apos;s set, keep an eye on your inbox — we&apos;ll email you the event details, plus how to sign up and grab your ticket. A portion of every ticket supports local community and sustainability nonprofits, so a good time does a little good, too.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BOTTOM CTA ELEVATED CARD */}
        <section className="mt-8 bg-gradient-to-br from-[#FBF7EE] to-[#EDE4D3] border border-[#D8CEBC] rounded-3xl p-8 sm:p-12 text-center shadow-md animate-fade-in-delayed-2">
          <span className="text-xs uppercase tracking-wider font-bold text-[#C8643F]">
            READY TO BEGIN?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-2">
            Shape Chicago&apos;s Next Gathering
          </h2>
          <p className="text-sm sm:text-base text-[#6A6253] max-w-md mx-auto mt-2">
            Takes just a minute to cast your dates and preferences.
          </p>
          <div className="mt-7">
            <Link
              href="/chicago"
              className="inline-flex items-center gap-2.5 bg-[#2B271F] hover:bg-[#C8643F] text-[#FBF7EE] hover:text-white px-8 py-4 rounded-full font-semibold text-sm tracking-wide shadow-md hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              <span>Ready to begin? RSVP Chicago</span>
              <span>→</span>
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#6A6253]">
            Free to submit · Instant confirmation with preferred dates &amp; times
          </p>
        </section>
      </main>

      {/* 4. FOOTER */}
      <footer className="border-t border-[#D8CEBC]/70 py-10 text-center text-xs text-[#6A6253] font-sans-hanken bg-[#EDE4D3]/40">
        <div className="max-w-4xl mx-auto px-6 space-y-3">
          <div className="flex justify-center items-center gap-4 text-xs font-medium text-[#6A6253]">
            <Link href="/chicago" className="hover:text-[#2B271F] underline underline-offset-4">
              Chicago Series
            </Link>
            <span>▪</span>
            <Link href="/privacy" className="hover:text-[#2B271F] transition-colors">
              Privacy
            </Link>
            <span>▪</span>
            <Link href="/terms" className="hover:text-[#2B271F] transition-colors">
              Terms
            </Link>
          </div>
          <p>
            Actually Let’s · A portion of every ticket supports local community and sustainability nonprofits.
          </p>
        </div>
      </footer>
    </div>
  );
}
