'use client';

import React from 'react';

interface MailtoButtonProps {
  email?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function MailtoButton({
  email = 'admin@actuallylets.com',
  className = 'underline hover:text-stone-800 transition-colors bg-transparent border-0 p-0 inline cursor-pointer text-inherit font-inherit',
  style,
  children,
}: MailtoButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `mailto:${email}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children || email}
    </button>
  );
}
