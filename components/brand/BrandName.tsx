import React from 'react';

export interface BrandNameProps {
  className?: string;
  tmClassName?: string;
}

export function BrandName({ className = '', tmClassName = '' }: BrandNameProps) {
  // Allow tmClassName to customize size, alignment, and color while providing solid optical defaults
  const hasCustomSize = /(?:text-\[|text-xs|text-sm|text-base|text-lg|text-xl)/.test(tmClassName);
  const hasCustomAlign = /(?:align-|top-)/.test(tmClassName);
  const hasCustomColor = /(?:text-(?:stone|terra|neutral|gray|slate|zinc|red|amber|emerald|blue|white|black|#|\[#|var\()|(?:text-[a-z]+-\d+))/.test(tmClassName);
  const hasCustomMargin = /ml-/.test(tmClassName);

  const baseSize = hasCustomSize ? '' : 'text-[max(10px,0.68em)] min-text-[10px]';
  const baseAlign = hasCustomAlign ? '' : '-top-[0.45em] relative';
  const baseColor = hasCustomColor ? '' : 'text-stone-500';
  const baseMargin = hasCustomMargin ? '' : 'ml-[1.5px]';

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span>Actually, Let&apos;s</span>
      <span
        aria-hidden="true"
        className={`font-sans font-medium select-none ${baseSize} ${baseAlign} ${baseMargin} ${baseColor} ${tmClassName}`.replace(/\s+/g, ' ').trim()}
      >
        ™
      </span>
    </span>
  );
}

export default BrandName;

