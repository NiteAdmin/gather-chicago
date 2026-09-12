'use client';

import React from 'react';
import Link from 'next/link';
import UserNavButton from '@/components/nav/UserNavButton';
import { BrandName } from '@/components/brand/BrandName';

export interface NavbarProps {
  className?: string;
}

export default function Navbar({ className = '' }: NavbarProps) {
  return (
    <header className={`w-full relative z-50 ${className}`}>
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 font-sans-hanken">
        {/* Brand Mark: Left-aligned with isolated styling and superscript TM */}
        <Link
          href="/"
          className="group flex items-center gap-2 text-decoration-none shrink-0"
          aria-label="Actually, Let's Home"
        >
          <BrandName className="font-serif-fraunces text-xl sm:text-2xl font-bold tracking-tight text-[#2B271F] group-hover:text-[#C8643F] transition-colors whitespace-nowrap" />
          {/* SERIES chip: hidden on mobile (< 640px), visible on sm: and up */}
          <span className="hidden sm:inline-flex rounded-full bg-[#EFEAD8] px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wider text-[#C8643F] uppercase border border-[#D8CEBC]/60 shrink-0">
            SERIES
          </span>
        </Link>

        {/* Header Actions / Navigation */}
        <nav
          aria-label="Main Navigation"
          className="flex items-center gap-2 sm:gap-6 text-xs sm:text-sm font-medium text-[#6A6253] shrink-0"
        >
          {/* Secondary Cities link: hidden below md: */}
          <a
            href="#cities"
            className="hover:text-[#2B271F] transition-colors hidden md:inline whitespace-nowrap"
          >
            Cities
          </a>

          {/* Become a Host: hidden on mobile (< 640px), visible on sm: and up */}
          <Link
            href="/host"
            className="hidden sm:inline-flex hover:text-[#2B271F] transition-colors whitespace-nowrap"
          >
            Become a Host
          </Link>

          {/* Compact CTA Pill: condensed on small mobile, full on 360px+ */}
          <Link
            href="/chicago"
            className="bg-[#2B271F] hover:bg-[#C8643F] text-[#FBF7EE] text-[11px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold tracking-wide transition-all shadow-xs hover:shadow whitespace-nowrap shrink-0"
          >
            <span className="hidden min-[360px]:inline">Chicago </span>Poll →
          </Link>

          {/* User profile avatar / auth icon: always visible, docked on far right */}
          <UserNavButton className="shrink-0" />
        </nav>
      </div>
    </header>
  );
}
