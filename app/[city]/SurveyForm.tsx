'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { saveResponse, auth } from '@/lib/firebase';
import { formatPhoneNumber } from '@/lib/formatPhone';
import { Turnstile } from '@marsidev/react-turnstile';
import ConfirmationCard from '@/app/components/ConfirmationCard';
import PostRsvpAuthModal from '@/components/survey/PostRsvpAuthModal';
import {
  Calendar,
  Upload,
  ShieldCheck,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  parseIcsBusyIntervals,
  getCandidateSlotIntervals,
  getSurveyDateBounds,
  evaluateSlotConflicts,
  fetchGoogleFreeBusy,
} from '@/lib/smartCalendar';

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
const DRINKS = ["Mimosa", "Mocktail", "Both please"];

const DATES = [
  "Fri, Oct 9: Family Night — Pizza",
  "Sat, Oct 17: Morning Walk",
  "Any date",
];

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
  }, []);

  // Form state
  const [selectedGatherings, setSelectedGatherings] = useState<string[]>([]);
  const [customGathering, setCustomGathering] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedDayPref, setSelectedDayPref] = useState<string>('');
  const [selectedGuests, setSelectedGuests] = useState<string>('');
  const [selectedDrink, setSelectedDrink] = useState<string>('');

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

  const toggleChip = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
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

    if (selectedDates.length === 0 && !trimmedCustomDate) {
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
      // 1. Verify anti-spam, duplicate uniqueness, save to Firestore, and dispatch email/SMS via API
      const payload = {
        city: rawCity.toLowerCase(),
        cityName: cityName,
        name: trimmedName,
        email: trimmedEmail,
        phoneNumber: sanitizedPhone ? sanitizedPhone : null,
        smsOptIn: Boolean(hasSmsOptIn),
        quarterlyReminder: Boolean(quarterlyReminder),
        dates: Array.isArray(selectedDates) ? selectedDates : [],
        gatherings: Array.isArray(selectedGatherings) ? selectedGatherings : [],
        customGathering: trimmedCustomGathering || null,
        customDate: trimmedCustomDate || null,
        times: Array.isArray(selectedTimes) ? selectedTimes : [],
        customTime: customTime.trim() || null,
        dayPref: selectedDayPref || null,
        guests: selectedGuests || null,
        drink: selectedDrink || null,
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

      // Secure-first: Once the RSVP write to Firestore responses collection resolves,
      // activate the PostRsvpAuthModal if the user is not already logged in.
      if (!auth.currentUser) {
        setShowPostRsvpModal(true);
      }
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

      <div className="wrap" style={{ minHeight: '850px', opacity: mounted ? 1 : 0, transition: 'opacity 0.15s ease-in-out' }}>
        <header className="top" style={{ minHeight: '180px' }}>
          <Link href="/" className="eyebrow" style={{ minHeight: '1.2rem' }}>
            <span>Actually, Let&apos;s</span>
            <sup style={{ fontSize: '0.68em', fontWeight: 'bold' }}>TM</sup>
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
            selectedDates={selectedDates}
            customDate={customDate}
            selectedTimes={selectedTimes}
            customTime={customTime}
            selectedDrink={selectedDrink}
            selectedGuests={selectedGuests}
            responseId={responseId}
            onReset={() => {
              setSubmitted(false);
              setResponseId('');
              setSelectedGatherings([]);
              setCustomGathering('');
              setSelectedDates([]);
              setSelectedTimes([]);
              setSelectedDayPref('');
              setSelectedGuests('');
              setSelectedDrink('');
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
                  <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#2B271F] tracking-tight mb-1">
                    Which dates could you make?
                  </h3>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FBF0EA] border border-[#F0D5C7] text-[#A64F2E] font-medium text-[11px] tracking-wide uppercase">
                      <span>✦</span>
                      <span>Fast Pass · Set it & forget it</span>
                    </div>
                    <span className="text-[11px] font-serif italic text-stone-500">
                      Free/busy only · 100% private
                    </span>
                  </div>
                </div>

                {/* Inline Auto-Detect Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 p-2 rounded-xl bg-[#F7F3EB] border border-[#E5DDD0] mb-5">
                  {/* Google Calendar Action */}
                  <button
                    type="button"
                    onClick={handleConnectGoogleCalendar}
                    disabled={isSyncingCalendar}
                    className="flex-1 flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-[#2B271F] hover:bg-[#3D372E] text-[#FAF8F5] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
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
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-white hover:bg-stone-50 border border-[#D9CFC1] text-[#3B3228] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
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

                <div className="chips">
                  {DATES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`chip date ${selectedDates.includes(d) ? 'on' : ''}`}
                      onClick={() => toggleChip(selectedDates, setSelectedDates, d)}
                    >
                      <span>{d}</span>
                      {calendarConnected && slotStatusMap[d] === 'free' && (
                        <span className="status-pill free">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Free</span>
                        </span>
                      )}
                      {calendarConnected && slotStatusMap[d] === 'busy' && (
                        <span className="status-pill busy">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Busy</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Gatherings */}
              <div className="q">
                <div className="q-label">Which gatherings would you attend?</div>
                <div className="chips">
                  {GATHERINGS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`chip ${selectedGatherings.includes(g) ? 'on' : ''}`}
                      onClick={() => toggleChip(selectedGatherings, setSelectedGatherings, g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Have another idea or suggestion? (e.g., Board game night, rooftop picnic)…"
                  style={{ marginTop: '11px' }}
                  value={customGathering}
                  onChange={(e) => setCustomGathering(e.target.value)}
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
                <input
                  type="text"
                  placeholder="Prefer a specific time? Type it here (e.g. 10:30am)…"
                  style={{ marginTop: '11px' }}
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                />
              </div>

              <div className="q">
                <div className="q-label">Weekday or weekend?</div>
                <div className="chips">
                  {DAYPREF.map((dp) => (
                    <button
                      key={dp}
                      type="button"
                      className={`chip ${selectedDayPref === dp ? 'on' : ''}`}
                      onClick={() => setSelectedDayPref(selectedDayPref === dp ? '' : dp)}
                    >
                      {dp}
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

              <div className="q">
                <div className="q-label">Mimosa or mocktail?</div>
                <div className="chips">
                  {DRINKS.map((drk) => (
                    <button
                      key={drk}
                      type="button"
                      className={`chip ${selectedDrink === drk ? 'on' : ''}`}
                      onClick={() => setSelectedDrink(selectedDrink === drk ? '' : drk)}
                    >
                      {drk}
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
                  <strong>Actually, Let&apos;s<sup style={{ fontSize: '0.6em', fontWeight: 'bold', marginLeft: '2px', verticalAlign: 'super' }}>TM</sup></strong> &middot; {cityName === 'Chicago' ? 'Chicago, IL' : cityName === 'Austin' ? 'Austin, TX' : cityName} &middot;{' '}
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

        {/* Post-RSVP Account Creation Interception Modal */}
        {showPostRsvpModal && (
          <PostRsvpAuthModal
            isOpen={showPostRsvpModal}
            email={submittedEmail || email}
            name={name}
            onDismissGuest={() => setShowPostRsvpModal(false)}
          />
        )}
      </div>
    </>
  );
}
