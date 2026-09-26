"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { auth } from "@/lib/firebase";
import { ResolvedEvent } from "@/lib/userEvents";
import {
  splitEventTitle,
  chicagoPotteryPoll,
  getAudienceBadge,
  getAudienceIcon,
} from "@/lib/eventsConfig";
import EventIcon from "@/components/dashboard/EventIcon";
import { BrandName } from "@/components/brand/BrandName";
import PotteryPollModal from "@/app/components/PotteryPollModal";
import {
  Calendar as CalendarIcon,
  List,
  Clock,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Check,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface MemberCalendarProps {
  events: ResolvedEvent[];
  onToggleRSVP?: (eventId: string) => void;
  className?: string;
  userEmail?: string | null;
  preferredDates?: string[];
  onTogglePreferredDate?: (dateKey: string) => void;
}

function getMonthShortName(monthKey: string): string {
  switch (monthKey) {
    case "2026-09":
      return "Sep";
    case "2026-10":
      return "Oct";
    case "2026-11":
      return "Nov";
    case "2026-12":
      return "Dec";
    default:
      return "Oct";
  }
}

function getMonthWeekendLabel(monthKey: string): string {
  switch (monthKey) {
    case "2026-09":
      return "All September Weekends";
    case "2026-10":
      return "All October Weekends";
    case "2026-11":
      return "All November Weekends";
    case "2026-12":
      return "All December Weekends";
    default:
      return "";
  }
}

function isDayPreferred(
  selectedMonth: string,
  dayNum: number,
  preferredDates: string[],
  isWeekend: boolean
): boolean {
  if (!preferredDates || preferredDates.length === 0) return false;
  const shortMonth = getMonthShortName(selectedMonth);
  const formattedKey = `${shortMonth} ${dayNum}, 2026`.toLowerCase();
  const shortKey = `${shortMonth} ${dayNum}`.toLowerCase();
  const isoKey = `${selectedMonth}-${String(dayNum).padStart(2, "0")}`.toLowerCase();

  if (isWeekend) {
    const weekendLabel = getMonthWeekendLabel(selectedMonth).toLowerCase();
    if (weekendLabel && preferredDates.some((d) => typeof d === "string" && d.trim().toLowerCase() === weekendLabel)) {
      return true;
    }
  }

  return preferredDates.some((d) => {
    if (!d || typeof d !== "string") return false;
    const clean = d.trim().toLowerCase();
    return (
      clean === formattedKey ||
      clean === shortKey ||
      clean === isoKey ||
      clean.includes(formattedKey) ||
      clean.includes(isoKey)
    );
  });
}

export default function MemberCalendar({
  events,
  onToggleRSVP,
  className = "",
  userEmail,
  preferredDates: propsPreferredDates,
  onTogglePreferredDate,
}: MemberCalendarProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const AVAILABLE_MONTHS = ["2026-09", "2026-10", "2026-11", "2026-12"] as const;
  type MonthKey = (typeof AVAILABLE_MONTHS)[number];
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>("2026-10");
  const [agendaMonthFilter, setAgendaMonthFilter] = useState<"all" | MonthKey>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "attending" | "open">("all");
  const [activePopoverEvent, setActivePopoverEvent] = useState<ResolvedEvent | null>(null);
  const [isPotteryModalOpen, setIsPotteryModalOpen] = useState(false);

  // Active preferred dates state (synced with props.preferredDates and localStorage)
  const [internalPreferredDates, setInternalPreferredDates] = useState<string[]>(() => {
    if (propsPreferredDates && propsPreferredDates.length > 0) {
      return propsPreferredDates;
    }
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("actuallylets_preferred_dates");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  useEffect(() => {
    if (propsPreferredDates && propsPreferredDates.length > 0) {
      setInternalPreferredDates(propsPreferredDates);
    }
  }, [propsPreferredDates]);

  const activePreferredDates = propsPreferredDates && propsPreferredDates.length > 0
    ? propsPreferredDates
    : internalPreferredDates;
  const [hasVoted, setHasVoted] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Derived current active event strictly bound to reactive events array (for seamless rollback sync)
  const currentActiveEvent = activePopoverEvent
    ? events.find((e) => e.id === activePopoverEvent.id) || activePopoverEvent
    : null;

  // Lock body scroll and dismiss on Escape when event modal is open
  useEffect(() => {
    if (activePopoverEvent) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setActivePopoverEvent(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [activePopoverEvent]);

  useEffect(() => {
    const checkVoted = () => {
      try {
        const currentUser = auth.currentUser;
        const voted = localStorage.getItem('hasVoted_pottery-studio-faceoff');
        const sessionVoted = typeof window !== 'undefined' ? sessionStorage.getItem('hasVoted_anonymous_session') : null;
        if (currentUser) {
          setHasVoted(voted === 'true');
        } else {
          setHasVoted(sessionVoted === 'true');
        }
      } catch {
        // ignore localStorage errors
      }
    };
    checkVoted();

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        const sessionVoted = typeof window !== 'undefined' ? sessionStorage.getItem('hasVoted_anonymous_session') : null;
        if (sessionVoted !== 'true') {
          setHasVoted(false);
        }
      } else {
        checkVoted();
      }
    });

    const handleSignOutEvent = () => {
      setHasVoted(false);
    };

    window.addEventListener('pollVoteUpdated', checkVoted);
    window.addEventListener('storage', checkVoted);
    window.addEventListener('actuallylets_signout', handleSignOutEvent);
    return () => {
      unsubAuth();
      window.removeEventListener('pollVoteUpdated', checkVoted);
      window.removeEventListener('storage', checkVoted);
      window.removeEventListener('actuallylets_signout', handleSignOutEvent);
    };
  }, []);

  // Month Configurations for Fall/Winter 2026
  const monthConfigs: Record<MonthKey, {
    key: MonthKey;
    name: string;
    shortName: string;
    headerLabel: string;
    badgeLabel: string;
    daysInMonth: number;
    startDayOfWeek: number;
  }> = {
    "2026-09": {
      key: "2026-09",
      name: "September 2026",
      shortName: "Sep 2026",
      headerLabel: "September",
      badgeLabel: "SEPTEMBER 2026 LINEUP",
      daysInMonth: 30,
      startDayOfWeek: 2, // Tuesday (Sep 1, 2026)
    },
    "2026-10": {
      key: "2026-10",
      name: "October 2026",
      shortName: "Oct 2026",
      headerLabel: "October 2026",
      badgeLabel: "OCTOBER 2026 LINEUP",
      daysInMonth: 31,
      startDayOfWeek: 4, // Thursday (Oct 1, 2026)
    },
    "2026-11": {
      key: "2026-11",
      name: "November 2026",
      shortName: "Nov 2026",
      headerLabel: "November 2026",
      badgeLabel: "NOVEMBER 2026 LINEUP",
      daysInMonth: 30,
      startDayOfWeek: 0, // Sunday (Nov 1, 2026)
    },
    "2026-12": {
      key: "2026-12",
      name: "December 2026",
      shortName: "Dec 2026",
      headerLabel: "December 2026",
      badgeLabel: "DECEMBER 2026 LINEUP",
      daysInMonth: 31,
      startDayOfWeek: 2, // Tuesday (Dec 1, 2026)
    },
  };

  const currentMonthIndex = AVAILABLE_MONTHS.indexOf(selectedMonth);
  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      const prev = AVAILABLE_MONTHS[currentMonthIndex - 1];
      setSelectedMonth(prev);
      setAgendaMonthFilter(prev);
    }
  };
  const handleNextMonth = () => {
    if (currentMonthIndex < AVAILABLE_MONTHS.length - 1) {
      const next = AVAILABLE_MONTHS[currentMonthIndex + 1];
      setSelectedMonth(next);
      setAgendaMonthFilter(next);
    }
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

  const handleBlankDateClick = (dayNum: number) => {
    const shortMonth = getMonthShortName(selectedMonth);
    const dateKey = `${shortMonth} ${dayNum}, 2026`;
    const isWeekend = (startDayOfWeek + dayNum - 1) % 7 === 0 || (startDayOfWeek + dayNum - 1) % 7 === 6;
    const isCurrentlyPreferred = isDayPreferred(selectedMonth, dayNum, activePreferredDates, isWeekend);

    let updated: string[];
    if (isCurrentlyPreferred) {
      const isoKey = `${selectedMonth}-${String(dayNum).padStart(2, "0")}`.toLowerCase();
      const shortKey = `${shortMonth} ${dayNum}`.toLowerCase();
      const lowerKey = dateKey.toLowerCase();
      updated = activePreferredDates.filter((d) => {
        if (!d || typeof d !== "string") return false;
        const clean = d.trim().toLowerCase();
        return (
          clean !== lowerKey &&
          clean !== isoKey &&
          clean !== shortKey &&
          !clean.includes(lowerKey)
        );
      });
      // If bulk weekend label exists, unroll weekends for this month
      const weekendLabel = getMonthWeekendLabel(selectedMonth).toLowerCase();
      if (weekendLabel && updated.some((d) => typeof d === "string" && d.trim().toLowerCase() === weekendLabel)) {
        updated = updated.filter((d) => typeof d === "string" && d.trim().toLowerCase() !== weekendLabel);
        for (let d = 1; d <= daysInMonth; d++) {
          const isDWeekend = (startDayOfWeek + d - 1) % 7 === 0 || (startDayOfWeek + d - 1) % 7 === 6;
          if (isDWeekend && d !== dayNum) {
            updated.push(`${shortMonth} ${d}, 2026`);
          }
        }
      }
    } else {
      updated = Array.from(new Set([...activePreferredDates, dateKey]));
    }

    setInternalPreferredDates(updated);
    try {
      localStorage.setItem("actuallylets_preferred_dates", JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (onTogglePreferredDate) {
      onTogglePreferredDate(dateKey);
    }
  };

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
      case "comedy":
      case "stand-up":
        return {
          bg: "bg-[#FFF8E7]",
          border: "border-[#EAD39E]",
          text: "text-[#8A6218]",
          badgeBg: "bg-[#F7EDD5]",
          label: "Stand-Up Comedy",
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
    <div className={`bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-3 sm:p-6 shadow-sm overflow-hidden ${className}`}>
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
          {/* Mobile Month Pager (< sm) */}
          <div className="flex sm:hidden items-center justify-between w-full p-1 bg-[#EDE4D3]/70 rounded-xl text-xs font-semibold text-[#6A6253]">
            <button
              type="button"
              aria-label="Previous month"
              disabled={currentMonthIndex === 0}
              onClick={handlePrevMonth}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                currentMonthIndex === 0
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-[#2B271F] hover:bg-white/60 active:bg-white"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Prev</span>
            </button>
            <span className="px-2 py-0.5 font-bold text-[#2B271F] text-xs">
              {currentMonthConfig.headerLabel}
            </span>
            <button
              type="button"
              aria-label="Next month"
              disabled={currentMonthIndex === AVAILABLE_MONTHS.length - 1}
              onClick={handleNextMonth}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                currentMonthIndex === AVAILABLE_MONTHS.length - 1
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-[#2B271F] hover:bg-white/60 active:bg-white"
              }`}
            >
              <span className="text-[11px] font-medium">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop Month Switcher (>= sm) */}
          <div className="hidden sm:flex items-center p-0.5 bg-[#EDE4D3]/70 rounded-xl text-xs font-semibold text-[#6A6253]">
            <button
              type="button"
              aria-label="Previous month"
              disabled={currentMonthIndex === 0}
              onClick={handlePrevMonth}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                currentMonthIndex === 0
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-[#2B271F] hover:bg-white/60"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {AVAILABLE_MONTHS.map((mKey) => {
              const mConf = monthConfigs[mKey];
              const isCur = selectedMonth === mKey;
              return (
                <button
                  key={mKey}
                  type="button"
                  aria-label={`Select ${mConf.name}`}
                  onClick={() => {
                    setSelectedMonth(mKey);
                    setAgendaMonthFilter(mKey);
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isCur
                      ? "bg-[#FBF7EE] text-[#2B271F] shadow-xs font-bold"
                      : "hover:text-[#2B271F]"
                  }`}
                >
                  {mConf.headerLabel}
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Next month"
              disabled={currentMonthIndex === AVAILABLE_MONTHS.length - 1}
              onClick={handleNextMonth}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                currentMonthIndex === AVAILABLE_MONTHS.length - 1
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

          {/* December Empty Month Banner */}
          {selectedMonth === "2026-12" && (
            <div className="mb-3 p-3.5 bg-[#FAF7F2] border border-[#EADBCC] rounded-xl text-center text-xs text-stone-600">
              December lineup coming soon · Tap any date to let us know when you&apos;re free to gather.
            </div>
          )}

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
                className="min-h-[46px] sm:min-h-[62px] p-1 bg-[#F4EEE2]/40 rounded-xl border border-dashed border-[#D8CEBC]/40 opacity-40"
              />
            ))}

            {/* Days 1 through daysInMonth */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
              const dayEvents = eventsByDay[dayNum] || [];
              const hasEvents = dayEvents.length > 0;
              const isWeekend = (startDayOfWeek + dayNum - 1) % 7 === 0 || (startDayOfWeek + dayNum - 1) % 7 === 6;
              const isPreferred = isDayPreferred(selectedMonth, dayNum, activePreferredDates, isWeekend);
              const isPollDay =
                (selectedMonth === "2026-10" && dayNum === 4) ||
                (selectedMonth === "2026-11" && dayNum === 14);
              const pollTitle = isPollDay
                ? selectedMonth === "2026-10"
                  ? "Vote on Next Gathering: Lincoln Square Pottery Studio vs. GnarWare Workshop (Oct 4 option)"
                  : "Vote on Next Gathering: Lincoln Square Pottery Studio vs. GnarWare Workshop (Nov 14 option)"
                : undefined;

              return (
                <div
                  key={`day-${dayNum}`}
                  role="button"
                  tabIndex={0}
                  title={
                    isPollDay
                      ? pollTitle
                      : hasEvents
                      ? undefined
                      : isPreferred
                      ? `${currentMonthConfig.name} ${dayNum} marked as available (click to remove)`
                      : `Click to mark ${currentMonthConfig.name} ${dayNum} as free to gather`
                  }
                  aria-label={
                    isPollDay
                      ? pollTitle
                      : hasEvents
                      ? `View gatherings for ${currentMonthConfig.name} ${dayNum}`
                      : isPreferred
                      ? `${currentMonthConfig.name} ${dayNum}, currently marked as free. Tap to remove availability.`
                      : `${currentMonthConfig.name} ${dayNum}, blank date. Tap to mark as free to gather.`
                  }
                  onClick={() => {
                    if (isPollDay) {
                      setIsPotteryModalOpen(true);
                    } else if (hasEvents) {
                      setActivePopoverEvent(dayEvents[0]);
                    } else {
                      handleBlankDateClick(dayNum);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (isPollDay) {
                        setIsPotteryModalOpen(true);
                      } else if (hasEvents) {
                        setActivePopoverEvent(dayEvents[0]);
                      } else {
                        handleBlankDateClick(dayNum);
                      }
                    }
                  }}
                  className={`min-h-[44px] sm:min-h-[62px] p-0.5 sm:p-1 rounded-xl border transition-all relative flex flex-col justify-between overflow-hidden min-w-0 group/cell cursor-pointer select-none ${
                    isPollDay
                      ? "bg-white border-[#C8643F] shadow-xs hover:border-[#C8643F] hover:shadow-sm"
                      : hasEvents
                      ? "bg-white border-[#C8643F]/60 shadow-xs ring-1 ring-[#C8643F]/20 hover:border-[#C8643F]"
                      : isPreferred
                      ? "bg-[#FAF3EF] border-[#C8643F] ring-1 ring-[#C8643F]/40 shadow-xs"
                      : isWeekend
                      ? "bg-[#FAF5EA] border-[#D8CEBC]/60 hover:border-[#C8643F]/60 hover:bg-[#FAF3EF]/40"
                      : "bg-[#FBF7EE] border-[#D8CEBC]/50 hover:border-[#C8643F]/60 hover:bg-[#FAF3EF]/40"
                  }`}
                >
                  <div className="flex items-center justify-between leading-none w-full">
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-colors ${
                        hasEvents || isPollDay
                          ? "bg-[#2B271F] text-white"
                          : isPreferred
                          ? "bg-[#C8643F] text-white"
                          : "text-[#6A6253] group-hover/cell:text-[#2B271F]"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isPreferred && !hasEvents && !isPollDay && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#C8643F] shrink-0"
                        title="Available / Preferred"
                      />
                    )}
                    {hasEvents && (
                      <>
                        <span className="text-[9px] font-bold text-[#C8643F] hidden sm:inline">
                          ● {dayEvents.length > 1 ? `${dayEvents.length} Events` : "Event"}
                        </span>
                        {/* Mobile Event Dot Indicator (< sm) */}
                        <div className="flex items-center gap-0.5 sm:hidden">
                          {dayEvents.map((ev) => (
                            <span
                              key={ev.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                ev.attendanceStatus === "attending"
                                  ? "bg-emerald-600"
                                  : "bg-[#C8643F]"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Neutral Community Poll Badge on Oct 4 & Nov 14 */}
                  {isPollDay && (
                    <div className="mt-1 min-w-0 relative group/poll" title={pollTitle}>
                      <span
                        className="text-[10px] sm:text-[11px] font-bold text-[#C8643F] bg-[#C8643F]/10 border border-dashed border-[#C8643F]/60 rounded-md py-0.5 px-1 inline-flex items-center justify-center gap-1 whitespace-nowrap leading-tight w-full hover:bg-[#C8643F]/20 transition-colors"
                        title={pollTitle}
                      >
                        🗳️ Vote
                      </span>

                      {/* Matching Hover Popover Card */}
                      <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-48 sm:w-56 p-2.5 bg-[#2B271F] text-white rounded-xl shadow-xl z-50 pointer-events-none opacity-0 group-hover/poll:opacity-100 transition-opacity duration-150 text-left hidden sm:block">
                        <div className="text-[9px] font-bold text-[#E07A5F] tracking-widest uppercase mb-0.5">
                          COMMUNITY POLL
                        </div>
                        <div className="text-xs font-bold font-serif-fraunces text-white leading-snug">
                          {selectedMonth === "2026-10" ? "Lincoln Square Pottery Studio (Oct 4)" : "GnarWare Workshop (Nov 14)"}
                        </div>
                        <div className="text-[10px] text-[#EDE4D3] mt-1 flex items-center gap-1">
                          <span>Click to cast your vote</span>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#2B271F]" />
                      </div>
                    </div>
                  )}

                  {/* Blank date availability indicator */}
                  {!hasEvents && !isPollDay && (
                    isPreferred ? (
                      <div className="mt-auto pt-0.5 flex items-center justify-center sm:justify-start w-full">
                        <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9.5px] font-semibold text-[#C8643F] bg-[#C8643F]/10 px-1 sm:px-1.5 py-0.5 rounded-md border border-[#C8643F]/20 leading-none">
                          <Check className="w-2.5 h-2.5 text-[#C8643F] shrink-0" strokeWidth={2.5} />
                          <span className="hidden sm:inline">Available</span>
                          <span className="sm:hidden">Free</span>
                        </span>
                      </div>
                    ) : (
                      <div className="mt-auto pt-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity hidden sm:flex items-center text-[9px] text-[#8C8270]">
                        <span>+ Free</span>
                      </div>
                    )
                  )}

                  {/* Desktop Event Bubbles (>= sm) */}
                  <div className="hidden sm:block space-y-0.5 mt-1 min-w-0">
                    {dayEvents.map((ev) => {
                      const style = getCategoryStyles(ev.category);
                      const isAttending = ev.attendanceStatus === "attending";
                      const sTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
                      const evTooltip = `${sTitle} • ${ev.timeWindow} • ${ev.venueName}`;
                      const audIcon = getAudienceIcon(ev.audience, ev.audienceLabel);

                      return (
                        <div key={ev.id} className="relative group/bubble min-w-0">
                          <button
                            type="button"
                            aria-label={`View details for ${sTitle} on ${ev.displayDate}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePopoverEvent(ev);
                            }}
                            className={`w-full text-left py-0.5 px-1.5 rounded-lg border text-[10px] sm:text-xs font-semibold transition-all hover:scale-102 cursor-pointer flex items-center justify-between gap-1 leading-tight min-w-0 ${style.bg} ${style.border} ${style.text}`}
                            title={evTooltip}
                          >
                            <span className="truncate flex items-center gap-1 min-w-0">
                              <span className="shrink-0 flex items-center">
                                <EventIcon
                                  iconName={ev.iconName}
                                  eventId={ev.id}
                                  category={ev.category}
                                  fallbackIcon={ev.icon}
                                  className="w-3.5 h-3.5 text-[#C8643F]"
                                />
                              </span>
                              {audIcon && (
                                <span className="shrink-0 text-[8.5px] sm:text-[9.5px] leading-none" aria-hidden="true">
                                  {audIcon}
                                </span>
                              )}
                              <span className="font-bold truncate min-w-0">{ev.chipLabel || sTitle}</span>
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

                  {/* Mobile Tap Target (< sm) */}
                  {hasEvents && (
                    <div className="sm:hidden mt-auto pt-0.5 flex justify-center w-full">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopoverEvent(dayEvents[0]);
                        }}
                        className="w-full flex items-center justify-center gap-1 p-1 rounded-md bg-[#EDE4D3]/50 text-[#C8643F] hover:bg-[#EDE4D3]"
                        aria-label={`View event details on ${currentMonthConfig.name} ${dayNum}`}
                      >
                        <EventIcon
                          iconName={dayEvents[0].iconName}
                          eventId={dayEvents[0].id}
                          category={dayEvents[0].category}
                          fallbackIcon={dayEvents[0].icon}
                          className="w-3.5 h-3.5 text-[#C8643F]"
                        />
                        {getAudienceIcon(dayEvents[0].audience, dayEvents[0].audienceLabel) && (
                          <span className="text-[8px] leading-none" aria-hidden="true">
                            {getAudienceIcon(dayEvents[0].audience, dayEvents[0].audienceLabel)}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Trailing empty slots to complete the final grid row */}
            {Array.from({ length: trailingEmptySlots }).map((_, index) => (
              <div
                key={`empty-trail-${index}`}
                className="min-h-[46px] sm:min-h-[62px] p-1 bg-[#F4EEE2]/40 rounded-xl border border-dashed border-[#D8CEBC]/40 opacity-40"
              />
            ))}
          </div>

          {/* Community Poll Banner Strip below Month Grid (Oct 2026 & Nov 2026) */}
          {(selectedMonth === "2026-10" || selectedMonth === "2026-11") && (
            <div className="mt-4 p-4 sm:p-5 bg-[#FAF7F2] border border-dashed border-[#C8643F] rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EDE4D3] flex items-center justify-center shrink-0 shadow-inner text-xl">
                  🗳️
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#C8643F] bg-[#FBE8DF] px-2.5 py-0.5 rounded-full">
                      {selectedMonth === "2026-10" ? "Sun, Oct 4 (Lincoln Square)" : "Sat, Nov 14 (GnarWare Pilsen)"}
                    </span>
                    {hasVoted ? (
                      <span className="text-[11px] font-bold bg-[#2D6A4F]/10 text-[#2D6A4F] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        ✓ VOTED
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold bg-[#EDE4D3] text-[#C8643F] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        COMMUNITY POLL
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5">
                    <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#C8643F] flex items-center">
                      <BrandName />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold font-serif-fraunces text-[#2B271F] leading-snug">
                      Vote on Next Gathering
                    </h3>
                  </div>

                  <p className="text-xs text-[#6A6253] mt-1 leading-relaxed max-w-xl">
                    {hasVoted
                      ? "Your vote is in. We'll announce the winning location when bookings open."
                      : "Help us choose between Lincoln Square Pottery Studio and GnarWare Workshop."}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D8CEBC]/40">
                {hasVoted ? (
                  <button
                    type="button"
                    onClick={() => setIsPotteryModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-[#D8CEBC] bg-white text-[#2B271F] hover:bg-[#EDE4D3]/50 shadow-xs"
                  >
                    Edit Vote
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPotteryModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-dashed border-[#C8643F] bg-[#C8643F]/5 text-[#C8643F] hover:bg-[#C8643F]/10 shadow-xs"
                  >
                    Vote Now &rarr;
                  </button>
                )}
              </div>
            </div>
          )}
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
              {AVAILABLE_MONTHS.map((mKey) => {
                const count = filteredEvents.filter((e) => e.date.startsWith(mKey)).length;
                const mConf = monthConfigs[mKey];
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => setAgendaMonthFilter(mKey)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      agendaMonthFilter === mKey
                        ? "bg-[#2B271F] text-[#FBF7EE] font-bold shadow-xs"
                        : "bg-white border border-[#D8CEBC] text-[#6A6253] hover:text-[#2B271F]"
                    }`}
                  >
                    {mConf.headerLabel} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredEvents.filter((e) => {
            if (agendaMonthFilter === "all") return true;
            return e.date.startsWith(agendaMonthFilter);
          }).length === 0 ? (
            <div className="text-center py-12 text-[#8C8270] bg-white border border-[#D8CEBC] rounded-2xl p-6">
              <Info className="w-6 h-6 mx-auto mb-2 text-[#C8643F]" />
              <p className="text-sm font-semibold">
                {agendaMonthFilter === "2026-12"
                  ? "December lineup coming soon — check back shortly for holiday gatherings."
                  : "No gatherings found for selected filters."}
              </p>
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
            <>
              {/* Community Poll Agenda Card (Oct 4 & Nov 14) */}
              {(agendaMonthFilter === "all" || agendaMonthFilter === "2026-10" || agendaMonthFilter === "2026-11") &&
                filterStatus !== "attending" &&
                (filterCategory === "all" || filterCategory === "culture") && (
                  <div className="p-4 sm:p-5 bg-[#FAF7F2] border border-dashed border-[#C8643F] rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EDE4D3] flex items-center justify-center shrink-0 shadow-inner text-xl">
                        🗳️
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#C8643F] bg-[#FBE8DF] px-2.5 py-0.5 rounded-full">
                            {agendaMonthFilter === "2026-11" ? "Sat, Nov 14 (GnarWare Pilsen)" : agendaMonthFilter === "2026-10" ? "Sun, Oct 4 (Lincoln Square)" : "Sun, Oct 4 & Sat, Nov 14"}
                          </span>
                          {hasVoted ? (
                            <span className="text-[11px] font-bold bg-[#2D6A4F]/10 text-[#2D6A4F] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              ✓ VOTED
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold bg-[#EDE4D3] text-[#C8643F] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              COMMUNITY POLL
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5">
                          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#C8643F] flex items-center">
                            <BrandName />
                          </div>
                          <h3 className="text-base sm:text-lg font-bold font-serif-fraunces text-[#2B271F] leading-snug">
                            Vote on Next Gathering
                          </h3>
                        </div>

                        <p className="text-xs text-[#6A6253] mt-1 leading-relaxed max-w-xl">
                          {hasVoted
                            ? "Your vote is in. We'll announce the winning location when bookings open."
                            : "Help us choose between Lincoln Square Pottery Studio and GnarWare Workshop."}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D8CEBC]/40">
                      {hasVoted ? (
                        <button
                          type="button"
                          onClick={() => setIsPotteryModalOpen(true)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-[#D8CEBC] bg-white text-[#2B271F] hover:bg-[#EDE4D3]/50 shadow-xs"
                        >
                          Edit Vote
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsPotteryModalOpen(true)}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-dashed border-[#C8643F] bg-[#C8643F]/5 text-[#C8643F] hover:bg-[#C8643F]/10 shadow-xs"
                        >
                          Vote Now &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}

              {filteredEvents
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
                        {(ev.audienceLabel || ev.audience) && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EEF5EB] border border-[#C5DEC0] text-[#3D5634]">
                            {getAudienceBadge(ev.audience, ev.audienceLabel)}
                          </span>
                        )}
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
                          <BrandName />
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
            })}
            </>
          )}
        </div>
      )}

      {/* MODAL / POPOVER FOR EVENT DETAILS */}
      {currentActiveEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePopoverEvent(null);
          }}
        >
          <div
            ref={modalScrollRef}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in"
          >
            {/* Multi-event switcher bar if multiple events exist on same date */}
            {(() => {
              const sameDayEvents = events.filter((e) => e.date === currentActiveEvent.date);
              if (sameDayEvents.length <= 1) {
                return (
                  <button
                    type="button"
                    onClick={() => setActivePopoverEvent(null)}
                    className="absolute top-4 right-4 p-2 text-[#8C8270] hover:text-[#2B271F] transition-colors rounded-full hover:bg-[#EDE4D3]/50 cursor-pointer"
                    aria-label="Close event popover"
                  >
                    <X className="w-5 h-5" />
                  </button>
                );
              }
              return (
                <div className="mb-5">
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <span className="text-xs font-bold text-[#8C8270] uppercase tracking-wider">
                      {sameDayEvents.length} Gatherings on this date
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePopoverEvent(null)}
                      className="p-1.5 text-[#8C8270] hover:text-[#2B271F] transition-colors rounded-full hover:bg-[#EDE4D3]/60 cursor-pointer shrink-0"
                      aria-label="Close event popover"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-[#EDE4D3]/70 rounded-xl">
                    {sameDayEvents.map((sEv) => {
                      const isCurrent = sEv.id === currentActiveEvent.id;
                      const sTitle = splitEventTitle(sEv.title, sEv.brandPrefix).eventName;
                      return (
                        <button
                          key={sEv.id}
                          type="button"
                          onClick={() => {
                            setActivePopoverEvent(sEv);
                            modalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 truncate cursor-pointer ${
                            isCurrent
                              ? "bg-[#2B271F] text-white shadow-xs"
                              : "text-[#6A6253] hover:text-[#2B271F] hover:bg-white/50"
                          }`}
                        >
                          <span className="truncate">{sEv.chipLabel || sTitle}</span>
                          {sEv.attendanceStatus === "attending" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="You're going" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Header with Icon & Badges */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EDE4D3] flex items-center justify-center shrink-0 shadow-inner">
                <EventIcon
                  iconName={currentActiveEvent.iconName}
                  eventId={currentActiveEvent.id}
                  category={currentActiveEvent.category}
                  fallbackIcon={currentActiveEvent.icon}
                  className="w-7 h-7 text-[#E07A5F]"
                />
              </div>
              <div className="pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[#C8643F] bg-[#FBE8DF] px-2.5 py-0.5 rounded-full">
                    {currentActiveEvent.displayDate}
                  </span>
                  <span className="text-[11px] font-semibold text-[#6A6253] bg-[#EDE4D3] px-2.5 py-0.5 rounded-full">
                    {currentActiveEvent.category.toUpperCase()}
                  </span>
                  {(currentActiveEvent.audienceLabel || currentActiveEvent.audience) && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EEF5EB] border border-[#C5DEC0] text-[#3D5634]">
                      {getAudienceBadge(currentActiveEvent.audience, currentActiveEvent.audienceLabel)}
                    </span>
                  )}
                </div>
                <div className="mt-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#C8643F] flex items-center">
                    <BrandName />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-serif-fraunces text-[#2B271F] leading-tight">
                    {splitEventTitle(currentActiveEvent.title, currentActiveEvent.brandPrefix).eventName}
                  </h3>
                </div>
              </div>
            </div>

            {/* Attendance Status Banner */}
            <div
              className={`p-3 rounded-2xl border mb-5 flex items-center justify-between text-xs font-semibold ${
                currentActiveEvent.attendanceStatus === "attending"
                  ? "bg-[#EEF5EB] border-[#C5DEC0] text-[#3D5634]"
                  : "bg-[#F5F1E8] border-[#D8CEBC] text-[#6A6253]"
              }`}
            >
              <div className="flex items-center gap-2">
                {currentActiveEvent.attendanceStatus === "attending" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <CalendarIcon className="w-4 h-4 text-[#C8643F] shrink-0" />
                )}
                <span>
                  {currentActiveEvent.attendanceStatus === "attending"
                    ? "You're Going — RSVP Confirmed"
                    : "Spots Available — RSVP to attend"}
                </span>
              </div>
              {currentActiveEvent.matchingReason && (
                <span className="text-[10px] text-[#8C8270] hidden sm:inline">
                  {currentActiveEvent.matchingReason}
                </span>
              )}
            </div>

            {/* Event Description */}
            <p className="text-xs sm:text-sm text-[#6A6253] leading-relaxed mb-5">
              {currentActiveEvent.description}
            </p>

            {/* Details Box */}
            <div className="bg-white border border-[#D8CEBC] rounded-2xl p-4 space-y-3 text-xs text-[#2B271F] mb-6">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#C8643F] shrink-0" />
                <div>
                  <span className="text-[#8C8270] text-[11px] block">Time Window</span>
                  <span className="font-semibold">{currentActiveEvent.timeWindow}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#4C5A40] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#8C8270] text-[11px] block">Venue &amp; Location</span>
                  <span className="font-semibold block">{currentActiveEvent.venueName}</span>
                  {currentActiveEvent.venueAddress && (
                    <span className="text-[11px] text-[#6A6253]">{currentActiveEvent.venueAddress}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Sister gathering callout if multiple events exist on same date */}
            {(() => {
              const sameDayEvents = events.filter((e) => e.date === currentActiveEvent.date);
              if (sameDayEvents.length <= 1) return null;
              const others = sameDayEvents.filter((e) => e.id !== currentActiveEvent.id);
              if (others.length === 0) return null;
              return (
                <div className="bg-[#FAF7F2] border border-[#D8CEBC]/70 rounded-2xl p-3 mb-5">
                  <span className="text-[10px] font-bold text-[#8C8270] uppercase tracking-wider block mb-1.5">
                    Another gathering on this date
                  </span>
                  {others.map((other) => {
                    const isAttendingOther = other.attendanceStatus === "attending";
                    return (
                      <div key={other.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-[#2B271F] truncate">
                            {splitEventTitle(other.title, other.brandPrefix).eventName}
                          </div>
                          <div className="text-[11px] text-[#6A6253]">
                            {other.timeWindow} · {other.venueName}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePopoverEvent(other);
                            modalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2B271F] text-[#FBF7EE] hover:bg-[#3D372E] transition-all cursor-pointer shadow-xs"
                        >
                          {isAttendingOther ? "View RSVP (Going)" : "View Gathering →"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Popover Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onToggleRSVP) {
                    onToggleRSVP(currentActiveEvent.id);
                  }
                }}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  currentActiveEvent.attendanceStatus === "attending"
                    ? "bg-[#FDF2F0] hover:bg-[#F5C2BA] text-[#A63A24] border border-[#F5C2BA]"
                    : "bg-[#C8643F] hover:bg-[#b05230] text-white shadow-md hover:shadow-lg"
                }`}
              >
                {currentActiveEvent.attendanceStatus === "attending" ? "Can't Make It? Cancel RSVP" : "RSVP: I'm Going! →"}
              </button>

              {(currentActiveEvent.externalUrl || currentActiveEvent.partifulUrl) && (
                <a
                  href={currentActiveEvent.externalUrl || currentActiveEvent.partifulUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-white hover:bg-[#EDE4D3] text-[#2B271F] border border-[#D8CEBC] rounded-xl text-xs font-semibold transition-all"
                >
                  <span>{currentActiveEvent.externalUrlLabel || "Open Link"}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5 inline" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pottery Studio Face-Off Community Choice Ballot Modal */}
      <PotteryPollModal
        isOpen={isPotteryModalOpen}
        onClose={() => setIsPotteryModalOpen(false)}
        initialEmail={userEmail || undefined}
        currentMonth={selectedMonth}
      />
    </div>
  );
}
