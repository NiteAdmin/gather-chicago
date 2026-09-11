import React from "react";
import { splitEventTitle } from "@/lib/formatters";

interface BrandEventHeaderProps {
  title?: string | null;
  brandPrefix?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  headingTag?: "h1" | "h2" | "h3" | "h4" | "div";
  containerClassName?: string;
  tradeMarkClassName?: string;
}

/**
 * Reusable brand event header adhering strictly to brand guidelines:
 * 1. Isolated line: "Actually, Let's" sits on its own line above the event name.
 * 2. Visual prominence with clear hierarchy.
 * 3. Directly attached superscript TM symbol.
 */
export default function BrandEventHeader({
  title,
  brandPrefix,
  eyebrowClassName = "text-[11px] font-bold uppercase tracking-widest text-[#C8643F]",
  titleClassName = "text-xl sm:text-2xl font-bold font-serif-fraunces text-[#2B271F] leading-tight",
  headingTag: Heading = "h2",
  containerClassName = "space-y-1",
  tradeMarkClassName = "text-[0.65em] font-bold ml-0.5 align-super",
}: BrandEventHeaderProps) {
  const { eventName } = splitEventTitle(title, brandPrefix);

  return (
    <div className={containerClassName}>
      <div className={`${eyebrowClassName} flex items-center`}>
        <span>Actually, Let&apos;s</span>
        <sup className={tradeMarkClassName}>TM</sup>
      </div>
      <Heading className={titleClassName}>{eventName}</Heading>
    </div>
  );
}
