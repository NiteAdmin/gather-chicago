import React from 'react';

export interface BrandNameProps {
  className?: string;
  tmClassName?: string;
}

export function BrandName({ className = '', tmClassName = '' }: BrandNameProps) {
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span>Actually, Let&apos;s</span>
      <span
        aria-hidden="true"
        className={`text-[max(9px,0.65em)] font-sans font-medium -top-[0.45em] relative ml-[1.5px] select-none text-stone-500 min-text-[9px] ${tmClassName}`}
      >
        ™
      </span>
    </span>
  );
}

export default BrandName;
