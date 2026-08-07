'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface IntroPageProps {
  initialVariant?: string;
}

export default function IntroPage({ initialVariant = '1' }: IntroPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantFromQuery = searchParams.get('variant');

  const [activeVariant, setActiveVariant] = useState<string>(
    variantFromQuery || initialVariant || '1'
  );

  useEffect(() => {
    if (variantFromQuery && ['1', '2', '3'].includes(variantFromQuery)) {
      setActiveVariant(variantFromQuery);
    }
  }, [variantFromQuery]);

  const handleVariantSwitch = (v: string) => {
    setActiveVariant(v);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', v);
    window.history.pushState({}, '', url.toString());
  };

  // Cycler text state for Variant 3
  const rotatingActivities = [
    'yoga & mimosas',
    'rooftop mocktails',
    'ladies’ night dinners',
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

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.15);
          }
        }

        @keyframes cardFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
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

      {/* STAKEHOLDER VARIANT REVIEW TOOLBAR */}
      <aside aria-label="Stakeholder Review Bar" className="sticky top-0 z-50 bg-[#2B271F] text-[#F4EEE2] px-4 py-2.5 shadow-md border-b border-[#4C5A40]">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#E08A63] animate-pulse" />
            <span className="font-medium tracking-wide uppercase text-[11px] text-[#D8CEBC]">
              Stakeholder Review Mode
            </span>
            <span className="hidden sm:inline text-[#6A6253]">|</span>
            <span className="hidden sm:inline text-[#D8CEBC]/90 font-serif-fraunces italic">
              Actually Let’s Landing Page
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1F1B15] p-1 rounded-full border border-[#4C5A40]/40">
            <button
              onClick={() => handleVariantSwitch('1')}
              className={`px-3 py-1 rounded-full transition-all font-medium ${
                activeVariant === '1'
                  ? 'bg-[#C8643F] text-white shadow-sm'
                  : 'text-[#D8CEBC] hover:text-white'
              }`}
            >
              1. Editorial Warmth
            </button>
            <button
              onClick={() => handleVariantSwitch('2')}
              className={`px-3 py-1 rounded-full transition-all font-medium ${
                activeVariant === '2'
                  ? 'bg-[#6E7F5E] text-white shadow-sm'
                  : 'text-[#D8CEBC] hover:text-white'
              }`}
            >
              2. Split Canvas
            </button>
            <button
              onClick={() => handleVariantSwitch('3')}
              className={`px-3 py-1 rounded-full transition-all font-medium ${
                activeVariant === '3'
                  ? 'bg-[#4C5A40] text-white shadow-sm'
                  : 'text-[#D8CEBC] hover:text-white'
              }`}
            >
              3. Card Deck
            </button>
          </div>
        </div>
      </aside>

      {/* TOP NAVIGATION BAR */}
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between font-sans-hanken">
        <Link href="/" className="group flex items-center gap-2 text-decoration-none">
          <span className="text-xl font-bold font-serif-fraunces tracking-tight text-[#2B271F] group-hover:text-[#C8643F] transition-colors">
            Actually Let’s
          </span>
          <span className="text-[11px] uppercase tracking-widest text-[#C8643F] font-semibold bg-[#EDE4D3] px-2 py-0.5 rounded-full">
            Series
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-[#6A6253]">
          <a
            href="#cities"
            className="hover:text-[#2B271F] transition-colors hidden sm:inline"
          >
            Cities
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#2B271F] transition-colors"
          >
            How It Works
          </a>
          <Link
            href="/chicago"
            className="bg-[#2B271F] hover:bg-[#C8643F] text-[#FBF7EE] px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow"
          >
            Chicago RSVP →
          </Link>
        </nav>
      </header>

      {/* VARIANT 1: EDITORIAL WARMTH */}
      {activeVariant === '1' && (
        <main className="max-w-4xl mx-auto px-6 pt-8 pb-24 font-sans-hanken">
          {/* HERO */}
          <section className="text-center pt-8 pb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-[#EDE4D3] text-[#C8643F] text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-6 border border-[#D8CEBC]/60">
              <span className="w-2 h-2 rounded-full bg-[#C8643F]" />
              Community-Led Gatherings
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-serif-fraunces text-[#2B271F] leading-[1.05] tracking-tight max-w-3xl mx-auto">
              Gatherings people <em className="italic font-normal text-[#4C5A40]">actually</em> want to attend.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-[#6A6253] max-w-2xl mx-auto leading-relaxed">
              No more chaotic group chats or lukewarm RSVPs. We tally neighborhood availability, pick the winning date, and host relaxed yoga mornings, mimosa brunches, and evening mixers.
            </p>

            {/* CITY TEASER PILLS */}
            <div id="cities" className="mt-10 pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/chicago"
                className="group flex items-center gap-2.5 bg-[#FBF7EE] hover:bg-white border-2 border-[#C8643F] text-[#2B271F] px-5 py-2.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all scale-100 hover:scale-[1.02]"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#6E7F5E] animate-pulse" />
                <span className="font-semibold text-sm">Chicago</span>
                <span className="text-xs bg-[#EDE4D3] text-[#C8643F] font-bold px-2 py-0.5 rounded-full">
                  Active Series
                </span>
                <span className="text-[#C8643F] group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>

              <div className="flex items-center gap-2 bg-[#EDE4D3]/70 border border-[#D8CEBC] text-[#6A6253] px-4 py-2.5 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-[#A89F91]" />
                <span>Austin</span>
                <span className="text-[11px] text-[#6A6253] bg-[#D8CEBC]/50 px-2 py-0.5 rounded-full">
                  Launching Soon
                </span>
              </div>

              <div className="flex items-center gap-2 bg-[#EDE4D3]/70 border border-[#D8CEBC] text-[#6A6253] px-4 py-2.5 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-[#A89F91]" />
                <span>New York</span>
                <span className="text-[11px] text-[#6A6253] bg-[#D8CEBC]/50 px-2 py-0.5 rounded-full">
                  Expanding 2026
                </span>
              </div>
            </div>

            {/* SMOOTH SCROLL ANCHOR */}
            <div className="mt-12">
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#6A6253] hover:text-[#2B271F] transition-colors py-2 px-4 rounded-full border border-transparent hover:border-[#D8CEBC]"
              >
                <span>Explore how it works</span>
                <span className="text-base animate-bounce">↓</span>
              </a>
            </div>
          </section>

          {/* 3-CARD HOW IT WORKS GRID */}
          <section id="how-it-works" className="pt-16 pb-12 animate-fade-in-delayed">
            <div className="text-center mb-12">
              <span className="text-xs uppercase tracking-widest font-bold text-[#4C5A40]">
                Simple & Consensus-Driven
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-2">
                How Actually Let’s Works
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-7 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="text-4xl font-bold font-serif-fraunces text-[#C8643F]/30 group-hover:text-[#C8643F]/60 transition-colors mb-4">
                  01
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F] mb-2">
                  Vote on Vibes & Dates
                </h3>
                <p className="text-sm text-[#6A6253] leading-relaxed">
                  Pick the gathering styles you’d love (moms morning, ladies’ night, couples date) and mark the exact dates and times that fit your real calendar.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-7 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="text-4xl font-bold font-serif-fraunces text-[#4C5A40]/30 group-hover:text-[#4C5A40]/60 transition-colors mb-4">
                  02
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F] mb-2">
                  Real-Time Consensus
                </h3>
                <p className="text-sm text-[#6A6253] leading-relaxed">
                  Our system aggregates neighborhood availability in real-time. Once critical mass aligns on a winning slot, the host venue is confirmed.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-7 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="text-4xl font-bold font-serif-fraunces text-[#6E7F5E]/30 group-hover:text-[#6E7F5E]/60 transition-colors mb-4">
                  03
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F] mb-2">
                  Invite & Give Back
                </h3>
                <p className="text-sm text-[#6A6253] leading-relaxed">
                  You receive an official ticket link with guaranteed attendance. A portion of every ticket directly supports local cultural & sustainability non-profits.
                </p>
              </div>
            </div>
          </section>

          {/* FINAL CTA SECTION */}
          <section className="mt-8 bg-[#EDE4D3] border border-[#D8CEBC] rounded-3xl p-8 sm:p-12 text-center shadow-sm animate-fade-in-delayed-2">
            <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F]">
              Ready to begin?
            </h2>
            <p className="mt-3 text-base text-[#6A6253] max-w-md mx-auto">
              Takes about 60 seconds. Pick your favorite days for Chicago and shape the upcoming gathering.
            </p>
            <div className="mt-8">
              <Link
                href="/chicago"
                className="inline-flex items-center justify-center gap-3 bg-[#C8643F] hover:bg-[#B35532] text-white text-base font-semibold px-8 py-4 rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <span>Find your time in Chicago</span>
                <span className="text-lg">→</span>
              </Link>
            </div>
            <p className="mt-4 text-xs text-[#6A6253]">
              Free to submit · Instant email confirmation with preferred times
            </p>
          </section>
        </main>
      )}

      {/* VARIANT 2: SPLIT CANVAS */}
      {activeVariant === '2' && (
        <main className="max-w-5xl mx-auto px-6 pt-6 pb-24 font-sans-hanken">
          {/* HERO SPLIT */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-8 pb-16 animate-fade-in">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#4C5A40] text-[#FBF7EE] text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
                <span>🌿</span>
                Consensus-Powered Events
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-serif-fraunces text-[#2B271F] leading-[1.08] tracking-tight">
                Bringing back the warmth of gathering <em className="italic font-normal text-[#C8643F]">in person</em>.
              </h1>

              <p className="text-base sm:text-lg text-[#6A6253] leading-relaxed max-w-xl">
                We make city life feel like a village again. Pick your favorite vibes, vote for times that work for you, and we’ll match you with curated groups and warm venues.
              </p>

              {/* City Row */}
              <div id="cities" className="pt-2 flex flex-wrap gap-2.5">
                <Link
                  href="/chicago"
                  className="inline-flex items-center gap-2 bg-[#2B271F] hover:bg-[#C8643F] text-white px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-[#6E7F5E]" />
                  <span>Chicago · Open Now</span>
                  <span>→</span>
                </Link>
                <span className="inline-flex items-center gap-1.5 bg-[#EDE4D3] text-[#6A6253] px-3.5 py-2 rounded-full text-xs font-medium border border-[#D8CEBC]">
                  Austin (Soon)
                </span>
                <span className="inline-flex items-center gap-1.5 bg-[#EDE4D3] text-[#6A6253] px-3.5 py-2 rounded-full text-xs font-medium border border-[#D8CEBC]">
                  NYC (2026)
                </span>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link
                  href="/chicago"
                  className="bg-[#C8643F] hover:bg-[#B35532] text-white px-6 py-3.5 rounded-full font-semibold text-sm shadow-md transition-all"
                >
                  Shape Chicago Gatherings →
                </Link>
                <a
                  href="#how-it-works"
                  className="text-xs uppercase tracking-widest font-bold text-[#4C5A40] hover:text-[#2B271F] transition-colors"
                >
                  See timeline ↓
                </a>
              </div>
            </div>

            {/* Right Column: Interactive Live Preview Card */}
            <div className="lg:col-span-5 bg-[#4C5A40] text-[#FBF7EE] p-8 rounded-3xl shadow-xl border border-[#394430] space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#6E7F5E]/40 pb-4">
                <span className="text-xs font-mono tracking-wider uppercase text-[#D8CEBC]">
                  Live Pulse · Chicago
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#E08A63] bg-[#2B271F]/40 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#E08A63] animate-ping" />
                  Survey Active
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-[#D8CEBC] uppercase font-bold tracking-wider">
                    Current Top Gatherings
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="bg-[#3A4531] p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span>☕ Moms Morning</span>
                      <span className="font-bold text-[#E08A63]">Leading Vote</span>
                    </div>
                    <div className="bg-[#3A4531] p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span>🥂 Couples / Date Night</span>
                      <span className="font-bold text-[#D8CEBC]">Strong Contender</span>
                    </div>
                    <div className="bg-[#3A4531] p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span>✨ Ladies’ Night</span>
                      <span className="font-bold text-[#D8CEBC]">Trending</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#6E7F5E]/40 text-xs text-[#D8CEBC]/80 italic">
                  “A portion of every ticket supports the Institute of Cultural Affairs (ICA), Chicago.”
                </div>
              </div>

              <Link
                href="/chicago"
                className="block text-center w-full bg-[#FBF7EE] hover:bg-white text-[#2B271F] font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow"
              >
                Cast Your Availability Vote
              </Link>
            </div>
          </section>

          {/* VERTICAL TIMELINE HOW IT WORKS */}
          <section id="how-it-works" className="pt-16 pb-12 border-t border-[#D8CEBC]/60">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <span className="text-xs uppercase tracking-widest font-bold text-[#C8643F]">
                The Three-Step Loop
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                How our consensus model works
              </h2>
            </div>

            <div className="max-w-xl mx-auto relative pl-8 border-l-2 border-[#6E7F5E]/40 space-y-10">
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-[#C8643F] text-white flex items-center justify-center font-bold text-sm shadow">
                  1
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Submit Your Availability
                </h3>
                <p className="mt-2 text-sm text-[#6A6253] leading-relaxed">
                  Select gathering themes you care about, pick the dates and times that work for you, and write in any custom preferences in 60 seconds.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-[#4C5A40] text-white flex items-center justify-center font-bold text-sm shadow">
                  2
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Neighborhood Consensus Tally
                </h3>
                <p className="mt-2 text-sm text-[#6A6253] leading-relaxed">
                  When enough neighbors align on the same calendar window, we reserve space at a curated local venue and set the program.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-[#6E7F5E] text-white flex items-center justify-center font-bold text-sm shadow">
                  3
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Gather, Meet & Connect
                </h3>
                <p className="mt-2 text-sm text-[#6A6253] leading-relaxed">
                  Receive your email invitation and RSVP ticket link. Enjoy relaxed, non-awkward conversations with verified local guests.
                </p>
              </div>
            </div>
          </section>

          {/* FINAL CTA BAR */}
          <section className="mt-12 bg-[#4C5A40] text-[#FBF7EE] rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif-fraunces">
                Ready to begin?
              </h2>
              <p className="text-sm text-[#D8CEBC] mt-1 max-w-md">
                Lock in your Chicago vote today and be first on the invite list.
              </p>
            </div>
            <Link
              href="/chicago"
              className="whitespace-nowrap bg-[#E08A63] hover:bg-[#C8643F] text-white font-semibold px-8 py-4 rounded-full shadow-md transition-all text-sm uppercase tracking-wide"
            >
              Start Chicago RSVP →
            </Link>
          </section>
        </main>
      )}

      {/* VARIANT 3: INTERACTIVE CARD DECK */}
      {activeVariant === '3' && (
        <main className="max-w-4xl mx-auto px-6 pt-6 pb-24 font-sans-hanken">
          {/* HERO */}
          <section className="text-center pt-8 pb-14 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-[#FBF7EE] text-[#4C5A40] border border-[#D8CEBC] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-sm">
              <span>✦</span>
              Consensus-Driven Community
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold font-serif-fraunces text-[#2B271F] leading-[1.1] tracking-tight max-w-3xl mx-auto">
              Let’s make time for{' '}
              <span className="inline-block text-[#C8643F] transition-all duration-300 font-serif-fraunces underline decoration-[#E08A63]/50 decoration-wavy underline-offset-8">
                {rotatingActivities[activityIndex]}
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#6A6253] max-w-2xl mx-auto leading-relaxed">
              We replace guesswork with community consensus. Vote on your preferred gatherings and dates, and we’ll coordinate the rest.
            </p>

            {/* CITY DECK */}
            <div id="cities" className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              {/* Chicago Card */}
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
                <p className="text-xs text-[#6A6253] mb-3">
                  Fall Series survey open. Voting in progress across Lincoln Park, Lakeview, and West Loop.
                </p>
                <div className="text-xs font-bold text-[#C8643F] flex items-center gap-1 group-hover:gap-2 transition-all">
                  <span>Enter RSVP</span>
                  <span>→</span>
                </div>
              </Link>

              {/* Austin Card */}
              <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-5 rounded-2xl opacity-80">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    Austin
                  </span>
                  <span className="text-[10px] bg-[#D8CEBC] text-[#6A6253] px-2 py-0.5 rounded-full font-bold uppercase">
                    Soon
                  </span>
                </div>
                <p className="text-xs text-[#6A6253]">
                  Waitlist opening soon for South Congress & East Austin community circles.
                </p>
              </div>

              {/* NYC Card */}
              <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-5 rounded-2xl opacity-80">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    New York
                  </span>
                  <span className="text-[10px] bg-[#D8CEBC] text-[#6A6253] px-2 py-0.5 rounded-full font-bold uppercase">
                    2026
                  </span>
                </div>
                <p className="text-xs text-[#6A6253]">
                  Brooklyn & Manhattan gatherings launching in the next phase.
                </p>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="mt-10">
              <a
                href="#how-it-works"
                className="text-xs uppercase tracking-widest font-bold text-[#6A6253] hover:text-[#2B271F] transition-colors"
              >
                How the deck works ↓
              </a>
            </div>
          </section>

          {/* INTERACTIVE STEP DECK */}
          <section id="how-it-works" className="pt-14 pb-12">
            <div className="text-center mb-10">
              <span className="text-xs uppercase tracking-widest font-bold text-[#4C5A40]">
                The Experience Deck
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                How It Works
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#C8643F] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                    You Choose Your Ideal Time & Vibe
                  </h3>
                  <p className="text-sm text-[#6A6253] mt-1">
                    Select activities you genuinely enjoy and pick any dates or write-in times that work for your schedule.
                  </p>
                </div>
              </div>

              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#4C5A40] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                    We Tally Neighborhood Consensus
                  </h3>
                  <p className="text-sm text-[#6A6253] mt-1">
                    No awkward attendance guarantees required upfront. We only lock dates once enough guests commit.
                  </p>
                </div>
              </div>

              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#6E7F5E] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                    You Receive Direct Invite & Ticket RSVP
                  </h3>
                  <p className="text-sm text-[#6A6253] mt-1">
                    Once unlocked, receive your private ticket link and gather in a warm, welcoming local space.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FINAL CTA ELEVATED CARD */}
          <section className="mt-8 bg-gradient-to-br from-[#FBF7EE] to-[#EDE4D3] border-2 border-[#D8CEBC] rounded-3xl p-8 sm:p-12 text-center shadow-lg">
            <span className="text-xs uppercase tracking-widest font-bold text-[#C8643F]">
              Ready to begin?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-2">
              Shape Chicago’s Next Gathering
            </h2>
            <p className="text-sm text-[#6A6253] max-w-md mx-auto mt-2">
              Takes just a minute to cast your dates and preferences.
            </p>
            <div className="mt-7">
              <Link
                href="/chicago"
                className="inline-flex items-center gap-2.5 bg-[#2B271F] hover:bg-[#C8643F] text-white px-8 py-4 rounded-full font-semibold text-sm tracking-wide shadow-md hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                <span>Ready to begin? RSVP Chicago</span>
                <span>→</span>
              </Link>
            </div>
          </section>
        </main>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#D8CEBC]/70 py-10 text-center text-xs text-[#6A6253] font-sans-hanken bg-[#EDE4D3]/40">
        <div className="max-w-4xl mx-auto px-6 space-y-3">
          <div className="flex justify-center items-center gap-4 text-xs font-medium">
            <Link href="/chicago" className="hover:text-[#2B271F] underline">Chicago Series</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[#2B271F]">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#2B271F]">Terms</Link>
            <span>•</span>
            <Link href="/admin" className="hover:text-[#2B271F]">Host Dashboard</Link>
          </div>
          <p>
            Actually Let’s · A portion of every ticket supports local community & sustainability initiatives.
          </p>
        </div>
      </footer>
    </div>
  );
}
