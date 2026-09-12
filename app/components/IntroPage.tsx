'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function IntroPage() {
  // Cycler text state for Hero headline
  const heroPhrases = [
    'toasting mimosas',
    'in child’s pose',
    'at the playground',
    'paddling rivers',
    'hiking the woods',
    'making new old friends',
    'giving back',
    'finding our balance',
    'golfing',
  ];
  const [activityIndex, setActivityIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % heroPhrases.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [heroPhrases.length]);

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2B271F] selection:bg-[#E08A63]/30 w-full max-w-full overflow-x-hidden">
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

      {/* TOP NAVIGATION BAR */}
      <Navbar />

      {/* MAIN CONTENT CONTAINER */}
      <main className="relative z-0 max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-20 sm:pb-24 font-sans-hanken">
        {/* 1. HERO SECTION */}
        <section className="text-center pt-6 sm:pt-10 pb-12 sm:pb-14 animate-fade-in">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FBF7EE] text-[#4C5A40] border border-[#D8CEBC] text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest px-3 sm:px-4 py-1.5 rounded-full mb-6 shadow-sm max-w-full text-center">
            <Users className="w-3.5 h-3.5 text-[var(--terra)] shrink-0" />
            <span>CONSENSUS-DRIVEN COMMUNITY GATHERINGS</span>
          </div>

          {/* Headline with Text Cycler */}
          <h1 className="text-4xl sm:text-6xl font-bold font-serif-fraunces text-[#2B271F] leading-[1.1] tracking-tight max-w-3xl mx-auto">
            Actually, Let’s{' '}
            <span className="inline-block text-[#C8643F] transition-all duration-300 font-serif-fraunces underline decoration-[#E08A63]/50 decoration-wavy underline-offset-8">
              {heroPhrases[activityIndex]}
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-6 text-base sm:text-lg text-[#6A6253] max-w-2xl mx-auto leading-relaxed">
            Coordinating effortless, recurring local gatherings without group-chat chaos.
          </p>

          {/* Active & Upcoming City Chapters Row - 4-Column Horizontal Grid */}
          <div id="cities" className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 max-w-5xl mx-auto text-left">
            {/* Chicago Active Card */}
            <Link
              href="/chicago"
              className="bg-[#FBF7EE] hover:bg-white border-2 border-[#C8643F] p-4 rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    Chicago
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200/80 whitespace-nowrap shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE POLL
                  </span>
                </div>
                <p className="text-xs text-[#6A6253] leading-relaxed">
                  Community availability poll live. Pick dates and vibes for our upcoming gathering.
                </p>
              </div>
              <div className="text-xs font-bold text-[#C8643F] flex items-center gap-1 group-hover:gap-2 transition-all mt-auto pt-3">
                <span>Cast Your Vote</span>
                <span>→</span>
              </div>
            </Link>

            {/* Austin Teaser Card */}
            <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-4 rounded-2xl opacity-90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    Austin
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-stone-100 text-stone-600 border border-stone-200/80 whitespace-nowrap shrink-0">
                    <span className="text-[10px]">⏳</span>
                    SOON
                  </span>
                </div>
                <p className="text-xs text-[#6A6253] leading-relaxed">
                  Casual dinners, outdoor hangs, and neighborhood meetups across Austin.
                </p>
              </div>
              <div className="mt-auto pt-3 text-[11px] text-[#8C8270] font-medium">
                Waitlist opening shortly
              </div>
            </div>

            {/* New York Teaser Card */}
            <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-4 rounded-2xl opacity-90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    New York
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-stone-100 text-stone-600 border border-stone-200/80 whitespace-nowrap shrink-0">
                    <span className="text-[10px]">⏳</span>
                    SOON
                  </span>
                </div>
                <p className="text-xs text-[#6A6253] leading-relaxed">
                  Curated dinners, socials, and creative meetups across the boroughs.
                </p>
              </div>
              <div className="mt-auto pt-3 text-[11px] text-[#8C8270] font-medium">
                Waitlist opening shortly
              </div>
            </div>

            {/* San Francisco Teaser Card */}
            <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-4 rounded-2xl opacity-90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    San Francisco
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-stone-100 text-stone-600 border border-stone-200/80 whitespace-nowrap shrink-0">
                    <span className="text-[10px]">⏳</span>
                    SOON
                  </span>
                </div>
                <p className="text-xs text-[#6A6253] leading-relaxed">
                  Social gatherings, park meetups, and casual dining around the Bay.
                </p>
              </div>
              <div className="mt-auto pt-3 text-[11px] text-[#8C8270] font-medium">
                Waitlist opening shortly
              </div>
            </div>
          </div>
        </section>


        {/* 2. HOW IT WORKS SECTION */}
        <section id="how-it-works" className="pt-10 sm:pt-14 pb-12 animate-fade-in-delayed">
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-widest font-bold text-[#4C5A40]">
              THE EXPERIENCE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-1.5">
              How It Works
            </h2>
          </div>

          <div className="space-y-4">
            {/* Card 1 */}
            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-5 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#C8643F] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                  Vote on vibes &amp; dates
                </h3>
                <p className="text-sm text-[#6A6253] mt-1 leading-relaxed">
                  Pick the gatherings you&apos;d actually show up for — yoga mornings, mimosa brunches, ladies&apos; nights, date nights — and mark the dates that fit your real calendar.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-5 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#4C5A40] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                  We tally consensus &amp; sync your calendar
                </h3>
                <p className="text-sm text-[#6A6253] mt-1 leading-relaxed">
                  We lock in the winning slot that works for the most people. Your live calendar feed updates automatically as details are finalized.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#FBF7EE] border border-[#D8CEBC]/70 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-5 group">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#6E7F5E] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                  Show up and connect
                </h3>
                <p className="text-sm text-[#6A6253] mt-1 leading-relaxed">
                  We send you the venue details and ticket link. A portion of every gathering supports local community initiatives.
                </p>
              </div>
            </div>
          </div>

          {/* How It Works CTA */}
          <div className="mt-8 text-center">
            <Link
              href="/host"
              className="inline-flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 bg-[#FBF7EE] hover:bg-[#EDE4D3] text-[#2B271F] border border-[#D8CEBC] text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl sm:rounded-full transition-all shadow-xs hover:shadow hover:scale-102 max-w-full text-center"
            >
              <span>Want to lead gatherings in your city?</span>
              <span className="text-[#C8643F]">Become a Host →</span>
            </Link>
          </div>
        </section>

        {/* 3. HOST APPLICATION TEASER CARD */}
        <section id="host" className="mt-8 bg-[#FBF7EE] border-2 border-[#D8CEBC] rounded-3xl p-6 sm:p-10 shadow-lg animate-fade-in-delayed-2">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-widest font-bold text-[#C8643F]">
              LEAD YOUR COMMUNITY
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-2 leading-tight">
              Launch Actually, Let&apos;s in Your City — Become a Host Admin
            </h2>
            <p className="text-sm sm:text-base text-[#6A6253] mt-3 leading-relaxed">
              Turn messy group chats into effortless gatherings. Apply to lead your city chapter or unlock your own Host Admin workspace to coordinate private events, social clubs, or community meetups.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/host"
                className="w-full sm:w-auto bg-[#C8643F] hover:bg-[#b05230] text-white py-3.5 px-8 rounded-xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-center"
              >
                Apply for Host Admin Workspace →
              </Link>
            </div>

            <p className="text-[11px] text-[#8C8270] text-center pt-4 leading-relaxed">
              ✦ Host Admin Beta includes automated calendar availability polling, broadcast alerts, and dynamic event feeds.
            </p>
          </div>
        </section>
      </main>

      {/* 4. FOOTER */}
      <footer className="border-t border-[#D8CEBC]/70 py-10 text-center text-xs text-[#6A6253] font-sans-hanken bg-[#EDE4D3]/40">
        <div className="max-w-4xl mx-auto px-6 space-y-3">
          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 text-xs font-medium text-[#6A6253]">
            <Link href="/chicago" className="hover:text-[#2B271F] underline underline-offset-4">
              Chicago Series
            </Link>
            <span className="text-[#A89F91] select-none">&middot;</span>
            <Link href="/host" className="hover:text-[#2B271F] transition-colors">
              Host Application
            </Link>
            <span className="text-[#A89F91] select-none">&middot;</span>
            <Link href="/privacy" className="hover:text-[#2B271F] transition-colors">
              Privacy Policy
            </Link>
            <span className="text-[#A89F91] select-none">&middot;</span>
            <Link href="/terms" className="hover:text-[#2B271F] transition-colors">
              Terms of Service
            </Link>
            <span className="text-[#A89F91] select-none">&middot;</span>
            <a
              href="mailto:admin@actuallylets.com"
              className="underline hover:text-stone-800 transition-colors"
            >
              admin@actuallylets.com
            </a>
          </div>
          <div className="space-y-1 pt-1">
            <p className="text-xs sm:text-sm font-bold text-[#2B271F]">
              Actually, Let&apos;s<span className="text-[0.55em] font-sans font-normal -top-[0.6em] relative ml-[1px] select-none text-stone-500">™</span>
            </p>
            <p className="text-[11px] sm:text-xs text-[#6A6253]">
              Consensus-driven community gatherings <span className="mx-1 text-[#A89F91]">&middot;</span> A portion of every ticket supports local community initiatives.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
