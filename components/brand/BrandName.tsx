import React from 'react';

export interface BrandNameProps {
  className?: string;
  tmClassName?: string;
  short?: boolean;
}

export function BrandName({ className = '', tmClassName = '', short = false }: BrandNameProps) {
  // Allow tmClassName to customize size, alignment, and color while providing solid optical defaults
  const hasCustomSize = /(?:text-\[|text-xs|text-sm|text-base|text-lg|text-xl)/.test(tmClassName);
  const hasCustomAlign = /(?:align-|top-)/.test(tmClassName);
  const hasCustomColor = /(?:text-(?:stone|terra|neutral|gray|slate|zinc|red|amber|emerald|blue|white|black|#|\[#|var\()|(?:text-[a-z]+-\d+))/.test(tmClassName);
  const hasCustomMargin = /ml-/.test(tmClassName);
  const hasCustomWeight = /(?:font-(?:normal|medium|semibold|bold|extrabold|black))/.test(tmClassName);

  const baseSize = hasCustomSize ? '' : 'text-[max(12px,0.76em)] min-text-[10px]';
  const baseAlign = hasCustomAlign ? '' : '-top-[0.42em] relative';
  const baseColor = hasCustomColor ? '' : 'text-[#2B271F]';
  const baseMargin = hasCustomMargin ? '' : 'ml-[2px]';
  const baseWeight = hasCustomWeight ? '' : 'font-bold';

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span>{short ? 'Actually' : <>Actually, Let&apos;s</>}</span>
      <span
        aria-hidden="true"
        className={`font-sans ${baseWeight} leading-none select-none ${baseSize} ${baseAlign} ${baseMargin} ${baseColor} ${tmClassName}`.replace(/\s+/g, ' ').trim()}
      >
        ™
      </span>
    </span>
  );
}

export default BrandName;

