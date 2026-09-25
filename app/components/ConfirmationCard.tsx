'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandName } from '@/components/brand/BrandName';
import { Vote, Eye, EyeOff, Calendar } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import PotteryPollModal from '@/app/components/PotteryPollModal';
import { ALL_COMMUNITY_EVENTS, CommunityEvent, splitEventTitle } from '@/lib/eventsConfig';
import { buildGoogleCalendarUrl } from '@/lib/calendar';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

interface ConfirmationCardProps {
  name: string;
  email: string;
  cityName: string;
  selectedGatherings: string[];
  customGathering?: string;
  selectedDates: string[];
  availableDates?: string[];
  customDate?: string;
  selectedTimes: string[];
  customTime?: string;
  selectedDrink?: string | null;
  selectedGuests?: string;
  responseId?: string;
  onReset?: () => void;
}

export const AVAILABLE_VIBES = [
  "Board Games & Card Games",
  "Casual Conversations & Coffee",
  "Family Night & Pizza",
  "Wine Tasting & Socials",
  "Stand-Up Comedy & Entertainment",
  "Down for Whatever",
];

const OCTOBER_WEEKENDS = [
  "Oct 3, 2026", "Oct 4, 2026", "Oct 10, 2026", "Oct 11, 2026",
  "Oct 17, 2026", "Oct 18, 2026", "Oct 24, 2026", "Oct 25, 2026", "Oct 31, 2026"
];
const NOVEMBER_WEEKENDS = [
  "Nov 1, 2026", "Nov 7, 2026", "Nov 8, 2026", "Nov 14, 2026",
  "Nov 15, 2026", "Nov 21, 2026", "Nov 22, 2026", "Nov 28, 2026", "Nov 29, 2026"
];
const DECEMBER_WEEKENDS = [
  "Dec 5, 2026", "Dec 6, 2026", "Dec 12, 2026", "Dec 13, 2026",
  "Dec 19, 2026", "Dec 20, 2026", "Dec 26, 2026", "Dec 27, 2026"
];

function formatSurveyDateChip(d: string): string {
  if (!d) return '';
  let clean = d.trim();
  if (/all\s+october\s+weekends/i.test(clean)) return 'All October Weekends';
  if (/all\s+november\s+weekends/i.test(clean)) return 'All November Weekends';
  if (/all\s+december\s+weekends/i.test(clean)) return 'All December Weekends';
  if (/down\s+for\s+whatever/i.test(clean)) return 'Down for Whatever';
  clean = clean.replace(/,?\s*2026\b/g, '').trim();
  clean = clean.replace(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+/i, '');
  clean = clean.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+0(\d)\b/i, '$1 $2');
  return clean;
}

export function formatAvailabilityDatesList(dates: string[]): string[] {
  const result: string[] = [];
  const remaining = new Set(dates);

  // Check October Weekends
  if (OCTOBER_WEEKENDS.length > 0 && OCTOBER_WEEKENDS.every((d) => remaining.has(d))) {
    result.push("All October Weekends");
    OCTOBER_WEEKENDS.forEach((d) => remaining.delete(d));
  }

  // Check November Weekends
  if (NOVEMBER_WEEKENDS.length > 0 && NOVEMBER_WEEKENDS.every((d) => remaining.has(d))) {
    result.push("All November Weekends");
    NOVEMBER_WEEKENDS.forEach((d) => remaining.delete(d));
  }

  // Check December Weekends
  if (DECEMBER_WEEKENDS.length > 0 && DECEMBER_WEEKENDS.every((d) => remaining.has(d))) {
    result.push("All December Weekends");
    DECEMBER_WEEKENDS.forEach((d) => remaining.delete(d));
  }

  remaining.forEach((d) => {
    const formatted = formatSurveyDateChip(d);
    if (formatted && !result.includes(formatted)) {
      result.push(formatted);
    }
  });

  return result;
}

export default function ConfirmationCard({
  name,
  email,
  cityName,
  selectedGatherings,
  customGathering,
  selectedDates,
  availableDates = [],
  customDate,
  selectedTimes,
  customTime,
  selectedDrink,
  selectedGuests,
  responseId,
  onReset,
}: ConfirmationCardProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);

  // Community Vote State & Modal
  const [pollVote, setPollVote] = useState<{ studioName: string; dateText: string } | null>(null);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);

  // Available Open Dates & Vibes State & Inline Editor
  const initialCombinedDates = Array.from(
    new Set([...(selectedDates || []), ...(availableDates || [])])
  );
  const [currentDates, setCurrentDates] = useState<string[]>(initialCombinedDates);
  const [currentVibes, setCurrentVibes] = useState<string[]>(selectedGatherings || []);

  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [editableOpenDates, setEditableOpenDates] = useState<string[]>([]);
  const [editableVibes, setEditableVibes] = useState<string[]>(selectedGatherings || []);
  const [newOpenDateInput, setNewOpenDateInput] = useState('');
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    const combined = Array.from(
      new Set([...(selectedDates || []), ...(availableDates || [])])
    );
    setCurrentDates(combined);
  }, [selectedDates, availableDates]);

  useEffect(() => {
    setCurrentVibes(selectedGatherings || []);
  }, [selectedGatherings]);

  const loadVote = () => {
    try {
      const raw = localStorage.getItem('votedData_pottery-studio-faceoff');
      if (raw) {
        const parsed = JSON.parse(raw);
        const studioName =
          parsed.selectedStudio === 'lincoln-square'
            ? 'Lincoln Square Pottery Studio'
            : parsed.selectedStudio === 'gnarware'
            ? 'GnarWare Workshop (Pilsen)'
            : parsed.selectedStudio || 'Pottery Studio';
        const dateText =
          parsed.preferredDate ||
          (parsed.selectedStudio === 'lincoln-square' ? 'Sun, Oct 4' : 'Sat, Nov 14');
        setPollVote({ studioName, dateText });
      } else if (localStorage.getItem('hasVoted_pottery-studio-faceoff') === 'true') {
        setPollVote({ studioName: 'Lincoln Square Pottery Studio', dateText: 'Sun, Oct 4' });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadVote();
    window.addEventListener('pollVoteUpdated', loadVote);
    window.addEventListener('storage', loadVote);
    return () => {
      window.removeEventListener('pollVoteUpdated', loadVote);
      window.removeEventListener('storage', loadVote);
    };
  }, []);

interface AttendingGatheringItem {
  id: string;
  rawInput: string;
  title: string;
  displayLine: string;
  calendarUrl: string;
}

function getAttendingEventTitle(ev: CommunityEvent): string {
  if (ev.id === 'chi-2026-10-05-little-lark-pizza' || ev.id.includes('pizza-wine')) {
    return 'Little Lark Pizza & Wine';
  }
  if (ev.id === 'chi-2026-10-08-little-lark-pinsa' || ev.id.includes('pinsa-night')) {
    return 'Little Lark Pinsa Night';
  }
  if (ev.chipLabel && ev.chipLabel.length > 2) {
    return ev.chipLabel;
  }
  return splitEventTitle(ev.title, ev.brandPrefix).eventName;
}

function getAttendingEventDate(ev: CommunityEvent, inputString?: string): string {
  if (inputString) {
    const match = inputString.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i);
    if (match) return match[0];
  }
  if (ev.displayDate) {
    if (ev.displayDate.includes('&')) {
      return ev.displayDate.split('&')[0].trim();
    }
    if (ev.displayDate.includes('–')) {
      return ev.displayDate.split('–')[0].trim();
    }
    return ev.displayDate;
  }
  return '';
}

function getAttendingEventTime(ev: CommunityEvent): string {
  if (!ev.timeWindow) return '';
  const match = ev.timeWindow.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
  return match ? match[1].toUpperCase() : '';
}

  // Classify currentDates into Attending Gatherings and Open Dates
  const attendingGatherings: AttendingGatheringItem[] = [];
  const openDates: string[] = [];
  const preservedGatheringOriginalStrings: string[] = [];

  const allDateInputs = Array.from(
    new Set([...currentDates, ...(availableDates || []), customDate].filter(Boolean) as string[])
  );

  allDateInputs.forEach((d) => {
    const matchingEvent = ALL_COMMUNITY_EVENTS.find((ev) => {
      const cleanTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
      return (
        d === ev.displayDate ||
        d === ev.chipLabel ||
        d === cleanTitle ||
        d === `${ev.displayDate}: ${ev.chipLabel || cleanTitle}` ||
        d.includes(cleanTitle) ||
        (ev.chipLabel && d.includes(ev.chipLabel)) ||
        d.includes(ev.id) ||
        (ev.id.includes('pizza') && (d.includes('Pizza') || d.includes('pizza-wine') || d.includes('Little Lark'))) ||
        (ev.id.includes('pinsa') && (d.includes('Pinsa') || d.includes('pinsa-night')))
      );
    });

    if (matchingEvent) {
      if (!preservedGatheringOriginalStrings.includes(d)) {
        preservedGatheringOriginalStrings.push(d);
      }
      if (!attendingGatherings.some((item) => item.id === matchingEvent.id)) {
        const title = getAttendingEventTitle(matchingEvent);
        const dateStr = getAttendingEventDate(matchingEvent, d);
        const timeStr = getAttendingEventTime(matchingEvent);
        const metaPart = [dateStr, timeStr].filter(Boolean).join(' · ');
        const displayLine = metaPart ? `${title} — ${metaPart}` : title;
        const calendarUrl = buildGoogleCalendarUrl(matchingEvent, dateStr);

        attendingGatherings.push({
          id: matchingEvent.id,
          rawInput: d,
          title,
          displayLine,
          calendarUrl,
        });
      }
    } else {
      if (!openDates.includes(d)) {
        openDates.push(d);
      }
    }
  });

  // Sync editableOpenDates and editableVibes whenever openDates or currentVibes change, or editor opens
  useEffect(() => {
    if (!isEditingPreferences) {
      setEditableOpenDates(openDates);
      setEditableVibes(currentVibes);
    }
  }, [currentDates, currentVibes, isEditingPreferences]);

  const handleToggleVibe = (vibe: string) => {
    setEditableVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const handleAddOpenDate = () => {
    const trimmed = newOpenDateInput.trim();
    if (trimmed && !editableOpenDates.includes(trimmed)) {
      setEditableOpenDates((prev) => [...prev, trimmed]);
      setNewOpenDateInput('');
    }
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      const updatedDates = [...preservedGatheringOriginalStrings, ...editableOpenDates];
      setCurrentDates(updatedDates);
      setCurrentVibes(editableVibes);

      if (responseId) {
        await updateDoc(doc(db, 'responses', responseId), {
          dates: updatedDates,
          gatherings: editableVibes,
          updatedAt: serverTimestamp(),
        });
      }
      setIsEditingPreferences(false);
    } catch (err) {
      console.error('Failed to update preferences in Firestore:', err);
    } finally {
      setSavingPreferences(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!password || password.length < 6) {
      setAccountError('Password must be at least 6 characters long.');
      return;
    }

    setSubmittingAccount(true);

    try {
      if (isExistingUser) {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        setAccountSuccess('Signed in! Redirecting to your dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        try {
          await sendEmailVerification(userCredential.user);
        } catch (verErr) {
          console.warn('Could not dispatch verification email:', verErr);
        }
        setAccountSuccess('Account created! Redirecting to your member dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (err: any) {
      console.error('Post-survey account creation error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setIsExistingUser(true);
        setAccountError('Account exists — enter your password to sign in and view your plans:');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAccountError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/weak-password') {
        setAccountError('Password must be at least 6 characters long.');
      } else {
        setAccountError(err.message || 'Unable to create account. Please try again.');
      }
    } finally {
      setSubmittingAccount(false);
    }
  };

  const allVibesToDisplay = Array.from(
    new Set([...currentVibes, customGathering ? `"${customGathering}"` : ''].filter(Boolean))
  );
  const formattedOpenDates = formatAvailabilityDatesList(openDates);
  const allGatherings = allVibesToDisplay;
  const allDates = [...selectedDates, customDate].filter(Boolean);
  const allTimes = [...selectedTimes, customTime].filter(Boolean);

  return (
    <div className="card thanks-card" style={{ padding: '32px 24px', textAlign: 'center', backgroundColor: '#FBF7EE', border: '1px solid #D8CEBC', borderRadius: '20px', boxShadow: '0 18px 40px -22px rgba(43, 39, 31, 0.45)' }}>
      {/* Visual Badge */}
      <div style={{ fontSize: '2.8rem', lineHeight: 1, marginBottom: '8px' }}>🎉</div>

      {/* Brand Header & Subtitle */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C8643F', fontWeight: 700 }}>
          <BrandName />
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#4C5A40', marginTop: '2px', fontFamily: "'Fraunces', serif" }}>
          Community Series · {cityName}
        </div>
      </div>

      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '2rem', fontWeight: 900, color: '#2B271F', margin: '0 0 8px' }}>
        Thank you, {name || 'friend'}!
      </h2>

      <p style={{ color: '#6A6253', fontSize: '1.02rem', maxWidth: '44ch', margin: '0 auto 24px', lineHeight: 1.5 }}>
        Your availability and preferences for <strong>{cityName}</strong> are saved. We&apos;ll tally everyone&apos;s votes and email your invite to <span style={{ color: '#2B271F', fontWeight: 600 }}>{email}</span>.
      </p>

      {/* 3-Part Summary & "Thank You" Receipt */}
      <div style={{ backgroundColor: '#EDE4D3', borderRadius: '16px', padding: '18px 20px', textAlign: 'left', margin: '0 auto 24px', maxWidth: '500px', fontSize: '0.88rem', border: '1px solid #D8CEBC' }}>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4C5A40', fontWeight: 700, marginBottom: '14px' }}>
          Your Selected Choices
        </div>

        {/* 1. Gatherings You're Attending */}
        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px dashed #D8CEBC' }}>
          <div style={{ color: '#4C5A40', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px' }}>
            Gatherings You&apos;re Attending:
          </div>
          {attendingGatherings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {attendingGatherings.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    backgroundColor: '#EEF5EB',
                    border: '1px solid #C5DEC0',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      color: '#3D5634',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: '#4C5A40', fontWeight: 700 }}>✓</span>
                    <span>{item.displayLine}</span>
                  </span>
                  {item.calendarUrl && (
                    <a
                      href={item.calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#C8643F] hover:underline text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-[#D8CEBC] hover:border-[#C8643F]/50 transition-colors shadow-2xs"
                      title="Add to Google Calendar"
                    >
                      <Calendar style={{ width: '13px', height: '13px', color: '#C8643F' }} />
                      <span>Add to Calendar</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span style={{ color: '#8C8270', fontStyle: 'italic', fontSize: '0.82rem' }}>
              No locked gatherings selected yet
            </span>
          )}
        </div>

        {/* 2. Community Vote */}
        <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed #D8CEBC' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: '#4C5A40', fontWeight: 700, fontSize: '0.82rem' }}>
              Community Vote:
            </span>
            <button
              type="button"
              onClick={() => setIsPollModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#C8643F',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {pollVote ? 'Edit' : 'Vote Now →'}
            </button>
          </div>
          {pollVote ? (
            <div style={{ color: '#2B271F', fontWeight: 600, fontSize: '0.85rem' }}>
              🗳️ {pollVote.studioName} — {pollVote.dateText}
            </div>
          ) : (
            <span style={{ color: '#8C8270', fontStyle: 'italic', fontSize: '0.82rem' }}>
              No vote cast yet — click Vote Now to choose your studio!
            </span>
          )}
        </div>

        {/* 3. YOUR SURVEY DATES & VIBES */}
        <div style={{ marginBottom: (allTimes.length > 0 || selectedDrink || selectedGuests) ? '12px' : '0', paddingBottom: (allTimes.length > 0 || selectedDrink || selectedGuests) ? '12px' : '0', borderBottom: (allTimes.length > 0 || selectedDrink || selectedGuests) ? '1px dashed #D8CEBC' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: '#4C5A40', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Your Survey Preferences:
            </span>
            {!isEditingPreferences && (
              <button
                type="button"
                onClick={() => {
                  setEditableOpenDates(openDates);
                  setEditableVibes(currentVibes);
                  setIsEditingPreferences(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C8643F',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Edit &rarr;
              </button>
            )}
          </div>

          {!isEditingPreferences ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Selected Availability Dates */}
              <div>
                <div style={{ color: '#6B6357', fontSize: '0.75rem', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Selected Availability Dates:
                </div>
                {formattedOpenDates.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {formattedOpenDates.map((dateStr, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#C8643F]/10 text-[#C8643F] border border-[#C8643F]/30"
                      >
                        {dateStr}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#8C8270', fontStyle: 'italic', fontSize: '0.82rem' }}>
                    None specified
                  </span>
                )}
              </div>

              {/* Vibes / Activities */}
              <div>
                <div style={{ color: '#6B6357', fontSize: '0.75rem', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Vibes / Activities:
                </div>
                {allVibesToDisplay.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {allVibesToDisplay.map((vibe, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF7F2] border border-[#D8CEBC] text-[#2B271F]"
                      >
                        {vibe}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#8C8270', fontStyle: 'italic', fontSize: '0.82rem' }}>
                    None specified
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '8px', padding: '12px 14px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D8CEBC' }}>
              {/* Edit Dates Section */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#4C5A40', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Edit Availability Dates:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {editableOpenDates.map((od) => (
                    <span
                      key={od}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#F5EBE6',
                        color: '#C8643F',
                        border: '1px solid #F0D5C7',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>{formatSurveyDateChip(od)}</span>
                      <button
                        type="button"
                        onClick={() => setEditableOpenDates((prev) => prev.filter((item) => item !== od))}
                        style={{ background: 'none', border: 'none', color: '#C8643F', cursor: 'pointer', padding: 0, fontSize: '0.75rem', lineHeight: 1 }}
                        aria-label={`Remove ${od}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {editableOpenDates.length === 0 && (
                    <span style={{ color: '#8C8270', fontStyle: 'italic', fontSize: '0.78rem' }}>
                      No dates marked yet. Add dates below:
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="e.g. Oct 2, Oct 27, Nov 14..."
                    value={newOpenDateInput}
                    onChange={(e) => setNewOpenDateInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOpenDate();
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#FAF7F2',
                      border: '1px solid #D8CEBC',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.82rem',
                      color: '#2B271F',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddOpenDate}
                    style={{
                      backgroundColor: '#2B271F',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Edit Vibes Section */}
              <div style={{ marginBottom: '12px', paddingTop: '10px', borderTop: '1px dashed #D8CEBC' }}>
                <div style={{ color: '#4C5A40', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Select Gathering Vibes:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {AVAILABLE_VIBES.map((vibe) => {
                    const isSelected = editableVibes.includes(vibe);
                    return (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => handleToggleVibe(vibe)}
                        style={{
                          backgroundColor: isSelected ? '#C8643F' : '#FAF7F2',
                          color: isSelected ? '#FFFFFF' : '#2B271F',
                          border: `1px solid ${isSelected ? '#C8643F' : '#D8CEBC'}`,
                          padding: '3px 9px',
                          borderRadius: '9999px',
                          fontSize: '0.76rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? `✓ ${vibe}` : vibe}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions: Cancel & Save */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px', borderTop: '1px solid #EDE4D3' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditableOpenDates(openDates);
                    setEditableVibes(currentVibes);
                    setIsEditingPreferences(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6A6253',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingPreferences}
                  onClick={handleSavePreferences}
                  style={{
                    backgroundColor: '#C8643F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: savingPreferences ? 0.6 : 1,
                  }}
                >
                  {savingPreferences ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>

        {allTimes.length > 0 && (
          <div style={{ marginBottom: (selectedDrink || selectedGuests) ? '6px' : '0', fontSize: '0.82rem' }}>
            <span style={{ color: '#6A6253', fontWeight: 500 }}>Preferred Times: </span>
            <span style={{ color: '#2B271F', fontWeight: 600 }}>{allTimes.join(', ')}</span>
          </div>
        )}

        {(selectedDrink || selectedGuests) && (
          <div style={{ fontSize: '0.82rem', color: '#6A6253', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #D8CEBC' }}>
            {selectedDrink && <span>Drink: <strong>{selectedDrink}</strong></span>}
            {selectedDrink && selectedGuests && <span> &bull; </span>}
            {selectedGuests && <span>Party: <strong>{selectedGuests}</strong></span>}
          </div>
        )}
      </div>

      {/* Community Consensus & Profile Claim Section */}
      <div style={{ margin: '24px auto 16px', maxWidth: '490px', padding: '22px 20px', backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #D8CEBC', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', textAlign: 'left' }}>
        {/* Consensus Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Vote style={{ width: '20px', height: '20px', color: '#C8643F', flexShrink: 0 }} />
          <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: '1.18rem', color: '#2B271F', margin: 0 }}>
            We&apos;re tallying {cityName} votes
          </h3>
        </div>

        {/* Consensus Body */}
        <p style={{ fontSize: '0.85rem', color: '#6A6253', lineHeight: 1.5, margin: '0 0 16px' }}>
          Your preferences are locked in. Once our community consensus window closes, we&apos;ll finalize the winning dates and send you the official calendar invite and venue details.
        </p>

        {/* Profile Claim / Account Prompt */}
        {!currentUser || accountSuccess ? (
          <div style={{ paddingTop: '16px', borderTop: '1px solid #EDE4D3' }}>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#2B271F', display: 'block', fontWeight: 700, marginBottom: '2px' }}>
                Claim your profile to save your preferences and track {cityName} gatherings.
              </strong>
              <p style={{ fontSize: '0.78rem', color: '#8C8270', margin: 0, lineHeight: 1.4 }}>
                Set a password for <strong style={{ color: '#2B271F' }}>{email}</strong> to transition smoothly into your dashboard and community ledger.
              </p>
            </div>

            <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isExistingUser ? 'Enter your password to sign in' : 'Create a password (at least 6 characters)'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAccountError(null);
                  }}
                  minLength={6}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#FAF7F2',
                    border: '1.5px solid #D8CEBC',
                    borderRadius: '12px',
                    padding: '11px 40px 11px 14px',
                    fontSize: '0.85rem',
                    color: '#2B271F',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8C8270',
                    padding: 0,
                    fontSize: '0.85rem',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <Eye style={{ width: '16px', height: '16px' }} />
                  )}
                </button>
              </div>

              {accountError && (
                <div style={{ fontSize: '0.78rem', color: '#A63A24', backgroundColor: '#FDF2F0', padding: '8px 12px', borderRadius: '8px', border: '1px solid #F5C2BA' }}>
                  {accountError}
                </div>
              )}

              {accountSuccess && (
                <div style={{ fontSize: '0.78rem', color: '#3D5634', backgroundColor: '#EEF5EB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #C5DEC0' }}>
                  {accountSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingAccount}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#C8643F',
                  color: '#FFFFFF',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.18s',
                  boxShadow: '0 4px 12px -2px rgba(200, 100, 63, 0.35)',
                  opacity: submittingAccount ? 0.7 : 1,
                }}
              >
                {submittingAccount ? (
                  <span>Saving account...</span>
                ) : isExistingUser ? (
                  <span>Sign In &amp; View Community Ledger &rarr;</span>
                ) : (
                  <span>Create Account / View Community Ledger &rarr;</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ paddingTop: '14px', borderTop: '1px solid #EDE4D3' }}>
            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: '#C8643F',
                color: '#FFFFFF',
                padding: '12px 18px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                boxShadow: '0 4px 12px -2px rgba(200, 100, 63, 0.35)',
              }}
            >
              <span>View Community Ledger &rarr;</span>
            </Link>
          </div>
        )}
      </div>

      {/* Navigation actions */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', fontSize: '0.85rem' }}>
        <Link href="/" style={{ color: '#C8643F', fontWeight: 600, textDecoration: 'none' }}>
          &larr; Explore Other Cities
        </Link>
        {onReset && (
          <>
            <span style={{ color: '#D8CEBC' }}>&bull;</span>
            <button
              type="button"
              onClick={onReset}
              style={{ background: 'none', border: 'none', color: '#6A6253', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}
            >
              Submit another response
            </button>
          </>
        )}
      </div>

      {/* Compliance / Entity Footer */}
      <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #D8CEBC', fontSize: '0.78rem', color: '#6A6253', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '4px' }}>
          <strong><BrandName tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super" /></strong> &middot; {cityName === 'Chicago' ? 'Chicago, IL' : cityName === 'Austin' ? 'Austin, TX' : cityName} &middot;{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = 'mailto:admin@actuallylets.com';
            }}
            className="underline hover:text-stone-800 transition-colors bg-transparent border-0 p-0 inline cursor-pointer font-inherit"
            style={{ color: '#C8643F', textDecoration: 'underline', fontSize: 'inherit', font: 'inherit' }}
          >
            rsvp@actuallylets.com
          </button>
        </div>
        <div>
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#6A6253', textDecoration: 'underline', marginRight: '8px' }}>
            Privacy Policy
          </Link>
          <span>&bull;</span>
          <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#6A6253', textDecoration: 'underline', marginLeft: '8px' }}>
            Terms of Service
          </Link>
        </div>
      </div>

      {/* Community Pottery Poll Modal */}
      <PotteryPollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        initialEmail={email}
        currentMonth={
          pollVote?.dateText?.toLowerCase().includes('nov') ||
          currentDates.some((d) => d.toLowerCase().includes('nov'))
            ? '2026-11'
            : '2026-10'
        }
      />
    </div>
  );
}
