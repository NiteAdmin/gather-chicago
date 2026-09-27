"use client";

import React from "react";
import { ResolvedEvent } from "@/lib/userEvents";
import { splitEventTitle } from "@/lib/eventsConfig";
import { BrandName } from "@/components/brand/BrandName";
import EventIcon from "@/components/dashboard/EventIcon";
import AfterglowCard from "@/components/dashboard/AfterglowCard";
import { EventPhase } from "@/lib/eventStatus";

interface PastEventCardProps {
  event: ResolvedEvent;
  phase: EventPhase;
  selectedReaction?: string;
  onSelectReaction?: (token: string) => void;
}

export default function PastEventCard({
  event,
  phase,
  selectedReaction,
  onSelectReaction,
}: PastEventCardProps) {
  const { eventName } = splitEventTitle(event.title, event.brandPrefix);

  return (
    <div className="pt-3 first:pt-0">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#EDE4D3] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <EventIcon
            iconName={event.iconName}
            eventId={event.id}
            category={event.category}
            fallbackIcon={event.icon}
            className="w-3.5 h-3.5 text-[#E07A5F]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#C8643F] flex items-center">
              <BrandName />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EFE8DF] text-stone-700">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
              YOU ATTENDED
            </div>
          </div>
          <h4 className="text-xs font-bold text-[#2B271F] leading-tight">
            {eventName}
          </h4>
          <p className="text-[11px] font-semibold text-[#8C8270] mt-0.5">
            {event.displayDate} &bull; {event.timeWindow.includes("10:30 AM") ? "10:30 AM" : event.timeWindow.split(" (")[0]} &bull; {event.venueName}
          </p>
          {event.venueAddress && (
            <p className="text-[10.5px] text-[#8C8270] truncate mt-0.5" title={`${event.venueName} • ${event.venueAddress}`}>
              {event.venueAddress}
            </p>
          )}
        </div>
      </div>

      {/* 24-Hour Afterglow Feedback Card (Renders directly below the attended card when in afterglow state) */}
      {phase === 'afterglow' && (
        <AfterglowCard
          eventId={event.id}
          selectedReaction={selectedReaction}
          onSelectReaction={onSelectReaction}
        />
      )}
    </div>
  );
}
