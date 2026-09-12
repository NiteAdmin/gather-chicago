import React from 'react';
import Link from 'next/link';
import { BrandName } from '@/components/brand/BrandName';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`border-t border-[#D8CEBC] mt-20 pt-8 pb-12 text-center text-xs text-[#6A6253] space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
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
          <BrandName />
        </p>
        <p className="text-[11px] sm:text-xs text-[#6A6253]">
          Consensus-driven community gatherings <span className="mx-1 text-[#A89F91]">&middot;</span> A portion of every ticket supports local community initiatives.
        </p>
      </div>
    </footer>
  );
}
