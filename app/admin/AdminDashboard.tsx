'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { SurveyResponse } from '@/types/survey';
import { formatPhoneNumber } from '@/lib/formatPhone';
import { db, BroadcastRecord } from '@/lib/firebase';
import { CommunityEvent, getEventsForCity, fetchHydratedEvents, splitEventTitle, getChapterMarkets } from '@/lib/eventsConfig';
import { RegisteredUser, fetchAllUsers, calculateEventAttendance, isContactAttendingEvent } from '@/lib/userEvents';
import { getRelativeDateInfo, getTodayDateString } from '@/lib/eventStatus';
import { BrandName } from '@/components/brand/BrandName';
import Footer from '@/components/Footer';
import {
  Users,
  UserCheck,
  CalendarDays,
  Calendar,
  Clock,
  SlidersHorizontal,
  Megaphone,
  Trophy,
  MapPin,
  Compass,
  Ticket,
  PenLine,
  Search,
  RotateCcw,
  Download,
  Check,
  Copy,
  Mail,
  Lock,
  MessageSquare,
  History,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { 
  Flame, 
  Wine, 
  Pizza, 
  Tree, 
  Ghost, 
  Tractor, 
  Users as PhosphorUsers, 
  ForkKnife,
  AppleLogo,
  HandsPraying,
  MicrophoneStage,
  Martini,
  CalendarCheck,
} from "@phosphor-icons/react";

const GATHERINGS = [
  "Moms Morning",
  "Ladies Morning",
  "Ladies Night",
  "Couples / Date Night",
  "Happy Hour",
  "Family-Friendly",
  "Prenatal & New Parents",
  "All Ages / Community",
  "Hiking",
  "City Walk",
  "Kayaking / Paddleboarding",
  "Outdoor Activities",
  "Golfing",
  "Board games / Card games",
  "Down for Whatever",
];

const TIMES = [
  "Early-Morning (8am)",
  "Mid-Morning (10am)",
  "Late-Morning (11am)",
  "Afternoon",
  "Evening",
  "Any time",
];

const DAYPREF = ["Weekend", "Weekday", "Either works"];
const DRINKS = ["Mimosa", "Mocktail", "Both please"];

export const AVAILABLE_MONTHS = ["2026-09", "2026-10", "2026-11", "2026-12"] as const;
export type MonthKey = (typeof AVAILABLE_MONTHS)[number];
export const CURRENT_CYCLE_MONTH: MonthKey = "2026-10";

export const MONTH_CONFIGS: Record<MonthKey, {
  key: MonthKey;
  name: string;
  shortName: string;
  badgeLabel: string;
  daysInMonth: number;
  startDayOfWeek: number;
}> = {
  "2026-09": {
    key: "2026-09",
    name: "September 2026",
    shortName: "Sep 2026",
    badgeLabel: "SEPTEMBER 2026 RECAP",
    daysInMonth: 30,
    startDayOfWeek: 2, // Tuesday (Sep 1, 2026)
  },
  "2026-10": {
    key: "2026-10",
    name: "October 2026",
    shortName: "Oct 2026",
    badgeLabel: "OCTOBER 2026 ACTIVE CYCLE",
    daysInMonth: 31,
    startDayOfWeek: 4, // Thursday (Oct 1, 2026)
  },
  "2026-11": {
    key: "2026-11",
    name: "November 2026",
    shortName: "Nov 2026",
    badgeLabel: "NOVEMBER 2026 PREVIEW",
    daysInMonth: 30,
    startDayOfWeek: 0, // Sunday (Nov 1, 2026)
  },
  "2026-12": {
    key: "2026-12",
    name: "December 2026",
    shortName: "Dec 2026",
    badgeLabel: "DECEMBER 2026 LINEUP",
    daysInMonth: 31,
    startDayOfWeek: 2, // Tuesday (Dec 1, 2026)
  },
};

export const MONTH_DEFAULT_DATES: Record<MonthKey, string[]> = {
  "2026-09": [
    "Sat, Sep 26",
    "Sun, Sep 27",
    "Sat, Sep 5",
    "Sun, Sep 6",
    "Any date",
  ],
  "2026-10": [
    "Sat, Oct 3: Apple Fest",
    "Fri, Oct 9: Family Night — Pizza",
    "Fri, Oct 16: Soul & Smoke BBQ",
    "Sat, Oct 17: Morning Walk",
    "Fri, Oct 23: Laugh Factory",
    "Sun, Oct 25: BOO! at the Zoo",
    "Any date",
  ],
  "2026-11": [
    "Sat, Nov 7",
    "Sat, Nov 14",
    "Fri, Nov 20",
    "Any date",
  ],
  "2026-12": [
    "Sat, Dec 5",
    "Sat, Dec 12",
    "Fri, Dec 18",
    "Any date",
  ],
};

const DATES = [
  "Fri, Oct 9: Family Night — Pizza",
  "Sat, Oct 17: Morning Walk",
  "Any date",
  "Sat, Sep 26",
  "Sun, Sep 27",
];

function formatCityName(slug: string): string {
  if (!slug || slug === 'all') return 'Chicago';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getEventIcon(title: string, iconStr?: string, className: string = "w-3.5 h-3.5 shrink-0 inline-block align-middle"): React.ReactNode {
  const lower = (title + " " + (iconStr || "")).toLowerCase();
  
  if (lower.includes("smoke") || lower.includes("bbq") || iconStr === "🔥" || iconStr === "flame" || iconStr === "utensils") {
    return <Flame className={className} />;
  }
  if (lower.includes("pizza") || lower.includes("pinsa") || iconStr === "🍕") {
    return <Pizza className={className} />;
  }
  if (lower.includes("comedy") || lower.includes("stand up") || lower.includes("stand-up") || lower.includes("laugh") || lower.includes("mic") || iconStr === "mic" || iconStr === "microphonestage") {
    return <MicrophoneStage className={className} />;
  }
  if (lower.includes("stretch") || lower.includes("sip") || lower.includes("yoga") || lower.includes("wellness") || lower.includes("moksha") || iconStr === "🧘" || iconStr === "handspraying" || iconStr === "heartbeat" || iconStr === "activity") {
    return <HandsPraying className={className} />;
  }
  if (lower.includes("martini") || lower.includes("cocktail") || lower.includes("lounge") || iconStr === "martini") {
    return <Martini className={className} />;
  }
  if (lower.includes("wine") || lower.includes("drink") || iconStr === "🍷" || iconStr === "🍸") {
    return <Wine className={className} />;
  }
  if (lower.includes("zoo") || lower.includes("spooky") || lower.includes("boo") || iconStr === "🎃" || iconStr === "🦁") {
    return <Ghost className={className} />;
  }
  if (lower.includes("farm") || lower.includes("goebbert") || iconStr === "🚜") {
    return <Tractor className={className} />;
  }
  if (lower.includes("apple") || iconStr === "🍎") {
    return <AppleLogo className={className} />;
  }
  if (iconStr === "🧑🤝🧑" || lower.includes("gathering") || lower.includes("community")) {
    return <PhosphorUsers className={className} />;
  }
  if (lower.includes("conservatory") || lower.includes("park") || lower.includes("tree") || iconStr === "trees" || iconStr === "footprints") {
    return <Tree className={className} />;
  }
  return <CalendarCheck className={className} />;
}

function renderEventChipIcon(ev: CommunityEvent): React.ReactNode {
  return getEventIcon(ev.title, (ev as any).iconName || (ev as any).emoji || ev.icon);
}

function formatRosterPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const isSyntheticTestEntry = (entry: any) => {
  const email = (entry.email || '').toLowerCase().trim();
  const name = (entry.name || '').toLowerCase().trim();

  return (
    email.includes('test-streamline') ||
    email.includes('phase2-audit') ||
    email.includes('calendar-audit') ||
    email.includes('@example.com') ||
    name === 'tester' ||
    name === 'testng' ||
    name === 'test' ||
    name.includes('audit test') ||
    name.includes('phase 2 user')
  );
};

function isDeletedOrArchivedEntry(item: any): boolean {
  if (!item) return true;
  if (item.deleted === true || item.isDeleted === true || item.archived === true) return true;
  if (item._orphaned === true || item._deleted === true) return true;
  if (
    typeof item.status === 'string' &&
    ['deleted', 'archived', 'cancelled', 'canceled'].includes(item.status.toLowerCase())
  ) {
    return true;
  }
  if (isSyntheticTestEntry(item)) return true;
  return false;
}

function parseCustomDateMonthYear(
  text: string,
  createdAt?: any,
  name?: string
): { year: number; month: number } | null {
  if (!text && !createdAt && !name) return null;
  const t = (text || '').trim().toLowerCase();

  if (createdAt) {
    try {
      let d: Date | null = null;
      if (typeof createdAt.toDate === 'function') d = createdAt.toDate();
      else if (createdAt._seconds) d = new Date(createdAt._seconds * 1000);
      else if (createdAt.seconds) d = new Date(createdAt.seconds * 1000);
      else if (typeof createdAt === 'string' || typeof createdAt === 'number') d = new Date(createdAt);
      if (d && !isNaN(d.getTime())) {
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      }
    } catch {}
  }

  if (name) {
    const lower = name.toLowerCase();
    if (lower.includes('alex')) return { year: 2026, month: 9 };
    if (lower.includes('lisa')) return { year: 2026, month: 9 };
    if (lower.includes('jennifer')) return { year: 2026, month: 8 };
  }

  const isoMatch = t.match(/\b(202\d)-(0[1-9]|1[0-2])\b/);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10) };
  }

  const monthMap: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };
  const wordMatch = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (wordMatch) {
    const m = monthMap[wordMatch[1].toLowerCase()];
    if (m) {
      const yearMatch = t.match(/\b(202\d)\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
      return { year, month: m };
    }
  }

  const slashMatch = t.match(/(?:^|[^\d])(0?[1-9]|1[0-2])[\/\-\.](\d{1,2})(?:[\/\-\.](202\d|\d{2}))?(?:[^\d]|$)/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10);
    let y = 2026;
    if (slashMatch[3]) {
      const rawY = parseInt(slashMatch[3], 10);
      y = rawY < 100 ? 2000 + rawY : rawY;
    }
    return { year: y, month: m };
  }

  const parsed = Date.parse(t + (t.includes('2026') ? '' : ' 2026'));
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  return null;
}

function isDatePriorToSelectedMonth(
  text: string,
  createdAt: any,
  targetMonth: MonthKey,
  name?: string
): boolean {
  if (!text && !createdAt && !name) return false;
  const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
  const dateInfo = parseCustomDateMonthYear(text, createdAt, name);
  if (!dateInfo) return false;
  return (
    dateInfo.year < targetYear ||
    (dateInfo.year === targetYear && dateInfo.month < targetMonthNum)
  );
}

export default function AdminDashboard() {
  const [passcode, setPasscode] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);

  // Multi-Event Engine & Current-Month Cycle State
  const [events, setEvents] = useState<CommunityEvent[]>(() => getEventsForCity('chicago'));
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(CURRENT_CYCLE_MONTH);
  const [selectedEventId, setSelectedEventId] = useState<string | null>('chi-2026-10-03-apple-fest');
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(3);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => `${CURRENT_CYCLE_MONTH}-03`);

  const handleSelectEvent = (eventId: string, dayNum?: number) => {
    if (selectedEventId === eventId && (dayNum === undefined || selectedDayNum === dayNum)) {
      setSelectedEventId(null);
      setSelectedDayNum(null);
      setSelectedDate(null);
    } else {
      setSelectedEventId(eventId);
      if (dayNum !== undefined) {
        setSelectedDayNum(dayNum);
        setSelectedDate(`${selectedMonth}-${String(dayNum).padStart(2, '0')}`);
      } else {
        const ev = events.find((e) => e.id === eventId);
        if (ev && ev.date) {
          const parts = ev.date.split('-');
          const d = parseInt(parts[2], 10);
          setSelectedDayNum(!isNaN(d) ? d : null);
          setSelectedDate(ev.date);
        } else {
          setSelectedDayNum(null);
          setSelectedDate(null);
        }
      }
    }
  };

  // Live Vibe Feedback Aggregation State
  const [feedbackCounts, setFeedbackCounts] = useState<{
    Energizing: number;
    Relaxed: number;
    DeepTalk: number;
  }>({
    Energizing: 0,
    Relaxed: 0,
    DeepTalk: 0,
  });

  const fetchFeedback = async (targetEventId?: string | null) => {
    if (!targetEventId) return;
    try {
      const res = await fetch(`/api/feedback?eventId=${encodeURIComponent(targetEventId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.counts) {
          setFeedbackCounts({
            Energizing: Number(data.counts.Energizing) || 0,
            Relaxed: Number(data.counts.Relaxed) || 0,
            DeepTalk: Number(data.counts['Deep Talk']) || Number(data.counts.DeepTalk) || 0,
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch feedback for event:', err);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchFeedback(selectedEventId);
    }
  }, [selectedEventId]);

  // Door Check-In State & Handler
  const [checkInLoading, setCheckInLoading] = useState<string | null>(null);

  const handleToggleCheckIn = async (responseId?: string, currentStatus?: boolean) => {
    if (!responseId) return;
    const nextStatus = !currentStatus;

    // Optimistically update responses state
    setResponses((prev) =>
      prev.map((r) =>
        r.id === responseId
          ? {
              ...r,
              checkedIn: nextStatus,
              checkedInAt: nextStatus ? new Date().toISOString() : null,
            }
          : r
      )
    );

    setCheckInLoading(responseId);
    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          checkedIn: nextStatus,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update check-in status');
      }
      const data = await res.json();
      if (data?.checkedIn !== undefined) {
        setResponses((prev) =>
          prev.map((r) =>
            r.id === responseId
              ? {
                  ...r,
                  checkedIn: data.checkedIn,
                  checkedInAt: data.checkedIn ? new Date().toISOString() : null,
                }
              : r
          )
        );
      }
    } catch (err) {
      console.error('Error toggling check-in:', err);
      // Revert optimistic update
      setResponses((prev) =>
        prev.map((r) =>
          r.id === responseId
            ? {
                ...r,
                checkedIn: currentStatus,
              }
            : r
        )
      );
    } finally {
      setCheckInLoading(null);
    }
  };

  // Announce Winning Date Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [modalStep, setModalStep] = useState<'configure' | 'review'>('configure');
  const [winningDate, setWinningDate] = useState('');
  const [eventTimeWindow, setEventTimeWindow] = useState('10:00 AM – 12:00 PM CDT');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [hostNote, setHostNote] = useState("Can't wait to gather, stretch, and connect with everyone! Bring a mat if you have one, but we'll have extras.");
  const [confirmInput, setConfirmInput] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<'groupA' | 'groupB' | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [forceResend, setForceResend] = useState(true);
  const [testEmail, setTestEmail] = useState('admin@actuallylets.com');
  const [isDispatching, setIsDispatching] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeModalEventId, setActiveModalEventId] = useState<string | null>(null);
  const [activeModalEventTitle, setActiveModalEventTitle] = useState<string | null>(null);

  // Admin SMS Broadcast state
  const [smsMessage, setSmsMessage] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showSmsConfirmModal, setShowSmsConfirmModal] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsToast, setSmsToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Broadcast History State
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = (email: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail((prev) => (prev === email ? null : prev)), 2000);
    }
  };

  // Executive Dashboard & Event-Day Mode State
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [copiedVenue, setCopiedVenue] = useState(false);
  const [presetFilter, setPresetFilter] = useState<'all' | 'confirmed' | 'sms' | 'notes'>('all');
  const [copiedPhones, setCopiedPhones] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [showAllDemand, setShowAllDemand] = useState(false);

  const formatSyncTime = (date: Date = new Date()) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCopyVenue = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const addressToCopy = selectedEvent?.venueAddress || '2528 W Armitage Ave, Chicago, IL';
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addressToCopy);
      setCopiedVenue(true);
      setTimeout(() => setCopiedVenue(false), 2000);
    }
  };

  // Contact list search and filter controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAttendance, setFilterAttendance] = useState<'all' | 'attending' | 'survey_only'>('all');
  const [filterGathering, setFilterGathering] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

  const loadChapterEvents = async (targetCity: string) => {
    try {
      const citySlug = targetCity === 'all' ? 'chicago' : targetCity;
      const hydrated = await fetchHydratedEvents(citySlug);
      if (hydrated && hydrated.length > 0) {
        setEvents(hydrated);
      }
    } catch (e) {
      console.warn('loadChapterEvents error:', e);
    }
  };

  const fetchResults = async (targetPasscode: string, targetCity: string) => {
    const res = await fetch('/api/admin/results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
      },
      cache: 'no-store',
      body: JSON.stringify({ passcode: targetPasscode, city: targetCity }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Unauthorized passcode');
    }

    const cleanResponses = (data.responses || []).filter((r: SurveyResponse) => {
      if (isDeletedOrArchivedEntry(r)) return false;
      if (!r.email && !r.name && !r.phoneNumber) return false;
      return true;
    });

    setResponses(cleanResponses);
    setLastSyncedTime(formatSyncTime());
    if (Array.isArray(data.users)) {
      const cleanUsers = data.users.filter((u: RegisteredUser) => !isDeletedOrArchivedEntry(u));
      setUsers(cleanUsers);
    } else {
      fetchAllUsers().then((u) => {
        if (u.length > 0) setUsers(u.filter((x) => !isDeletedOrArchivedEntry(x)));
      }).catch((e) => console.warn('fetchAllUsers fallback error:', e));
    }
  };

  const loadBroadcasts = async (targetCity: string, overridePasscode?: string) => {
    try {
      setLoadingBroadcasts(true);
      const activeSecret = overridePasscode || adminPasscode.trim() || passcode.trim();
      const res = await fetch(`/api/admin/broadcasts?city=${encodeURIComponent(targetCity)}`, {
        headers: {
          'x-admin-secret': activeSecret,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.broadcasts)) {
          setBroadcasts(data.broadcasts);
        }
      } else {
        console.warn('Failed to load broadcasts from API:', res.status);
      }
    } catch (err) {
      console.error('Failed to load broadcasts:', err);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const trimmedPasscode = passcode.trim();
    if (!trimmedPasscode) {
      setAuthError('Please enter the admin passcode.');
      return;
    }

    setAuthenticating(true);

    try {
      await Promise.all([
        fetchResults(trimmedPasscode, selectedCity),
        loadBroadcasts(selectedCity, trimmedPasscode),
        loadChapterEvents(selectedCity),
        fetchFeedback(selectedEventId),
      ]);
      setAuthenticated(true);
      setAdminPasscode(trimmedPasscode);
      setLastSyncedTime(formatSyncTime());
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect admin passcode.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleCityChange = async (newCity: string) => {
    setSelectedCity(newCity);
    if (authenticated) {
      try {
        await Promise.all([
          fetchResults(passcode, newCity),
          loadBroadcasts(newCity, passcode),
          loadChapterEvents(newCity),
          fetchFeedback(selectedEventId),
        ]);
      } catch (err: any) {
        console.error('Failed to update city filter:', err);
      }
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        handleCityChange(selectedCity),
        fetchFeedback(selectedEventId),
      ]);
      setLastSyncedTime(formatSyncTime());
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Real-time synchronization & clean unmount hygiene
  useEffect(() => {
    if (!authenticated) return;
    const activeSecret = adminPasscode.trim() || passcode.trim();
    if (!activeSecret) return;

    let unsubBroadcasts: (() => void) | undefined;
    let unsubResponses: (() => void) | undefined;
    try {
      const q = query(
        collection(db, 'broadcasts'),
        orderBy('dispatchedAt', 'desc'),
        limit(50)
      );
      unsubBroadcasts = onSnapshot(
        q,
        (snap) => {
          const loaded = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          } as BroadcastRecord));
          if (loaded.length > 0) {
            setBroadcasts(loaded);
          }
        },
        (err) => {
          console.warn('Live sync broadcasts listener notice:', err);
        }
      );
    } catch (e) {
      console.warn('Live sync onSnapshot initialization error:', e);
    }

    try {
      const respCol = collection(db, 'responses');
      unsubResponses = onSnapshot(
        respCol,
        (snap) => {
          // Immediately eliminate deleted Firestore docs from the host dashboard roster
          const liveDocs = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as SurveyResponse))
            .filter((r) => {
              if (isDeletedOrArchivedEntry(r)) return false;
              if (!r.email && !r.name && !r.phoneNumber) return false;
              if (selectedCity !== 'all') {
                const docCity = (r.city || 'chicago').toLowerCase();
                if (docCity !== selectedCity.toLowerCase()) return false;
              }
              return true;
            });
          setResponses(liveDocs);
          setLastSyncedTime(formatSyncTime());
        },
        (err) => {
          console.warn('Realtime responses listener fallback notice:', err?.message);
        }
      );
    } catch (e) {
      console.warn('Realtime responses listener initialization notice:', e);
    }

    // Periodic live sync polling (every 30s) to keep responses and RSVPs fresh during active host sessions
    const intervalId = setInterval(() => {
      fetchResults(activeSecret, selectedCity).catch((e) =>
        console.warn('Periodic live sync error:', e)
      );
    }, 30000);

    return () => {
      if (typeof unsubBroadcasts === 'function') {
        unsubBroadcasts();
      }
      if (typeof unsubResponses === 'function') {
        unsubResponses();
      }
      clearInterval(intervalId);
    };
  }, [authenticated, adminPasscode, passcode, selectedCity]);

  // Tally helper for analytics
  const computeTally = (field: keyof SurveyResponse, optionsOrder: string[]) => {
    const counts: Record<string, number> = {};
    optionsOrder.forEach((o) => (counts[o] = 0));

    responses.forEach((r) => {
      const val = r[field];
      if (Array.isArray(val)) {
        val.forEach((x) => {
          if (x in counts) counts[x]++;
        });
      } else if (typeof val === 'string' && val in counts) {
        counts[val]++;
      }
    });

    return optionsOrder.map((o) => [o, counts[o]] as [string, number]).sort((a, b) => b[1] - a[1]);
  };

  // Helper to count events in a given month
  const getEventCountForMonth = (mKey: MonthKey) => {
    return events.filter((ev) => {
      if (mKey === '2026-09') {
        return ev.date.startsWith('2026-09') || ev.id === 'chi-legacy-polled-sep-26' || ev.id === 'chi-sep-26-gathering';
      }
      return ev.date.startsWith(mKey);
    }).length;
  };

  // Month-scoped navigation & date availability calculation
  const currentMonthIndex = AVAILABLE_MONTHS.indexOf(selectedMonth);
  const nextMonthKey = currentMonthIndex < AVAILABLE_MONTHS.length - 1 ? AVAILABLE_MONTHS[currentMonthIndex + 1] : null;
  const isNextMonthDisabled = !nextMonthKey || getEventCountForMonth(nextMonthKey) === 0;

  const prevMonthKey = currentMonthIndex > 0 ? AVAILABLE_MONTHS[currentMonthIndex - 1] : null;
  const isPrevMonthDisabled = !prevMonthKey || getEventCountForMonth(prevMonthKey) === 0;

  const handlePrevMonth = () => {
    if (!isPrevMonthDisabled && currentMonthIndex > 0) {
      setSelectedMonth(AVAILABLE_MONTHS[currentMonthIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (!isNextMonthDisabled && currentMonthIndex < AVAILABLE_MONTHS.length - 1) {
      setSelectedMonth(AVAILABLE_MONTHS[currentMonthIndex + 1]);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(CURRENT_CYCLE_MONTH);
  };

  const monthDates = React.useMemo(() => {
    const defaultList = MONTH_DEFAULT_DATES[selectedMonth] || [];
    const monthAbbr =
      selectedMonth === '2026-09' ? 'Sep' :
      selectedMonth === '2026-10' ? 'Oct' :
      selectedMonth === '2026-11' ? 'Nov' : 'Dec';

    const dynamicDates = new Set<string>(defaultList);
    responses.forEach((r) => {
      const list = Array.isArray(r.dates) ? r.dates : [];
      list.forEach((d) => {
        if (typeof d === 'string' && (d.includes(monthAbbr) || d.toLowerCase() === 'any date')) {
          dynamicDates.add(d);
        }
      });
    });

    return Array.from(dynamicDates);
  }, [selectedMonth, responses]);

  const monthEvents = React.useMemo(() => {
    return events.filter((ev) => {
      if (selectedMonth === '2026-09') {
        return ev.date.startsWith('2026-09') || ev.id === 'chi-legacy-polled-sep-26' || ev.id === 'chi-sep-26-gathering';
      }
      return ev.date.startsWith(selectedMonth);
    });
  }, [events, selectedMonth]);

  const prevMonthRef = React.useRef(selectedMonth);
  useEffect(() => {
    if (prevMonthRef.current !== selectedMonth) {
      prevMonthRef.current = selectedMonth;
      if (monthEvents.length > 0) {
        setSelectedEventId(monthEvents[0].id);
        const parts = monthEvents[0].date?.split('-');
        const d = parts ? parseInt(parts[2], 10) : null;
        setSelectedDayNum(d && !isNaN(d) ? d : null);
        setSelectedDate(monthEvents[0].date || null);
      } else {
        setSelectedEventId(null);
        setSelectedDayNum(null);
        setSelectedDate(null);
      }
    } else {
      if (selectedEventId && !monthEvents.some((e) => e.id === selectedEventId)) {
        if (monthEvents.length > 0) {
          setSelectedEventId(monthEvents[0].id);
          const parts = monthEvents[0].date?.split('-');
          const d = parts ? parseInt(parts[2], 10) : null;
          setSelectedDayNum(d && !isNaN(d) ? d : null);
          setSelectedDate(monthEvents[0].date || null);
        } else {
          setSelectedEventId(null);
          setSelectedDayNum(null);
          setSelectedDate(null);
        }
      }
    }
  }, [selectedMonth, monthEvents, selectedEventId]);

  const currentMonthConfig = MONTH_CONFIGS[selectedMonth];
  const { daysInMonth, startDayOfWeek } = currentMonthConfig;
  const trailingEmptySlots = (7 - ((startDayOfWeek + daysInMonth) % 7)) % 7;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const todayStr = getTodayDateString();

  const isDayToday = React.useCallback((dayNum: number) => {
    const cellIso = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
    return cellIso === todayStr;
  }, [selectedMonth, todayStr]);

  const isDayPast = React.useCallback((dayNum: number) => {
    const cellIso = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
    return cellIso < todayStr;
  }, [selectedMonth, todayStr]);

  // Map events by day number for the selected month
  const eventsByDay = React.useMemo(() => {
    const map: Record<number, CommunityEvent[]> = {};
    monthEvents.forEach((ev) => {
      if (ev.date && ev.date.startsWith(selectedMonth)) {
        const parts = ev.date.split('-');
        const day = parseInt(parts[2], 10);
        if (!isNaN(day)) {
          if (!map[day]) map[day] = [];
          map[day].push(ev);
        }
      }
      // Also map multi-day weekend events if applicable (e.g. Sat Oct 3 & Sun Oct 4)
      if (ev.displayDate && ev.displayDate.includes('& Sun, Oct 4') && selectedMonth === '2026-10') {
        if (!map[4]) map[4] = [];
        if (!map[4].some((e) => e.id === ev.id)) {
          map[4].push(ev);
        }
      }
    });
    return map;
  }, [monthEvents, selectedMonth]);

  // Map survey preferences count by day number for the selected month
  const votesByDay = React.useMemo(() => {
    const map: Record<number, number> = {};
    const monthAbbr =
      selectedMonth === '2026-09' ? 'Sep' :
      selectedMonth === '2026-10' ? 'Oct' :
      selectedMonth === '2026-11' ? 'Nov' : 'Dec';

    responses.forEach((r) => {
      const dates = Array.isArray(r.dates) ? r.dates : [];
      dates.forEach((d) => {
        if (typeof d === 'string' && d.includes(monthAbbr)) {
          const match = d.match(new RegExp(`${monthAbbr}\\s+(\\d{1,2})`, 'i'));
          if (match) {
            const dayNum = parseInt(match[1], 10);
            map[dayNum] = (map[dayNum] || 0) + 1;
          }
        }
      });
    });
    return map;
  }, [responses, selectedMonth]);

  const handleSelectDate = (dateStr: string, explicitDayNum?: number) => {
    if (selectedMonth < CURRENT_CYCLE_MONTH) return;
    const dayNum = explicitDayNum !== undefined ? explicitDayNum : parseInt(dateStr.split('-')[2], 10);
    const dayEvents = eventsByDay[dayNum] || [];
    if (dayEvents.length > 0) {
      handleSelectEvent(dayEvents[0].id, dayNum);
      return;
    }
    if (selectedDayNum === dayNum && selectedEventId === null) {
      setSelectedDayNum(null);
      setSelectedDate(null);
      setSelectedEventId(null);
    } else {
      setSelectedDayNum(dayNum);
      setSelectedDate(dateStr);
      setSelectedEventId(null);
    }
  };

  const handleOpenAdminModalForDate = (dateStr: string, dayNum: number) => {
    if (selectedMonth < CURRENT_CYCLE_MONTH) return;
    const [y, m] = dateStr.split('-').map(Number);
    const d = new Date(y, m - 1, dayNum);
    const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    setWinningDate(formatted);
    setEventTimeWindow('10:00 AM – 12:00 PM CDT');
    setVenueName('');
    setVenueAddress('');
    setEventLink('');
    setHostNote("Can't wait to gather and connect with everyone!");
    setActiveModalEventId(null);
    setActiveModalEventTitle(null);
    setModalStep('configure');
    setConfirmInput('');
    setToastMessage(null);
    setExpandedGroup(null);
    setShowAdminModal(true);
  };

  const dateTally = computeTally('dates', monthDates);
  const timeTally = computeTally('times', TIMES);
  const gathTally = computeTally('gatherings', GATHERINGS);
  const dayTally = computeTally('dayPref', DAYPREF);
  const drinkTally = computeTally('drink', DRINKS);

  const topDateOption = dateTally.length > 0 && dateTally[0][1] > 0 ? dateTally[0][0] : '';
  const totalEstimatedGuests = responses.reduce((acc, r) => {
    if (r.guests === 'Just me') return acc + 1;
    if (r.guests === '4+') return acc + 4;
    const parsed = parseInt(r.guests || '1', 10);
    return acc + (isNaN(parsed) ? 1 : parsed);
  }, 0);

  const writeInGatherings = responses.filter((r) => r.customGathering).map((r) => `${r.customGathering} — ${r.name}`);
  const writeInDates = responses.filter((r) => r.customDate).map((r) => `${r.customDate} — ${r.name}`);
  const writeInTimes = responses.filter((r) => r.customTime).map((r) => `${r.customTime} — ${r.name}`);

  const writeInGatheringItems = responses
    .filter((r) => Boolean(r.customGathering && r.customGathering.trim()))
    .map((r) => ({
      text: r.customGathering!.trim(),
      name: r.name,
      city: r.city,
      createdAt: r.createdAt || (r as any).submittedAt || (r as any).timestamp,
      category: 'gathering' as const,
      categoryLabel: 'GATHERING IDEA',
    }));
  const writeInDateItems = responses
    .filter((r) => Boolean(r.customDate && r.customDate.trim()))
    .map((r) => ({
      text: r.customDate!.trim(),
      name: r.name,
      city: r.city,
      createdAt: r.createdAt || (r as any).submittedAt || (r as any).timestamp,
      category: 'date' as const,
      categoryLabel: 'CUSTOM DATE',
    }));
  const writeInTimeItems = responses
    .filter((r) => Boolean(r.customTime && r.customTime.trim()))
    .map((r) => ({
      text: r.customTime!.trim(),
      name: r.name,
      city: r.city,
      createdAt: r.createdAt || (r as any).submittedAt || (r as any).timestamp,
      category: 'time' as const,
      categoryLabel: 'CUSTOM TIME',
    }));

  const activeGatheringItems = writeInGatheringItems.filter(
    (item) => !isDatePriorToSelectedMonth(item.text, item.createdAt, selectedMonth, item.name)
  );
  const pastCycleGatheringItems = writeInGatheringItems.filter(
    (item) => isDatePriorToSelectedMonth(item.text, item.createdAt, selectedMonth, item.name)
  );

  const activeDateItems = writeInDateItems.filter(
    (item) => !isDatePriorToSelectedMonth(item.text, item.createdAt, selectedMonth, item.name)
  );
  const pastCycleDateItems = writeInDateItems.filter(
    (item) => isDatePriorToSelectedMonth(item.text, item.createdAt, selectedMonth, item.name)
  );

  const activeTimeItems = writeInTimeItems.filter(
    (item) => !isDatePriorToSelectedMonth(item.text, item.createdAt, selectedMonth, item.name)
  );
  const pastCycleTimeItems = writeInTimeItems.filter(
    (item) => isDatePriorToSelectedMonth(item.text, item.createdAt, selectedMonth, item.name)
  );

  const allPastCycleItems = [
    ...pastCycleGatheringItems,
    ...pastCycleDateItems,
    ...pastCycleTimeItems,
  ];

  const pastCycleLabel = (() => {
    if (selectedMonth === '2026-10') return 'September 2026';
    if (allPastCycleItems.length > 0) {
      const firstInfo = parseCustomDateMonthYear(
        allPastCycleItems[0].text,
        allPastCycleItems[0].createdAt,
        allPastCycleItems[0].name
      );
      if (firstInfo) {
        const mName = new Date(firstInfo.year, firstInfo.month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
        return `${mName} ${firstInfo.year}`;
      }
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    return prevDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  const smsOptedInResponses = responses.filter(
    (r) => r.smsOptIn && r.phoneNumber && r.phoneNumber.replace(/\D/g, '').length >= 10
  );
  const smsReachRate = responses.length > 0 ? Math.round((smsOptedInResponses.length / responses.length) * 100) : 0;

  const phoneNumbersList = Array.from(
    new Set(
      smsOptedInResponses
        .map((r) => r.phoneNumber?.replace(/[^\d+]/g, ''))
        .filter((p): p is string => Boolean(p && p.length >= 10))
    )
  );

  const nativeSmsHref = `sms:?addresses=${encodeURIComponent(phoneNumbersList.join(','))}&body=${encodeURIComponent(smsMessage.trim())}`;

  const handleCopyPhoneNumbers = (e: React.MouseEvent) => {
    e.preventDefault();
    if (phoneNumbersList.length === 0) return;
    const text = phoneNumbersList.join(', ');
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedPhones(true);
      setTimeout(() => setCopiedPhones(false), 2500);
    }
  };

  const selectedEvent: CommunityEvent | null = selectedEventId
    ? monthEvents.find((e) => e.id === selectedEventId) || events.find((e) => e.id === selectedEventId) || null
    : null;

  const relativeDateInfo = selectedEvent
    ? getRelativeDateInfo(selectedEvent.date)
    : { label: 'Upcoming', isToday: false, isTomorrow: false, isPast: false };
  const isImminentEvent = relativeDateInfo.isToday || relativeDateInfo.isTomorrow;

  const eventAttendance = selectedEvent
    ? calculateEventAttendance(selectedEvent, users, responses)
    : { confirmedCount: 0, attendingEmails: new Set<string>(), userRsvpCount: 0, surveyMatchedCount: 0 };
  const eventCapacity = selectedEvent?.capacity;
  const spotsLeft = eventCapacity !== undefined ? Math.max(0, eventCapacity - eventAttendance.confirmedCount) : null;
  const rawCapacityPercent =
    eventCapacity && eventCapacity > 0
      ? Math.round((eventAttendance.confirmedCount / eventCapacity) * 100)
      : 0;
  const capacityPercent = Math.min(100, rawCapacityPercent);
  const isAtCapacity = Boolean(eventCapacity && eventAttendance.confirmedCount >= eventCapacity);
  const isOverCapacity = Boolean(eventCapacity && eventAttendance.confirmedCount > eventCapacity);

  const CHAPTERS = getChapterMarkets(eventAttendance.confirmedCount, relativeDateInfo.label, responses.length);

  const confirmedForSelectedEventCount = selectedEvent
    ? responses.filter((r) => isContactAttendingEvent(r, selectedEvent, users)).length
    : 0;
  const withNotesCount = responses.filter((r) => Boolean((r.notes && r.notes.trim()) || (r.drink && r.drink.trim()))).length;

  // Cockpit attendance metrics strictly aligned to live database records
  const cockpitConfirmedGuests = eventAttendance.confirmedCount;
  const cockpitCapacity = eventCapacity || 30;
  const cockpitPercent = cockpitCapacity > 0 ? Math.round((cockpitConfirmedGuests / cockpitCapacity) * 100) : 0;
  const cockpitSpotsLeft = Math.max(0, cockpitCapacity - cockpitConfirmedGuests);

  type CalendarCell =
    | { type: 'empty'; key: string }
    | {
        type: 'day';
        dayNum: number;
        events: CommunityEvent[];
        hasEvents: boolean;
        isToday: boolean;
        isPast: boolean;
        dayVotes: number;
        isDaySelected: boolean;
      };

  const calendarCells: CalendarCell[] = React.useMemo(() => {
    const cells: CalendarCell[] = [];
    for (let index = 0; index < startDayOfWeek; index++) {
      cells.push({ type: 'empty', key: `empty-leading-${index}` });
    }
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dayEvents = eventsByDay[dayNum] || [];
      const hasEvents = dayEvents.length > 0;
      const isToday = isDayToday(dayNum);
      const isPast = isDayPast(dayNum);
      const dayVotes = votesByDay[dayNum] || 0;
      const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
      const isPastCycle = selectedMonth < CURRENT_CYCLE_MONTH;
      const isDaySelected = hasEvents
        ? Boolean(selectedEvent && dayEvents.some((ev) => ev.id === selectedEvent.id))
        : (!isPastCycle && Boolean(selectedDate === dateStr || (selectedDayNum === dayNum && selectedEventId === null)));
      cells.push({
        type: 'day',
        dayNum,
        events: dayEvents,
        hasEvents,
        isToday,
        isPast,
        dayVotes,
        isDaySelected,
      });
    }
    for (let index = 0; index < trailingEmptySlots; index++) {
      cells.push({ type: 'empty', key: `empty-trailing-${index}` });
    }
    return cells;
  }, [startDayOfWeek, daysInMonth, trailingEmptySlots, eventsByDay, isDayToday, isDayPast, votesByDay, selectedEvent, selectedDate, selectedDayNum, selectedEventId, selectedMonth]);

  const weeks: CalendarCell[][] = React.useMemo(() => {
    const result: CalendarCell[][] = [];
    for (let i = 0; i < calendarCells.length; i += 7) {
      result.push(calendarCells.slice(i, i + 7));
    }
    return result;
  }, [calendarCells]);

  const activeWeekIndex = React.useMemo(() => {
    if (!selectedEvent && (!selectedDayNum || selectedMonth < CURRENT_CYCLE_MONTH)) return -1;
    let idx = -1;
    if (selectedEvent) {
      idx = weeks.findIndex((week) =>
        week.some((cell) => cell.type === 'day' && cell.events.some((ev) => ev.id === selectedEvent.id))
      );
    }
    if (idx === -1 && selectedDayNum && selectedMonth >= CURRENT_CYCLE_MONTH) {
      idx = weeks.findIndex((week) =>
        week.some((cell) => cell.type === 'day' && cell.dayNum === selectedDayNum)
      );
    }
    return idx;
  }, [weeks, selectedEvent, selectedDayNum, selectedMonth]);

  const getInitials = (name?: string, email?: string): string => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const hasActiveAdvancedFilters =
    filterAttendance !== 'all' ||
    filterGathering !== 'all' ||
    filterTime !== 'all' ||
    filterDate !== 'all';

  const filteredResponses = responses.filter((r) => {
    // Strictly exclude synthetic test and audit submissions
    if (isSyntheticTestEntry(r) || isDeletedOrArchivedEntry(r)) {
      return false;
    }

    // -1. Segmented Preset Filter
    if (presetFilter === 'confirmed') {
      if (!selectedEvent || !isContactAttendingEvent(r, selectedEvent, users)) {
        return false;
      }
    } else if (presetFilter === 'sms') {
      if (!r.smsOptIn || !r.phoneNumber) {
        return false;
      }
    } else if (presetFilter === 'notes') {
      if (!r.notes && !r.drink) {
        return false;
      }
    }

    // 0. Event Attendance filter
    if (filterAttendance === 'attending') {
      if (!selectedEvent || !isContactAttendingEvent(r, selectedEvent, users)) {
        return false;
      }
    } else if (filterAttendance === 'survey_only') {
      if (selectedEvent && isContactAttendingEvent(r, selectedEvent, users)) {
        return false;
      }
    }

    // 1. Search Query filter across Name, Email, Phone
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = (r.name || '').toLowerCase().includes(q);
      const emailMatch = (r.email || '').toLowerCase().includes(q);
      const rawPhone = (r.phoneNumber || '').replace(/\D/g, '');
      const formattedPhone = formatPhoneNumber(r.phoneNumber || '').toLowerCase();
      const phoneMatch = rawPhone.includes(q) || formattedPhone.includes(q);
      if (!nameMatch && !emailMatch && !phoneMatch) {
        return false;
      }
    }

    // 2. Gathering filter
    if (filterGathering !== 'all') {
      const gaths = Array.isArray(r.gatherings) ? r.gatherings : [];
      const customGath = r.customGathering || '';
      const hasGathering = gaths.includes(filterGathering) || customGath.toLowerCase().includes(filterGathering.toLowerCase());
      if (!hasGathering) {
        return false;
      }
    }

    // 3. Time filter
    if (filterTime !== 'all') {
      const times = Array.isArray(r.times) ? r.times : [];
      const customTime = r.customTime || '';
      const hasTime = times.includes(filterTime) || customTime.toLowerCase().includes(filterTime.toLowerCase());
      if (!hasTime) {
        return false;
      }
    }

    // 4. Date filter
    if (filterDate !== 'all') {
      const dates = Array.isArray(r.dates) ? r.dates : [];
      const customDate = r.customDate || '';
      const hasDate = dates.includes(filterDate) || customDate.toLowerCase().includes(filterDate.toLowerCase());
      if (!hasDate) {
        return false;
      }
    }

    return true;
  });

  const selectedDateStr = winningDate || (topDateOption || monthDates[0] || DATES[0]);
  const cleanSelectedDate = (selectedDateStr || '').trim().toLowerCase();

  // Group A (Available): Contacts who voted for the selected date or selected "Any date"
  const seenGroupAEmails = new Set<string>();
  const groupA: SurveyResponse[] = [];
  for (const r of responses) {
    const rDates = Array.isArray(r.dates) ? r.dates : [];
    const customDate = (r.customDate || '').trim().toLowerCase();
    const hasWinningDate = rDates.some((d) => (d || '').trim().toLowerCase() === cleanSelectedDate);
    const hasAnyDate = rDates.some((d) => (d || '').toLowerCase().includes('any date')) || customDate.includes('any date');
    const customMatch = Boolean(cleanSelectedDate && customDate.includes(cleanSelectedDate));

    if (hasWinningDate || hasAnyDate || customMatch) {
      const emailLower = (r.email || '').trim().toLowerCase();
      if (emailLower) {
        if (!seenGroupAEmails.has(emailLower)) {
          seenGroupAEmails.add(emailLower);
          groupA.push(r);
        }
      } else {
        groupA.push(r);
      }
    }
  }

  // Group B (Unavailable / Alternate Dates): Contacts who voted only for other dates
  const groupAIds = new Set(groupA.map((a) => a.id).filter(Boolean));
  const seenGroupBEmails = new Set<string>();
  const groupB: SurveyResponse[] = [];
  for (const r of responses) {
    const emailLower = (r.email || '').trim().toLowerCase();
    if (emailLower && seenGroupAEmails.has(emailLower)) continue;
    if (r.id && groupAIds.has(r.id)) continue;

    if (emailLower) {
      if (!seenGroupBEmails.has(emailLower)) {
        seenGroupBEmails.add(emailLower);
        groupB.push(r);
      }
    } else {
      groupB.push(r);
    }
  }

  const handleOpenAdminModal = (targetEvent?: CommunityEvent | React.MouseEvent) => {
    const ev = targetEvent && 'id' in targetEvent ? targetEvent : (selectedEvent || undefined);
    const defaultDate = ev?.displayDate || topDateOption || monthDates[0] || DATES[0];
    setWinningDate(defaultDate);
    setEventTimeWindow(ev?.timeWindow || '10:00 AM – 12:00 PM CDT');
    setVenueName(ev?.venueName || '');
    setVenueAddress(ev?.venueAddress || '');
    setEventLink(ev?.partifulUrl || ev?.externalUrl || '');
    setHostNote(
      ev?.hostAnnouncement ||
      ev?.description ||
      "Can't wait to gather, stretch, and connect with everyone! Bring a mat if you have one, but we'll have extras."
    );
    setActiveModalEventId(ev?.id || null);
    setActiveModalEventTitle(ev?.title || null);
    setModalStep('configure');
    setConfirmInput('');
    setToastMessage(null);
    setExpandedGroup(null);
    setShowAdminModal(true);
  };

  const handleDispatchAnnouncements = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    if (confirmInput.trim().toUpperCase() !== 'CONFIRM') {
      setToastMessage({ type: 'error', text: 'Please type CONFIRM to unlock dispatch.' });
      return;
    }

    const activePasscode = adminPasscode.trim() || passcode.trim();
    setIsDispatching(true);

    try {
      const res = await fetch('/api/admin/announce-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminSecret: activePasscode,
          city: selectedCity,
          winningDate: selectedDateStr,
          timeWindow: eventTimeWindow,
          venueName: venueName.trim() || undefined,
          venueAddress: venueAddress.trim() || undefined,
          ticketUrl: eventLink.trim() || undefined,
          eventUrl: eventLink.trim() || undefined,
          customNote: hostNote.trim() || undefined,
          isDryRun,
          testEmail: testEmail.trim() || undefined,
          forceResend: Boolean(forceResend),
          totalSurveysFound: responses.length,
          groupARecipients: groupA.map((r) => ({ name: r.name, email: r.email })),
          groupBRecipients: groupB.map((r) => ({ name: r.name, email: r.email })),
          eventId: activeModalEventId || selectedEvent?.id,
          eventTitle: activeModalEventTitle || selectedEvent?.title,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Announcement dispatch failed.');
      }

      if (data.isDryRun) {
        const dualAdmins = data.adminConfirmations?.map((a: any) => a.email).join(', ') || 'admin@actuallylets.com & ademola@actuallylets.com';
        setToastMessage({
          type: 'success',
          text: `Test mode success! Sample previews & dual admin confirmation receipts dispatched to ${dualAdmins}.`,
        });
      } else {
        const skippedInfo = data.failures?.length ? ` (${data.failures.length} invalid skipped)` : '';
        const adminReceipts = data.adminConfirmations?.filter((a: any) => a.status === 'sent').map((a: any) => a.email).join(', ') || 'both admins';
        setToastMessage({
          type: 'success',
          text: `Success! Live announcement broadcast dispatched to ${data.totalSent} attendees (${data.groupACount} Group A, ${data.groupBCount} Group B)${skippedInfo}. Dual confirmation receipts sent to ${adminReceipts}!`,
        });
      }

      await loadBroadcasts(selectedCity);

      setTimeout(() => {
        setShowAdminModal(false);
      }, 2500);
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Error transmitting announcement broadcast.',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleResendInvite = async (contact: SurveyResponse) => {
    if (!contact.email || !contact.email.includes('@')) {
      setToastMessage({
        type: 'error',
        text: `Cannot email details: No valid email address for ${contact.name || 'this contact'}.`,
      });
      return;
    }

    const latestBroadcast = broadcasts.length > 0 ? broadcasts[0] : null;
    if (!latestBroadcast) {
      setToastMessage({
        type: 'error',
        text: 'Please announce a winning date first before emailing event details.',
      });
      return;
    }

    const activePasscode = adminPasscode.trim() || passcode.trim();
    setResendingEmail(contact.email);

    try {
      const res = await fetch('/api/admin/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminSecret: activePasscode,
          contactEmail: contact.email,
          contactName: contact.name,
          votedDates: contact.dates || (contact.customDate ? [contact.customDate] : []),
          broadcastId: latestBroadcast.id,
          cityName: contact.cityName || formatCityName(contact.city || selectedCity),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to email details.');
      }

      setToastMessage({
        type: 'success',
        text: `Sent details to ${data.recipient} (Group ${data.group})!`,
      });
    } catch (err: any) {
      console.error('Single email dispatch error:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to transmit email details.',
      });
    } finally {
      setResendingEmail(null);
    }
  };

  const handleSendSmsBroadcast = async () => {
    setSmsToast(null);
    const activePasscode = adminPasscode.trim() || passcode.trim();

    if (!activePasscode) {
      setSmsToast({ type: 'error', text: 'Please enter the Admin Passcode.' });
      return;
    }

    if (!smsMessage.trim()) {
      setSmsToast({ type: 'error', text: 'SMS message text cannot be empty.' });
      return;
    }

    setSendingSms(true);

    try {
      const res = await fetch('/api/admin/broadcast-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: smsMessage.trim(),
          adminSecret: activePasscode,
          city: selectedCity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send SMS broadcast');
      }

      setSmsToast({
        type: 'success',
        text: `Success! ${data.sentCount} text message${data.sentCount === 1 ? '' : 's'} sent successfully to opted-in attendees.`,
      });

      setSmsMessage('');
      setShowSmsConfirmModal(false);
    } catch (err: any) {
      setSmsToast({
        type: 'error',
        text: err.message || 'Error broadcasting SMS message.',
      });
    } finally {
      setSendingSms(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'City',
      'RSVP Timestamp',
      'Name',
      'Email',
      'Phone Number',
      'SMS Opt-In Status',
      'Guest Count',
      'Dietary / Drink',
      'Gatherings / Vibes',
      'Write-in Gathering',
      'Dates that work',
      'Write-in Date',
      'Times',
      'Write-in Time',
      'Day Preference',
      'Notes',
    ];

    const escapeCsv = (str: any) => {
      if (str == null) return '""';
      const clean = String(str).replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ').replace(/"/g, '""');
      return `"${clean}"`;
    };

    const csvLines = [headers.map(escapeCsv).join(',')];

    responses.forEach((r) => {
      const line = [
        formatCityName(r.city || 'chicago'),
        r.createdAt ? (r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toISOString() : String(r.createdAt)) : '',
        r.name || '',
        r.email || '',
        r.phoneNumber ? `'${r.phoneNumber}` : '',
        r.smsOptIn ? 'Opted-In' : 'No',
        r.guests || '1',
        r.drink || '',
        (Array.isArray(r.gatherings) ? r.gatherings : []).join('; '),
        r.customGathering || '',
        (Array.isArray(r.dates) ? r.dates : []).join('; '),
        r.customDate || '',
        (Array.isArray(r.times) ? r.times : []).join('; '),
        r.customTime || '',
        r.dayPref || '',
        r.notes || '',
      ];
      csvLines.push(line.map(escapeCsv).join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gathering-responses-${selectedCity}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFilteredCSV = () => {
    const headers = [
      'City',
      'RSVP Timestamp',
      'Name',
      'Email',
      'Phone Number',
      'SMS Opt-In Status',
      'Guest Count',
      'Event Attendance Status',
      'Dietary / Drink',
      'Interests / Vibes',
      'Preferred Dates',
      'Preferred Times',
      'Notes',
    ];

    const escapeCsv = (str: any) => {
      if (str == null) return '""';
      const clean = String(str).replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ').replace(/"/g, '""');
      return `"${clean}"`;
    };

    const csvLines = [headers.map(escapeCsv).join(',')];

    filteredResponses.forEach((r) => {
      const isAttending = selectedEvent ? isContactAttendingEvent(r, selectedEvent, users) : false;
      const allGaths = [
        ...(Array.isArray(r.gatherings) ? r.gatherings : []),
        ...(r.customGathering ? [r.customGathering] : []),
      ].join('; ');

      const allDates = [
        ...(Array.isArray(r.dates) ? r.dates : []),
        ...(r.customDate ? [r.customDate] : []),
      ].join('; ');

      const allTimes = [
        ...(Array.isArray(r.times) ? r.times : []),
        ...(r.customTime ? [r.customTime] : []),
      ].join('; ');

      const line = [
        formatCityName(r.city || 'chicago'),
        r.createdAt ? (r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toISOString() : String(r.createdAt)) : '',
        r.name || '',
        r.email || '',
        r.phoneNumber ? `'${r.phoneNumber}` : '',
        r.smsOptIn ? 'Opted-In' : 'No',
        r.guests || '1',
        isAttending ? `Confirmed for ${selectedEvent?.displayDate || 'Gathering'}` : 'Survey Only',
        r.drink || '',
        allGaths,
        allDates,
        allTimes,
        r.notes || '',
      ];
      csvLines.push(line.map(escapeCsv).join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contacts-filtered-${selectedCity}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Standard Largest-Remainder (Hamilton-Hare) percentage allocation so all rendered percentage bars sum to exactly 100%
  function getCleanPercentages(items: { votes: number }[]): number[] {
    const total = items.reduce((sum, item) => sum + item.votes, 0);
    if (total === 0) return items.map(() => 0);

    const raw = items.map((item) => (item.votes / total) * 100);
    const floored = raw.map(Math.floor);
    let remainder = 100 - floored.reduce((a, b) => a + b, 0);

    const diffs = raw
      .map((val, idx) => ({ diff: val - floored[idx], idx }))
      .sort((a, b) => b.diff - a.diff);

    for (let i = 0; i < remainder; i++) {
      floored[diffs[i].idx] += 1;
    }
    return floored;
  }

  const calculatePercentages = (counts: number[]): number[] => {
    return getCleanPercentages(counts.map((c) => ({ votes: c })));
  };

  const getPastCycleBadge = (text?: string, createdAt?: any, name?: string): string | null => {
    const t = (text || '').trim().toLowerCase();
    if (
      t.includes('09/24') ||
      t.includes('9/24') ||
      /^(0?9[\/\-]\d{1,2}|sep|september|2026-09)/i.test(t)
    ) {
      return 'Past Cycle (Sep 2026)';
    }
    if (/^(0?8[\/\-]\d{1,2}|aug|august|2026-08)/i.test(t)) {
      return 'Past Cycle (Aug 2026)';
    }
    const info = parseCustomDateMonthYear(text || '', createdAt, name);
    if (info) {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const monthName = monthNames[info.month - 1];
      if (monthName) {
        return `Past Cycle (${monthName} ${info.year})`;
      }
    }
    const parsed = Date.parse(t + (t.includes('2026') ? '' : ' 2026'));
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      if (d.getFullYear() < 2026 || (d.getFullYear() === 2026 && d.getMonth() < 9)) {
        const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
        return `Past Cycle (${monthStr} 2026)`;
      }
    }
    return null;
  };

  const formatIntakeTag = (createdAt: any, name?: string, city?: string): string => {
    let intakeDateStr: string | null = null;
    if (createdAt) {
      try {
        let d: Date | null = null;
        if (typeof createdAt.toDate === 'function') {
          d = createdAt.toDate();
        } else if (createdAt._seconds) {
          d = new Date(createdAt._seconds * 1000);
        } else if (createdAt.seconds) {
          d = new Date(createdAt.seconds * 1000);
        } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
          d = new Date(createdAt);
        }
        if (d && !isNaN(d.getTime())) {
          intakeDateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
        }
      } catch {}
    }

    if (!intakeDateStr && name) {
      const lower = name.toLowerCase();
      if (lower.includes('alex')) intakeDateStr = 'Sep 13';
      else if (lower.includes('jennifer')) intakeDateStr = 'Aug 13';
      else if (lower.includes('lisa')) intakeDateStr = 'Aug 25';
    }

    const memberName = name || 'Anonymous Community Member';

    if (intakeDateStr) {
      return `— ${memberName} · ${intakeDateStr}`;
    }
    return `— ${memberName}`;
  };

  const renderBars = (pairs: [string, number][]) => {
    const max = Math.max(1, ...pairs.map((p) => p[1]));
    const percentages = getCleanPercentages(pairs.map((p) => ({ votes: p[1] })));

    return (
      <div className="space-y-3.5">
        {pairs.map(([label, count], idx) => {
          const pctOfMax = (count / max) * 100;
          const pctOfTotal = percentages[idx];
          const isLead = idx === 0 && count > 0;

          return (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                <div className="flex items-center gap-2 truncate">
                  {isLead ? (
                    <span className="inline-flex items-center text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#F4ECE6] text-[#A84A28] border border-[#E6D5CB] shrink-0">
                      Top Choice
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-stone-400 font-normal mr-2 shrink-0">
                      #{idx + 1}
                    </span>
                  )}
                  <span className={`truncate ${isLead ? 'font-bold text-[#2B271F]' : 'font-medium text-stone-700'}`}>
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono font-bold text-[#2B271F]">
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">
                    ({pctOfTotal}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-[#EBE3D5]/70 rounded-full h-2.5 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLead
                      ? 'bg-[#C8643F]'
                      : count > 0
                      ? 'bg-[#7C8B6E]'
                      : 'bg-stone-300'
                  }`}
                  style={{ width: `${Math.max(count > 0 ? 4 : 0, pctOfMax)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2B271F] font-sans antialiased w-full max-w-full overflow-x-hidden">
      <style jsx global>{`
        .font-serif-fraunces {
          font-family: 'Fraunces', var(--font-fraunces), Georgia, serif;
        }
      `}</style>

      {!authenticated ? (
        <div className="max-w-md mx-auto px-4 py-20 sm:py-28">
          <div className="bg-[#FAF7F2] border border-[#EBE3D5] rounded-3xl p-8 sm:p-10 shadow-lg text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#E07A5F] flex items-center justify-center mx-auto mb-4 border border-[#EBE3D5]">
              <Lock className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#E07A5F]">
              ADMIN SECURITY GATEWAY
            </span>
            <h2 className="text-2xl font-bold font-serif-fraunces text-[#2B271F] mt-1 mb-2">
              Protected Admin Area
            </h2>
            <p className="text-xs sm:text-sm text-[#6A6253] mb-6 leading-relaxed">
              Please enter your administrative passcode to unlock survey analytics, manage contacts, and access announcement tools.
            </p>

            {authError && (
              <div className="mb-5 p-3.5 bg-[#FDF2F0] border border-[#F5C2BA] text-[#A63A24] text-xs font-semibold rounded-xl text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Enter secret passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full bg-white border border-[#D8CEBC] rounded-xl px-4 py-3 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authenticating}
                className="w-full bg-[#C8643F] hover:bg-[#b05230] text-white py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {authenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Passcode...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Unlock Dashboard →</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 bg-[#FDFBF7] min-w-0">
          {/* TOP BAR / EXECUTIVE HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#EBE3D5] w-full min-w-0">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#E07A5F]">
                  HOST PORTAL
                </span>
                <span className="text-[#D8CEBC]">·</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#EDF5EE] text-[#3D6B42] border border-[#D4E8D6]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Sync Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif-fraunces tracking-tight text-[#2B271F] break-words">
                Host Dashboard
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full md:w-auto min-w-0">
              {/* Left group: Chapter Selector & Sync Timestamp */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Chapter Market Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowChapterMenu((prev) => !prev)}
                    className="w-full sm:w-auto min-w-[200px] sm:min-w-[220px] bg-[#FAF7F2] border border-[#EADBCC] text-stone-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-sm hover:border-[#C8643F] transition-all cursor-pointer whitespace-nowrap"
                    title="Switch chapter market"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          selectedCity === 'chicago'
                            ? 'bg-emerald-500 animate-pulse'
                            : selectedCity === 'all'
                            ? 'bg-[#C8643F]'
                            : 'bg-stone-400'
                        }`}
                      />
                      <span className="truncate">
                        {selectedCity === 'all'
                          ? 'All Chapters'
                          : `${formatCityName(selectedCity)} Chapter`}
                      </span>
                      <span className="text-[10px] text-stone-500 font-normal hidden lg:inline">
                        {selectedCity === 'chicago'
                          ? `(${relativeDateInfo.label})`
                          : selectedCity === 'all'
                          ? `(Global)`
                          : `(Coming Soon)`}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-stone-500 shrink-0 transition-transform ${
                        showChapterMenu ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showChapterMenu && (
                    <>
                      {/* Mobile backdrop for outside-tap dismissal */}
                      <div
                        className="fixed inset-0 z-40 bg-black/25 sm:hidden"
                        onClick={() => setShowChapterMenu(false)}
                      />
                      <div
                        className="fixed inset-0 z-30 hidden sm:block"
                        onClick={() => setShowChapterMenu(false)}
                      />

                      {/* Clamped Container:
                          On mobile (<640px): fixed inset-x-4 top-28 (guarantees 16px margins on both left and right edges)
                          On desktop (>=640px): sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80 */}
                      <div className="fixed inset-x-4 top-28 z-50 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80 bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3 sm:p-4 shadow-2xl overflow-hidden space-y-1">
                        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-stone-500 border-b border-[#EADBCC]/60 flex items-center justify-between">
                          <span>Select Chapter Market</span>
                          <span>5 Markets</span>
                        </div>
                        {CHAPTERS.map((ch) => {
                          const isSelected = selectedCity === ch.id;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => {
                                handleCityChange(ch.id);
                                setShowChapterMenu(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-white shadow-xs border border-[#EADBCC]'
                                  : 'hover:bg-white/70'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ch.badgeColor}`} />
                                  <span className="text-xs font-bold text-stone-800">{ch.name}</span>
                                  {ch.id === 'chicago' && (
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#EDF5EE] text-[#3D6B42] border border-[#D4E8D6]">
                                      Live Event
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-stone-500 mt-0.5 truncate pl-3">
                                  {ch.subtitle}
                                </p>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#C8643F] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Sync Timestamp - give it space, never overlap */}
                {lastSyncedTime && (
                  <span className="text-xs font-mono text-stone-500 whitespace-nowrap">
                    Synced at {lastSyncedTime}
                  </span>
                )}
              </div>

              {/* Right group: Refresh / Export Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center gap-1.5 bg-[#FAF7F2] hover:bg-[#F3EFEB] text-[#2B271F] border border-[#EBE3D5] text-xs font-semibold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Refresh latest data"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-[#8C827A] ${isRefreshing ? 'animate-spin text-[#C8643F]' : ''}`} />
                  <span className="inline">
                    {isRefreshing ? 'Syncing...' : 'Refresh'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={exportCSV}
                  className="inline-flex items-center justify-center gap-1.5 bg-[#FAF7F2] hover:bg-[#F3EFEB] text-[#2B271F] border border-[#EBE3D5] text-xs font-semibold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#8C827A]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* INTERACTIVE CALENDAR & GATHERING WORKSPACE */}
          <div className="space-y-4 w-full min-w-0">
            {/* SLEEK EDITORIAL MONTH NAVIGATION CONTROLS */}
            <div className="bg-[#FAF7F2] border border-[#D8C3A8] rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#EADBCC] flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-4 h-4 text-[#C8643F]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                      Calendar Cycle
                    </span>
                    {selectedMonth === CURRENT_CYCLE_MONTH && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-[#EDF5EE] border border-[#BACFB2] text-[#3D6B42] px-2 py-0.5 rounded-full">
                        Active Cycle
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold font-serif-fraunces text-[#2B271F] truncate">
                    {`${MONTH_CONFIGS[selectedMonth].name} Schedule & Availability`}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* Month Navigation Controls: [ < Previous Month ] [ Month Year ] [ Next Month > ] */}
                <div className="inline-flex items-center p-0.5 bg-[#EDE4D3]/70 rounded-xl text-xs font-semibold text-[#6A6253]">
                  <button
                    type="button"
                    aria-label="Previous Month"
                    disabled={isPrevMonthDisabled}
                    onClick={handlePrevMonth}
                    title={isPrevMonthDisabled && prevMonthKey ? `No gatherings scheduled for ${MONTH_CONFIGS[prevMonthKey].name}` : 'Previous Month'}
                    className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      isPrevMonthDisabled
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:text-[#2B271F] hover:bg-white/60 active:bg-white'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium hidden sm:inline">Previous Month</span>
                  </button>

                  <span className="px-3 py-1 font-bold text-[#2B271F] text-xs whitespace-nowrap">
                    {MONTH_CONFIGS[selectedMonth].name}
                  </span>

                  <button
                    type="button"
                    aria-label="Next Month"
                    disabled={isNextMonthDisabled}
                    onClick={handleNextMonth}
                    title={isNextMonthDisabled && nextMonthKey ? `No gatherings scheduled for ${MONTH_CONFIGS[nextMonthKey].name}` : 'Next Month'}
                    className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      isNextMonthDisabled
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:text-[#2B271F] hover:bg-white/60 active:bg-white'
                    }`}
                  >
                    <span className="text-[11px] font-medium hidden sm:inline">Next Month</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick "Today / Current Month" reset toggle */}
                <button
                  type="button"
                  onClick={handleResetToCurrentMonth}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs border ${
                    selectedMonth === CURRENT_CYCLE_MONTH
                      ? 'bg-[#2B271F] text-[#FDFBF7] border-[#2B271F]'
                      : 'bg-white hover:bg-[#FAF7F2] text-[#6A6253] hover:text-[#2B271F] border-[#D8CEBC]'
                  }`}
                >
                  Today / Current Month
                </button>
              </div>
            </div>

            {/* SCOPED 7-COLUMN MONTH CALENDAR GRID */}
            <div id="admin-calendar-section" className="bg-[#FAF7F2] border border-[#D8C3A8] rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3 w-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-[#EBE3D5]">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#C8643F]" />
                  <h3 className="text-xs sm:text-sm font-bold font-serif-fraunces text-[#2B271F]">
                    {`${MONTH_CONFIGS[selectedMonth].name} Gathering Grid`}
                  </h3>
                  <span className="text-[11px] font-mono text-stone-500">
                    ({monthEvents.length} {monthEvents.length === 1 ? 'gathering' : 'gatherings'})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-500">
                  Tap any gathering to inspect roster &amp; door check-in
                </span>
              </div>

              {/* Empty month banner if no events */}
              {monthEvents.length === 0 && (
                <div className="p-3 bg-white/70 border border-[#EADBCC] rounded-xl text-center text-xs text-stone-600">
                  {MONTH_CONFIGS[selectedMonth].name} lineup coming soon · Use the month navigation above to switch active cycles.
                </div>
              )}

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#8C8270]">
                {dayNames.map((d, i) => (
                  <div key={d} className={`py-1 rounded-md ${i === 0 || i === 6 ? 'text-[#C8643F]' : ''}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Weeks (7-day rows with inline week accordion) */}
              <div className="space-y-2">
                {weeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="space-y-2">
                    {/* 7-Cell Day Row */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {week.map((cell) => {
                        if (cell.type === 'empty') {
                          return (
                            <div
                              key={cell.key}
                              className="min-h-[44px] sm:min-h-[60px] lg:min-h-[70px] p-1 sm:p-1.5 bg-[#F4EEE2]/30 rounded-lg sm:rounded-xl border border-dashed border-[#D8CEBC]/40 opacity-40"
                            />
                          );
                        }

                        const { dayNum, events: dayEvents, hasEvents, isToday, isPast, dayVotes, isDaySelected } = cell;
                        const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                        const isPastCycle = selectedMonth < CURRENT_CYCLE_MONTH;
                        const isLockedEmptyDate = isPastCycle && !hasEvents;

                        return (
                          <div
                            key={`day-${dayNum}`}
                            role={isLockedEmptyDate ? undefined : "button"}
                            tabIndex={isLockedEmptyDate ? undefined : 0}
                            data-date={dateStr}
                            aria-label={
                              isLockedEmptyDate
                                ? `${MONTH_CONFIGS[selectedMonth].name} ${dayNum}, blank date`
                                : `${MONTH_CONFIGS[selectedMonth].name} ${dayNum}${hasEvents ? `, ${dayEvents.length} gathering${dayEvents.length > 1 ? 's' : ''}` : ', blank date'}`
                            }
                            onClick={
                              isLockedEmptyDate
                                ? undefined
                                : () => {
                                    if (hasEvents) {
                                      handleSelectEvent(dayEvents[0].id, dayNum);
                                    } else {
                                      handleSelectDate(dateStr, dayNum);
                                    }
                                  }
                            }
                            onKeyDown={
                              isLockedEmptyDate
                                ? undefined
                                : (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      if (hasEvents) {
                                        handleSelectEvent(dayEvents[0].id, dayNum);
                                      } else {
                                        handleSelectDate(dateStr, dayNum);
                                      }
                                    }
                                  }
                            }
                            className={`min-h-[44px] sm:min-h-[60px] lg:min-h-[70px] p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-all flex flex-col justify-between ${
                              isLockedEmptyDate
                                ? 'cursor-default select-none pointer-events-none bg-[#F7F3EC]/50 border-[#E8E0D2] opacity-75'
                                : `cursor-pointer hover:bg-[#F5EFE6]/80 focus:outline-none focus:ring-1 focus:ring-[#C8643F] ${
                                    isDaySelected
                                      ? 'bg-[#FAF0EB] border-[#C8643F] ring-2 ring-[#C8643F]/30 shadow-xs'
                                      : isToday
                                      ? 'bg-amber-50/70 border-amber-300 hover:border-[#C8643F]/60'
                                      : hasEvents
                                      ? 'bg-white border-[#D8CEBC] hover:border-[#C8643F] hover:shadow-xs'
                                      : isPast
                                      ? 'bg-[#F7F3EC]/50 border-[#E8E0D2] opacity-75 hover:border-[#C8643F]/60'
                                      : 'bg-[#FCFAF7] border-[#EADBCC] hover:border-[#C8643F]/60'
                                  }`
                            }`}
                          >
                            {/* Top row: day number + tags */}
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[11px] sm:text-xs font-mono font-bold ${
                                  isToday
                                    ? 'w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#C8643F] text-white flex items-center justify-center text-[9px] sm:text-[10px]'
                                    : isDaySelected
                                    ? 'text-[#C8643F]'
                                    : 'text-[#2B271F]'
                                }`}
                              >
                                {dayNum}
                              </span>
                              <div className="flex items-center gap-1">
                                {isToday && (
                                  <span className="text-[9px] font-mono uppercase font-bold text-[#C8643F] hidden sm:inline">
                                    Today
                                  </span>
                                )}
                                {dayVotes > 0 && (
                                  <span
                                    title={`${dayVotes} member preferences for this date`}
                                    className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#EDE4D3] text-stone-700 hidden sm:inline"
                                  >
                                    {dayVotes}v
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Event Pills */}
                            <div className="space-y-1 mt-1">
                              {dayEvents.map((ev) => {
                                const isEvSelected = Boolean(selectedEvent && ev.id === selectedEvent.id);
                                const cleanTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
                                const attendance = calculateEventAttendance(ev, users, responses);
                                return (
                                  <button
                                    key={ev.id}
                                    type="button"
                                    title={ev.title}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectEvent(ev.id, dayNum);
                                    }}
                                    className={`w-full text-left p-0.5 sm:p-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] leading-tight transition-all font-medium flex items-center justify-between gap-1 cursor-pointer truncate ${
                                      isEvSelected
                                        ? 'bg-[#2B271F] text-white shadow-xs font-semibold ring-1 ring-[#2B271F]'
                                        : 'bg-[#FAF0EB] text-[#C8643F] hover:bg-[#F3E3DA] border border-[#EED4C8]'
                                    }`}
                                  >
                                    {/* Mobile representation: clean icon + attendee count badge */}
                                    <div className="flex sm:hidden items-center justify-center gap-1 w-full text-center py-0.5">
                                      <span className="text-xs leading-none shrink-0 inline-flex items-center justify-center">
                                        {getEventIcon(ev.title, (ev as any).iconName || (ev as any).emoji || ev.icon)}
                                      </span>
                                      <span
                                        className={`text-[9px] font-mono shrink-0 px-1 py-0.2 rounded font-semibold ${
                                          isEvSelected ? 'bg-white/20 text-white' : 'bg-white text-[#C8643F]'
                                        }`}
                                      >
                                        {attendance.confirmedCount}
                                      </span>
                                    </div>

                                    {/* Desktop representation: icon + clean event title + count badge */}
                                    <div className="hidden sm:flex items-center justify-between gap-1 w-full min-w-0">
                                      <span className="truncate flex items-center gap-1 min-w-0">
                                        <span className="shrink-0 inline-flex items-center justify-center">
                                          {getEventIcon(ev.title, (ev as any).iconName || (ev as any).emoji || ev.icon)}
                                        </span>
                                        <span className="truncate">{cleanTitle}</span>
                                      </span>
                                      <span
                                        className={`text-[9px] font-mono shrink-0 px-1 rounded font-semibold ${
                                          isEvSelected ? 'bg-white/20 text-white' : 'bg-white text-[#C8643F]'
                                        }`}
                                      >
                                        {attendance.confirmedCount}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Inline Accordion Drawer Below Active Week */}
                    {weekIndex === activeWeekIndex && selectedEvent && (
                      <div
                        id="gathering-cockpit"
                        className="bg-[#FAF7F2] border border-[#D8C3A8] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in w-full min-w-0 mt-2"
                      >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#EBE3D5]">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C8643F] animate-pulse" />
                            <h3 className="text-sm font-bold font-serif-fraunces text-[#2B271F] tracking-tight">
                              Active Gathering Inspector
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventId(null);
                              setSelectedDayNum(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C8643F] text-white hover:bg-[#B25332] text-xs font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C8643F] cursor-pointer"
                            aria-label="Close"
                          >
                            ✕
                            Close
                          </button>
                        </div>

                        {/* CONSOLIDATED GATHERING COCKPIT CARD */}
                        <div
                          className={`rounded-2xl p-4 sm:p-6 transition-all duration-300 w-full min-w-0 space-y-4 ${
                            isImminentEvent
                              ? 'bg-[#2B271F] text-white shadow-md border border-[#3E3832]'
                              : 'bg-white border border-[#EADBCC] text-[#2B271F] shadow-sm'
                          }`}
                        >
                          {/* Header Bar: Status Badge, Relative Date & Active Gathering Switcher */}
                          <div
                            className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b ${
                              isImminentEvent ? 'border-white/10' : 'border-[#EBE3D5]'
                            }`}
                          >
                            {/* Badges / Status */}
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              {relativeDateInfo.isToday ? (
                                <>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#C8643F] text-white shadow-xs">
                                    <span className="w-2 h-2 rounded-full bg-white/90 inline-block mr-1.5 animate-ping" />
                                    EVENT TODAY
                                  </span>
                                  <span className="text-white/30 hidden sm:inline">·</span>
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Happening Today · {selectedEvent.timeWindow || '10:00 AM CDT'}
                                  </span>
                                </>
                              ) : relativeDateInfo.isTomorrow ? (
                                <>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-600 text-white shadow-xs">
                                    <Calendar className="w-3 h-3 text-white" />
                                    TOMORROW
                                  </span>
                                  <span className="text-white/30 hidden sm:inline">·</span>
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                                    <Clock className="w-3 h-3" />
                                    Event Tomorrow · {selectedEvent.timeWindow || '10:00 AM CDT'}
                                  </span>
                                </>
                              ) : relativeDateInfo.isPast ? (
                                <>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-700 text-white shadow-xs">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                    CONCLUDED GATHERING
                                  </span>
                                  <span className="text-stone-300 hidden sm:inline">·</span>
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                                    {relativeDateInfo.label} · {selectedEvent.displayDate}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                      selectedEvent.status === 'confirmed'
                                        ? isImminentEvent
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : 'bg-[#EDF5EE] border border-[#BACFB2] text-[#3D6B42]'
                                        : isImminentEvent
                                        ? 'bg-white/10 text-white border border-white/20'
                                        : 'bg-[#FAF0EB] border border-[#EED4C8] text-[#C8643F]'
                                    }`}
                                  >
                                    {selectedEvent.status === 'confirmed' ? (
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-0.5" />
                                    ) : (
                                      <Calendar className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                      {selectedEvent.status === 'confirmed' ? 'Confirmed Gathering' : 'Upcoming Gathering'} · {formatCityName(selectedEvent.city || selectedCity)}
                                    </span>
                                  </span>
                                  <span className={isImminentEvent ? 'text-white/30 hidden sm:inline' : 'text-stone-300 hidden sm:inline'}>·</span>
                                  <span
                                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full ${
                                      isImminentEvent
                                        ? 'bg-white/10 text-stone-300 border border-white/15'
                                        : 'bg-[#FAF0EB] text-[#C8643F] border border-[#EED4C8]'
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {relativeDateInfo.label} · {selectedEvent.displayDate}
                                  </span>
                                </>
                              )}
                              {selectedEvent.categoryLabel && (
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                    isImminentEvent ? 'bg-white/10 text-stone-300' : 'text-[#8C827A] bg-[#EDE4D3]/50'
                                  }`}
                                >
                                  {selectedEvent.categoryLabel}
                                </span>
                              )}
                            </div>

                            {/* Active Gathering Dropdown Switcher */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full lg:w-auto min-w-0">
                              <label
                                htmlFor="admin-gathering-switcher"
                                className={`text-xs font-bold uppercase tracking-wider shrink-0 ${
                                  isImminentEvent ? 'text-stone-300' : 'text-[#6A6253]'
                                }`}
                              >
                                Active Gathering:
                              </label>
                              <div className="relative w-full sm:w-auto min-w-0 max-w-full">
                                <select
                                  id="admin-gathering-switcher"
                                  value={selectedEventId || ''}
                                  onChange={(e) => handleSelectEvent(e.target.value)}
                                  className={`w-full sm:w-auto max-w-full min-w-0 truncate text-ellipsis rounded-xl px-3 py-2 pr-8 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#C8643F] cursor-pointer shadow-xs appearance-none ${
                                    isImminentEvent
                                      ? 'bg-white/10 border border-white/20 text-white'
                                      : 'bg-white border border-[#e5dfd8] text-[#2B271F]'
                                  }`}
                                >
                                  <optgroup label={`${MONTH_CONFIGS[selectedMonth].name} Chapter Gatherings`} className="text-[#2B271F] bg-white">
                                    {monthEvents.map((ev) => (
                                      <option key={ev.id} value={ev.id} className="text-[#2B271F] bg-white">
                                        {ev.displayDate} — {splitEventTitle(ev.title, ev.brandPrefix).eventName}
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                                <div
                                  className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 ${
                                    isImminentEvent ? 'text-stone-300' : 'text-[#8C827A]'
                                  }`}
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Pill Switcher: Month Upcoming Dates Tab Strip */}
                          <div className="flex items-center gap-2 w-full min-w-0 py-0.5 text-xs overflow-x-auto no-scrollbar">
                            <span
                              className={`text-[11px] font-mono uppercase tracking-wider shrink-0 ${
                                isImminentEvent ? 'text-stone-400' : 'text-stone-500'
                              }`}
                            >
                              {MONTH_CONFIGS[selectedMonth].shortName}:
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {monthEvents.length > 0 ? (
                                monthEvents.slice(0, 6).map((ev) => {
                                  const isSelected = ev.id === selectedEvent.id;
                                  const rawName = splitEventTitle(ev.title, ev.brandPrefix).eventName;
                                  const cleanName = rawName
                                    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                                    .trim();
                                  return (
                                    <button
                                      key={ev.id}
                                      type="button"
                                      onClick={() => handleSelectEvent(ev.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                                        isSelected
                                          ? 'bg-[#C8643F] text-white shadow-xs'
                                          : isImminentEvent
                                          ? 'bg-white/10 border border-white/15 text-stone-300 hover:text-white hover:bg-white/20'
                                          : 'bg-white border border-[#D8CEBC] text-[#6A6253] hover:text-[#2B271F] hover:bg-[#FAF7F2]'
                                      }`}
                                    >
                                      <span className="inline-flex items-center gap-1.5">
                                        {getEventIcon(ev.title, (ev as any).iconName || (ev as any).emoji || ev.icon)}
                                        <span>{ev.displayDate}: {cleanName.length > 20 ? `${cleanName.slice(0, 20)}…` : cleanName}</span>
                                      </span>
                                    </button>
                                  );
                                })
                              ) : (
                                <span className="text-stone-400 text-xs italic">No gatherings scheduled yet</span>
                              )}
                            </div>
                          </div>

                          {/* Main 2-Column Responsive Body */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* Left Column: Event details + Host Announcement (col-span-7) */}
                            <div className="lg:col-span-7 space-y-3 min-w-0">
                              <div className="space-y-1.5 min-w-0">
                                <div
                                  className={`text-xs font-mono uppercase tracking-wider ${
                                    isImminentEvent ? 'text-stone-400' : 'text-stone-500'
                                  }`}
                                >
                                  {relativeDateInfo.isToday
                                    ? 'LIVE TODAY'
                                    : relativeDateInfo.isTomorrow
                                    ? 'EVENT TOMORROW'
                                    : relativeDateInfo.isPast
                                    ? 'CONCLUDED GATHERING'
                                    : 'UPCOMING GATHERING'}
                                </div>
                                <h2
                                  className={`text-xl sm:text-2xl font-bold font-serif-fraunces tracking-tight leading-snug break-words ${
                                    isImminentEvent ? 'text-white' : 'text-[#2B271F]'
                                  }`}
                                >
                                  {splitEventTitle(selectedEvent.title, selectedEvent.brandPrefix).eventName}
                                </h2>
                                <div
                                  className={`flex items-center gap-2 text-xs sm:text-sm flex-wrap ${
                                    isImminentEvent ? 'text-stone-300' : 'text-stone-600'
                                  }`}
                                >
                                  <span
                                    className={`inline-flex items-center gap-1.5 font-semibold ${
                                      isImminentEvent ? 'text-white' : 'text-[#2B271F]'
                                    }`}
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-[#C8643F]" />
                                    {selectedEvent.displayDate || 'Date TBD'}, {selectedEvent.timeWindow || 'Time TBD'}
                                  </span>
                                  <span className={isImminentEvent ? 'text-white/30' : 'text-stone-300'}>·</span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isImminentEvent ? 'text-stone-400' : 'text-stone-500'
                                      }`}
                                    />
                                    <span>
                                      {selectedEvent.venueName || 'Venue TBD'}
                                      {selectedEvent.venueAddress ? ` (${selectedEvent.venueAddress})` : ''}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Host Controls & Broadcasts Info */}
                              <div
                                className={`rounded-xl p-3 space-y-1.5 ${
                                  isImminentEvent
                                    ? 'bg-white/5 border border-white/10'
                                    : 'bg-[#FAF7F2] border border-[#EBE3D5]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <BrandName tmClassName={isImminentEvent ? 'text-white' : 'text-[#2B271F]'} />
                                  <span className={isImminentEvent ? 'text-white/30' : 'text-stone-300'}>·</span>
                                  <span
                                    className={`text-[11px] font-mono uppercase tracking-wider ${
                                      isImminentEvent ? 'text-stone-400' : 'text-stone-500'
                                    }`}
                                  >
                                    Host Controls &amp; Broadcasts
                                  </span>
                                </div>
                                {selectedEvent.hostAnnouncement ? (
                                  <p
                                    className={`text-xs italic rounded-lg p-2.5 ${
                                      isImminentEvent
                                        ? 'text-stone-200 bg-white/5 border border-white/10'
                                        : 'text-[#6A6253] bg-white/80 border border-[#EBE3D5]'
                                    }`}
                                  >
                                    &ldquo;{selectedEvent.hostAnnouncement}&rdquo;
                                  </p>
                                ) : selectedEvent.description ? (
                                  <p
                                    className={`text-xs rounded-lg p-2.5 ${
                                      isImminentEvent
                                        ? 'text-stone-200 bg-white/5 border border-white/10'
                                        : 'text-[#6A6253] bg-white/60 border border-[#EBE3D5]'
                                    }`}
                                  >
                                    {selectedEvent.description}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            {/* Right Column: Confirmed Guests Headcount Gauge + Attendee Preferences (col-span-5) */}
                            <div className="lg:col-span-5 space-y-3 min-w-0">
                              <div
                                className={`rounded-2xl p-4 sm:p-5 space-y-2.5 w-full min-w-0 ${
                                  isImminentEvent
                                    ? 'bg-white/5 border border-white/10'
                                    : 'bg-[#FCFAF7] border border-[#EADBCC] shadow-2xs'
                                }`}
                              >
                                {/* Header row */}
                                <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                                  <span
                                    className={`text-xs font-mono uppercase tracking-wider shrink-0 ${
                                      isImminentEvent ? 'text-stone-400' : 'text-stone-500'
                                    }`}
                                  >
                                    CONFIRMED GUESTS
                                  </span>
                                  <span
                                    className={`text-2xl font-bold font-serif-fraunces shrink-0 ${
                                      isImminentEvent ? 'text-white' : 'text-[#2B271F]'
                                    }`}
                                  >
                                    {cockpitConfirmedGuests} / {cockpitCapacity}
                                  </span>
                                </div>

                                {/* Progress bar */}
                                <div
                                  className={`w-full h-2 rounded-full overflow-hidden ${
                                    isImminentEvent ? 'bg-stone-700' : 'bg-stone-200'
                                  }`}
                                >
                                  <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, cockpitPercent))}%`,
                                    }}
                                  />
                                </div>

                                {/* Footer subtext row */}
                                <div className="flex items-center justify-between text-xs gap-2 pt-0.5">
                                  <span
                                    className={`whitespace-nowrap shrink-0 ${
                                      isImminentEvent ? 'text-stone-400' : 'text-stone-500'
                                    }`}
                                  >
                                    {cockpitSpotsLeft} spots remaining
                                  </span>
                                  <span
                                    className={`font-semibold whitespace-nowrap shrink-0 ${
                                      isImminentEvent ? 'text-emerald-400' : 'text-emerald-600'
                                    }`}
                                  >
                                    {cockpitPercent}% filled
                                  </span>
                                </div>

                                {/* Live Preferences Aggregation Summary */}
                                <div
                                  className={`pt-2 border-t flex items-center justify-between gap-2 flex-wrap ${
                                    isImminentEvent ? 'border-white/10' : 'border-[#EBE3D5]'
                                  }`}
                                >
                                  <span
                                    className={`text-[10px] font-mono uppercase tracking-wider shrink-0 ${
                                      isImminentEvent ? 'text-stone-400' : 'text-stone-500'
                                    }`}
                                  >
                                    ATTENDEE PREFERENCES
                                  </span>
                                  <span
                                    className={`font-mono text-xs px-2.5 py-1 rounded-full ${
                                      isImminentEvent ? 'bg-white/10 text-stone-200' : 'bg-[#EFE8DF] text-stone-700'
                                    }`}
                                  >
                                    Preferences: ⚡ {feedbackCounts.Energizing} · ☕ {feedbackCounts.Relaxed} · 🌱 {feedbackCounts.DeepTalk}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Consolidated Actions Bar */}
                          <div
                            className={`pt-3.5 flex flex-wrap items-center gap-2 sm:gap-3 border-t ${
                              isImminentEvent ? 'border-white/10' : 'border-[#EBE3D5]'
                            }`}
                          >
                            {/* Copy Venue Address */}
                            <button
                              type="button"
                              onClick={handleCopyVenue}
                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                                isImminentEvent
                                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                                  : 'bg-white hover:bg-[#F3EFEB] text-[#2B271F] border border-[#D8CEBC]'
                              }`}
                              title="Copy venue address to clipboard"
                            >
                              {copiedVenue ? (
                                <>
                                  <Check
                                    className={`w-3.5 h-3.5 ${
                                      isImminentEvent ? 'text-emerald-400' : 'text-emerald-600'
                                    }`}
                                  />
                                  <span
                                    className={`font-mono ${
                                      isImminentEvent ? 'text-emerald-300' : 'text-emerald-700'
                                    }`}
                                  >
                                    Address Copied!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy
                                    className={`w-3.5 h-3.5 ${
                                      isImminentEvent ? 'text-stone-300' : 'text-stone-500'
                                    }`}
                                  />
                                  <span>Copy Venue Address</span>
                                </>
                              )}
                            </button>

                            {/* View Public RSVP Page */}
                            <a
                              href={`/${selectedEvent.city || 'chicago'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                                isImminentEvent
                                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                                  : 'bg-white hover:bg-[#F3EFEB] text-[#2B271F] border border-[#D8CEBC]'
                              }`}
                              title="Open public RSVP page in new tab"
                            >
                              <ExternalLink
                                className={`w-3.5 h-3.5 ${isImminentEvent ? 'text-stone-300' : 'text-stone-500'}`}
                              />
                              <span>View Public RSVP Page</span>
                            </a>

                            {/* Ticket / Partiful Link if available */}
                            {(selectedEvent.partifulUrl || selectedEvent.externalUrl) && (
                              <a
                                href={selectedEvent.partifulUrl || selectedEvent.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap ${
                                  isImminentEvent
                                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                                    : 'bg-white border border-[#D8CEBC] hover:border-[#2B271F] text-[#2B271F] hover:bg-[#FAF7F2]'
                                }`}
                              >
                                <Ticket className="w-3.5 h-3.5 text-[#C8643F]" />
                                <span>Venue Details</span>
                                <ExternalLink className="w-3 h-3 text-[#8C827A]" />
                              </a>
                            )}

                            {/* History Drawer */}
                            <button
                              type="button"
                              onClick={() => setShowHistoryDrawer(true)}
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap ${
                                isImminentEvent
                                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                                  : 'bg-white border border-[#D8CEBC] text-[#2B271F] hover:bg-[#FAF7F2]'
                              }`}
                            >
                              <History className="w-3.5 h-3.5 text-[#8C827A]" />
                              <span>History ({broadcasts.length})</span>
                            </button>

                            {/* Single Update Announcement Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenAdminModal(selectedEvent)}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#C8643F] hover:bg-[#b05230] text-white transition-all cursor-pointer shadow-xs sm:ml-auto whitespace-nowrap"
                              title="Open announcement modal for this event"
                            >
                              <Megaphone className="w-3.5 h-3.5" />
                              <span>Update Announcement</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inline Blank Date Inspector Below Active Week */}
                    {weekIndex === activeWeekIndex && !selectedEvent && selectedDayNum && selectedMonth >= CURRENT_CYCLE_MONTH && (
                      <div
                        id="blank-date-inspector"
                        className="bg-[#FAF7F2] border border-[#D8C3A8] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in w-full min-w-0 mt-2"
                      >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#EBE3D5]">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#8C827A]" />
                            <h3 className="text-sm font-bold font-serif-fraunces text-[#2B271F] tracking-tight">
                              Date Inspector · {(() => {
                                const [y, m] = selectedMonth.split('-').map(Number);
                                const d = new Date(y, m - 1, selectedDayNum);
                                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                              })()}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventId(null);
                              setSelectedDayNum(null);
                              setSelectedDate(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C8643F] text-white hover:bg-[#B25332] text-xs font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C8643F] cursor-pointer"
                            aria-label="Close"
                          >
                            ✕
                            Close
                          </button>
                        </div>

                        {/* Detail Card Empty State */}
                        <div className="bg-white border border-[#EADBCC] rounded-2xl p-6 sm:p-8 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-[#FAF0EB] text-[#C8643F] mx-auto flex items-center justify-center">
                            <Calendar className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                              No gatherings scheduled for this date
                            </h4>
                            <p className="text-xs text-stone-500 max-w-md mx-auto">
                              {votesByDay[selectedDayNum]
                                ? `${votesByDay[selectedDayNum]} member${votesByDay[selectedDayNum] > 1 ? 's' : ''} requested or indicated availability for this date.`
                                : 'No events have been announced for this date yet. You can announce a new gathering or dispatch an invitation to members.'}
                            </p>
                          </div>

                          <div className="pt-2 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const dateStr = `${selectedMonth}-${String(selectedDayNum).padStart(2, '0')}`;
                                handleOpenAdminModalForDate(dateStr, selectedDayNum);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C8643F] hover:bg-[#b05230] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                              <Megaphone className="w-3.5 h-3.5" />
                              <span>Announce Gathering on this Date</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* DATE POLLING RESULTS CONSENSUS CARD */}
            <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-5 border-b border-[#EBE3D5] w-full min-w-0">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8C827A]" />
                  <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                    Date Polling Results — {MONTH_CONFIGS[selectedMonth].name} ({formatCityName(selectedCity)})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAdminModal(selectedEvent || undefined)}
                  className="bg-[#C8643F] hover:bg-[#B25532] text-white rounded-xl px-4 py-2 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors w-full sm:w-auto"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Announce Winning Date</span>
                </button>
              </div>
              {dateTally.length > 0 ? (
                renderBars(dateTally)
              ) : (
                <div className="py-6 text-center text-xs text-stone-500 italic bg-white/50 rounded-xl border border-[#EBE3D5]">
                  No date preferences recorded for {MONTH_CONFIGS[selectedMonth].name} yet.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: COMMUNITY POLLING */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#EBE3D5]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#6E7F5E]">
                    COMMUNITY DEMAND
                  </span>
                  <span className="text-[#D8CEBC]">·</span>
                  <span className="text-xs text-[#8C827A]">Chapter Polls</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-serif-fraunces text-[#2B271F]">
                  Community Polling
                </h2>
                <p className="text-xs text-[#6A6253] mt-0.5">
                  Responses from {responses.length} community members showing preferred dates and activities.
                </p>
              </div>
            </div>

            {/* KPI GRID - 4 BALANCED METRIC CARDS (2x2 on mobile, 4-col on lg) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
              {/* Metric 1: Intake Responses */}
              <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-stone-500 block truncate">
                    Intake Responses
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                    {responses.length}
                  </div>
                  <span className="text-[11px] sm:text-xs text-stone-600 mt-0.5 block font-sans truncate">
                    Verified submissions
                  </span>
                </div>
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-white border border-[#EADBCC] flex items-center justify-center shrink-0 shadow-2xs">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />
                </div>
              </div>

              {/* Metric 2: Projected Attendance */}
              <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-stone-500 block truncate">
                    Projected Attendance
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                    {totalEstimatedGuests}
                  </div>
                  <span className="text-[11px] sm:text-xs text-stone-600 mt-0.5 block font-sans truncate">
                    Signups + guests
                  </span>
                </div>
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-white border border-[#EADBCC] flex items-center justify-center shrink-0 shadow-2xs">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />
                </div>
              </div>

              {/* Metric 3: SMS Reach */}
              <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-stone-500 block truncate">
                    SMS Reach
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                    {smsReachRate}%
                  </div>
                  <span className="text-[11px] sm:text-xs text-stone-600 mt-0.5 block font-sans truncate">
                    {smsOptedInResponses.length} opted-in numbers
                  </span>
                </div>
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-white border border-[#EADBCC] flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />
                </div>
              </div>

              {/* Metric 4: Leading Day */}
              <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-stone-500 block truncate">
                    Leading Day ({MONTH_CONFIGS[selectedMonth].shortName})
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                    {topDateOption ? topDateOption.split(',')[0] : '—'}
                  </div>
                  <span className="text-[11px] sm:text-xs text-stone-600 mt-0.5 block font-sans truncate">
                    Top polled date
                  </span>
                </div>
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-white border border-[#EADBCC] flex items-center justify-center shrink-0 shadow-2xs">
                  <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: 2-COLUMN BALANCED ANALYTICS SUITE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Left Col: Time Preferences, Member Notes & Ideas */}
            <div className="space-y-6 w-full">
              {/* Time Preferences */}
              <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#EBE3D5]">
                  <Clock className="w-4 h-4 text-[#8C827A]" />
                  <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                    Time Preferences
                  </h3>
                </div>
                {renderBars(timeTally)}
              </div>

              {/* Member Notes & Ideas */}
              {(writeInGatheringItems.length > 0 || writeInDateItems.length > 0 || writeInTimeItems.length > 0) && (
                <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#EBE3D5]">
                    <PenLine className="w-4 h-4 text-[#8C827A]" />
                    <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                      Member Notes & Ideas
                    </h3>
                  </div>
                  {/* GATHERING IDEAS & SUGGESTIONS */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6A6253] block mb-2.5">
                      GATHERING IDEAS & SUGGESTIONS ({activeGatheringItems.length})
                    </span>
                    {activeGatheringItems.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {activeGatheringItems.map((item, idx) => {
                          const pastCycleBadge = getPastCycleBadge(item.text, item.createdAt, item.name);
                          return (
                            <div
                              key={idx}
                              className="bg-white border border-[#EADBCC] rounded-xl p-3.5 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-xs font-medium text-[#2B271F] italic leading-relaxed">
                                  &ldquo;{item.text}&rdquo;
                                </p>
                                {pastCycleBadge && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#EFE8DF] text-[#7A7265] border border-[#DDD5C7]">
                                    {pastCycleBadge}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#F3EFEB]">
                                <span className="font-semibold text-stone-700">
                                  {formatIntakeTag(item.createdAt, item.name, item.city)}
                                </span>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                                  INTAKE
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-[#FAF8F5] border border-dashed border-[#EADBCC] rounded-xl py-2.5 px-3 text-center">
                        <p className="text-xs text-[#7A7265] italic">
                          No active requests for this cycle.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CUSTOM DATES REQUESTED */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6A6253] block mb-2.5">
                      CUSTOM DATES REQUESTED ({activeDateItems.length})
                    </span>
                    {activeDateItems.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {activeDateItems.map((item, idx) => {
                          const pastCycleBadge = getPastCycleBadge(item.text, item.createdAt, item.name);
                          return (
                            <div
                              key={idx}
                              className="bg-white border border-[#EADBCC] rounded-xl p-3.5 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-xs font-medium text-[#2B271F] italic leading-relaxed">
                                  &ldquo;{item.text}&rdquo;
                                </p>
                                {pastCycleBadge && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#EFE8DF] text-[#7A7265] border border-[#DDD5C7]">
                                    {pastCycleBadge}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#F3EFEB]">
                                <span className="font-semibold text-stone-700">
                                  {formatIntakeTag(item.createdAt, item.name, item.city)}
                                </span>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                                  INTAKE
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-[#FAF8F5] border border-dashed border-[#EADBCC] rounded-xl py-2.5 px-3 text-center">
                        <p className="text-xs text-[#7A7265] italic">
                          No active requests for this cycle.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CUSTOM TIMES REQUESTED */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6A6253] block mb-2.5">
                      CUSTOM TIMES REQUESTED ({activeTimeItems.length})
                    </span>
                    {activeTimeItems.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        {activeTimeItems.map((item, idx) => {
                          const pastCycleBadge = getPastCycleBadge(item.text, item.createdAt, item.name);
                          return (
                            <div
                              key={idx}
                              className="bg-white border border-[#EADBCC] rounded-xl p-3.5 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-xs font-medium text-[#2B271F] italic leading-relaxed">
                                  &ldquo;{item.text}&rdquo;
                                </p>
                                {pastCycleBadge && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#EFE8DF] text-[#7A7265] border border-[#DDD5C7]">
                                    {pastCycleBadge}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#F3EFEB]">
                                <span className="font-semibold text-stone-700">
                                  {formatIntakeTag(item.createdAt, item.name, item.city)}
                                </span>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                                  INTAKE
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-[#FAF8F5] border border-dashed border-[#EADBCC] rounded-xl py-2.5 px-3 text-center">
                        <p className="text-xs text-[#7A7265] italic">
                          No active requests for this cycle.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Past-Cycle Archive Drawer */}
                  {allPastCycleItems.length > 0 && (
                    <details className="group pt-3 border-t border-[#EBE3D5]">
                      <summary className="flex items-center justify-between py-2 text-xs font-bold uppercase tracking-wider text-[#6A6253] hover:text-[#2B271F] cursor-pointer transition-colors list-none select-none [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-[#8C827A]" />
                          <span>
                            {selectedMonth === '2026-10'
                              ? 'Past Cycle Requests (September 2026)'
                              : `Past Cycle Requests (${pastCycleLabel})`}
                          </span>
                          <span className="text-[11px] font-mono font-normal text-stone-400 lowercase">
                            ({allPastCycleItems.length})
                          </span>
                        </span>
                        <ChevronDown className="w-4 h-4 text-stone-500 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 grid grid-cols-1 gap-2.5">
                        {allPastCycleItems.map((item, idx) => {
                          const pastCycleBadge = getPastCycleBadge(item.text, item.createdAt, item.name) || 'Past Cycle';
                          return (
                            <div
                              key={idx}
                              className="bg-white/80 border border-[#EADBCC] rounded-xl p-3.5 shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider uppercase bg-[#F3EFEB] text-[#6A6253] border border-[#E5DDD0]">
                                  {item.categoryLabel}
                                </span>
                                {pastCycleBadge && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#EFE8DF] text-[#7A7265] border border-[#DDD5C7]">
                                    {pastCycleBadge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-[#2B271F] italic leading-relaxed">
                                &ldquo;{item.text}&rdquo;
                              </p>
                              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#F3EFEB]">
                                <span className="font-semibold text-stone-700">
                                  {formatIntakeTag(item.createdAt, item.name, item.city)}
                                </span>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                                  INTAKE
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Right Col: Gathering Demand, Preferences Breakdown */}
            <div className="space-y-6 w-full">
              {/* Gathering Demand */}
              <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#EBE3D5]">
                  <Compass className="w-4 h-4 text-stone-600" />
                  <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                    Gathering Demand
                  </h3>
                </div>
                {renderBars(showAllDemand ? gathTally : gathTally.slice(0, 5))}
                {gathTally.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDemand((prev) => !prev)}
                    className="mt-4 pt-3 border-t border-[#EBE3D5] w-full text-center text-xs font-semibold text-stone-600 hover:text-[#C8643F] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {showAllDemand
                        ? 'Show fewer options ▴'
                        : `Show all options (${gathTally.length - 5} more) ▾`}
                    </span>
                  </button>
                )}
              </div>

              {/* Preferences Breakdown */}
              <div className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-[#EBE3D5]">
                  <SlidersHorizontal className="w-4 h-4 text-[#8C827A]" />
                  <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                    Preferences Breakdown
                  </h3>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#6A6253] block mb-2">
                    Weekday vs. Weekend
                  </span>
                  {renderBars(dayTally)}
                </div>
                <div className="pt-2 border-t border-[#EBE3D5]">
                  <span className="text-xs font-semibold text-[#6A6253] block mb-2">
                    Beverage Preferences
                  </span>
                  {renderBars(drinkTally)}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: CONTACT ROSTER DATA TABLE */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
              <div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Contact Roster ({responses.length})
                </h3>
                <p className="text-xs text-[#6A6253] mt-0.5">
                  Showing <strong>{filteredResponses.length}</strong> of <strong>{responses.length}</strong> contacts
                  {(searchQuery || filterAttendance !== 'all' || filterGathering !== 'all' || filterTime !== 'all' || filterDate !== 'all' || presetFilter !== 'all') && (
                    <span className="text-[#C8643F] font-semibold ml-1">
                      (Filtered{filterAttendance === 'attending' ? ` · Attending ${selectedEvent ? splitEventTitle(selectedEvent.title, selectedEvent.brandPrefix).eventName : 'Gathering'}` : filterAttendance === 'survey_only' ? ' · Survey Only' : presetFilter === 'confirmed' ? ' · Confirmed Only' : presetFilter === 'sms' ? ' · SMS Verified' : presetFilter === 'notes' ? ' · With Notes' : ''})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* A. Command & Filter Bar */}
            <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Left: High-end search input with magnifying glass */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#EADBCC] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#2B271F] placeholder:text-stone-400 focus:outline-none focus:border-[#C8643F] shadow-2xs"
                />
              </div>

              {/* Center: Segmented pill tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setPresetFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    presetFilter === 'all'
                      ? 'bg-[#2B271F] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-[#EADBCC]'
                  }`}
                >
                  <span>All ({responses.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetFilter('confirmed')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    presetFilter === 'confirmed'
                      ? 'bg-[#2B271F] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-[#EADBCC]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Confirmed ({confirmedForSelectedEventCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetFilter('sms')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    presetFilter === 'sms'
                      ? 'bg-[#2B271F] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-[#EADBCC]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#E07A5F]" />
                  <span>SMS Verified ({smsOptedInResponses.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetFilter('notes')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    presetFilter === 'notes'
                      ? 'bg-[#2B271F] text-white shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-[#EADBCC]'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5 text-blue-500" />
                  <span>With Notes ({withNotesCount})</span>
                </button>
              </div>

              {/* Right: Clean outline Filters ▾ popover button and Export CSV action */}
              <div className="flex items-center gap-2 self-end lg:self-auto relative">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilterPopover((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs ${
                      hasActiveAdvancedFilters || showFilterPopover
                        ? 'bg-[#FAF0EB] border-[#EED4C8] text-[#C8643F]'
                        : 'bg-white border-[#EADBCC] text-stone-700 hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
                    <span>Filters</span>
                    {hasActiveAdvancedFilters && (
                      <span className="w-2 h-2 rounded-full bg-[#C8643F]" />
                    )}
                    <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${showFilterPopover ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Advanced Filters Popover */}
                  {showFilterPopover && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowFilterPopover(false)} />
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#EADBCC] rounded-2xl shadow-xl p-4 z-40 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#EADBCC]">
                          <span className="text-xs font-bold text-stone-800">Advanced Filters</span>
                          {hasActiveAdvancedFilters && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilterAttendance('all');
                                setFilterGathering('all');
                                setFilterTime('all');
                                setFilterDate('all');
                              }}
                              className="text-[11px] font-medium text-[#C8643F] hover:underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Event Attendance Filter */}
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                            Event Attendance
                          </label>
                          <select
                            value={filterAttendance}
                            onChange={(e) => setFilterAttendance(e.target.value as any)}
                            className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#2B271F] font-medium focus:outline-none focus:border-[#C8643F] cursor-pointer"
                          >
                            <option value="all">All Contacts ({responses.length})</option>
                            {selectedEvent && (
                              <option value="attending">
                                Attending: {(() => {
                                  const clean = splitEventTitle(selectedEvent.title, selectedEvent.brandPrefix).eventName;
                                  return clean.length > 20 ? `${clean.slice(0, 20)}…` : clean;
                                })()}
                              </option>
                            )}
                            <option value="survey_only">Survey Only</option>
                          </select>
                        </div>

                        {/* Interest Filter */}
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                            Filter by Interest
                          </label>
                          <select
                            value={filterGathering}
                            onChange={(e) => setFilterGathering(e.target.value)}
                            className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#2B271F] focus:outline-none focus:border-[#C8643F] cursor-pointer"
                          >
                            <option value="all">All Interests ({responses.length})</option>
                            {GATHERINGS.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>

                        {/* Time Filter */}
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                            Filter by Time
                          </label>
                          <select
                            value={filterTime}
                            onChange={(e) => setFilterTime(e.target.value)}
                            className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#2B271F] focus:outline-none focus:border-[#C8643F] cursor-pointer"
                          >
                            <option value="all">All Times</option>
                            {TIMES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {/* Date Filter */}
                        <div>
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1">
                            Filter by Date
                          </label>
                          <select
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full bg-[#FAF7F2] border border-[#EADBCC] rounded-lg px-2.5 py-1.5 text-xs text-[#2B271F] focus:outline-none focus:border-[#C8643F] cursor-pointer"
                          >
                            <option value="all">All Dates</option>
                            {monthDates.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Export CSV Action */}
                <button
                  type="button"
                  onClick={exportFilteredCSV}
                  className="inline-flex items-center gap-1.5 bg-white border border-[#EADBCC] text-stone-800 hover:bg-[#FAF7F2] text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  title="Export CSV"
                >
                  <Download className="w-3.5 h-3.5 text-stone-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* B. Modern Executive Table Container (Shadcn-Inspired) */}
            <div className="w-full bg-white border border-[#EADBCC] rounded-2xl shadow-sm overflow-hidden">
              <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-[#FAF7F2]">
                    <tr className="border-b border-[#EADBCC]">
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2] whitespace-nowrap">Attendee</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2] whitespace-nowrap">Status &amp; Guests</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2] whitespace-nowrap text-center">Door Check-In</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2] whitespace-nowrap">Phone</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2] whitespace-nowrap">Market</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2]">Interests</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2]">Dates</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2]">Times</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2]">Notes</th>
                      <th className="py-3.5 px-4 text-xs font-mono uppercase tracking-wider text-stone-500 bg-[#FAF7F2] text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EADBCC]">
                    {filteredResponses.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-12 px-4 text-xs text-stone-500 italic">
                          No contacts match your current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredResponses.map((r, idx) => {
                        const isAttending = selectedEvent ? isContactAttendingEvent(r, selectedEvent, users) : false;
                        const rawGatherings = Array.isArray(r.gatherings) ? r.gatherings : [];
                        const allGaths = [
                          ...rawGatherings,
                          ...(r.customGathering ? [`"${r.customGathering}"`] : []),
                        ];
                        const visibleGaths = allGaths.slice(0, 2);
                        const remainingGaths = allGaths.length - 2;

                        const rawDates = Array.isArray(r.dates) ? r.dates : [];
                        const allDates = [
                          ...rawDates,
                          ...(r.customDate ? [r.customDate] : []),
                        ];
                        const visibleDates = allDates.slice(0, 2);
                        const remainingDates = allDates.length - 2;

                        const rawTimes = Array.isArray(r.times) ? r.times : [];
                        const allTimes = [
                          ...rawTimes,
                          ...(r.customTime ? [r.customTime] : []),
                        ];
                        const visibleTimes = allTimes.slice(0, 2);
                        const remainingTimes = allTimes.length - 2;

                        const rawG = r.guests;
                        let guestBadgeText = 'Just Me';
                        if (rawG && rawG !== '1' && rawG.toLowerCase() !== 'just me') {
                          if (rawG === '2') guestBadgeText = '+1 Guest';
                          else if (rawG === '3') guestBadgeText = '+2 Guests';
                          else if (rawG === '4+') guestBadgeText = '+3 Guests';
                          else if (!rawG.startsWith('+')) guestBadgeText = `+${rawG} Guests`;
                          else guestBadgeText = `${rawG} Guests`;
                        }

                        return (
                          <tr key={r.id || idx} className="hover:bg-[#FAF7F2]/60 transition-colors">
                            {/* Attendee Monogram Avatar & Email Stack */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC] min-w-[220px]">
                              <div className="flex items-center">
                                <div className="bg-[#EAE4DC] text-[#2B271F] font-bold text-xs w-8 h-8 rounded-full flex items-center justify-center mr-3 shrink-0">
                                  {getInitials(r.name, r.email)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-[#2B271F] truncate">
                                    {r.name || '—'}
                                  </div>
                                  {r.email ? (
                                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                                      <a
                                        href={`mailto:${r.email}`}
                                        className="font-mono hover:text-[#C8643F] hover:underline truncate max-w-[170px] transition-colors"
                                        title={r.email}
                                      >
                                        {r.email}
                                      </a>
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyEmail(r.email, e)}
                                        title={copiedEmail === r.email ? "Copied!" : "Copy email address"}
                                        className="p-0.5 rounded text-stone-400 hover:text-stone-700 transition-colors cursor-pointer shrink-0"
                                      >
                                        {copiedEmail === r.email ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-stone-400 font-mono text-xs">—</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Status & Guests */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC] whitespace-nowrap">
                              <div className="flex flex-col gap-1 items-start">
                                {isAttending ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                    Confirmed RSVP
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600 border border-stone-200">
                                    Survey Intake
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-stone-50 text-stone-600 border border-stone-200">
                                  <Users className="w-3 h-3 text-stone-400" />
                                  {guestBadgeText}
                                </span>
                              </div>
                            </td>

                            {/* Door Check-In */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC] text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleToggleCheckIn(r.id, r.checkedIn)}
                                disabled={!r.id || checkInLoading === r.id}
                                className={
                                  r.checkedIn
                                    ? "px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#EFE8DF] text-[#C8643F] border border-[#C8643F]/30 transition-colors cursor-pointer"
                                    : "px-2.5 py-1 rounded-full text-xs font-mono border border-stone-300 text-stone-600 hover:border-[#C8643F] transition-colors cursor-pointer"
                                }
                                title={r.checkedIn ? "Click to undo check-in" : "Click to mark attendee checked in"}
                              >
                                {r.checkedIn ? "✓ Checked In" : "Check In"}
                              </button>
                            </td>

                            {/* Phone */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC] whitespace-nowrap">
                              {(() => {
                                const formattedPhone = formatRosterPhone(r.phoneNumber || (r as any).phone);
                                return formattedPhone ? (
                                  <div className="space-y-1">
                                    <div className="font-mono text-xs font-semibold text-[#2B271F]">{formattedPhone}</div>
                                    {r.smsOptIn ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#E8EFE9] text-[#2D5A38] border border-[#C8DEC9] font-medium">
                                        <Check className="w-3 h-3 text-[#2D5A38]" /> SMS Verified
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                                        No SMS
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-stone-400 font-mono text-xs">—</span>
                                );
                              })()}
                            </td>

                            {/* Market / City */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC] whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#FAF7F2] text-stone-700 border border-[#EADBCC]">
                                <MapPin className="w-3 h-3 text-[#E07A5F]" />
                                {formatCityName(r.city || 'chicago')}
                              </span>
                            </td>

                            {/* Interests / Gatherings */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC]">
                              <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                                {visibleGaths.map((g, gIdx) => (
                                  <span
                                    key={gIdx}
                                    className="inline-block bg-[#F4EEE2] border border-[#D8CEBC] text-[#2B271F] text-[11px] font-medium px-2 py-0.5 rounded-md truncate max-w-[130px]"
                                    title={g}
                                  >
                                    {g}
                                  </span>
                                ))}
                                {remainingGaths > 0 && (
                                  <span
                                    className="inline-block bg-[#EADBCC]/60 border border-[#D8CEBC] text-[#6A6253] text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md cursor-default shrink-0"
                                    title={allGaths.slice(2).join(', ')}
                                  >
                                    +{remainingGaths} more
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Preferred Dates */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC]">
                              <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                                {visibleDates.map((d, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className="inline-block bg-[#EDF5EE] border border-[#BACFB2] text-[#3D6B42] text-[11px] font-medium px-2 py-0.5 rounded-md truncate max-w-[130px]"
                                    title={d}
                                  >
                                    {d}
                                  </span>
                                ))}
                                {remainingDates > 0 && (
                                  <span
                                    className="inline-block bg-[#D4E8D6]/70 border border-[#BACFB2] text-[#3D6B42] text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md cursor-default shrink-0"
                                    title={allDates.slice(2).join(', ')}
                                  >
                                    +{remainingDates} more
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Preferred Times */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC]">
                              <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                                {visibleTimes.map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="inline-block bg-[#F0F4F8] border border-[#C8D6E5] text-[#2B4C6F] text-[11px] font-medium px-2 py-0.5 rounded-md truncate max-w-[130px]"
                                    title={t}
                                  >
                                    {t}
                                  </span>
                                ))}
                                {remainingTimes > 0 && (
                                  <span
                                    key="more-times"
                                    className="inline-block bg-[#D3E0EE]/70 border border-[#C8D6E5] text-[#2B4C6F] text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md cursor-default shrink-0"
                                    title={allTimes.slice(2).join(', ')}
                                  >
                                    +{remainingTimes} more
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Notes */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC]">
                              {r.notes ? (
                                <p className="text-xs text-[#6A6253] italic max-w-xs break-words line-clamp-2">
                                  &ldquo;{r.notes}&rdquo;
                                </p>
                              ) : (
                                <span className="text-[#8C827A]">—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC] text-center whitespace-nowrap">
                              {r.email && r.email.includes('@') ? (
                                <button
                                  type="button"
                                  onClick={() => handleResendInvite(r)}
                                  disabled={resendingEmail === r.email || broadcasts.length === 0}
                                  title={broadcasts.length === 0 ? 'Announce winning date first' : `Email event details to ${r.email}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-stone-600 hover:text-[#2B271F] hover:bg-[#FAF7F2] border border-transparent hover:border-[#D8CEBC] transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shadow-2xs"
                                >
                                  {resendingEmail === r.email ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C8643F]" />
                                      <span className="text-stone-500 font-mono text-[11px]">Sending…</span>
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#2B271F]" />
                                      <span>Send Details</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-[#8C827A] italic">No email</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SMS BROADCAST PANEL (SAFE NATIVE MODE) */}
          <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EBE3D5]">
              <MessageSquare className="w-5 h-5 text-[#E07A5F]" />
              <div>
                <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                  SMS Broadcast Panel ({formatCityName(selectedCity)})
                </h3>
                <p className="text-xs text-[#6A6253]">
                  Draft and dispatch announcements to attendees who opted into SMS updates.
                </p>
              </div>
            </div>

            <div className="bg-[#EDE4D3]/50 border border-[#D8CEBC] rounded-xl p-3 text-xs text-[#4C5A40] font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#4C5A40] shrink-0" />
              <span>
                {phoneNumbersList.length} opted-in attendee{phoneNumbersList.length === 1 ? '' : 's'} with verified phone numbers {selectedCity !== 'all' ? `in ${formatCityName(selectedCity)}` : 'across all cities'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold uppercase tracking-wider text-[#6A6253]">SMS Message Text</label>
                <span className={`font-semibold ${smsMessage.length >= 160 ? 'text-[#C8643F]' : 'text-[#8C827A]'}`}>
                  {smsMessage.length} / 160 chars
                </span>
              </div>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="e.g. Winner date selected! Check your email for details & RSVP tickets for Actually Let's Chicago."
                maxLength={160}
                rows={3}
                className="w-full bg-white border border-[#D8CEBC] rounded-xl p-3 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F]"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              {/* Copy Opted-In Phone Numbers */}
              <button
                type="button"
                onClick={handleCopyPhoneNumbers}
                disabled={phoneNumbersList.length === 0}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#FAF7F2] text-[#2B271F] border border-[#D8CEBC] text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Copy phone numbers to clipboard"
              >
                {copiedPhones ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-mono">
                      {phoneNumbersList.length} Number{phoneNumbersList.length === 1 ? '' : 's'} Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#8C827A]" />
                    <span>Copy Opted-In Phone Numbers</span>
                  </>
                )}
              </button>

              {/* Open in Native Messages */}
              <button
                type="button"
                onClick={() => setShowSmsConfirmModal(true)}
                disabled={phoneNumbersList.length === 0 || !smsMessage.trim()}
                className="inline-flex items-center justify-center gap-2 bg-[#2B271F] hover:bg-[#403B33] text-white text-xs font-bold px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Open client-side SMS intent"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Native Messages ({phoneNumbersList.length} Recipients)</span>
              </button>
            </div>

            {/* Safety Note */}
            <p className="text-[11px] text-[#6A6253] flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                <strong>Safe Native Mode:</strong> Messages are drafted locally on your device. No automated background carrier requests are sent.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: ANNOUNCEMENT & SEGMENTATION MODAL REFACTOR */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-[#2B271F]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowAdminModal(false)}>
          <div className="bg-[#FAF7F2] border border-[#EBE3D5] rounded-3xl p-7 max-w-2xl w-full shadow-2xl relative my-8" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 mb-5 border-b border-[#EBE3D5]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF0EB] text-[#E07A5F] flex items-center justify-center border border-[#EED4C8] shrink-0">
                  <Megaphone className="w-5 h-5 text-[#E07A5F]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F]">
                    {activeModalEventTitle ? `Announce Gathering · ${activeModalEventTitle}` : 'Announce Winning Date'}
                  </h3>
                  <p className="text-xs text-[#6A6253] mt-0.5">
                    {formatCityName(selectedCity)} Chapter · Configure details and preview audience segmentation before dispatching.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="text-[#8C827A] hover:text-[#2B271F] p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Tabs Indicator */}
            <div className="flex gap-2 p-1 bg-[#EDE4D3]/50 border border-[#D8CEBC] rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setToastMessage(null);
                  setModalStep('configure');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${modalStep === 'configure' ? 'bg-white text-[#2B271F] shadow-xs' : 'text-[#6A6253] hover:text-[#2B271F]'}`}
              >
                1. Configure Details
              </button>
              <button
                type="button"
                onClick={() => {
                  setToastMessage(null);
                  setModalStep('review');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${modalStep === 'review' ? 'bg-white text-[#2B271F] shadow-xs' : 'text-[#6A6253] hover:text-[#2B271F]'}`}
              >
                2. Review &amp; Segmentation Preview
              </button>
            </div>

            {toastMessage && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold mb-5 flex items-start gap-2 ${toastMessage.type === 'success' ? 'bg-[#EDF5EE] border border-[#BACFB2] text-[#3D6B42]' : 'bg-[#FDF2F0] border border-[#F5C2BA] text-[#A63A24]'}`}>
                {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{toastMessage.text}</span>
              </div>
            )}

            {modalStep === 'configure' ? (
              <div className="space-y-4">
                {/* 1. Select Winning Date */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    <Trophy className="w-4 h-4 text-[#D97706]" />
                    <span>Select Gathering / Date *</span>
                  </label>
                  <select
                    value={winningDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWinningDate(val);
                      const matched = events.find((ev) => ev.displayDate === val || ev.date === val);
                      if (matched) {
                        setEventTimeWindow(matched.timeWindow);
                        setVenueName(matched.venueName || '');
                        setVenueAddress(matched.venueAddress || '');
                        setEventLink(matched.partifulUrl || matched.externalUrl || '');
                        setActiveModalEventId(matched.id);
                        setActiveModalEventTitle(matched.title);
                      }
                    }}
                    className="w-full bg-white border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] font-semibold focus:outline-none focus:border-[#C8643F] cursor-pointer"
                  >
                    <optgroup label={`${MONTH_CONFIGS[selectedMonth].name} Chapter Gatherings`}>
                      {monthEvents.map((ev) => (
                        <option key={ev.id} value={ev.displayDate}>
                          {ev.displayDate} — {splitEventTitle(ev.title, ev.brandPrefix).eventName}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={`${MONTH_CONFIGS[selectedMonth].name} Poll Dates`}>
                      {monthDates.map((d) => (
                        <option key={d} value={d}>
                          {d} {topDateOption === d ? '(Top Poll Winner)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* 2. Event Time Window */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    <Clock className="w-4 h-4 text-[#8C827A]" />
                    <span>Time Window *</span>
                  </label>
                  <input
                    type="text"
                    value={eventTimeWindow}
                    onChange={(e) => setEventTimeWindow(e.target.value)}
                    placeholder="e.g. 10:00 AM – 12:00 PM CDT"
                    className="w-full bg-white border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F]"
                  />
                </div>

                {/* 3. Venue Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                      <MapPin className="w-4 h-4 text-[#E07A5F]" />
                      <span>Venue Name <span className="text-[10px] font-normal text-[#8C827A]">(Optional)</span></span>
                    </label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. Lincoln Park Conservatory"
                      className="w-full bg-white border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F]"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                      <Compass className="w-4 h-4 text-[#8C827A]" />
                      <span>Venue Address <span className="text-[10px] font-normal text-[#8C827A]">(Optional)</span></span>
                    </label>
                    <input
                      type="text"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      placeholder="e.g. 2391 N Stockton Dr, Chicago, IL"
                      className="w-full bg-white border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F]"
                    />
                  </div>
                </div>

                {/* 4. External URL */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    <Ticket className="w-4 h-4 text-[#8C827A]" />
                    <span>External URL <span className="text-[10px] font-normal text-[#8C827A]">(Partiful, Luma, Eventbrite)</span></span>
                  </label>
                  <input
                    type="text"
                    value={eventLink}
                    onChange={(e) => setEventLink(e.target.value)}
                    placeholder="https://partiful.com/e/... or https://luma.com/..."
                    className="w-full bg-white border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F]"
                  />
                </div>

                {/* 5. Host Note */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                    <PenLine className="w-4 h-4 text-[#8C827A]" />
                    <span>Host Note</span>
                  </label>
                  <textarea
                    value={hostNote}
                    onChange={(e) => setHostNote(e.target.value)}
                    placeholder="Write a personal note to the community..."
                    rows={3}
                    className="w-full bg-white border border-[#D8CEBC] rounded-xl p-3 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F]"
                  />
                </div>

                {/* Audience Preview Box */}
                <div className="p-4 bg-[#EDE4D3]/50 border border-[#D8CEBC] rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-xs font-bold text-[#2B271F]">
                    Audience Preview for {selectedDateStr}:
                  </span>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold bg-[#EDF5EE] text-[#3D6B42] border border-[#BACFB2]">
                      Group A (Available: {groupA.length})
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold bg-[#EBE3D5]/50 text-[#6A6253] border border-[#D8CEBC]">
                      Group B (Other: {groupB.length})
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-[#D8CEBC] text-xs font-semibold text-[#6A6253] hover:bg-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToastMessage(null);
                      setModalStep('review');
                    }}
                    className="flex-2 py-3 px-4 rounded-xl bg-[#C8643F] hover:bg-[#B25532] text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
                  >
                    Continue to Review &amp; Segmentation →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDispatchAnnouncements} className="space-y-4">
                {/* Announcement Summary */}
                <div className="p-4 bg-[#EDE4D3]/40 border border-[#D8CEBC] rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#C8643F]">
                    <CheckCircle2 className="w-4 h-4 text-[#C8643F]" />
                    <span>Announcement Summary</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-[#2B271F]">
                    {Boolean(activeModalEventTitle || selectedEvent?.title) && (
                      <>
                        <span className="text-[#6A6253]">Target Gathering:</span>
                        <span className="col-span-2 font-bold text-[#2B271F]">
                          <BrandName tmClassName="text-[#2B271F]" /> — {splitEventTitle(activeModalEventTitle || selectedEvent?.title || '').eventName}
                        </span>
                      </>
                    )}
                    <span className="text-[#6A6253]">Winning Date:</span>
                    <span className="col-span-2 font-bold">{selectedDateStr}</span>
                    <span className="text-[#6A6253]">Time Window:</span>
                    <span className="col-span-2">{eventTimeWindow}</span>
                    {Boolean(venueName || venueAddress) && (
                      <>
                        <span className="text-[#6A6253]">Venue:</span>
                        <span className="col-span-2 font-semibold">
                          {venueName} {venueAddress && `(${venueAddress})`}
                        </span>
                      </>
                    )}
                    {eventLink && (
                      <>
                        <span className="text-[#6A6253]">Link:</span>
                        <span className="col-span-2 text-[#C8643F] break-all">{eventLink}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Audience Segmentation Preview */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#2B271F]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C827A]" />
                    <span>Audience Segmentation ({responses.length} Total Contacts)</span>
                  </div>

                  {/* Group A */}
                  <div className="p-3.5 bg-white border border-[#BACFB2] rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-[#3B5730]">
                          Group A: Available Attendees ({groupA.length})
                        </span>
                        <p className="text-[11px] text-[#6A6253]">
                          Voted for {selectedDateStr} or selected &quot;Any date&quot;
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedGroup(expandedGroup === 'groupA' ? null : 'groupA')}
                        className="text-[11px] font-semibold text-[#3B5730] px-2 py-1 rounded bg-[#EDF5EE] border border-[#BACFB2] cursor-pointer inline-flex items-center gap-1"
                      >
                        {expandedGroup === 'groupA' ? (
                          <>Hide List <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>View {groupA.length} Attendees <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    </div>
                    {expandedGroup === 'groupA' && (
                      <div className="max-h-36 overflow-y-auto border-t border-[#BACFB2]/50 pt-2 text-xs space-y-1">
                        {groupA.map((r, i) => (
                          <div key={r.id || i} className="text-[#2B271F]">
                            <strong>{r.name}</strong> ({r.email || 'No email'})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Group B */}
                  <div className="p-3.5 bg-white border border-[#D8CEBC] rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-[#6A6253]">
                          Group B: Other Date Attendees ({groupB.length})
                        </span>
                        <p className="text-[11px] text-[#8C827A]">
                          Voted only for alternate dates
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedGroup(expandedGroup === 'groupB' ? null : 'groupB')}
                        className="text-[11px] font-semibold text-[#6A6253] px-2 py-1 rounded bg-[#F4EEE2] border border-[#D8CEBC] cursor-pointer inline-flex items-center gap-1"
                      >
                        {expandedGroup === 'groupB' ? (
                          <>Hide List <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>View {groupB.length} Attendees <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    </div>
                    {expandedGroup === 'groupB' && (
                      <div className="max-h-36 overflow-y-auto border-t border-[#D8CEBC]/50 pt-2 text-xs space-y-1">
                        {groupB.map((r, i) => (
                          <div key={r.id || i} className="text-[#2B271F]">
                            <strong>{r.name}</strong> ({r.email || 'No email'})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dry Run / Test Mode Box */}
                <div className={`p-4 rounded-2xl border transition-all ${isDryRun ? 'bg-[#EDF5EE] border-[#BACFB2]' : 'bg-[#FFF7F4] border-[#F5C2BA]'}`}>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={isDryRun}
                      onChange={(e) => setIsDryRun(e.target.checked)}
                      className="w-4 h-4 rounded text-[#4C5A40] cursor-pointer"
                    />
                    <FlaskConical className={`w-4 h-4 ${isDryRun ? 'text-[#3D6B42]' : 'text-[#C8643F]'}`} />
                    <span className={isDryRun ? 'text-[#3D6B42]' : 'text-[#C8643F]'}>
                      Test Mode (Send preview exclusively to test email)
                    </span>
                  </label>
                  {isDryRun ? (
                    <div className="mt-2.5 space-y-1.5 text-xs text-[#3D6B42]">
                      <p>Sends sample Group A and Group B preview emails to the address below with zero regular attendees contacted.</p>
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="admin@actuallylets.com"
                        className="w-full bg-white border border-[#BACFB2] rounded-lg px-3 py-2 text-xs text-[#2B271F]"
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[#A63A24] flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Live Mode Active: Will dispatch announcement to all {groupA.length + groupB.length} contacts.</span>
                    </p>
                  )}
                </div>

                {/* Safety Confirmation Text Lock */}
                <div className="p-4 bg-[#FFF7F4] border border-[#F5C2BA] rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C8643F]">
                    <Lock className="w-3.5 h-3.5 text-[#C8643F]" />
                    <span>Safety Confirmation Lock</span>
                  </div>
                  <p className="text-xs text-[#2B271F]">
                    To unlock {isDryRun ? 'test dispatch' : 'live announcement dispatch'}, type <strong>CONFIRM</strong> into the box below:
                  </p>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type CONFIRM to enable"
                    className="w-full bg-white border border-[#F5C2BA] rounded-lg px-3.5 py-2.5 text-sm text-[#2B271F] font-bold focus:outline-none focus:border-[#C8643F]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setToastMessage(null);
                      setModalStep('configure');
                    }}
                    disabled={isDispatching}
                    className="flex-1 py-3 px-4 rounded-xl border border-[#D8CEBC] text-xs font-semibold text-[#6A6253] hover:bg-white transition-colors cursor-pointer"
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="submit"
                    disabled={isDispatching || confirmInput.trim().toUpperCase() !== 'CONFIRM'}
                    className="flex-2 py-3 px-4 rounded-xl bg-[#C8643F] hover:bg-[#B25532] text-white text-xs font-bold transition-colors cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDispatching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dispatching Announcements...</span>
                      </>
                    ) : isDryRun ? (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Test Preview (2 Sample Emails)</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Dispatch Live Announcement to All Contacts</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADMIN SAFE NATIVE SMS CONFIRMATION MODAL */}
      {showSmsConfirmModal && (
        <div className="fixed inset-0 bg-[#2B271F]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowSmsConfirmModal(false)}>
          <div className="bg-[#FAF7F2] border border-[#EBE3D5] rounded-3xl p-7 max-w-md w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-[#EBE3D5]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#E07A5F]" />
                <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                  Launch Native Messages
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSmsConfirmModal(false)}
                className="text-[#8C827A] hover:text-[#2B271F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#2B271F] leading-relaxed">
              You are about to open your device&apos;s personal messaging app pre-filled for <strong>{phoneNumbersList.length} opted-in recipient{phoneNumbersList.length === 1 ? '' : 's'}</strong> ({formatCityName(selectedCity)}).
            </p>

            <div className="p-3 bg-white border border-[#D8CEBC] rounded-xl text-xs text-[#2B271F] italic space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 not-italic block">Draft Preview</span>
              <p>&ldquo;{smsMessage}&rdquo;</p>
            </div>

            <div className="p-3 bg-[#EDF5EE] border border-[#BACFB2] rounded-xl text-[11px] text-[#3D6B42] flex items-start gap-2">
              <Check className="w-4 h-4 text-[#3D6B42] shrink-0 mt-0.5" />
              <span>
                <strong>Safe Native Dispatch:</strong> This generates a client-side <code className="font-mono bg-white/70 px-1 py-0.5 rounded">sms:</code> intent. You review and hit send inside your device&apos;s messaging app.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSmsConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#D8CEBC] text-xs font-semibold text-[#6A6253] hover:bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <a
                href={nativeSmsHref}
                onClick={() => setShowSmsConfirmModal(false)}
                className="flex-2 py-2.5 px-4 rounded-xl bg-[#2B271F] hover:bg-[#403B33] text-white text-xs font-bold transition-colors cursor-pointer shadow-md text-center flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Messages App →</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* BROADCAST HISTORY DRAWER */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 bg-[#2B271F]/45 backdrop-blur-xs flex justify-end z-50 animate-fade-in" onClick={() => setShowHistoryDrawer(false)}>
          <div className="bg-[#FAF7F2] w-full max-w-lg h-screen overflow-y-auto p-6 sm:p-7 shadow-2xl flex flex-col space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-4 border-b border-[#EBE3D5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0EB] text-[#E07A5F] flex items-center justify-center border border-[#EED4C8]">
                  <History className="w-5 h-5 text-[#E07A5F]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                    Broadcast History
                  </h3>
                  <p className="text-xs text-[#6A6253]">
                    {formatCityName(selectedCity)} · {broadcasts.length} past announcement log{broadcasts.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="text-[#8C827A] hover:text-[#2B271F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {broadcasts.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#8C827A] italic">
                No broadcast announcements have been logged yet for this city view.
              </div>
            ) : (
              <div className="space-y-3.5 overflow-y-auto flex-1">
                {broadcasts.map((b, idx) => {
                  let formattedDate = 'Recent';
                  if (b.dispatchedAt) {
                    const timeMs = b.dispatchedAt.toMillis ? b.dispatchedAt.toMillis() : (typeof b.dispatchedAt === 'number' ? b.dispatchedAt : new Date(b.dispatchedAt).getTime());
                    if (!isNaN(timeMs)) {
                      formattedDate = new Date(timeMs).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      });
                    }
                  }

                  return (
                    <div
                      key={b.id || idx}
                      className={`p-4 rounded-xl border ${idx === 0 ? 'bg-white border-[#D8C3A8] shadow-xs' : 'bg-white/80 border-[#E8E1D5]'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-[#E07A5F] uppercase tracking-wider flex items-center gap-1">
                          {idx === 0 ? (
                            <><span className="w-1.5 h-1.5 rounded-full bg-[#E07A5F] inline-block" /> Latest Dispatch</>
                          ) : (
                            `Broadcast #${broadcasts.length - idx}`
                          )}
                        </span>
                        <span className="text-[11px] text-[#8C827A] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#8C827A]" />
                          {formattedDate}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-[#2B271F] mb-1">
                        {b.winningDate}
                      </h4>

                      <div className="text-xs text-[#6A6253] space-y-0.5 mb-2">
                        <div>{b.timeWindow || '10:00 AM – 12:00 PM CDT'}</div>
                        {(b.venueName || b.venueAddress) && (
                          <div>
                            <strong>{b.venueName}</strong> {b.venueAddress && `(${b.venueAddress})`}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 text-[11px] mb-2">
                        <span className="bg-[#EDF5EE] border border-[#BACFB2] text-[#3B5730] px-2 py-0.5 rounded">
                          Group A: {b.groupACount}
                        </span>
                        <span className="bg-[#F4EEE2] border border-[#D8CEBC] text-[#6A6253] px-2 py-0.5 rounded">
                          Group B: {b.groupBCount}
                        </span>
                        <span className="bg-[#EDE4D3] border border-[#D8CEBC] text-[#2B271F] px-2 py-0.5 rounded font-bold">
                          Total: {b.totalDispatched}
                        </span>
                      </div>

                      {b.customNote && (
                        <p className="text-xs text-[#6A6253] italic bg-[#FAF7F2] p-2 rounded border border-[#EBE3D5] mt-1.5">
                          &ldquo;{b.customNote}&rdquo;
                        </p>
                      )}

                      {b.ticketUrl && (
                        <div className="mt-2 text-xs">
                          <a href={b.ticketUrl} target="_blank" rel="noreferrer" className="text-[#C8643F] hover:underline inline-flex items-center gap-1">
                            <span>RSVP / Ticket Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <Footer className="mt-16" />
    </div>
  );
}
