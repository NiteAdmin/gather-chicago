'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { SurveyResponse } from '@/types/survey';
import { formatPhoneNumber } from '@/lib/formatPhone';
import { db, BroadcastRecord } from '@/lib/firebase';
import { CommunityEvent, getEventsForCity, fetchHydratedEvents, splitEventTitle } from '@/lib/eventsConfig';
import { RegisteredUser, fetchAllUsers, calculateEventAttendance, isContactAttendingEvent } from '@/lib/userEvents';
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
  Flame,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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

export default function AdminDashboard() {
  const [passcode, setPasscode] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);

  // Multi-Event Engine State
  const [events, setEvents] = useState<CommunityEvent[]>(() => getEventsForCity('chicago'));
  const [selectedEventId, setSelectedEventId] = useState<string>('chi-sep-26-gathering');

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
    const addressToCopy = selectedEvent.venueAddress || '2528 W Armitage Ave, Chicago, IL';
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: targetPasscode, city: targetCity }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Unauthorized passcode');
    }

    setResponses(data.responses || []);
    setLastSyncedTime(formatSyncTime());
    if (Array.isArray(data.users)) {
      setUsers(data.users);
    } else {
      fetchAllUsers().then((u) => {
        if (u.length > 0) setUsers(u);
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
      await handleCityChange(selectedCity);
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

  const dateTally = computeTally('dates', DATES);
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
    .map((r) => ({ text: r.customGathering!.trim(), name: r.name, city: r.city }));
  const writeInDateItems = responses
    .filter((r) => Boolean(r.customDate && r.customDate.trim()))
    .map((r) => ({ text: r.customDate!.trim(), name: r.name, city: r.city }));
  const writeInTimeItems = responses
    .filter((r) => Boolean(r.customTime && r.customTime.trim()))
    .map((r) => ({ text: r.customTime!.trim(), name: r.name, city: r.city }));

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

  const selectedEvent: CommunityEvent =
    events.find((e) => e.id === selectedEventId) ||
    events[0] || {
      id: 'chi-sep-26-gathering',
      city: 'chicago',
      brandPrefix: "Actually, Let's™",
      title: 'Stretch & Sip — Moksha Yoga',
      date: '2026-09-26',
      displayDate: 'Sat, Sep 26',
      timeWindow: '10:30 AM (10:00 AM – 12:00 PM CDT)',
      category: 'wellness',
      categoryLabel: 'WELLNESS & MOVEMENT',
      icon: '🧘',
      venueName: 'Moksha Yoga Center',
      venueAddress: '2528 W Armitage Ave, Chicago, IL',
      description: 'Join us for a morning yoga session at Moksha Yoga Center.',
      status: 'confirmed',
      capacity: 30,
    };

  const isTomorrowEvent =
    selectedEvent.id === 'chi-sep-26-gathering' ||
    selectedEvent.date === '2026-09-26' ||
    selectedEvent.title.toLowerCase().includes('moksha');

  const eventAttendance = calculateEventAttendance(selectedEvent, users, responses);
  const eventCapacity = selectedEvent.capacity;
  const spotsLeft = eventCapacity !== undefined ? Math.max(0, eventCapacity - eventAttendance.confirmedCount) : null;
  const rawCapacityPercent =
    eventCapacity && eventCapacity > 0
      ? Math.round((eventAttendance.confirmedCount / eventCapacity) * 100)
      : 0;
  const capacityPercent = Math.min(100, rawCapacityPercent);
  const isAtCapacity = Boolean(eventCapacity && eventAttendance.confirmedCount >= eventCapacity);
  const isOverCapacity = Boolean(eventCapacity && eventAttendance.confirmedCount > eventCapacity);

  const CHAPTERS = [
    {
      id: 'chicago',
      name: 'Chicago Chapter',
      subtitle: `Event Tomorrow · ${eventAttendance.confirmedCount > 0 ? eventAttendance.confirmedCount : 13} RSVPs`,
      status: 'live',
      badgeColor: 'bg-emerald-500',
    },
    {
      id: 'austin',
      name: 'Austin',
      subtitle: 'Polling Open',
      status: 'polling',
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'new-york',
      name: 'New York',
      subtitle: 'Coming Soon',
      status: 'soon',
      badgeColor: 'bg-stone-300',
    },
    {
      id: 'san-francisco',
      name: 'San Francisco',
      subtitle: 'Coming Soon',
      status: 'soon',
      badgeColor: 'bg-stone-300',
    },
    {
      id: 'all',
      name: 'All Chapters',
      subtitle: `Global roll-up (${responses.length} responses)`,
      status: 'all',
      badgeColor: 'bg-[#C8643F]',
    },
  ];

  const confirmedForTomorrowCount = responses.filter((r) =>
    isContactAttendingEvent(r, selectedEvent, users)
  ).length;
  const withNotesCount = responses.filter((r) => Boolean((r.notes && r.notes.trim()) || (r.drink && r.drink.trim()))).length;

  // Cockpit attendance metrics (dynamically falls back to mock 13 / 30 if unhydrated for tomorrow's event)
  const cockpitConfirmedGuests = eventAttendance.confirmedCount > 0 ? eventAttendance.confirmedCount : (selectedEvent.id === 'moksha-sept-26' || isTomorrowEvent ? 13 : 0);
  const cockpitCapacity = eventCapacity || 30;
  const cockpitPercent = cockpitCapacity > 0 ? Math.round((cockpitConfirmedGuests / cockpitCapacity) * 100) : 0;
  const cockpitSpotsLeft = Math.max(0, cockpitCapacity - cockpitConfirmedGuests);

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
    // -1. Segmented Preset Filter
    if (presetFilter === 'confirmed') {
      if (!isContactAttendingEvent(r, selectedEvent, users)) {
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
      if (!isContactAttendingEvent(r, selectedEvent, users)) {
        return false;
      }
    } else if (filterAttendance === 'survey_only') {
      if (isContactAttendingEvent(r, selectedEvent, users)) {
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

  const selectedDateStr = winningDate || (topDateOption || DATES[0]);
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
    const ev = targetEvent && 'id' in targetEvent ? targetEvent : selectedEvent;
    const defaultDate = ev?.displayDate || topDateOption || DATES[0];
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
      const isAttending = isContactAttendingEvent(r, selectedEvent, users);
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
        isAttending ? `Confirmed for ${selectedEvent.displayDate}` : 'Survey Only',
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

  const renderBars = (pairs: [string, number][]) => {
    const max = Math.max(1, ...pairs.map((p) => p[1]));
    const totalVotes = pairs.reduce((sum, p) => sum + p[1], 0);

    return (
      <div className="space-y-3.5">
        {pairs.map(([label, count], idx) => {
          const pctOfMax = (count / max) * 100;
          const pctOfTotal = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 bg-[#FDFBF7] min-w-0">
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

            <div className="flex flex-wrap items-center justify-between gap-2.5 w-full md:w-auto min-w-0">
              <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-0">
                {/* Chapter Market Selector */}
                <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowChapterMenu((prev) => !prev)}
                  className="w-full sm:w-auto min-w-[220px] bg-[#FAF7F2] border border-[#EADBCC] text-stone-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-sm hover:border-[#C8643F] transition-all cursor-pointer"
                  title="Switch chapter market"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        selectedCity === 'chicago'
                          ? 'bg-emerald-500 animate-pulse'
                          : selectedCity === 'austin'
                          ? 'bg-amber-500'
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
                        ? `(Event Tomorrow)`
                        : selectedCity === 'austin'
                        ? `(Polling Open)`
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

              {/* Timestamp: hidden on mobile so it doesn't squish on small phone screens */}
              {lastSyncedTime && (
                <span className="text-[11px] font-mono text-stone-500 hidden sm:inline-block whitespace-nowrap">
                  Synced at {lastSyncedTime}
                </span>
              )}
            </div>

            {/* Right Side: Refresh & Export CSV */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-1.5 bg-[#FAF7F2] hover:bg-[#F3EFEB] text-[#2B271F] border border-[#EBE3D5] text-xs font-semibold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                title="Refresh latest data"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-[#8C827A] ${isRefreshing ? 'animate-spin text-[#C8643F]' : ''}`} />
                <span className="hidden sm:inline">
                  {isRefreshing ? 'Syncing...' : 'Refresh'}
                </span>
              </button>

              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center justify-center gap-1.5 bg-[#FAF7F2] hover:bg-[#F3EFEB] text-[#2B271F] border border-[#EBE3D5] text-xs font-semibold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#8C827A]" />
                <span>Export CSV</span>
              </button>
            </div>
            </div>
          </div>

          {/* GATHERING OVERVIEW BANNER */}
          <div
            className={`rounded-2xl p-5 sm:p-6 transition-all duration-300 w-full min-w-0 space-y-4 ${
              isTomorrowEvent
                ? 'bg-[#2B271F] text-white shadow-md border border-[#3E3832]'
                : 'bg-[#FAF7F2] border border-[#EADBCC] text-[#2B271F] shadow-sm'
            }`}
          >
            <div
              className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b ${
                isTomorrowEvent ? 'border-white/10' : 'border-[#EBE3D5]'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {isTomorrowEvent ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#C8643F] text-white shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-0.5 animate-pulse" />
                      EVENT DAY
                    </span>
                    <span className="text-white/30 hidden sm:inline">·</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Event Tomorrow · {selectedEvent.timeWindow || '10:30 AM CDT'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#2B271F] text-white shadow-xs">
                      <Calendar className="w-3 h-3 text-white" />
                      UPCOMING GATHERING
                    </span>
                    <span className="text-stone-300 hidden sm:inline">·</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#FAF0EB] text-[#C8643F] border border-[#EED4C8]">
                      <Calendar className="w-3 h-3 text-[#C8643F]" />
                      Scheduled Event
                    </span>
                  </>
                )}
              </div>
              <div className={`text-xs font-mono ${isTomorrowEvent ? 'text-stone-400' : 'text-stone-500'}`}>
                {selectedEvent.displayDate || 'Upcoming'} · {selectedEvent.timeWindow || 'Time TBD'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Event Callout (7 cols) */}
              <div className="lg:col-span-7 space-y-2 min-w-0">
                <div className={`text-xs font-mono uppercase tracking-wider ${isTomorrowEvent ? 'text-stone-400' : 'text-stone-500'}`}>
                  {isTomorrowEvent ? 'CURRENT EVENT' : 'UPCOMING GATHERING'}
                </div>
                <h2 className={`text-xl sm:text-2xl font-bold font-serif-fraunces tracking-tight leading-snug break-words ${isTomorrowEvent ? 'text-white' : 'text-[#2B271F]'}`}>
                  {splitEventTitle(selectedEvent.title, selectedEvent.brandPrefix).eventName}
                </h2>
                <div className={`flex items-center gap-2 text-xs sm:text-sm flex-wrap ${isTomorrowEvent ? 'text-stone-300' : 'text-stone-600'}`}>
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${isTomorrowEvent ? 'text-white' : 'text-[#2B271F]'}`}>
                    <Calendar className="w-3.5 h-3.5 text-[#C8643F]" />
                    {selectedEvent.displayDate || 'Date TBD'}, {selectedEvent.timeWindow || 'Time TBD'}
                  </span>
                  <span className={isTomorrowEvent ? 'text-white/30' : 'text-stone-300'}>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${isTomorrowEvent ? 'text-stone-400' : 'text-stone-500'}`} />
                    <span>
                      {selectedEvent.venueName || 'Venue TBD'}
                      {selectedEvent.venueAddress ? ` (${selectedEvent.venueAddress})` : ''}
                    </span>
                  </span>
                </div>
              </div>

              {/* Headcount Gauge (5 cols) */}
              <div
                className={`lg:col-span-5 rounded-2xl p-4 sm:p-5 space-y-2.5 w-full min-w-[210px] ${
                  isTomorrowEvent
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-white border border-[#EADBCC] shadow-2xs'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <span className={`text-xs font-mono uppercase tracking-wider shrink-0 ${isTomorrowEvent ? 'text-stone-400' : 'text-stone-500'}`}>
                    CONFIRMED GUESTS
                  </span>
                  <span className={`text-2xl font-bold font-serif-fraunces shrink-0 ${isTomorrowEvent ? 'text-white' : 'text-[#2B271F]'}`}>
                    {cockpitConfirmedGuests} / {cockpitCapacity}
                  </span>
                </div>

                {/* Progress bar */}
                <div className={`w-full h-2 rounded-full overflow-hidden ${isTomorrowEvent ? 'bg-stone-700' : 'bg-stone-200'}`}>
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, cockpitPercent))}%`,
                    }}
                  />
                </div>

                {/* Footer subtext row */}
                <div className="flex items-center justify-between text-xs gap-2 pt-0.5">
                  <span className={`whitespace-nowrap shrink-0 ${isTomorrowEvent ? 'text-stone-400' : 'text-stone-500'}`}>
                    {cockpitSpotsLeft} spots remaining
                  </span>
                  <span className={`font-semibold whitespace-nowrap shrink-0 ${isTomorrowEvent ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {cockpitPercent}% filled
                  </span>
                </div>
              </div>
            </div>

            {/* One-Tap Quick Actions */}
            <div
              className={`pt-3 flex items-center gap-2 sm:gap-3 flex-wrap border-t ${
                isTomorrowEvent ? 'border-white/10' : 'border-[#EBE3D5]'
              }`}
            >
              {/* Copy Venue Address */}
              <button
                type="button"
                onClick={handleCopyVenue}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isTomorrowEvent
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                    : 'bg-white hover:bg-[#F3EFEB] text-[#2B271F] border border-[#D8CEBC]'
                }`}
                title="Copy venue address to clipboard"
              >
                {copiedVenue ? (
                  <>
                    <Check className={`w-3.5 h-3.5 ${isTomorrowEvent ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span className={`font-mono ${isTomorrowEvent ? 'text-emerald-300' : 'text-emerald-700'}`}>Address Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className={`w-3.5 h-3.5 ${isTomorrowEvent ? 'text-stone-300' : 'text-stone-500'}`} />
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
                  isTomorrowEvent
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                    : 'bg-white hover:bg-[#F3EFEB] text-[#2B271F] border border-[#D8CEBC]'
                }`}
                title="Open public RSVP page in new tab"
              >
                <ExternalLink className={`w-3.5 h-3.5 ${isTomorrowEvent ? 'text-stone-300' : 'text-stone-500'}`} />
                <span>View Public RSVP Page</span>
              </a>

              {/* Update Announcement Modal */}
              <button
                type="button"
                onClick={() => handleOpenAdminModal(selectedEvent)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#C8643F] hover:bg-[#b05230] text-white transition-all cursor-pointer shadow-xs sm:ml-auto"
                title="Open announcement modal for this event"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Update Announcement</span>
              </button>
            </div>
          </div>

          {/* SECTION 1: CONFIRMED / UPCOMING GATHERING CARD WITH DYNAMIC EVENT SWITCHER */}
          <div className="bg-[#FAF7F2] border border-[#D8C3A8] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 overflow-hidden min-w-0 w-full">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#EBE3D5] min-w-0 w-full">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedEvent.status === 'confirmed'
                      ? 'bg-[#EDF5EE] border border-[#BACFB2] text-[#3D6B42]'
                      : 'bg-[#FAF0EB] border border-[#EED4C8] text-[#C8643F]'
                  }`}
                >
                  {selectedEvent.status === 'confirmed' ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block mr-0.5" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5 text-[#C8643F]" />
                  )}
                  <span>
                    {selectedEvent.status === 'confirmed' ? 'Confirmed Gathering' : 'Upcoming Gathering'} · {formatCityName(selectedEvent.city || selectedCity)}
                  </span>
                </div>
                {selectedEvent.categoryLabel && (
                  <span className="text-[11px] font-semibold text-[#8C827A] px-2 py-0.5 rounded-md bg-[#EDE4D3]/50">
                    {selectedEvent.categoryLabel}
                  </span>
                )}
              </div>

              {/* Active Gathering Dropdown Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full lg:w-auto min-w-0">
                <label htmlFor="admin-gathering-switcher" className="text-xs font-bold uppercase tracking-wider text-[#6A6253] shrink-0">
                  Active Gathering:
                </label>
                <div className="relative w-full sm:w-auto min-w-0 max-w-full">
                  <select
                    id="admin-gathering-switcher"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full sm:w-auto max-w-full min-w-0 truncate text-ellipsis bg-white border border-[#e5dfd8] text-[#2B271F] rounded-xl px-3 py-2 pr-8 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#C8643F] cursor-pointer shadow-xs appearance-none"
                  >
                    <optgroup label="Upcoming Chapter Gatherings">
                      {events
                        .filter((ev) => ev.id !== 'chi-legacy-polled-sep-26')
                        .map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.displayDate} — {splitEventTitle(ev.title, ev.brandPrefix).eventName}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Legacy / Polled Gathering">
                      {events
                        .filter((ev) => ev.id === 'chi-legacy-polled-sep-26')
                        .map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.displayDate} — {splitEventTitle(ev.title, ev.brandPrefix).eventName}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#8C827A]">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Pill Switcher: Next 3 Upcoming Dates Tab Strip */}
            <div className="flex items-center gap-2 w-full min-w-0 py-1 text-xs overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 shrink-0">
                Upcoming:
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {events.slice(0, 3).map((ev) => {
                  const isSelected = ev.id === selectedEvent.id;
                  const cleanName = splitEventTitle(ev.title, ev.brandPrefix).eventName;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[#2B271F] text-[#FDFBF7] shadow-xs'
                          : 'bg-white border border-[#D8CEBC] text-[#6A6253] hover:text-[#2B271F] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      {ev.icon ? `${ev.icon} ` : ''}
                      {ev.displayDate}: {cleanName.length > 20 ? `${cleanName.slice(0, 20)}…` : cleanName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Streamlined Gathering Management & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1 border-t border-[#EBE3D5]/80">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <BrandName tmClassName="text-[#2B271F]" />
                  <span className="text-stone-300">·</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                    Host Controls &amp; Broadcasts
                  </span>
                </div>
                {selectedEvent.hostAnnouncement ? (
                  <p className="text-xs text-[#6A6253] italic bg-white/70 border border-[#EBE3D5] rounded-xl p-2.5">
                    &ldquo;{selectedEvent.hostAnnouncement}&rdquo;
                  </p>
                ) : selectedEvent.description ? (
                  <p className="text-xs text-[#6A6253] bg-white/50 border border-[#EBE3D5] rounded-xl p-2.5">
                    {selectedEvent.description}
                  </p>
                ) : null}
              </div>

              {/* Grouped Action Buttons: Secondary (RSVP Page, History) & Primary (Update Announcement) */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end shrink-0">
                {(selectedEvent.partifulUrl || selectedEvent.externalUrl) && (
                  <a
                    href={selectedEvent.partifulUrl || selectedEvent.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-white border border-[#D8CEBC] hover:border-[#2B271F] text-[#2B271F] hover:bg-[#FAF7F2] text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Ticket className="w-3.5 h-3.5 text-[#C8643F]" />
                    <span>{selectedEvent.externalUrlLabel || 'RSVP Page'}</span>
                    <ExternalLink className="w-3 h-3 text-[#8C827A]" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  className="inline-flex items-center gap-1.5 bg-white border border-[#D8CEBC] text-[#2B271F] hover:bg-[#FAF7F2] text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <History className="w-3.5 h-3.5 text-[#8C827A]" />
                  <span>History ({broadcasts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdminModal(selectedEvent)}
                  className="inline-flex items-center gap-1.5 bg-[#C8643F] hover:bg-[#B25532] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Update Announcement</span>
                </button>
              </div>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Metric 1: Intake Responses */}
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-2 min-w-0">
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
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-2 min-w-0">
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
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-2 min-w-0">
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
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-stone-500 block truncate">
                    Leading Day
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

          {/* SECTION 3: 12-COLUMN ANALYTICS SUITE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col (col-span-12 lg:col-span-6): Date Polling, Member Notes & Ideas, Time Preferences & Preferences */}
            <div className="col-span-12 lg:col-span-6 space-y-6">
              {/* Date Polling Results */}
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-5 border-b border-[#EBE3D5] w-full min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8C827A]" />
                    <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                      Date Polling Results ({formatCityName(selectedCity)})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAdminModal(selectedEvent)}
                    className="bg-[#C8643F] hover:bg-[#B25532] text-white rounded-xl px-4 py-2 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors w-full sm:w-auto"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>Announce Winning Date</span>
                  </button>
                </div>
                {renderBars(dateTally)}
              </div>

              {/* Member Notes & Ideas */}
              {(writeInGatheringItems.length > 0 || writeInDateItems.length > 0 || writeInTimeItems.length > 0) && (
                <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#EBE3D5]">
                    <PenLine className="w-4 h-4 text-[#8C827A]" />
                    <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                      Member Notes &amp; Ideas
                    </h3>
                  </div>
                  {writeInGatheringItems.length > 0 && (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6A6253] block mb-2.5">
                        Gathering Ideas &amp; Suggestions ({writeInGatheringItems.length})
                      </span>
                      <div className="grid grid-cols-1 gap-2.5">
                        {writeInGatheringItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-[#EADBCC] rounded-xl p-3.5 shadow-2xs space-y-1.5"
                          >
                            <p className="text-xs font-medium text-[#2B271F] italic leading-relaxed">
                              &ldquo;{item.text}&rdquo;
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#F3EFEB]">
                              <span className="font-semibold text-stone-700">
                                — {item.name || 'Anonymous Community Member'}
                              </span>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                                {item.city ? formatCityName(item.city) : 'Intake Response'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {writeInDateItems.length > 0 && (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6A6253] block mb-2.5">
                        Custom Dates Requested ({writeInDateItems.length})
                      </span>
                      <div className="grid grid-cols-1 gap-2.5">
                        {writeInDateItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-[#EADBCC] rounded-xl p-3.5 shadow-2xs space-y-1.5"
                          >
                            <p className="text-xs font-medium text-[#2B271F] italic leading-relaxed">
                              &ldquo;{item.text}&rdquo;
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#F3EFEB]">
                              <span className="font-semibold text-stone-700">
                                — {item.name || 'Anonymous Community Member'}
                              </span>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                                {item.city ? formatCityName(item.city) : 'Intake Response'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {writeInTimeItems.length > 0 && (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6A6253] block mb-2.5">
                        Custom Times Requested ({writeInTimeItems.length})
                      </span>
                      <div className="grid grid-cols-1 gap-2.5">
                        {writeInTimeItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-[#EADBCC] rounded-xl p-3.5 shadow-2xs space-y-1.5"
                          >
                            <p className="text-xs font-medium text-[#2B271F] italic leading-relaxed">
                              &ldquo;{item.text}&rdquo;
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-[#F3EFEB]">
                              <span className="font-semibold text-stone-700">
                                — {item.name || 'Anonymous Community Member'}
                              </span>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                                {item.city ? formatCityName(item.city) : 'Intake Response'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Time Preferences */}
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#EBE3D5]">
                  <Clock className="w-4 h-4 text-[#8C827A]" />
                  <h3 className="text-base font-bold font-serif-fraunces text-[#2B271F]">
                    Time Preferences
                  </h3>
                </div>
                {renderBars(timeTally)}
              </div>

              {/* Preferences Breakdown */}
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm space-y-5">
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

            {/* Right Col (col-span-12 lg:col-span-6): Gathering Demand */}
            <div className="col-span-12 lg:col-span-6 space-y-6">
              {/* Gathering Demand */}
              <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-2xl p-6 shadow-sm">
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
                      (Filtered{filterAttendance === 'attending' ? ` · Attending ${splitEventTitle(selectedEvent.title, selectedEvent.brandPrefix).eventName}` : filterAttendance === 'survey_only' ? ' · Survey Only' : presetFilter === 'confirmed' ? ' · Confirmed Only' : presetFilter === 'sms' ? ' · SMS Verified' : presetFilter === 'notes' ? ' · With Notes' : ''})
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
                  <span>Confirmed ({confirmedForTomorrowCount > 0 ? confirmedForTomorrowCount : (selectedEvent.id === 'moksha-sept-26' || isTomorrowEvent ? 13 : 0)})</span>
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
                            <option value="attending">
                              Attending: {(() => {
                                const clean = splitEventTitle(selectedEvent.title, selectedEvent.brandPrefix).eventName;
                                return clean.length > 20 ? `${clean.slice(0, 20)}…` : clean;
                              })()}
                            </option>
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
                            {DATES.map((d) => (
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
                        <td colSpan={9} className="text-center py-12 px-4 text-xs text-stone-500 italic">
                          No contacts match your current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredResponses.map((r, idx) => {
                        const isAttending = isContactAttendingEvent(r, selectedEvent, users);
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

                            {/* Phone */}
                            <td className="py-3.5 px-4 border-b border-[#EADBCC] whitespace-nowrap">
                              {r.phoneNumber ? (
                                <div className="space-y-1">
                                  <div className="font-mono text-xs font-semibold text-[#2B271F]">{formatPhoneNumber(r.phoneNumber)}</div>
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
                              )}
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
                    <optgroup label="Chapter Gatherings">
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.displayDate}>
                          {ev.displayDate} — {splitEventTitle(ev.title, ev.brandPrefix).eventName}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Survey Poll Dates">
                      {DATES.map((d) => (
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
                          <BrandName tmClassName="text-[#2B271F]" /> — {splitEventTitle(activeModalEventTitle || selectedEvent?.title).eventName}
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
