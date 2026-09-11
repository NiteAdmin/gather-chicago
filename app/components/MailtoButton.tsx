'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MailtoButtonProps {
  email?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  showCopyButton?: boolean;
}

export default function MailtoButton({
  email = 'admin@actuallylets.com',
  className = 'underline hover:text-stone-800 transition-colors bg-transparent border-0 p-0 inline cursor-pointer text-inherit font-inherit',
  style,
  children,
  showCopyButton = false,
}: MailtoButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `mailto:${email}`;
  };

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(email);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        className={className}
        style={style}
      >
        {children || email}
      </button>
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Email copied to clipboard" : `Copy ${email}`}
          title={copied ? "Copied!" : `Copy ${email}`}
          className="inline-flex items-center text-stone-400 hover:text-stone-700 transition-colors p-0.5 rounded cursor-pointer"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[#3D5634]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </span>
  );
}
