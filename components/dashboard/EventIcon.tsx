"use client";

import React from "react";
import {
  Compass,
  Flame,
  Pizza,
  Footprints,
  Coffee,
  Trees,
  Sparkles,
  Activity,
  LucideProps,
} from "lucide-react";

export interface EventIconProps extends LucideProps {
  iconName?: string;
  eventId?: string;
  category?: string;
  fallbackIcon?: string;
}

export default function EventIcon({
  iconName,
  eventId = "",
  category = "",
  fallbackIcon,
  className = "w-4 h-4 text-[#E07A5F]",
  ...props
}: EventIconProps) {
  // Resolve icon identifier
  const resolvedName =
    iconName ||
    (eventId.includes("sep-26")
      ? "Sparkles"
      : eventId.includes("pizza")
      ? "Pizza"
      : eventId.includes("walk")
      ? "Footprints"
      : eventId.includes("coffee")
      ? "Coffee"
      : eventId.includes("stroll")
      ? "Trees"
      : eventId.includes("social")
      ? "Flame"
      : null);

  switch (resolvedName) {
    case "Sparkles":
      return <Sparkles className={className} strokeWidth={2} {...props} />;
    case "Activity":
      return <Activity className={className} strokeWidth={2} {...props} />;
    case "Compass":
      return <Compass className={className} strokeWidth={2} {...props} />;
    case "Flame":
      return <Flame className={className} strokeWidth={2} {...props} />;
    case "Pizza":
      return <Pizza className={className} strokeWidth={2} {...props} />;
    case "Footprints":
      return <Footprints className={className} strokeWidth={2} {...props} />;
    case "Coffee":
      return <Coffee className={className} strokeWidth={2} {...props} />;
    case "Trees":
      return <Trees className={className} strokeWidth={2} {...props} />;
    default:
      if (category === "wellness") {
        return <Sparkles className={className} strokeWidth={2} {...props} />;
      }
      if (category === "food") {
        return <Pizza className={className} strokeWidth={2} {...props} />;
      }
      if (category === "outdoor") {
        return <Footprints className={className} strokeWidth={2} {...props} />;
      }
      if (category === "social") {
        return <Flame className={className} strokeWidth={2} {...props} />;
      }
      if (fallbackIcon && fallbackIcon !== "✨" && fallbackIcon !== "🧘") {
        return <span className="inline-block leading-none">{fallbackIcon}</span>;
      }
      return <Sparkles className={className} strokeWidth={2} {...props} />;
  }
}
