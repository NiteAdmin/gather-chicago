"use client";

import React, { useState, useId } from "react";
import { ResolvedEvent } from "@/lib/userEvents";
import { splitEventTitle } from "@/lib/eventsConfig";
import EventIcon from "@/components/dashboard/EventIcon";
import {
  Calendar as CalendarIcon,
  List,
  Clock,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface MemberCalendarProps {
  events: ResolvedEvent[];
  onToggleRSVP?: (eventId: string) => void;
  className?: string;
}

export default function MemberCalendar({
  events,
  onToggleRSVP,
  className = "",
}: MemberCalendarProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMonth, setSelectedMonth] = useState<"2026-10" | "2026-11">("2026-10");
  const [agendaMonthFilter, setAgendaMonthFilter] = useState<"all" | "2026-10" | "2026-11">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "attending" | "open">("all");
  const [activePopoverEvent, setActivePopoverEvent] = useState<ResolvedEvent | null>(null);

  // Month Configurations for Fall 2026
  const monthConfigs = {
    "2026-10": {
      key: "2026-10" as const,
      name: "October 2026",
      shortName: "Oct 2026",
      badgeLabel: "OCTOBER 2026 LINEUP",
      daysInMonth: 31,
      startDayOfWeek: 4, // Thursday (Oct 1, 2026)
    },
    "2026-11": {
      key: "2026-11" as const,
      name: "November 2026",
      shortName: "Nov 2026",
      badgeLabel: "NOVEMBER 2026 LINEUP",
      daysInMonth: 30,
      startDayOfWeek: 0, // Sunday (Nov 1, 2026)
    },
  };

  const currentMonthConfig = monthConfigs[selectedMonth];
  const { daysInMonth, startDayOfWeek } = currentMonthConfig;
  const trailingEmptySlots = (7 - ((startDayOfWeek + daysInMonth) % 7)) % 7;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Filter events by status and category
  const filteredEvents = events.filter((e) => {
    if (filterStatus === "attending" && e.attendanceStatus !== "attending") return false;
    if (filterStatus === "open" && e.attendanceStatus !== "open") return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    return true;
  });

  // Map events by day number for the selected month
  const eventsByDay: Record<number, ResolvedEvent[]> = {};
  filteredEvents.forEach((ev) => {
    if (ev.date.startsWith(selectedMonth)) {
      const day = parseInt(ev.date.split("-")[2], 10);
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "food":
        return {
          bg: "bg-[#FDF2EC]",
          border: "border-[#F5C2BA]",
          text: "text-[#A63A24]",
          badgeBg: "bg-[#FBE8DF]",
          label: "Food & Drinks",
        };
      case "outdoor":
        return {
          bg: "bg-[#EEF5EB]",
          border: "border-[#C5DEC0]",
          text: "text-[#3D5634]",
          badgeBg: "bg-[#E2EEDD]",
          label: "Outdoor & Active",
        };
      case "wellness":
        return {
          bg: "bg-[#F4EFFB]",
          border: "border-[#DCCCF2]",
          text: "text-[#624099]",
          badgeBg: "bg-[#EDE4F8]",
          label: "Wellness & Movement",
        };
      case "culture":
        return {
          bg: "bg-[#FFF8E7]",
          border: "border-[#EAD39E]",
          text: "text-[#8A6218]",
          badgeBg: "bg-[#F7EDD5]",
          label: "Culture & Arts",
        };
      case "social":
      default:
        return {
          bg: "bg-[#F5F1E8]",
          border: "border-[#D8CEBC]",
          text: "text-[#5A5040]",
          badgeBg: "bg-[#EAE2D4]",
          label: "Community Social",
        };
    }
  };

  const attendingCount = events.filter((e) => e.attendanceStatus === "attending").length;
  const openCount = events.filter((e) => e.attendanceStatus === "open").length;

  return (
    <div className={`bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-4 sm:p-6 shadow-sm ${className}`}>
      {/* CALENDAR HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-[#D8CEBC]/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-[#EDE4D3] text-[#C8643F] px-2.5 py-0.5 rounded-full">
              {viewMode === "grid" ? currentMonthConfig.badgeLabel : "FALL 2026 LINEUP"}
            </span>
            <span className="text-xs text-[#6A6253]">Chicago Chapter</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
            Community Gatherings Calendar
          </h2>
          <p className="text-xs text-[#6A6253] mt-0.5">
            You are currently RSVP&apos;d to <strong className="text-[#4C5A40]">{attendingCount} gatherings</strong> • {openCount} open to join
          </p>
        </div>

        {/* View Mode & Month Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Month Switcher (Oct / Nov) */}
          <div className="flex items-center p-0.5 bg-[#EDE4D3]/70 rounded-xl text-xs font-semibold text-[#6A6253]">
            <button
              type="button"
              aria-label="Previous month"
              disabled={selectedMonth === "2026-10"}
              onClick={() => {
                setSelectedMonth("2026-10");
                setAgendaMonthFilter("2026-10");
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                selectedMonth === "2026-10"
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-[#2B271F] hover:bg-white/60"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Select October 2026"
              onClick={() => {
                setSelectedMonth("2026-10");
                setAgendaMonthFilter("2026-10");
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMonth === "2026-10"
                  ? "bg-[#FBF7EE] text-[#2B271F] shadow-xs font-bold"
                  : "hover:text-[#2B271F]"
              }`}
            >
              Oct 2026
            </button>
            <button
              type="button"
              aria-label="Select November 2026"
              onClick={() => {
                setSelectedMonth("2026-11");
                setAgendaMonthFilter("2026-11");
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedMonth === "2026-11"
                  ? "bg-[#FBF7EE] text-[#2B271F] shadow-xs font-bold"
                  : "hover:text-[#2B271F]"
              }`}
            >
              Nov 2026
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={selectedMonth === "2026-11"}
              onClick={() => {
                setSelectedMonth("2026-11");
                setAgendaMonthFilter("2026-11");
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                selectedMonth === "2026-11"
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-[#2B271F] hover:bg-white/60"
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center p-0.5 bg-[#EDE4D3]/70 rounded-xl text-xs font-semibold text-[#6A6253]">
            <button
              type="button"
              aria-label="Switch to Month Grid view"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-[#FBF7EE] text-[#2B271F] shadow-xs font-bold"
                  : "hover:text-[#2B271F]"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Month Grid</span>
            </button>
            <button
              type="button"
              aria-label="Switch to Agenda List view"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-[#FBF7EE] text-[#2B271F] shadow-xs font-bold"
                  : "hover:text-[#2B271F]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Agenda List</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER CHIPS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-b border-[#D8CEBC]/40 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C8270] mr-0.5">
            Filter:
          </span>
          <button
            type="button"
            aria-label="Filter all events"
            onClick={() => {
              setFilterStatus("all");
              setFilterCategory("all");
            }}
            className={`px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
              filterStatus === "all" && filterCategory === "all"
                ? "bg-[#2B271F] text-[#FBF7EE] border-[#2B271F] font-bold"
                : "bg-white text-[#6A6253] border-[#D8CEBC] hover:border-[#2B271F]"
            }`}
          >
            All ({events.length})
          </button>
          <button
            type="button"
            aria-label="Filter events you are attending"
            onClick={() => setFilterStatus("attending")}
            className={`px-2.5 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
              filterStatus === "attending"
                ? "bg-[#4C5A40] text-white border-[#4C5A40] font-bold shadow-xs"
                : "bg-white text-[#3D5634] border-[#C5DEC0] hover:bg-[#EEF5EB]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Going ({attendingCount})</span>
          </button>
          <button
            type="button"
            aria-label="Filter open gathering events"
            onClick={() => setFilterStatus("open")}
            className={`px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
              filterStatus === "open"
                ? "bg-[#C8643F] text-white border-[#C8643F] font-bold shadow-xs"
                : "bg-white text-[#6A6253] border-[#D8CEBC] hover:border-[#C8643F]"
            }`}
          >
            Open ({openCount})
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            aria-label="Filter food and drinks gatherings"
            onClick={() => setFilterCategory(filterCategory === "food" ? "all" : "food")}
            className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
              filterCategory === "food"
                ? "bg-[#FBE8DF] text-[#A63A24] border-[#F5C2BA] font-bold"
                : "bg-white/70 text-[#6A6253] border-[#D8CEBC]/70 hover:bg-white"
            }`}
          >
            🍕 Food
          </button>
          <button
            type="button"
            aria-label="Filter outdoor and active gatherings"
            onClick={() => setFilterCategory(filterCategory === "outdoor" ? "all" : "outdoor")}
            className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
              filterCategory === "outdoor"
                ? "bg-[#E2EEDD] text-[#3D5634] border-[#C5DEC0] font-bold"
                : "bg-white/70 text-[#6A6253] border-[#D8CEBC]/70 hover:bg-white"
            }`}
          >
            👟 Outdoor
          </button>
          <button
            type="button"
            aria-label="Filter community social gatherings"
            onClick={() => setFilterCategory(filterCategory === "social" ? "all" : "social")}
            className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
              filterCategory === "social"
                ? "bg-[#EAE2D4] text-[#5A5040] border-[#D8CEBC] font-bold"
                : "bg-white/70 text-[#6A6253] border-[#D8CEBC]/70 hover:bg-white"
            }`}
          >
            ☕ Social
          </button>
        </div>
      </div>

      {/* MONTH GRID VIEW */}
      {viewMode === "grid" ? (
        <div className="mt-3 sm:mt-4">
          {/* Active Month Banner */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D8CEBC]/50">
            <h3 className="text-base sm:text-lg font-bold font-serif-fraunces text-[#2B271F] flex items-center gap-2">
              <span>{currentMonthConfig.name}</span>
              <span className="text-xs font-normal font-sans-hanken text-[#8C8270]">
                ({Object.values(eventsByDay).flat().length} {Object.values(eventsByDay).flat().length === 1 ? 'gathering' : 'gatherings'})
              </span>
            </h3>
            <span className="text-[11px] font-semibold text-[#8C8270] hidden sm:inline">
              Chicago Chapter Series
            </span>
          </div>

          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 text-center text-[11px] font-bold text-[#8C8270] uppercase tracking-wider">
            {dayNames.map((d, i) => (
              <div
                key={d}
                className={`py-1 rounded-md ${
                  i === 0 || i === 6 ? "text-[#C8643F]" : ""
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Empty slots before month start */}
            {Array.from({ length: startDayOfWeek }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="min-h-[70px] sm:min-h-[78px] p-1 bg-[#F4EEE2]/40 rounded-xl border border-dashed border-[#D8CEBC]/40 opacity-40"
              />
            ))}

            {/* Days 1 through daysInMonth */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
              const dayEvents = eventsByDay[dayNum] || [];
              const hasEvents = dayEvents.length > 0;
              const isWeekend = (startDayOfWeek + dayNum - 1) % 7 === 0 || (startDayOfWeek + dayNum - 1) % 7 === 6;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[70px] sm:min-h-[78px] p-1 sm:p-1.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                    hasEvents
                      ? "bg-white border-[#C8643F]/60 shadow-xs ring-1 ring-[#C8643F]/20"
                      : isWeekend
                      ? "bg-[#FAF5EA] border-[#D8CEBC]/60"
                      : "bg-[#FBF7EE] border-[#D8CEBC]/50"
                  }`}
                >
                  <div className="flex items-center justify-between leading-none">
                    <span
                      className={`text-[11px] font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        hasEvents
                          ? "bg-[#2B271F] text-white"
                          : "text-[#6A6253]"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {hasEvents && (
                      <span className="text-[9px] font-bold text-[#C8643F] hidden sm:inline">
                        ● Event
                      </span>
                    )}
                  </div>

                  {/* Event Bubbles */}
                  <div className="space-y-0.5 mt-1">
                    {dayEvents.map((ev) => {
                      const style = getCategoryStyles(ev.category);
                      const isAttending = ev.attendanceStatus === "attending";

                      return (
                        <div key={ev.id} className="relative group/bubble">
                          <button
                            type="button"
                            aria-label={`View details for ${splitEventTitle(ev.title, ev.brandPrefix).eventName} on ${ev.displayDate}`}
                            onClick={() => setActivePopoverEvent(ev)}
                            className={`w-full text-left py-0.5 px-1.5 rounded-lg border text-[10px] sm:text-xs font-semibold transition-all hover:scale-102 cursor-pointer flex items-center justify-between gap-1 leading-tight ${style.bg} ${style.border} ${style.text}`}
                            title={`Actually, Let's™ ${splitEventTitle(ev.title, ev.brandPrefix).eventName} (${ev.timeWindow})`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <span className="shrink-0 flex items-center">
                                <EventIcon
                                  iconName={ev.iconName}
                                  eventId={ev.id}
                                  category={ev.category}
                                  fallbackIcon={ev.icon}
                                  className="w-3.5 h-3.5 text-[#C8643F]"
                                />
                              </span>
                              <span className="font-bold truncate">{splitEventTitle(ev.title, ev.brandPrefix).eventName}</span>
                            </span>
                            {isAttending ? (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"
                                title="You're Going"
                              />
                            ) : null}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Trailing empty slots to complete the final grid row */}
            {Array.from({ length: trailingEmptySlots }).map((_, index) => (
              <div
                key={`empty-trail-${index}`}
                className="min-h-[70px] sm:min-h-[78px] p-1 bg-[#F4EEE2]/40 rounded-xl border border-dashed border-[#D8CEBC]/40 opacity-40"
              />
            ))}
          </div>
        </div>
      ) : (
        /* AGENDA LIST VIEW */
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[#D8CEBC]/50 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#8C8270] uppercase text-[10.5px] font-bold tracking-wider mr-1">
                Month:
              </span>
              <button
                type="button"
                onClick={() => setAgendaMonthFilter("all")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  agendaMonthFilter === "all"
                    ? "bg-[#2B271F] text-[#FBF7EE] font-bold shadow-xs"
                    : "bg-white border border-[#D8CEBC] text-[#6A6253] hover:text-[#2B271F]"
                }`}
              >
                All Gatherings ({filteredEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setAgendaMonthFilter("2026-10")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  agendaMonthFilter === "2026-10"
                    ? "bg-[#2B271F] text-[#FBF7EE] font-bold shadow-xs"
                    : "bg-white border border-[#D8CEBC] text-[#6A6253] hover:text-[#2B271F]"
                }`}
              >
                October 2026 ({filteredEvents.filter((e) => e.date.startsWith("2026-10")).length})
              </button>
              <button
                type="button"
                onClick={() => setAgendaMonthFilter("2026-11")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  agendaMonthFilter === "2026-11"
                    ? "bg-[#2B271F] text-[#FBF7EE] font-bold shadow-xs"
                    : "bg-white border border-[#D8CEBC] text-[#6A6253] hover:text-[#2B271F]"
                }`}
              >
                November 2026 ({filteredEvents.filter((e) => e.date.startsWith("2026-11")).length})
              </button>
            </div>
          </div>

          {filteredEvents.filter((e) => {
            if (agendaMonthFilter === "all") return true;
            return e.date.startsWith(agendaMonthFilter);
          }).length === 0 ? (
            <div className="text-center py-12 text-[#8C8270] bg-white border border-[#D8CEBC] rounded-2xl p-6">
              <Info className="w-6 h-6 mx-auto mb-2 text-[#C8643F]" />
              <p className="text-sm font-semibold">No gatherings found for selected filters.</p>
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterCategory("all");
                  setAgendaMonthFilter("all");
                }}
                className="mt-3 text-xs text-[#C8643F] underline font-bold"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredEvents
              .filter((e) => {
                if (agendaMonthFilter === "all") return true;
                return e.date.startsWith(agendaMonthFilter);
              })
              .map((ev) => {
              const style = getCategoryStyles(ev.category);
              const isAttending = ev.attendanceStatus === "attending";

              return (
                <div
                  key={ev.id}
                  className="p-4 sm:p-5 bg-white border border-[#D8CEBC] rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EDE4D3] flex items-center justify-center shrink-0 shadow-inner">
                      <EventIcon
                        iconName={ev.iconName}
                        eventId={ev.id}
                        category={ev.category}
                        fallbackIcon={ev.icon}
                        className="w-5 h-5 sm:w-6 sm:h-6 text-[#E07A5F]"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#C8643F] bg-[#FBE8DF] px-2.5 py-0.5 rounded-full">
                          {ev.displayDate}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}>
                          {style.label}
                        </span>
                        {isAttending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#EEF5EB] text-[#3D5634] border border-[#C5DEC0] px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>You&apos;re Going</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium bg-[#FBF7EE] text-[#8C8270] border border-[#D8CEBC] px-2.5 py-0.5 rounded-full">
                            Open Gathering
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5">
                        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#C8643F] flex items-center">
                          <span>Actually, Let&apos;s<span className="text-[0.55em] font-sans font-normal -top-[0.6em] relative ml-[1px] select-none text-stone-500">™</span></span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold font-serif-fraunces text-[#2B271F] leading-snug">
                          {splitEventTitle(ev.title, ev.brandPrefix).eventName}
                        </h3>
                      </div>

                      <p className="text-xs text-[#6A6253] mt-1 leading-relaxed max-w-xl">
                        {ev.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[#8C8270]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#C8643F]" />
                          <span>{ev.timeWindow}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#4C5A40]" />
                          <span>{ev.venueName}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D8CEBC]/40">
                    <button
                      type="button"
                      aria-label={`${isAttending ? "Cancel RSVP for" : "RSVP to attend"} ${splitEventTitle(ev.title, ev.brandPrefix).eventName}`}
                      onClick={() => onToggleRSVP && onToggleRSVP(ev.id)}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isAttending
                          ? "bg-[#EEF5EB] text-[#3D5634] border border-[#C5DEC0] hover:bg-[#FDF2F0] hover:text-[#A63A24] hover:border-[#F5C2BA]"
                          : "bg-[#C8643F] hover:bg-[#b05230] text-white shadow-xs"
                      }`}
                    >
                      {isAttending ? "Attending ✓" : "RSVP to Attend →"}
                    </button>

                    {(ev.externalUrl || ev.partifulUrl) && (
                      <a
                        href={ev.externalUrl || ev.partifulUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#6A6253] hover:text-[#2B271F] underline transition-colors"
                      >
                        <span>{ev.externalUrlLabel || "Open Link"}</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1.5 inline" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL / POPOVER FOR EVENT DETAILS */}
      {activePopoverEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePopoverEvent(null);
          }}
        >
          <div className="relative w-full max-w-lg bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in">
            <button
              type="button"
              onClick={() => setActivePopoverEvent(null)}
              className="absolute top-4 right-4 p-2 text-[#8C8270] hover:text-[#2B271F] transition-colors rounded-full hover:bg-[#EDE4D3]/50 cursor-pointer"
              aria-label="Close event popover"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Icon & Badges */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EDE4D3] flex items-center justify-center shrink-0 shadow-inner">
                <EventIcon
                  iconName={activePopoverEvent.iconName}
                  eventId={activePopoverEvent.id}
                  category={activePopoverEvent.category}
                  fallbackIcon={activePopoverEvent.icon}
                  className="w-7 h-7 text-[#E07A5F]"
                />
              </div>
              <div className="pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[#C8643F] bg-[#FBE8DF] px-2.5 py-0.5 rounded-full">
                    {activePopoverEvent.displayDate}
                  </span>
                  <span className="text-[11px] font-semibold text-[#6A6253] bg-[#EDE4D3] px-2.5 py-0.5 rounded-full">
                    {activePopoverEvent.category.toUpperCase()}
                  </span>
                </div>
                <div className="mt-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#C8643F] flex items-center">
                    <span>Actually, Let&apos;s<span className="text-[0.55em] font-sans font-normal -top-[0.6em] relative ml-[1px] select-none text-stone-500">™</span></span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-serif-fraunces text-[#2B271F] leading-tight">
                    {splitEventTitle(activePopoverEvent.title, activePopoverEvent.brandPrefix).eventName}
                  </h3>
                </div>
              </div>
            </div>

            {/* Attendance Status Banner */}
            <div
              className={`p-3 rounded-2xl border mb-5 flex items-center justify-between text-xs font-semibold ${
                activePopoverEvent.attendanceStatus === "attending"
                  ? "bg-[#EEF5EB] border-[#C5DEC0] text-[#3D5634]"
                  : "bg-[#F5F1E8] border-[#D8CEBC] text-[#6A6253]"
              }`}
            >
              <div className="flex items-center gap-2">
                {activePopoverEvent.attendanceStatus === "attending" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#C8643F] shrink-0" />
                )}
                <span>
                  {activePopoverEvent.attendanceStatus === "attending"
                    ? "You're Going — Your RSVP is confirmed!"
                    : "Open Gathering — Spots available"}
                </span>
              </div>
              {activePopoverEvent.matchingReason && (
                <span className="text-[10px] text-[#8C8270] hidden sm:inline">
                  {activePopoverEvent.matchingReason}
                </span>
              )}
            </div>

            {/* Event Description */}
            <p className="text-xs sm:text-sm text-[#6A6253] leading-relaxed mb-5">
              {activePopoverEvent.description}
            </p>

            {/* Details Box */}
            <div className="bg-white border border-[#D8CEBC] rounded-2xl p-4 space-y-3 text-xs text-[#2B271F] mb-6">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#C8643F] shrink-0" />
                <div>
                  <span className="text-[#8C8270] text-[11px] block">Time Window</span>
                  <span className="font-semibold">{activePopoverEvent.timeWindow}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#4C5A40] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#8C8270] text-[11px] block">Venue &amp; Location</span>
                  <span className="font-semibold block">{activePopoverEvent.venueName}</span>
                  {activePopoverEvent.venueAddress && (
                    <span className="text-[11px] text-[#6A6253]">{activePopoverEvent.venueAddress}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Popover Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onToggleRSVP) {
                    onToggleRSVP(activePopoverEvent.id);
                    setActivePopoverEvent((prev) =>
                      prev
                        ? {
                            ...prev,
                            attendanceStatus: prev.attendanceStatus === "attending" ? "open" : "attending",
                          }
                        : null
                    );
                  }
                }}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activePopoverEvent.attendanceStatus === "attending"
                    ? "bg-[#FDF2F0] hover:bg-[#F5C2BA] text-[#A63A24] border border-[#F5C2BA]"
                    : "bg-[#C8643F] hover:bg-[#b05230] text-white shadow-md hover:shadow-lg"
                }`}
              >
                {activePopoverEvent.attendanceStatus === "attending" ? "Can't Make It? Cancel RSVP" : "RSVP: I'm Going! →"}
              </button>

              {(activePopoverEvent.externalUrl || activePopoverEvent.partifulUrl) && (
                <a
                  href={activePopoverEvent.externalUrl || activePopoverEvent.partifulUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-white hover:bg-[#EDE4D3] text-[#2B271F] border border-[#D8CEBC] rounded-xl text-xs font-semibold transition-all"
                >
                  <span>{activePopoverEvent.externalUrlLabel || "Open Link"}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5 inline" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
