"use client";

import React, { useState, useMemo } from "react";
import { ResolvedEvent, partitionUpcomingEvents } from "@/lib/userEvents";
import { splitEventTitle, OCTOBER_2026_BASE_EVENTS, isConfirmedGathering } from "@/lib/eventsConfig";
import EventIcon from "@/components/dashboard/EventIcon";
import { BrandName } from "@/components/brand/BrandName";
import AfterglowCard from "@/components/dashboard/AfterglowCard";
import { getCommunityEventPhase, EventPhase } from "@/lib/eventStatus";
import { useIsMounted } from "@/lib/useEventStatus";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Navigation,
  Megaphone,
  AlertCircle,
  X,
} from "lucide-react";

interface DashboardHeroProps {
  events: ResolvedEvent[];
  onToggleRSVP: (eventId: string) => void;
}

export default function DashboardHero({ events, onToggleRSVP }: DashboardHeroProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const isMounted = useIsMounted();

  // Dynamically partition and prioritize events:
  // Priority 1: Earliest upcoming event confirmed for attending (date >= 2026-10-01)
  // Priority 2: Next upcoming open community gathering in the chapter
  const { spotlightEvent } = partitionUpcomingEvents(events, "2026-10-01");

  // Non-breaking fallback if 0 upcoming RSVPs and no open events are found
  const fallbackEvent: ResolvedEvent = useMemo(() => {
    const baseOct =
      OCTOBER_2026_BASE_EVENTS.find((e) => e.date >= "2026-10-01" && isConfirmedGathering(e)) ||
      OCTOBER_2026_BASE_EVENTS[1];
    return {
      ...baseOct,
      attendanceStatus: "open",
    };
  }, []);

  const activeSpotlight = spotlightEvent || fallbackEvent;

  const isAttending = activeSpotlight.attendanceStatus === "attending";
  const spotlightPhase: EventPhase = isMounted ? getCommunityEventPhase(activeSpotlight) : 'upcoming';
  const isPast = spotlightPhase === 'afterglow' || spotlightPhase === 'archived';
  const isLive = spotlightPhase === 'live';

  const mapsQuery = [activeSpotlight.venueName, activeSpotlight.venueAddress]
    .filter(Boolean)
    .join(" ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, "+");
  const googleMapsUrl = `https://maps.google.com/?q=${mapsQuery || "Chicago+IL"}`;
  const externalLinkUrl = activeSpotlight.externalUrl || activeSpotlight.partifulUrl;
  const externalLinkLabel = activeSpotlight.externalUrlLabel || "Open Link";

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#2B271F] to-[#3D372E] text-[#F4EEE2] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#4C4538]">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#C8643F]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 bg-[#6B8E23]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between gap-4 sm:gap-4.5">
        {/* Top Header Badge & Tagline */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {isAttending ? (
            isPast ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EFE8DF] text-stone-700 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                <span>YOU ATTENDED</span>
              </div>
            ) : isLive ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3D2C1E] text-[#F5C26B] border border-[#5C4328] text-[11px] font-bold tracking-wider uppercase shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C26B] animate-pulse" />
                <span>HAPPENING NOW</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E3A20] text-[#A3E699] border border-[#2D5A30] text-[11px] font-bold tracking-wider uppercase shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#52C41A]" />
                <span>You&apos;re Going</span>
              </div>
            )
          ) : (
            isPast ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3D2C22] text-[#F5B096] border border-[#5C3B2B] text-[11px] font-bold tracking-wider uppercase shadow-xs">
                <CalendarIcon className="w-3.5 h-3.5 text-[#E07A5F]" />
                <span>Gathering Completed &bull; Past Event</span>
              </div>
            ) : isLive ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3D2C1E] text-[#F5C26B] border border-[#5C4328] text-[11px] font-bold tracking-wider uppercase shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C26B] animate-pulse" />
                <span>HAPPENING NOW &bull; Next Up in Chicago</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3D2C22] text-[#F5B096] border border-[#5C3B2B] text-[11px] font-bold tracking-wider uppercase shadow-xs">
                <CalendarIcon className="w-3.5 h-3.5 text-[#E07A5F]" />
                <span>Upcoming Gathering &bull; Next Up in Chicago</span>
              </div>
            )
          )}

          <span className="text-[10.5px] sm:text-[11px] font-mono tracking-widest text-[#D8CEBC]/70 uppercase">
            {activeSpotlight.categoryLabel || (activeSpotlight.category === "wellness" ? "WELLNESS & MOVEMENT" : `${activeSpotlight.category.toUpperCase()} SERIES`)}
          </span>
        </div>

        {/* Title & Vector Icon */}
        <div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#2B271F]/60 flex items-center justify-center border border-white/10 shrink-0 mt-0.5">
              <EventIcon
                iconName={activeSpotlight.iconName}
                eventId={activeSpotlight.id}
                category={activeSpotlight.category}
                fallbackIcon={activeSpotlight.icon}
                className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#E07A5F]"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-widest text-[#F5B096] mb-0.5 flex items-center">
                <BrandName tmClassName="text-[#F5B096] font-bold text-[0.85em]" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-[26px] font-bold font-serif-fraunces text-white tracking-tight leading-tight">
                {splitEventTitle(activeSpotlight.title, activeSpotlight.brandPrefix).eventName}
              </h2>
              <p className="text-xs sm:text-[13px] text-[#D8CEBC]/80 mt-1 line-clamp-2 leading-relaxed">
                {activeSpotlight.description}
              </p>
            </div>
          </div>
        </div>

        {/* Host Announcement Banner */}
        {Boolean(activeSpotlight.hostAnnouncement && activeSpotlight.hostAnnouncement.trim()) && (
          <div className="text-xs bg-white/10 border border-white/15 rounded-2xl p-2.5 sm:p-3 text-[#F4EEE2]/90 flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-[#2B271F]/50 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
              <Megaphone className="w-3 h-3 text-[#E07A5F]" />
            </div>
            <div>
              <span className="font-bold text-white text-[9.5px] uppercase tracking-wider block">
                Chapter Host Announcement
              </span>
              <p className="mt-0.5 italic text-[#F4EEE2] text-xs">
                &ldquo;{activeSpotlight.hostAnnouncement}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Key Gathering Logistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 py-2.5 border-y border-white/10 text-xs sm:text-[13px]">
          <div className="flex items-center gap-2 text-[#F4EEE2]/90">
            <CalendarIcon className="w-3.5 h-3.5 text-[#C8643F] shrink-0" />
            <span className="font-semibold">{activeSpotlight.displayDate}</span>
          </div>

          <div className="flex items-center gap-2 text-[#F4EEE2]/90">
            <Clock className="w-3.5 h-3.5 text-[#C8643F] shrink-0" />
            <span>{activeSpotlight.timeWindow}</span>
          </div>

          <div className="flex items-center gap-2 text-[#F4EEE2]/90 sm:col-span-2">
            <MapPin className="w-3.5 h-3.5 text-[#C8643F] shrink-0" />
            <span className="truncate">
              <strong>{activeSpotlight.venueName}</strong> &bull; {activeSpotlight.venueAddress}
            </span>
          </div>
        </div>

        {/* 24-Hour Afterglow Feedback Card */}
        {isAttending && spotlightPhase === 'afterglow' && (
          <AfterglowCard eventId={activeSpotlight.id} variant="dark" />
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {isAttending ? (
              <>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#F5B096]" />
                  <span>Open in Maps</span>
                </a>

                {externalLinkUrl && (
                  <a
                    href={externalLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D8CEBC]" />
                    <span>{externalLinkLabel}</span>
                  </a>
                )}
              </>
            ) : (
              <>
                {!isPast && (
                  <button
                    type="button"
                    onClick={() => onToggleRSVP(activeSpotlight.id)}
                    className="inline-flex items-center gap-2 px-4.5 py-2 rounded-xl bg-[#C8643F] hover:bg-[#b05230] text-white text-xs font-bold tracking-wide shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>RSVP: I&apos;m Going &rarr;</span>
                  </button>
                )}
                {isPast && (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 text-[#D8CEBC] text-xs font-semibold border border-white/10 cursor-not-allowed opacity-75"
                  >
                    Gathering Concluded
                  </button>
                )}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#F5B096]" />
                  <span>Open in Maps</span>
                </a>
                {!isPast && externalLinkUrl && (
                  <a
                    href={externalLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D8CEBC]" />
                    <span>{externalLinkLabel}</span>
                  </a>
                )}
              </>
            )}
          </div>

          <div>
            {isAttending && !isPast && !isLive && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs text-[#D8CEBC]/70 hover:text-red-300 transition-colors underline underline-offset-4 cursor-pointer"
              >
                Can&apos;t make it? Cancel RSVP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TWO-STEP CANCELLATION CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-[#2B271F]">
          <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#C8643F]" />
                <h3 className="font-serif-fraunces text-lg font-bold text-[#2B271F]">
                  Cancel your RSVP?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-[#8C8270] hover:text-[#2B271F] p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6A6253] leading-relaxed">
              You&apos;re giving up your spot for this gathering. If spots remain open later, you can always RSVP again.
            </p>

            <div className="bg-[#FAF7F2] border border-[#EBE3D5] rounded-xl p-3 text-[11px] text-[#8C8270] leading-normal">
              <span className="font-semibold text-[#6A6253]">Note:</span> Remember to manually remove this event from your Google or Apple calendar if you synced it earlier.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D8CEBC]/60">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FAF7F2] hover:bg-[#EDE4D3] text-[#2B271F] border border-[#D8CEBC] transition-all cursor-pointer"
              >
                Keep My Spot
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  onToggleRSVP(activeSpotlight.id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A63A24] bg-[#FDF2F0] hover:bg-[#FBE8E5] border border-[#F5C2BA] hover:border-[#E07A5F] transition-all cursor-pointer shadow-2xs"
              >
                Yes, Cancel RSVP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
