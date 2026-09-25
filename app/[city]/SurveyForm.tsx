'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { saveResponse, auth } from '@/lib/firebase';
import { formatPhoneNumber } from '@/lib/formatPhone';
import { Turnstile } from '@marsidev/react-turnstile';
import ConfirmationCard from '@/app/components/ConfirmationCard';
import PotteryPollModal from '@/app/components/PotteryPollModal';
import UserNavButton from '@/components/nav/UserNavButton';
import { BrandName } from '@/components/brand/BrandName';
import {
  Calendar,
  Upload,
  ShieldCheck,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowLeft,
  Clock,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  ALL_COMMUNITY_EVENTS,
  CommunityEvent,
  splitEventTitle,
  getAudienceBadge,
  getAudienceIcon,
} from '@/lib/eventsConfig';
import {
  parseIcsBusyIntervals,
  getCandidateSlotIntervals,
  getSurveyDateBounds,
  evaluateSlotConflicts,
  fetchGoogleFreeBusy,
} from '@/lib/smartCalendar';

const GATHERINGS = [
  "Board Games & Card Games",
  "Casual Conversations & Coffee",
  "Family Night & Pizza",
  "Wine Tasting & Socials",
  "Stand-Up Comedy & Entertainment",
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
const GUESTS = ["Just me", "2", "3", "4+"];

export interface VerifiedOctoberDate {
  day: number;
  dateStr: string;
  label: string;
  chip: string;
  category: string;
  timeWindow?: string;
  venueName?: string;
  venueAddress?: string;
  description?: string;
  eventId?: string;
}

export const VERIFIED_OCTOBER_DATES: Record<number, VerifiedOctoberDate | VerifiedOctoberDate[]> = {
  3: {
    day: 3,
    dateStr: "Sat, Oct 3",
    label: "Sat, Oct 3: Apple Fest",
    chip: "Apple Fest",
    category: "outdoor",
    timeWindow: "10:00 AM – 1:00 PM CDT",
    venueName: "Lincoln Square Ravenswood",
    eventId: "chi-2026-10-03-apple-fest",
  },
  5: {
    day: 5,
    dateStr: "Mon, Oct 5",
    label: "Mon, Oct 5: Little Lark Pizza & Wine",
    chip: "Little Lark Pizza & Wine",
    category: "food",
    timeWindow: "6:00 PM – 8:30 PM CDT",
    venueName: "Little Lark",
    eventId: "chi-2026-10-05-little-lark-pizza",
  },
  6: {
    day: 6,
    dateStr: "Tue, Oct 6",
    label: "Tue, Oct 6: Taco Tuesdays",
    chip: "Taco Tuesdays",
    category: "food",
    timeWindow: "6:00 PM – 8:00 PM CDT",
    venueName: "Local Taqueria",
    eventId: "chi-2026-10-06-taco-tuesdays",
  },
  8: {
    day: 8,
    dateStr: "Thu, Oct 8",
    label: "Thu, Oct 8: Little Lark Pinsa Night",
    chip: "Little Lark Pinsa Night",
    category: "food",
    timeWindow: "6:00 PM – 8:30 PM CDT",
    venueName: "Little Lark",
    eventId: "chi-2026-10-08-little-lark-pinsa",
  },
  9: {
    day: 9,
    dateStr: "Fri, Oct 9",
    label: "Fri, Oct 9: Wine Fest",
    chip: "Wine Fest",
    category: "social",
    timeWindow: "5:00 PM – 10:00 PM CDT",
    venueName: "Jonquil Park",
    eventId: "chi-2026-10-09-wine-fest",
  },
  13: {
    day: 13,
    dateStr: "Tue, Oct 13",
    label: "Tue, Oct 13: Taco Tuesdays",
    chip: "Taco Tuesdays",
    category: "food",
    timeWindow: "6:00 PM – 8:00 PM CDT",
    venueName: "Local Taqueria",
    eventId: "chi-2026-10-13-taco-tuesdays",
  },
  16: {
    day: 16,
    dateStr: "Fri, Oct 16",
    label: "Fri, Oct 16: Soul & Smoke BBQ",
    chip: "Soul & Smoke",
    category: "food",
    timeWindow: "6:00 PM – 8:30 PM CDT",
    venueName: "Soul & Smoke",
    venueAddress: "3057 N Rockwell St, Chicago, IL 60618",
    eventId: "chi-2026-10-16-soul-smoke",
  },
  17: [
    {
      day: 17,
      dateStr: "Sat, Oct 17",
      label: "Sat, Oct 17: Spooky Zoo",
      chip: "Spooky Zoo",
      category: "outdoor",
      timeWindow: "10:00 AM – 1:00 PM CDT",
      venueName: "Lincoln Park Zoo",
      description: "Lincoln Park Zoo daytime trick-or-treating, live music, and animal viewing across the grounds.",
      eventId: "chi-2026-10-17-spooky-zoo",
    },
    {
      day: 17,
      dateStr: "Sat, Oct 17",
      label: "Sat, Oct 17: Goebbert's Farm",
      chip: "Goebbert's Farm",
      category: "outdoor",
      timeWindow: "11:00 AM – 1:00 PM CDT",
      venueName: "Goebbert's Farm",
      description: "Pingree Grove pumpkin patches, hot apple cider donuts, and wagon rides.",
      eventId: "chi-2026-10-17-goebberts-farm",
    },
  ],
  20: {
    day: 20,
    dateStr: "Tue, Oct 20",
    label: "Tue, Oct 20: Taco Tuesdays",
    chip: "Taco Tuesdays",
    category: "food",
    timeWindow: "6:00 PM – 8:00 PM CDT",
    venueName: "Local Taqueria",
    eventId: "chi-2026-10-20-taco-tuesdays",
  },
  23: {
    day: 23,
    dateStr: "Fri, Oct 23",
    label: "Fri, Oct 23: Stand Up Comedy",
    chip: "Stand Up Comedy",
    category: "comedy",
    timeWindow: "7:00 PM – 8:30 PM CDT",
    venueName: "Laugh Factory Chicago",
    eventId: "chi-2026-10-23-laugh-factory",
  },
  25: {
    day: 25,
    dateStr: "Sun, Oct 25",
    label: "Sun, Oct 25: BOO! at the Zoo",
    chip: "BOO! Zoo",
    category: "outdoor",
    timeWindow: "10:00 AM – 6:00 PM CDT",
    venueName: "Brookfield Zoo Chicago",
    eventId: "chi-2026-10-25-boo-zoo",
  },
  27: {
    day: 27,
    dateStr: "Tue, Oct 27",
    label: "Tue, Oct 27: Taco Tuesdays",
    chip: "Taco Tuesdays",
    category: "food",
    timeWindow: "6:00 PM – 8:00 PM CDT",
    venueName: "Local Taqueria",
    eventId: "chi-2026-10-27-taco-tuesdays",
  },
};

export const AVAILABLE_CALENDAR_MONTHS = ["2026-09", "2026-10", "2026-11", "2026-12"] as const;
export type CalendarMonthKey = (typeof AVAILABLE_CALENDAR_MONTHS)[number];

export const SURVEY_MONTH_CONFIGS: Record<CalendarMonthKey, {
  key: CalendarMonthKey;
  name: string;
  headerLabel: string;
  daysInMonth: number;
  startDayOfWeek: number;
  monthShort: string;
}> = {
  "2026-09": {
    key: "2026-09",
    name: "September 2026",
    headerLabel: "September",
    daysInMonth: 30,
    startDayOfWeek: 2,
    monthShort: "Sep",
  },
  "2026-10": {
    key: "2026-10",
    name: "October 2026",
    headerLabel: "October 2026",
    daysInMonth: 31,
    startDayOfWeek: 4,
    monthShort: "Oct",
  },
  "2026-11": {
    key: "2026-11",
    name: "November 2026",
    headerLabel: "November 2026",
    daysInMonth: 30,
    startDayOfWeek: 0,
    monthShort: "Nov",
  },
  "2026-12": {
    key: "2026-12",
    name: "December 2026",
    headerLabel: "December 2026",
    daysInMonth: 31,
    startDayOfWeek: 2,
    monthShort: "Dec",
  },
};

export function getEventsForMonthAndDay(monthKey: string, dayNum: number, city: string = 'chicago'): CommunityEvent[] {
  const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
  const targetDate = `${monthKey}-${dayStr}`;
  return ALL_COMMUNITY_EVENTS.filter(
    (e) => e.city.toLowerCase() === city.toLowerCase() && e.date === targetDate
  );
}

export function getEventSelectionKey(ev: CommunityEvent): string {
  const cleanTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
  return `${ev.displayDate}: ${ev.chipLabel || cleanTitle}`;
}

export function isEventSelected(ev: CommunityEvent, dates: string[]): boolean {
  const selKey = getEventSelectionKey(ev);
  const cleanTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
  return dates.some((d) =>
    d === selKey ||
    d === ev.displayDate ||
    d === ev.chipLabel ||
    d === cleanTitle ||
    d.toLowerCase().includes(cleanTitle.toLowerCase()) ||
    (ev.chipLabel && d.toLowerCase().includes(ev.chipLabel.toLowerCase())) ||
    d.includes(ev.id)
  );
}

export function getVerifiedEventsForDay(dayNum: number): VerifiedOctoberDate[] {
  const item = VERIFIED_OCTOBER_DATES[dayNum];
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

export function getWeekendDatesForMonth(monthKey: CalendarMonthKey): string[] {
  const conf = SURVEY_MONTH_CONFIGS[monthKey];
  if (!conf) return [];
  const weekendDates: string[] = [];
  for (let dayNum = 1; dayNum <= conf.daysInMonth; dayNum++) {
    const dayOfWeek = (conf.startDayOfWeek + dayNum - 1) % 7;
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDates.push(`${conf.monthShort} ${dayNum}, 2026`);
    }
  }
  return weekendDates;
}

const DATES = Object.values(VERIFIED_OCTOBER_DATES)
  .flat()
  .map((d) => d.label);

function formatCityName(slug: string): string {
  if (!slug) return 'Chicago';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function SurveyForm({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const resolvedParams = use(params);
  const rawCity = resolvedParams?.city || 'chicago';
  const cityName = formatCityName(rawCity);
  const isChicago = rawCity.toLowerCase() === 'chicago';

  // Hydration state check
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.location.search.includes('view=confirmation')) {
      setName('Alex Morgan');
      setEmail('alex@example.com');
      setSelectedGatherings(['Family Night & Pizza', 'Wine Tasting & Socials']);
      setSelectedDates(['Sat, Oct 3', 'Fri, Oct 9']);
      setSelectedTimes(['Evening']);
      setSubmitted(true);
    }
  }, []);

  // Form state
  const [selectedGatherings, setSelectedGatherings] = useState<string[]>([]);
  const [customGathering, setCustomGathering] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedDayPref, setSelectedDayPref] = useState<string>('Either works');
  const [selectedGuests, setSelectedGuests] = useState<string>('');

  // Multi-Month Calendar Navigation & Modal State
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonthKey>("2026-10");
  const [activeEventModalEvents, setActiveEventModalEvents] = useState<CommunityEvent[] | null>(null);
  const [activeModalEventIndex, setActiveModalEventIndex] = useState<number>(0);

  // Smart Calendar Availability State
  const [checkingCalendar, setCheckingCalendar] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<'google' | 'ics' | null>(null);
  const [slotStatusMap, setSlotStatusMap] = useState<Record<string, 'free' | 'busy'>>({});
  const [calendarScanMessage, setCalendarScanMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSyncingCalendar = checkingCalendar;
  const handleTriggerIcsUpload = () => fileInputRef.current?.click();

  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [quarterlyReminder, setQuarterlyReminder] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState(''); // Visually hidden honeypot field
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseId, setResponseId] = useState('');
  const [showPostRsvpModal, setShowPostRsvpModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPotteryModalOpen, setIsPotteryModalOpen] = useState(false);
  const [multiEventModalDay, setMultiEventModalDay] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const checkVoted = () => {
      try {
        const voted = localStorage.getItem('hasVoted_pottery-studio-faceoff');
        setHasVoted(voted === 'true');
      } catch {
        // ignore localStorage errors
      }
    };
    checkVoted();
    window.addEventListener('pollVoteUpdated', checkVoted);
    window.addEventListener('storage', checkVoted);
    return () => {
      window.removeEventListener('pollVoteUpdated', checkVoted);
      window.removeEventListener('storage', checkVoted);
    };
  }, []);

  useEffect(() => {
    if (activeEventModalEvents || multiEventModalDay !== null) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setActiveEventModalEvents(null);
          setMultiEventModalDay(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [activeEventModalEvents, multiEventModalDay]);

  const toggleEventSelection = (ev: CommunityEvent) => {
    const selKey = getEventSelectionKey(ev);
    const cleanTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
    if (isEventSelected(ev, selectedDates)) {
      setSelectedDates((prev) =>
        prev.filter((d) =>
          d !== selKey &&
          d !== ev.displayDate &&
          d !== ev.chipLabel &&
          d !== cleanTitle &&
          !d.toLowerCase().includes(cleanTitle.toLowerCase()) &&
          !(ev.chipLabel && d.toLowerCase().includes(ev.chipLabel.toLowerCase())) &&
          !d.includes(ev.id)
        )
      );
    } else {
      setSelectedDates((prev) => [...prev, selKey]);
    }
  };

  // Check if confirmation view is active to suppress floating auth modals
  const isConfirmationActive =
    submitted ||
    (mounted &&
      typeof window !== 'undefined' &&
      window.location.search.includes('view=confirmation'));

  const toggleChip = (list: string[], setList: (v: any) => void, item: string) => {
    setList((prev: string[]) => {
      const current = Array.isArray(prev) ? prev : list;
      return current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
    });
  };

  const handleDateToggle = (dateStr: string) => {
    setAvailableDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const applyAvailabilityResults = (busyIntervals: { start: Date; end: Date }[], source: 'google' | 'ics') => {
    const candidateSlots = getCandidateSlotIntervals(DATES);
    const conflicts = evaluateSlotConflicts(candidateSlots, busyIntervals);

    const newStatusMap: Record<string, 'free' | 'busy'> = {};
    const autoSelectDates: string[] = [];

    conflicts.forEach((c) => {
      if (c.hasConflict) {
        newStatusMap[c.label] = 'busy';
      } else {
        newStatusMap[c.label] = 'free';
        if (!selectedDates.includes(c.label)) {
          autoSelectDates.push(c.label);
        }
      }
    });

    setSlotStatusMap(newStatusMap);
    setCalendarConnected(source);

    if (autoSelectDates.length > 0) {
      setSelectedDates((prev) => Array.from(new Set([...prev, ...autoSelectDates])));
    }

    const freeCount = Object.values(newStatusMap).filter((s) => s === 'free').length;
    setCalendarScanMessage(
      `✓ Scanned ${source === 'google' ? 'Google Calendar' : '.ics file'}: ${freeCount} slot${freeCount === 1 ? '' : 's'} free & auto-selected!`
    );
    setCheckingCalendar(false);
  };

  const handleIcsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCheckingCalendar(true);
    setCalendarScanMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const busyIntervals = parseIcsBusyIntervals(content);
        applyAvailabilityResults(busyIntervals, 'ics');
      } catch (err) {
        console.error('Error reading .ics file:', err);
        setCalendarScanMessage('Could not parse .ics file. Please check the file.');
        setCheckingCalendar(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConnectGoogleCalendar = async () => {
    setCheckingCalendar(true);
    setCalendarScanMessage(null);

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      setCalendarScanMessage("Google 1-click sync is awaiting OAuth credentials. Use 'Drop / Pick .ics File' to check your availability instantly.");
      setCheckingCalendar(false);
      return;
    }

    try {
      if (typeof window !== 'undefined' && !(window as any).google?.accounts?.oauth2) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Identity script'));
          document.head.appendChild(script);
        });
      }

      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/calendar.freebusy',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              console.warn('GIS token error:', tokenResponse.error);
              if (tokenResponse.error === 'popup_closed_by_user' || tokenResponse.error === 'access_denied') {
                setCalendarScanMessage("Sign-in cancelled. You can pick dates manually or use .ics drop.");
              } else {
                setCalendarScanMessage(`Google sign-in was unable to complete (${tokenResponse.error}). You can pick dates manually or use .ics drop.`);
              }
              setCheckingCalendar(false);
              return;
            }

            const token = tokenResponse?.access_token;
            if (token) {
              try {
                const candidateSlots = getCandidateSlotIntervals(DATES);
                const { timeMin, timeMax } = getSurveyDateBounds(candidateSlots);
                const busyIntervals = await fetchGoogleFreeBusy(token, timeMin, timeMax);
                applyAvailabilityResults(busyIntervals, 'google');

                // Zero-Trust Token Lifecycle: Revoke ephemeral token immediately after single read query
                if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2?.revoke) {
                  try {
                    (window as any).google.accounts.oauth2.revoke(token, () => {
                      // Token revoked cleanly
                    });
                  } catch (revokeErr) {
                    console.warn('Non-fatal error during token revocation:', revokeErr);
                  }
                }
              } catch (fetchErr: any) {
                console.error('Error in Google FreeBusy call:', fetchErr);
                setCalendarScanMessage('Unable to retrieve Google Calendar busy intervals. Please drop an .ics file instead.');
              } finally {
                setCheckingCalendar(false);
              }
            } else {
              setCheckingCalendar(false);
            }
          },
          error_callback: (err: any) => {
            console.warn('Google OAuth error or cancelled:', err);
            setCalendarScanMessage("Sign-in cancelled. You can pick dates manually or use .ics drop.");
            setCheckingCalendar(false);
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      }
    } catch (err: any) {
      console.error('Google token client initialization error:', err);
      setCalendarScanMessage('Google authentication unavailable. You can drop an .ics file instead.');
      setCheckingCalendar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setPhoneError(null);

    // Honeypot check: If visually hidden field is populated, silently abort (trap bots)
    if (websiteUrl && websiteUrl.trim().length > 0) {
      console.warn("Honeypot field populated on client. Aborting submission.");
      setSubmitted(true);
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCustomGathering = customGathering.trim();
    const trimmedCustomDate = customDate.trim();
    const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
    const sanitizedPhone = cleanPhone.length > 0 ? cleanPhone : undefined;
    const hasSmsOptIn = Boolean(smsOptIn);

    if (!trimmedName) {
      setFormError('Please enter your name.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const allChosenDates = Array.from(new Set([...selectedDates, ...availableDates]));

    if (allChosenDates.length === 0 && !trimmedCustomDate) {
      setFormError('Please pick or type at least one date that works for you.');
      return;
    }

    if (hasSmsOptIn && cleanPhone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit US phone number to receive SMS updates.');
      setFormError('Please enter a valid 10-digit US phone number to receive SMS updates.');
      return;
    }

    setSubmitting(true);

    try {
      const selectedEventIds: string[] = [];
      ALL_COMMUNITY_EVENTS.forEach((ev) => {
        if (isEventSelected(ev, allChosenDates) && !selectedEventIds.includes(ev.id)) {
          selectedEventIds.push(ev.id);
        }
      });

      const payload = {
        city: rawCity.toLowerCase(),
        cityName: cityName,
        name: trimmedName,
        email: trimmedEmail,
        phoneNumber: sanitizedPhone ? sanitizedPhone : null,
        smsOptIn: Boolean(hasSmsOptIn),
        quarterlyReminder: Boolean(quarterlyReminder),
        dates: allChosenDates,
        eventIds: selectedEventIds,
        gatherings: Array.isArray(selectedGatherings) ? selectedGatherings : [],
        customGathering: trimmedCustomGathering || null,
        customDate: trimmedCustomDate || null,
        times: Array.isArray(selectedTimes) ? selectedTimes : [],
        customTime: customTime.trim() || null,
        dayPref: selectedDayPref || 'Either works',
        guests: selectedGuests || null,
        drink: null,
        notes: notes ? notes.trim() : null,
        website_url: websiteUrl || null,
        turnstileToken: turnstileToken || null,
      };

      const confirmRes = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        setFormError(confirmData.error || 'Unable to process RSVP. Please try again.');
        return;
      }

      if (confirmData.responseId) {
        setResponseId(confirmData.responseId);
      }

      setSubmitted(true);
      setSubmittedEmail(trimmedEmail);

      // Secure-first: The post-survey consensus card and profile claim prompt are displayed
      // directly on ConfirmationCard without an intrusive popup modal covering the view.
      setShowPostRsvpModal(false);
    } catch (err: any) {
      console.error("Error submitting response:", err);
      setFormError('Something went wrong submitting your RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --cream: #F4EEE2;
          --cream-2: #EDE4D3;
          --sage: #6E7F5E;
          --sage-deep: #4C5A40;
          --terra: #C8643F;
          --terra-soft: #E08A63;
          --ink: #2B271F;
          --ink-soft: #6A6253;
          --line: #D8CEBC;
          --card: #FBF7EE;
          --shadow: 0 18px 40px -22px rgba(43, 39, 31, 0.45);
        }

        * {
          box-sizing: border-box;
        }

        body {
          font-family: 'Hanken Grotesk', var(--font-hanken-grotesk), sans-serif;
          color: var(--ink);
          background: var(--cream);
          background-image:
            radial-gradient(120% 90% at 12% -10%, rgba(200, 100, 63, 0.10), transparent 55%),
            radial-gradient(100% 80% at 100% 0%, rgba(110, 127, 94, 0.16), transparent 50%);
          min-height: 100vh;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }

        .wrap {
          max-width: 720px;
          margin: 0 auto;
          padding: 28px 20px 80px;
          overflow-x: clip;
        }

        header.top {
          margin-bottom: 26px;
        }

        .eyebrow {
          font-size: 0.75rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--terra);
          font-weight: 700;
          margin-bottom: 10px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          text-decoration: none;
          transition: opacity 0.2s;
          cursor: pointer;
        }

        .eyebrow:hover {
          opacity: 0.8;
        }

        h1 {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-weight: 900;
          font-size: 2.5rem;
          line-height: 1.02;
          letter-spacing: -0.01em;
          color: var(--ink);
        }

        h1 em {
          font-style: italic;
          font-weight: 500;
          color: var(--sage-deep);
        }

        .sub {
          color: var(--ink-soft);
          margin-top: 10px;
          max-width: 48ch;
          font-size: 1rem;
        }

        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 24px 22px;
          box-shadow: var(--shadow);
          margin-bottom: 18px;
          max-width: 100%;
          overflow-x: clip;
        }

        @media (max-width: 640px) {
          .wrap {
            padding: 20px 12px 60px;
          }
          .card {
            padding: 16px 10px;
            border-radius: 16px;
          }
        }

        .q {
          margin-bottom: 26px;
        }

        .q:last-child {
          margin-bottom: 0;
        }

        .q-label {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-size: 1.18rem;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .q-help {
          font-size: 0.85rem;
          color: var(--ink-soft);
          margin-bottom: 13px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .chip {
          appearance: none;
          border: 1.5px solid var(--line);
          background: var(--cream);
          color: var(--ink);
          font-family: inherit;
          font-size: 0.92rem;
          font-weight: 500;
          padding: 10px 15px;
          border-radius: 13px;
          cursor: pointer;
          transition: 0.16s;
          text-align: left;
        }

        .chip:hover {
          border-color: var(--sage);
        }

        .chip.on {
          background: var(--sage);
          border-color: var(--sage-deep);
          color: #fff;
          font-weight: 600;
        }

        .chip.date.on {
          background: var(--terra);
          border-color: var(--terra);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 8px;
          margin-left: 6px;
          vertical-align: middle;
          letter-spacing: 0.02em;
        }

        .status-pill.free {
          background: #EAF0E6;
          color: #3B5730;
          border: 1px solid #BACFB2;
        }

        .chip.date.on .status-pill.free {
          background: rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          border-color: rgba(255, 255, 255, 0.4);
        }

        .status-pill.busy {
          background: #FEF9E7;
          color: #8C6A18;
          border: 1px solid #E8D395;
        }

        .chip.date.on .status-pill.busy {
          background: rgba(0, 0, 0, 0.15);
          color: #FFF9E6;
          border-color: rgba(255, 255, 255, 0.3);
        }

        .smart-connect-bar {
          background: linear-gradient(135deg, #FBF7EE 0%, #F5EDE0 100%);
          border: 1.5px solid var(--line);
          border-radius: 16px;
          padding: 16px 18px;
          margin: 0 0 6px;
          box-shadow: 0 2px 8px -2px rgba(43, 39, 31, 0.05);
        }

        .smart-connect-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
        }

        .smart-connect-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--ink);
          font-family: 'Fraunces', serif;
        }

        .smart-connect-badge {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 3px 10px;
          border-radius: 20px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .smart-connect-badge.fast-pass {
          color: var(--terra);
          background: rgba(200, 100, 63, 0.08);
          border: 1px solid rgba(200, 100, 63, 0.22);
        }

        .smart-connect-badge.privacy {
          color: #2D5A30;
          background: #EAF0E6;
          border: 1px solid #BACFB2;
        }

        .smart-connect-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .connect-btn {
          appearance: none;
          background: #FFFFFF;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 9px 14px;
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--ink);
          cursor: pointer;
          transition: all 0.16s ease;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .connect-btn:hover {
          border-color: var(--terra);
          color: var(--terra);
          transform: translateY(-1px);
        }

        .connect-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .smart-connect-msg {
          margin-top: 8px;
          font-size: 0.8rem;
          color: #3B5730;
          font-weight: 600;
          background: rgba(234, 240, 230, 0.85);
          padding: 7px 11px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .manual-divider-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 20px;
        }

        .manual-divider-line {
          flex: 1;
          height: 1px;
          background: var(--line);
        }

        .manual-divider-text {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8C8270;
          white-space: nowrap;
        }

        @media (max-width: 480px) {
          .manual-divider-text {
            font-size: 0.63rem;
            letter-spacing: 0.06em;
          }
        }

        input[type='text'],
        input[type='email'],
        input[type='tel'],
        textarea {
          width: 100%;
          font-family: inherit;
          font-size: 1rem;
          color: var(--ink);
          background: var(--cream);
          border: 1.5px solid var(--line);
          border-radius: 13px;
          padding: 12px 14px;
          transition: 0.16s;
        }

        input::placeholder,
        textarea::placeholder {
          color: #A8A29E;
          opacity: 1;
        }

        input:focus,
        textarea:focus {
          outline: 0;
          border-color: var(--sage);
        }

        textarea {
          resize: vertical;
          min-height: 74px;
        }

        .submit {
          appearance: none;
          border: 0;
          cursor: pointer;
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--cream);
          background: var(--terra);
          width: 100%;
          padding: 16px;
          border-radius: 15px;
          transition: 0.18s;
          box-shadow: 0 10px 22px -12px var(--terra);
        }

        .submit:hover {
          background: #b5582f;
        }

        .submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .thanks {
          text-align: center;
          padding: 30px 10px;
        }

        .thanks .mark {
          font-size: 2.6rem;
        }

        .thanks h2 {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-size: 1.7rem;
          margin: 8px 0 6px;
        }

        .note {
          font-size: 0.8rem;
          color: var(--ink-soft);
          margin-top: 14px;
          line-height: 1.45;
        }

        .form-error {
          background: rgba(200, 100, 63, 0.12);
          border: 1px solid var(--terra);
          color: var(--terra);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.9rem;
          margin-bottom: 16px;
        }

        @media (max-width: 480px) {
          h1 {
            font-size: 2rem;
          }

          .wrap {
            padding: 22px 15px 70px;
          }
        }
      `}</style>

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 border-b border-[#D8CEBC]/70 bg-[#F6F1EA] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs tracking-wider uppercase text-stone-600 hover:text-stone-900 font-medium transition-colors inline-flex items-center gap-1.5"
          >
            &larr; Back to Home
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="text-xs tracking-wider uppercase text-stone-600 hover:text-stone-900 font-medium transition-colors hidden sm:inline-block"
            >
              Member Dashboard &rarr;
            </Link>
            <UserNavButton suppressModal={isConfirmationActive} />
          </div>
        </div>
      </header>

      <div className="wrap" style={{ minHeight: '850px', opacity: mounted ? 1 : 0, transition: 'opacity 0.15s ease-in-out' }}>
        <header className="top" style={{ minHeight: '180px' }}>
          <Link href="/" className="eyebrow" style={{ minHeight: '1.2rem' }}>
            <BrandName />
          </Link>
          <h1 style={{ minHeight: '3.2rem' }}>
            Let&apos;s find the <em>right time</em> to gather in {cityName}.
          </h1>
          <p className="sub">
            A rotating community series — yoga, mimosas, and good company in {cityName}. Tell us what activities you'd attend and when you're free. Takes about a minute.
          </p>
          <p className="sub" style={{ marginTop: '8px' }}>
            {isChicago ? (
              <>
                <strong style={{ color: 'var(--sage-deep)' }}>A portion of every ticket</strong> supports the Institute of Cultural Affairs (ICA), a local Chicago nonprofit working on community building and a more sustainable city.
              </>
            ) : (
              <>
                <strong style={{ color: 'var(--sage-deep)' }}>A portion of every ticket</strong> supports local community building and sustainability efforts.
              </>
            )}
          </p>
        </header>

        {submitted ? (
          <ConfirmationCard
            name={name}
            email={email}
            cityName={cityName}
            selectedGatherings={selectedGatherings}
            customGathering={customGathering}
            selectedDates={Array.from(new Set([...selectedDates, ...availableDates]))}
            customDate={customDate}
            selectedTimes={selectedTimes}
            customTime={customTime}
            selectedGuests={selectedGuests}
            responseId={responseId}
            onReset={() => {
              if (typeof window !== 'undefined' && window.location.search.includes('view=confirmation')) {
                window.history.replaceState(null, '', window.location.pathname);
              }
              setSubmitted(false);
              setResponseId('');
              setSelectedGatherings([]);
              setCustomGathering('');
              setSelectedDates([]);
              setAvailableDates([]);
              setSelectedTimes([]);
              setSelectedDayPref('Either works');
              setSelectedGuests('');
              setCustomDate('');
              setCustomTime('');
              setNotes('');
              setQuarterlyReminder(true);
              setSlotStatusMap({});
              setCalendarConnected(null);
              setCalendarScanMessage(null);
              setShowPostRsvpModal(false);
              setSubmittedEmail('');
            }}
          />
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Visually hidden honeypot input field named website_url */}
            <div style={{ display: 'none', visibility: 'hidden' }} aria-hidden="true">
              <label htmlFor="website_url">Website URL</label>
              <input
                id="website_url"
                type="text"
                name="website_url"
                tabIndex={-1}
                autoComplete="off"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>

            <div className="card">
              {/* Step 1: Dates */}
              <div className="q">
                {/* Question Header */}
                <div className="mb-4">
                  <div className="q-label">Which dates could you make?</div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#FBF0EA] border border-[#F0D5C7] text-[#A64F2E] font-medium text-[11px] tracking-wide uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C8643F]" />
                      <span>Fast Pass · Set it & forget it</span>
                    </div>
                    <span className="text-[11px] font-serif italic text-stone-500">
                      Free/busy only · 100% private
                    </span>
                  </div>
                </div>

                {/* Inline Auto-Detect Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-xl bg-[#F7F3EB] border border-[#E5DDD0] mb-5 w-full">
                  {/* Google Calendar Action */}
                  <button
                    type="button"
                    onClick={handleConnectGoogleCalendar}
                    disabled={isSyncingCalendar}
                    className="w-full flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-[#2B271F] hover:bg-[#3D372E] text-[#FAF8F5] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSyncingCalendar && calendarConnected === 'google' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E3D8C8]" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5 text-[#E3D8C8]" strokeWidth={1.75} />
                    )}
                    <span>Google Calendar</span>
                  </button>

                  {/* .ics Upload Action */}
                  <button
                    type="button"
                    onClick={handleTriggerIcsUpload}
                    disabled={isSyncingCalendar}
                    className="w-full flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-white hover:bg-stone-50 border border-[#D9CFC1] text-[#3B3228] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSyncingCalendar && calendarConnected === 'ics' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.75} />
                    )}
                    <span>Upload .ics</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  style={{ display: 'none' }}
                  onChange={handleIcsUpload}
                />

                {calendarScanMessage && (
                  <div className="mb-5 flex items-center justify-between gap-2 p-3 rounded-xl bg-[#EAF0E6] border border-[#C5D8BF] text-[#2D5A30] text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#3B5730] shrink-0" strokeWidth={1.8} />
                      <span>{calendarScanMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSlotStatusMap({});
                        setCalendarConnected(null);
                        setCalendarScanMessage(null);
                      }}
                      className="text-[11px] text-[#55694F] hover:text-[#2D5A30] underline cursor-pointer bg-transparent border-none"
                    >
                      Reset
                    </button>
                  </div>
                )}

                {/* Subtle Divider */}
                <div className="relative flex items-center justify-center mb-5">
                  <div className="w-full border-t border-[#E8DFD1]" />
                  <span className="absolute bg-[#FBF7EE] px-3 font-mono text-[10px] uppercase tracking-wider text-stone-600">
                    Or select manually
                  </span>
                </div>

                {/* Visual Multi-Month Community Calendar Grid */}
                {(() => {
                  const curConfig = SURVEY_MONTH_CONFIGS[calendarMonth];
                  const currentMonthIndex = AVAILABLE_CALENDAR_MONTHS.indexOf(calendarMonth);
                  const handlePrevMonth = () => {
                    if (currentMonthIndex > 0) {
                      setCalendarMonth(AVAILABLE_CALENDAR_MONTHS[currentMonthIndex - 1]);
                    }
                  };
                  const handleNextMonth = () => {
                    if (currentMonthIndex < AVAILABLE_CALENDAR_MONTHS.length - 1) {
                      setCalendarMonth(AVAILABLE_CALENDAR_MONTHS[currentMonthIndex + 1]);
                    }
                  };
                  const trailingEmptySlots = (7 - ((curConfig.startDayOfWeek + curConfig.daysInMonth) % 7)) % 7;

                  return (
                    <div className="bg-[#FAF7F2] border border-[#D8CEBC] rounded-xl sm:rounded-2xl p-2 sm:p-4 mb-4 w-full max-w-full overflow-hidden">
                      {/* Month Switcher Header: compact pager on mobile (< sm), segmented tabs on desktop (>= sm) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-[#D8CEBC]/60">
                        <div className="flex items-center justify-between w-full sm:w-auto">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C8643F] block">
                              COMMUNITY CALENDAR
                            </span>
                            <h3 className="text-sm sm:text-base font-bold font-serif-fraunces text-[#2B271F] m-0">
                              {curConfig.name} Gathering Lineup
                            </h3>
                          </div>
                        </div>

                        {/* Mobile Month Pager (< sm) */}
                        <div className="flex sm:hidden items-center justify-between w-full p-1 bg-[#EDE4D3]/70 rounded-xl text-xs font-semibold text-[#6A6253]">
                          <button
                            type="button"
                            data-testid="month-prev"
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
                            {curConfig.headerLabel}
                          </span>
                          <button
                            type="button"
                            data-testid="month-next"
                            aria-label="Next month"
                            disabled={currentMonthIndex === AVAILABLE_CALENDAR_MONTHS.length - 1}
                            onClick={handleNextMonth}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                              currentMonthIndex === AVAILABLE_CALENDAR_MONTHS.length - 1
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:text-[#2B271F] hover:bg-white/60 active:bg-white"
                            }`}
                          >
                            <span className="text-[11px] font-medium">Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Desktop Month Switcher Buttons (>= sm) */}
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
                          {AVAILABLE_CALENDAR_MONTHS.map((mKey) => {
                            const mConf = SURVEY_MONTH_CONFIGS[mKey];
                            const isCur = calendarMonth === mKey;
                            return (
                              <button
                                key={mKey}
                                type="button"
                                aria-label={`Select ${mConf.name}`}
                                onClick={() => setCalendarMonth(mKey)}
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
                            disabled={currentMonthIndex === AVAILABLE_CALENDAR_MONTHS.length - 1}
                            onClick={handleNextMonth}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              currentMonthIndex === AVAILABLE_CALENDAR_MONTHS.length - 1
                                ? "opacity-30 cursor-not-allowed"
                                : "hover:text-[#2B271F] hover:bg-white/60"
                            }`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Day of Week Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[9px] sm:text-[11px] font-bold text-[#8C8270] uppercase tracking-wider mb-1 w-full">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => (
                          <div
                            key={dayName}
                            className={`py-1 ${idx === 0 || idx === 6 ? "text-[#C8643F]" : ""}`}
                          >
                            {dayName}
                          </div>
                        ))}
                      </div>

                      {/* Calendar 7-Column Days Grid */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full">
                        {/* Leading empty cells */}
                        {Array.from({ length: curConfig.startDayOfWeek }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="min-h-[40px] sm:min-h-[58px] rounded-xl bg-[#F4EEE2]/40 border border-dashed border-[#D8CEBC]/30 opacity-40"
                          />
                        ))}

                        {/* Days 1 through daysInMonth */}
                        {Array.from({ length: curConfig.daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                          const eventsForDay = getEventsForMonthAndDay(calendarMonth, dayNum, rawCity);
                          const hasEvents = eventsForDay.length > 0;
                          const isWeekend = (curConfig.startDayOfWeek + dayNum - 1) % 7 === 0 || (curConfig.startDayOfWeek + dayNum - 1) % 7 === 6;
                          const openDateKey = `${curConfig.monthShort} ${dayNum}, 2026`;
                          const isPollDay = isChicago && ((calendarMonth === "2026-10" && dayNum === 4) || (calendarMonth === "2026-11" && dayNum === 14));
                          const pollTitle = isPollDay
                            ? calendarMonth === "2026-10"
                              ? "Vote on Next Gathering: Lincoln Square Pottery Studio vs. GnarWare Workshop (Oct 4 option)"
                              : "Vote on Next Gathering: Lincoln Square Pottery Studio vs. GnarWare Workshop (Nov 14 option)"
                            : undefined;

                          const isDateMarkedAvailable = availableDates.includes(openDateKey);
                          const isEventAttending = hasEvents && eventsForDay.some((ev) => isEventSelected(ev, selectedDates));
                          const isDaySelected = isDateMarkedAvailable || isEventAttending;

                          return (
                            <div
                              key={`day-${dayNum}`}
                              role="button"
                              tabIndex={0}
                              title={isPollDay ? pollTitle : undefined}
                              onClick={() => {
                                if (isPollDay) {
                                  setIsPotteryModalOpen(true);
                                  return;
                                }
                                if (hasEvents) {
                                  setActiveEventModalEvents(eventsForDay);
                                  setActiveModalEventIndex(0);
                                  return;
                                }
                                handleDateToggle(openDateKey);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  if (isPollDay) {
                                    setIsPotteryModalOpen(true);
                                    return;
                                  }
                                  if (hasEvents) {
                                    setActiveEventModalEvents(eventsForDay);
                                    setActiveModalEventIndex(0);
                                    return;
                                  }
                                  handleDateToggle(openDateKey);
                                }
                              }}
                              className={`min-h-[40px] sm:min-h-[58px] p-0.5 sm:p-1.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer select-none overflow-hidden group/cell ${
                                isDateMarkedAvailable
                                  ? "bg-[#C8643F] text-white border-[#C8643F] shadow-md ring-2 ring-[#C8643F]/30"
                                  : isEventAttending
                                  ? "bg-white border-[#C8643F] shadow-sm ring-2 ring-[#C8643F]/25"
                                  : isPollDay
                                  ? "bg-white border-[#C8643F] shadow-xs hover:border-[#C8643F] hover:shadow-sm"
                                  : hasEvents
                                  ? "bg-white border-[#C8643F]/60 shadow-xs hover:border-[#C8643F] hover:shadow-sm"
                                  : isWeekend
                                  ? "bg-[#FBF7EE] border-[#D8CEBC]/60 text-stone-600 hover:bg-white"
                                  : "bg-[#FAF7F2] border-[#D8CEBC]/40 text-stone-500 hover:bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full leading-none">
                                <span
                                  className={`text-[10px] sm:text-xs font-bold inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full ${
                                    isDateMarkedAvailable
                                      ? "bg-white text-[#C8643F]"
                                      : isEventAttending
                                      ? "bg-[#2B271F] text-white"
                                      : (hasEvents || isPollDay)
                                      ? "bg-[#2B271F] text-white"
                                      : "text-inherit"
                                  }`}
                                >
                                  {dayNum}
                                </span>
                                {isDaySelected && (
                                  <Check className={`w-3 h-3 shrink-0 sm:block hidden ${isDateMarkedAvailable ? "text-white" : "text-[#C8643F]"}`} />
                                )}
                              </div>

                              {/* Event Badge / Label for Gatherings */}
                              {hasEvents && (
                                <div className="mt-0.5 sm:mt-1 space-y-0.5 min-w-0">
                                  {eventsForDay.map((ev) => {
                                    const isEvSelected = isEventSelected(ev, selectedDates);
                                    const sTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
                                    const chipText = ev.chipLabel || sTitle;
                                    const evTooltip = `${chipText} • ${ev.timeWindow || ""} • ${ev.venueName || ""}`;
                                    const audIcon = getAudienceIcon(ev.audience, ev.audienceLabel);

                                    return (
                                      <span
                                        key={ev.id}
                                        role="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveEventModalEvents(eventsForDay);
                                          const idx = eventsForDay.findIndex((item) => item.id === ev.id);
                                          setActiveModalEventIndex(idx >= 0 ? idx : 0);
                                        }}
                                        className={`flex items-center gap-0.5 text-[8px] sm:text-[9.5px] font-bold rounded px-0.5 sm:px-1 py-0.5 leading-tight transition-all cursor-pointer min-w-0 ${
                                          isEvSelected
                                            ? isDateMarkedAvailable
                                              ? "bg-white text-[#C8643F] shadow-xs"
                                              : "bg-[#C8643F] text-white shadow-xs"
                                            : isDateMarkedAvailable
                                            ? "bg-white/25 text-white hover:bg-white/40"
                                            : "bg-[#FBE8DF] text-[#A63A24] hover:bg-[#F5C2BA]"
                                        }`}
                                        title={evTooltip}
                                      >
                                        {isEvSelected && <span className="shrink-0 text-[8px] leading-none">✓</span>}
                                        {audIcon && (
                                          <span className="shrink-0 text-[7px] sm:text-[8.5px] leading-none" aria-hidden="true">
                                            {audIcon}
                                          </span>
                                        )}
                                        <span className="truncate min-w-0">{chipText}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Neutral Community Poll Badge on Oct 4 & Nov 14 */}
                              {isPollDay && (
                                <div className="mt-0.5 sm:mt-1 min-w-0 relative group/poll" title={pollTitle}>
                                  <span
                                    className={`text-[9px] sm:text-[11px] font-bold rounded-md py-0.5 px-0.5 sm:px-1 inline-flex items-center justify-center gap-0.5 sm:gap-1 truncate whitespace-nowrap leading-tight w-full transition-colors ${
                                      isDateMarkedAvailable
                                        ? "text-white bg-white/20 border border-dashed border-white/60 hover:bg-white/30"
                                        : "text-[#C8643F] bg-[#C8643F]/10 border border-dashed border-[#C8643F]/60 hover:bg-[#C8643F]/20"
                                    }`}
                                    title={pollTitle}
                                  >
                                    🗳️ Vote
                                  </span>

                                  {/* Hover Popover Card */}
                                  <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-48 sm:w-56 p-2.5 bg-[#2B271F] text-white rounded-xl shadow-xl z-50 pointer-events-none opacity-0 group-hover/poll:opacity-100 transition-opacity duration-150 text-left hidden sm:block">
                                    <div className="text-[9px] font-bold text-[#E07A5F] tracking-widest uppercase mb-0.5">
                                      COMMUNITY POLL
                                    </div>
                                    <div className="text-xs font-bold font-serif-fraunces text-white leading-snug">
                                      {calendarMonth === "2026-10" ? "Lincoln Square Pottery Studio (Oct 4)" : "GnarWare Workshop (Nov 14)"}
                                    </div>
                                    <div className="text-[10px] text-[#EDE4D3] mt-1 flex items-center gap-1">
                                      <span>Click to cast your vote</span>
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#2B271F]" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Trailing empty cells */}
                        {Array.from({ length: trailingEmptySlots }).map((_, idx) => (
                          <div
                            key={`empty-trail-${idx}`}
                            className="min-h-[42px] sm:min-h-[58px] rounded-xl bg-[#F4EEE2]/40 border border-dashed border-[#D8CEBC]/30 opacity-40"
                          />
                        ))}
                      </div>

                      {/* Flexible Quick Toggles (Dynamic Weekends / Down for Whatever) */}
                      <div className="mt-3 pt-2.5 border-t border-[#D8CEBC]/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#8C8270] uppercase tracking-wider mr-1">
                            Flexible:
                          </span>
                          {(() => {
                            const activeMonthName = SURVEY_MONTH_CONFIGS[calendarMonth]?.name.split(' ')[0] || 'October';
                            const activeWeekendDates = getWeekendDatesForMonth(calendarMonth);
                            const areAllWeekendsSelected =
                              activeWeekendDates.length > 0 &&
                              activeWeekendDates.every((d) => availableDates.includes(d));

                            const handleToggleAllWeekends = () => {
                              if (areAllWeekendsSelected) {
                                setAvailableDates((prev) =>
                                  prev.filter((d) => !activeWeekendDates.includes(d))
                                );
                              } else {
                                setAvailableDates((prev) =>
                                  Array.from(new Set([...prev, ...activeWeekendDates]))
                                );
                              }
                            };

                            const weekendBtnLabel = `Select All ${activeMonthName} Weekends`;
                            const isDownForWhateverSelected = selectedDates.includes("Down for Whatever");

                            return (
                              <>
                                <button
                                  type="button"
                                  data-testid="toggle-all-weekends"
                                  onClick={handleToggleAllWeekends}
                                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                    areAllWeekendsSelected
                                      ? "bg-[#C8643F] text-white border-[#C8643F] shadow-xs"
                                      : "bg-white/80 hover:bg-white text-[#2B271F] border-[#D9D2C7] hover:border-[#C8643F]/50"
                                  }`}
                                >
                                  {areAllWeekendsSelected ? `✓ ${weekendBtnLabel}` : weekendBtnLabel}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleChip(selectedDates, setSelectedDates, "Down for Whatever")}
                                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                    isDownForWhateverSelected
                                      ? "bg-[#C8643F] text-white border-[#C8643F] shadow-xs"
                                      : "bg-white/80 hover:bg-white text-[#2B271F] border-[#D9D2C7] hover:border-[#C8643F]/50"
                                  }`}
                                >
                                  {isDownForWhateverSelected ? "✓ Down for Whatever" : "Down for Whatever"}
                                </button>
                              </>
                            );
                          })()}
                        </div>

                        {(() => {
                          const totalChoicesCount = availableDates.length + selectedDates.length;
                          if (totalChoicesCount === 0) return null;
                          return (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[#3D5634] font-semibold text-[11px] bg-[#EEF5EB] px-2 py-0.5 rounded-md border border-[#C5DEC0]">
                                {totalChoicesCount} choice{totalChoicesCount === 1 ? '' : 's'} selected
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAvailableDates([]);
                                  setSelectedDates([]);
                                }}
                                className="text-[11px] text-[#8C8270] hover:text-[#A63A24] underline cursor-pointer bg-transparent border-none"
                              >
                                Clear
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}

                {/* Community Poll Banner Strip below Calendar (Chicago only - Oct & Nov) */}
                {isChicago && (calendarMonth === "2026-10" || calendarMonth === "2026-11") && (
                  <div className="mb-4 p-4 sm:p-5 bg-[#FAF7F2] border border-dashed border-[#C8643F] rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EDE4D3] flex items-center justify-center shrink-0 shadow-inner text-xl">
                        🗳️
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#C8643F] bg-[#FBE8DF] px-2.5 py-0.5 rounded-full">
                            {calendarMonth === "2026-10" ? "Sun, Oct 4 (Lincoln Square)" : "Sat, Nov 14 (GnarWare Pilsen)"}
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

              {/* Step 2: Alternative Vibes & Suggestions */}
              <div className="q">
                <div className="q-label">Not interested in the above? Or open to more?</div>
                <p className="text-xs text-[#6A6253] mt-1 mb-3">
                  Suggest an idea or pick alternative vibes you&apos;d like to do.
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {GATHERINGS.map((g) => {
                    const isSelected = selectedGatherings.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleChip(selectedGatherings, setSelectedGatherings, g)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#C8643F] text-white border-[#C8643F]"
                            : "bg-white/80 border-[#D9D2C7] text-[#2B271F] hover:bg-white hover:border-[#C8643F]/50"
                        }`}
                      >
                        {isSelected ? `✓ ${g}` : g}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Have another idea or suggestion? (e.g., Board game night, rooftop picnic)…"
                  value={customGathering}
                  onChange={(e) => setCustomGathering(e.target.value)}
                  className="w-full text-sm text-[#2B271F] placeholder-[#A8A29E] !bg-white/70 focus:!bg-white !border-[#D9D2C7] focus:!border-[#C8643F] rounded-xl px-3.5 py-2.5 outline-hidden transition-all shadow-2xs"
                />
              </div>

              <div className="q">
                <div className="q-label">Best time of day?</div>
                <div className="chips">
                  {TIMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`chip ${selectedTimes.includes(t) ? 'on' : ''}`}
                      onClick={() => toggleChip(selectedTimes, setSelectedTimes, t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="q">
                <div className="q-label">
                  How many would you bring? <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(incl. you)</span>
                </div>
                <div className="chips">
                  {GUESTS.map((gst) => (
                    <button
                      key={gst}
                      type="button"
                      className={`chip ${selectedGuests === gst ? 'on' : ''}`}
                      onClick={() => setSelectedGuests(selectedGuests === gst ? '' : gst)}
                    >
                      {gst}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              {formError && <div className="form-error">{formError}</div>}

              <div className="q">
                <div className="q-label">Your name *</div>
                <input
                  type="text"
                  placeholder="First name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="q">
                <div className="q-label">Email *</div>
                <div className="q-help">So I can send you the invite once a date is set.</div>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="q">
                <div className="q-label">
                  Phone number <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(Optional)</span>
                </div>
                <input
                  type="tel"
                  id="phoneNumber"
                  placeholder="(555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setPhoneNumber(formatted);
                    setPhoneError(null);
                    if (formatted.trim().length === 0) {
                      setSmsOptIn(false);
                    }
                  }}
                />

                {phoneError && (
                  <div style={{ color: 'var(--terra)', fontSize: '0.82rem', marginTop: '6px', fontWeight: 500 }}>
                    {phoneError}
                  </div>
                )}

                {/* Progressive Disclosure: Only render opt-in option if phone number is entered */}
                {phoneNumber.trim().length > 0 && (
                  <div className="pt-2 space-y-2" style={{ marginTop: '10px' }}>
                    <label htmlFor="smsOptIn" className="flex items-center space-x-2.5 cursor-pointer select-none" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ink)' }}>
                      <input
                        type="checkbox"
                        id="smsOptIn"
                        name="smsOptIn"
                        checked={smsOptIn}
                        onChange={(e) => {
                          setSmsOptIn(e.target.checked);
                          setPhoneError(null);
                        }}
                        className="h-4 w-4 rounded border-[#e5dcd0] text-[#c85a32] focus:ring-[#c85a32] cursor-pointer"
                        style={{ accentColor: '#c85a32', width: '16px', height: '16px', flexShrink: 0 }}
                      />
                      <span className="text-sm font-medium text-gray-800" style={{ fontWeight: 500 }}>
                        Send me SMS updates for this event
                      </span>
                    </label>

                    {/* Compliance Blurb: Expands dynamically when checked */}
                    {smsOptIn && (
                      <div className="mt-2 rounded-xl border border-[#e5dcd0] bg-[#fbf8f2] p-3.5 shadow-sm transition-all duration-200" style={{ marginTop: '8px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e5dcd0', backgroundColor: '#fbf8f2' }}>
                        <p className="text-xs text-gray-700 leading-relaxed" style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', lineHeight: '1.45', margin: 0 }}>
                          By checking this box, you agree to receive SMS event updates from <strong>Actually Let's</strong>. Message frequency varies. Message &amp; data rates may apply. Reply <strong>STOP</strong> to cancel or <strong>HELP</strong> for help. See our <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline' }}>Privacy Policy</a> and <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline' }}>Terms of Service</a>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="q">
                <div className="q-label">Anything else you'd love?</div>
                <textarea
                  placeholder="Optional — a cause, a vibe, a request…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm text-[#2B271F] placeholder-[#A8A29E] !bg-white/70 focus:!bg-white !border-[#D9D2C7] focus:!border-[#C8643F] rounded-xl px-3.5 py-2.5 outline-hidden transition-all"
                />
              </div>

              {/* Cloudflare Turnstile Bot Protection Widget (Invisible Background Verification) */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAEHoBDshELwy5QVR'}
                  options={{ size: 'invisible' }}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              </div>

              {/* 3-Month Quarterly Availability Reminder Checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#6A6253', cursor: 'pointer', marginBottom: '14px', textAlign: 'left', lineHeight: 1.4 }}>
                <input 
                  type="checkbox" 
                  checked={quarterlyReminder} 
                  onChange={(e) => setQuarterlyReminder(e.target.checked)} 
                  style={{ marginTop: '2px', accentColor: '#C8643F' }}
                />
                <span>Keep my availability active — remind me to update my schedule every 3 months.</span>
              </label>

              <button className="submit" type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send my answers'}
              </button>
              <p className="note">
                Your response is saved securely and shared with the organizer.
              </p>

              {/* A2P 10DLC Footer Legal & Compliance Links */}
              <div className="footer-legal" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--ink-soft)', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong><BrandName /></strong> &middot; {cityName === 'Chicago' ? 'Chicago, IL' : cityName === 'Austin' ? 'Austin, TX' : cityName} &middot;{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = 'mailto:admin@actuallylets.com';
                    }}
                    className="underline hover:text-stone-800 transition-colors bg-transparent border-0 p-0 inline cursor-pointer font-inherit"
                    style={{ color: 'var(--terra)', textDecoration: 'underline', fontSize: 'inherit', font: 'inherit' }}
                  >
                    rsvp@actuallylets.com
                  </button>
                </div>
                <div>
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline', marginRight: '10px' }}>
                    Privacy Policy
                  </a>
                  <span style={{ color: 'var(--line)' }}>&middot;</span>
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline', marginLeft: '10px' }}>
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Event Detail Modal (Single & Multi-Event) */}
      {activeEventModalEvents && activeEventModalEvents.length > 0 && (() => {
        const curEvent = activeEventModalEvents[activeModalEventIndex] || activeEventModalEvents[0];
        const sTitle = splitEventTitle(curEvent.title, curEvent.brandPrefix).eventName;
        const isAttending = isEventSelected(curEvent, selectedDates);

        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveEventModalEvents(null);
            }}
          >
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in">
              <button
                type="button"
                onClick={() => setActiveEventModalEvents(null)}
                className="absolute top-4 right-4 p-2 text-[#8C8270] hover:text-[#2B271F] transition-colors rounded-full hover:bg-[#EDE4D3]/50 cursor-pointer"
                aria-label="Close gathering details"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Multi-event tab switcher if more than 1 event exists on this day (e.g., Oct 17) */}
              {activeEventModalEvents.length > 1 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-[#8C8270] uppercase tracking-wider mb-2">
                    {activeEventModalEvents.length} Gatherings on this date
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-[#EDE4D3]/70 rounded-xl">
                    {activeEventModalEvents.map((ev, idx) => {
                      const isTabActive = idx === activeModalEventIndex;
                      const tabTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
                      const isTabAttending = isEventSelected(ev, selectedDates);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setActiveModalEventIndex(idx)}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 truncate cursor-pointer ${
                            isTabActive
                              ? "bg-[#2B271F] text-white shadow-xs"
                              : "text-[#6A6253] hover:text-[#2B271F] hover:bg-white/50"
                          }`}
                        >
                          <span className="truncate">{ev.chipLabel || tabTitle}</span>
                          {isTabAttending && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="You're attending" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Eyebrow & Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-[#C8643F] bg-[#FBE8DF] px-2.5 py-0.5 rounded-full">
                  {curEvent.displayDate}
                </span>
                <span className="text-[11px] font-semibold text-[#6A6253] bg-[#EDE4D3] px-2.5 py-0.5 rounded-full">
                  {curEvent.category.toUpperCase()}
                </span>
                {(curEvent.audienceLabel || curEvent.audience) && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EEF5EB] border border-[#C5DEC0] text-[#3D5634]">
                    {getAudienceBadge(curEvent.audience, curEvent.audienceLabel)}
                  </span>
                )}
              </div>

              <div className="text-[11px] font-bold uppercase tracking-widest text-[#C8643F] flex items-center mb-1">
                <BrandName />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-serif-fraunces text-[#2B271F] leading-tight mb-3">
                {sTitle}
              </h3>

              {/* Attendance Status Banner */}
              <div
                className={`p-3 rounded-2xl border mb-4 flex items-center justify-between text-xs font-semibold ${
                  isAttending
                    ? "bg-[#EEF5EB] border-[#C5DEC0] text-[#3D5634]"
                    : "bg-[#F5F1E8] border-[#D8CEBC] text-[#6A6253]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${isAttending ? "text-emerald-600" : "text-[#8C8270]"}`} />
                  <span>
                    {isAttending
                      ? "You're Attending — Marked in your survey availability"
                      : "Spots Open — Mark your attendance to join"}
                  </span>
                </div>
              </div>

              {/* Description */}
              {curEvent.description && (
                <p className="text-xs sm:text-sm text-[#6A6253] leading-relaxed mb-4">
                  {curEvent.description}
                </p>
              )}

              {/* Venue & Time Details */}
              <div className="bg-white border border-[#D8CEBC] rounded-2xl p-4 space-y-3 text-xs text-[#2B271F] mb-6">
                {curEvent.timeWindow && (
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#C8643F] shrink-0" />
                    <div>
                      <span className="text-[#8C8270] text-[11px] block">Time Window</span>
                      <span className="font-semibold">{curEvent.timeWindow}</span>
                    </div>
                  </div>
                )}

                {curEvent.venueName && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#4C5A40] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#8C8270] text-[11px] block">Venue &amp; Location</span>
                      <span className="font-semibold block">{curEvent.venueName}</span>
                      {curEvent.venueAddress && (
                        <span className="text-[11px] text-[#6A6253]">{curEvent.venueAddress}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleEventSelection(curEvent)}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isAttending
                      ? "bg-[#FDF2F0] hover:bg-[#F5C2BA] text-[#A63A24] border border-[#F5C2BA]"
                      : "bg-[#C8643F] hover:bg-[#b05230] text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {isAttending ? "✓ Attending (Click to Remove)" : "I'm Attending This Gathering →"}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveEventModalEvents(null)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold text-[#6A6253] hover:text-[#2B271F] bg-white border border-[#D8CEBC] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pottery Studio Face-Off Community Choice Ballot Modal */}
      <PotteryPollModal
        isOpen={isPotteryModalOpen}
        onClose={() => setIsPotteryModalOpen(false)}
        initialEmail={email}
        currentMonth={calendarMonth}
      />
    </>
  );
}
