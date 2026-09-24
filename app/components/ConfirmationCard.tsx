'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandName } from '@/components/brand/BrandName';
import { Vote, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import PotteryPollModal from '@/app/components/PotteryPollModal';
import { ALL_COMMUNITY_EVENTS, splitEventTitle } from '@/lib/eventsConfig';
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
  customDate?: string;
  selectedTimes: string[];
  customTime?: string;
  selectedDrink?: string | null;
  selectedGuests?: string;
  responseId?: string;
  onReset?: () => void;
}

export default function ConfirmationCard({
  name,
  email,
  cityName,
  selectedGatherings,
  customGathering,
  selectedDates,
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

  // Available Open Dates State & Inline Editor
  const [currentDates, setCurrentDates] = useState<string[]>(selectedDates);
  const [isEditingOpenDates, setIsEditingOpenDates] = useState(false);
  const [editableOpenDates, setEditableOpenDates] = useState<string[]>([]);
  const [newOpenDateInput, setNewOpenDateInput] = useState('');
  const [savingDates, setSavingDates] = useState(false);

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

  // Classify currentDates into Attending Gatherings and Open Dates
  const attendingGatherings: string[] = [];
  const openDates: string[] = [];
  const preservedGatheringOriginalStrings: string[] = [];

  const allDateInputs = [...currentDates, customDate].filter(Boolean) as string[];

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
        d.includes(ev.id)
      );
    });

    if (matchingEvent) {
      const label = matchingEvent.chipLabel || splitEventTitle(matchingEvent.title, matchingEvent.brandPrefix).eventName;
      if (!attendingGatherings.includes(label)) {
        attendingGatherings.push(label);
      }
      if (!preservedGatheringOriginalStrings.includes(d)) {
        preservedGatheringOriginalStrings.push(d);
      }
    } else {
      if (!openDates.includes(d)) {
        openDates.push(d);
      }
    }
  });

  // Sync editableOpenDates whenever openDates changes or editor opens
  useEffect(() => {
    if (!isEditingOpenDates) {
      setEditableOpenDates(openDates);
    }
  }, [currentDates, isEditingOpenDates]);

  const handleAddOpenDate = () => {
    const trimmed = newOpenDateInput.trim();
    if (trimmed && !editableOpenDates.includes(trimmed)) {
      setEditableOpenDates((prev) => [...prev, trimmed]);
      setNewOpenDateInput('');
    }
  };

  const handleSaveOpenDates = async () => {
    setSavingDates(true);
    try {
      const updatedDates = [...preservedGatheringOriginalStrings, ...editableOpenDates];
      setCurrentDates(updatedDates);

      if (responseId) {
        await updateDoc(doc(db, 'responses', responseId), {
          dates: updatedDates,
          updatedAt: serverTimestamp(),
        });
      }
      setIsEditingOpenDates(false);
    } catch (err) {
      console.error('Failed to update open dates in Firestore:', err);
    } finally {
      setSavingDates(false);
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

  const allGatherings = [...selectedGatherings, customGathering ? `"${customGathering}"` : ''].filter(Boolean);
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
        <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed #D8CEBC' }}>
          <div style={{ color: '#4C5A40', fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px' }}>
            Gatherings You&apos;re Attending:
          </div>
          {attendingGatherings.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {attendingGatherings.map((g) => (
                <span
                  key={g}
                  style={{
                    backgroundColor: '#EEF5EB',
                    color: '#3D5634',
                    border: '1px solid #C5DEC0',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  ✓ {g}
                </span>
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

        {/* 3. Available For (Open Dates) */}
        <div style={{ marginBottom: (allGatherings.length > 0 || allTimes.length > 0 || selectedDrink || selectedGuests) ? '12px' : '0', paddingBottom: (allGatherings.length > 0 || allTimes.length > 0 || selectedDrink || selectedGuests) ? '12px' : '0', borderBottom: (allGatherings.length > 0 || allTimes.length > 0 || selectedDrink || selectedGuests) ? '1px dashed #D8CEBC' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: '#4C5A40', fontWeight: 700, fontSize: '0.82rem' }}>
              Available For (Open Dates):
            </span>
            {!isEditingOpenDates && (
              <button
                type="button"
                onClick={() => setIsEditingOpenDates(true)}
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
                Edit
              </button>
            )}
          </div>

          {!isEditingOpenDates ? (
            openDates.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {openDates.map((d) => (
                  <span
                    key={d}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#2B271F',
                      border: '1px solid #D8CEBC',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ color: '#8C8270', fontStyle: 'italic', fontSize: '0.82rem' }}>
                No open dates marked
              </span>
            )
          ) : (
            <div style={{ marginTop: '8px', padding: '10px 12px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #D8CEBC' }}>
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
                    <span>{od}</span>
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
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="e.g. Oct 15, Nov 12..."
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditableOpenDates(openDates);
                    setIsEditingOpenDates(false);
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
                  disabled={savingDates}
                  onClick={handleSaveOpenDates}
                  style={{
                    backgroundColor: '#C8643F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: savingDates ? 0.6 : 1,
                  }}
                >
                  {savingDates ? 'Saving...' : 'Save Dates'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Additional preferences (Vibes, Times, Party) */}
        {allGatherings.length > 0 && (
          <div style={{ marginBottom: '6px', fontSize: '0.82rem' }}>
            <span style={{ color: '#6A6253', fontWeight: 500 }}>Alternative Vibes: </span>
            <span style={{ color: '#2B271F', fontWeight: 600 }}>{allGatherings.join(', ')}</span>
          </div>
        )}

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
            We&apos;re tallying {cityName}&apos;s votes
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
          <strong><BrandName /></strong> &middot; {cityName === 'Chicago' ? 'Chicago, IL' : cityName === 'Austin' ? 'Austin, TX' : cityName} &middot;{' '}
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
      />
    </div>
  );
}
