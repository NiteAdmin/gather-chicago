'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BrandName } from '@/components/brand/BrandName';
import {
  X,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  MapPin,
  Clock,
  Vote,
  Calendar,
} from 'lucide-react';
import { chicagoPotteryPoll } from '@/lib/eventsConfig';

interface PotteryPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

const DATE_OPTIONS = [
  'Sun, Oct 4 (Morning)',
  'Sat, Oct 10 (Morning)',
  'Flexible / Nov (Wed–Sun)',
];

export default function PotteryPollModal({
  isOpen,
  onClose,
  initialEmail = '',
}: PotteryPollModalProps) {
  const [selectedStudio, setSelectedStudio] = useState<'lincoln-square' | 'gnarware'>('lincoln-square');
  const [preferredDate, setPreferredDate] = useState<string>(DATE_OPTIONS[0]);
  const [email, setEmail] = useState<string>(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  // Check auth state and local storage on mount / open
  useEffect(() => {
    if (!isOpen) return;

    // Check Firebase auth
    const current = auth.currentUser;
    if (current && current.email) {
      setLoggedInEmail(current.email);
      setEmail(current.email);
    } else if (initialEmail) {
      setEmail(initialEmail);
    }

    // Check localStorage for prior vote
    try {
      const voted = localStorage.getItem('hasVoted_pottery-studio-faceoff');
      if (voted === 'true') {
        setHasVoted(true);
        setIsSuccess(true);
        const savedData = localStorage.getItem('votedData_pottery-studio-faceoff');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.selectedStudio) setSelectedStudio(parsed.selectedStudio);
          if (parsed.preferredDate) setPreferredDate(parsed.preferredDate);
          if (parsed.email) setEmail(parsed.email);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [isOpen, initialEmail]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const voteEmail = (loggedInEmail || email || '').trim().toLowerCase();
    if (!voteEmail) {
      setError('Please provide your email address to record your vote.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(voteEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const sanitizedEmail = voteEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
      const docId = `${sanitizedEmail}_pottery-studio-faceoff`;

      const payload = {
        pollId: 'pottery-studio-faceoff',
        selectedStudio,
        preferredDate,
        email: voteEmail,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'communityPolls', docId), payload, { merge: true });

      // Save to localStorage
      try {
        localStorage.setItem('hasVoted_pottery-studio-faceoff', 'true');
        localStorage.setItem(
          'votedData_pottery-studio-faceoff',
          JSON.stringify({ selectedStudio, preferredDate, email: voteEmail })
        );
      } catch {
        // Ignore localStorage quota errors
      }

      setHasVoted(true);
      setIsSuccess(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pollVoteUpdated'));
      }
    } catch (err: any) {
      console.error('Failed to persist community poll vote:', err);
      // Fallback: save to localStorage even if firestore write experienced an issue
      try {
        localStorage.setItem('hasVoted_pottery-studio-faceoff', 'true');
        localStorage.setItem(
          'votedData_pottery-studio-faceoff',
          JSON.stringify({ selectedStudio, preferredDate, email: voteEmail })
        );
        setHasVoted(true);
        setIsSuccess(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('pollVoteUpdated'));
        }
      } catch {
        setError('Failed to record your vote. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOption = chicagoPotteryPoll.options.find((opt) => opt.id === selectedStudio);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pottery-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-5 sm:p-7 shadow-2xl animate-fade-in">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8C8270] hover:text-[#2B271F] transition-colors rounded-full hover:bg-[#EDE4D3]/50 cursor-pointer"
          aria-label="Close pottery poll ballot"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 pr-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#EDE4D3] text-[#C8643F]">
              <Sparkles className="w-3 h-3" />
              COMMUNITY POLL
            </span>
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider text-[#C8643F] mb-1">
            <BrandName />
          </div>

          <h2
            id="pottery-modal-title"
            className="text-xl sm:text-2xl font-bold font-serif-fraunces text-[#2B271F] leading-tight"
          >
            Vote on Next Gathering
          </h2>

          <p className="text-xs sm:text-sm text-[#6A6253] leading-relaxed mt-1.5">
            Which of these events would you go to?
          </p>
        </div>

        {/* INLINE CONFIRMATION STATE */}
        {isSuccess ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-[#EEF5EB] border border-[#C5DEC0] text-[#3D5634] space-y-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 leading-tight">
                    ✓ Vote Recorded! We&apos;ll notify you as soon as this gathering is locked in.
                  </h3>
                  <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                    Your choice helps determine our venue location and target dates. This preference does not commit you to an RSVP or ticket purchase until dates are finalized.
                  </p>
                </div>
              </div>

              {/* Vote Summary Card */}
              <div className="mt-3 pt-3 border-t border-[#C5DEC0]/70 text-xs text-[#2B271F] space-y-1.5 bg-white/60 p-3 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-[#6A6253]">Studio Selected:</span>
                  <strong className="text-[#2B271F] text-right">
                    {selectedOption?.name || selectedStudio}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A6253]">Target Date:</span>
                  <strong className="text-[#2B271F]">{preferredDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A6253]">Voter Email:</span>
                  <strong className="text-[#2B271F]">{loggedInEmail || email}</strong>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-[#D8CEBC] bg-white hover:bg-[#EDE4D3]/50 text-[#2B271F] text-xs font-semibold transition-colors cursor-pointer"
              >
                Change My Vote
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#C8643F] hover:bg-[#b05230] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* COMPARISON CARDS (Radio Select) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8270] mb-2">
                Pick an event:
              </label>

              <div className="space-y-3">
                {/* Card 1: Lincoln Square Pottery Studio */}
                <div
                  onClick={() => setSelectedStudio('lincoln-square')}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    selectedStudio === 'lincoln-square'
                      ? 'bg-[#FAF4ED] border-[#C8643F] ring-2 ring-[#C8643F]/20 shadow-xs'
                      : 'bg-white border-[#D8CEBC] hover:border-[#C8643F]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedStudio === 'lincoln-square'
                              ? 'border-[#C8643F] bg-[#C8643F]'
                              : 'border-[#D8CEBC] bg-white'
                          }`}
                        >
                          {selectedStudio === 'lincoln-square' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold font-serif-fraunces text-[#2B271F] leading-tight">
                          Lincoln Square Pottery Studio
                        </h4>
                      </div>

                      {/* Neighborhood & Value Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pl-6 pt-0.5">
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#EDE4D3] text-[#4C5A40]">
                          North Side
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FBE8DF] text-[#C8643F]">
                          $60 &middot; Fixed Weekend
                        </span>
                      </div>

                      <div className="pl-6 pt-1 space-y-1 text-xs text-[#6A6253]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8C8270] shrink-0" />
                          <span>Dates: Oct 4 or Oct 10 morning (10 AM or 12 PM)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#8C8270] shrink-0" />
                          <span className="truncate">4150 N Lincoln Ave, Chicago, IL</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href="https://www.comeplaywithclay.com/classes"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] text-[#8C8270] hover:text-[#C8643F] underline shrink-0 mt-0.5"
                      title="Visit studio website"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Card 2: GnarWare Workshop */}
                <div
                  onClick={() => setSelectedStudio('gnarware')}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    selectedStudio === 'gnarware'
                      ? 'bg-[#FAF4ED] border-[#C8643F] ring-2 ring-[#C8643F]/20 shadow-xs'
                      : 'bg-white border-[#D8CEBC] hover:border-[#C8643F]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedStudio === 'gnarware'
                              ? 'border-[#C8643F] bg-[#C8643F]'
                              : 'border-[#D8CEBC] bg-white'
                          }`}
                        >
                          {selectedStudio === 'gnarware' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold font-serif-fraunces text-[#2B271F] leading-tight">
                          GnarWare Workshop
                        </h4>
                      </div>

                      {/* Neighborhood & Value Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pl-6 pt-0.5">
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#EDE4D3] text-[#4C5A40]">
                          Pilsen
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FBE8DF] text-[#C8643F]">
                          $40 &middot; Flexible Schedule
                        </span>
                      </div>

                      <div className="pl-6 pt-1 space-y-1 text-xs text-[#6A6253]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8C8270] shrink-0" />
                          <span>Dates: Flexible Oct/Nov afternoon/evening (Wed–Sun, 12–8 PM)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#8C8270] shrink-0" />
                          <span className="truncate">1838 West Cermak Ave, Chicago, IL 60608</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href="https://www.care.com/connect/gnarwareworkshop/providers/671-gnarware-workshop"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] text-[#8C8270] hover:text-[#C8643F] underline shrink-0 mt-0.5"
                      title="Visit studio website"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* DATE SELECTION (Radio/Pills) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8270] mb-2">
                2. Preferred Date Window
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DATE_OPTIONS.map((dateOpt) => {
                  const isSelected = preferredDate === dateOpt;
                  return (
                    <button
                      key={dateOpt}
                      type="button"
                      onClick={() => setPreferredDate(dateOpt)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#C8643F] text-white border-[#C8643F] shadow-xs'
                          : 'bg-white text-[#2B271F] border-[#D8CEBC] hover:border-[#C8643F]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                      <span className="truncate">{dateOpt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EMAIL & SUBMIT */}
            <div className="pt-2 border-t border-[#D8CEBC]/60 space-y-3">
              {loggedInEmail ? (
                <div className="p-3 rounded-xl bg-[#EDE4D3]/40 border border-[#D8CEBC] text-xs text-[#2B271F] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#8C8270] block">Voting as member:</span>
                    <strong className="font-semibold text-stone-900">{loggedInEmail}</strong>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EEF5EB] text-[#3D5634] px-2 py-0.5 rounded-md border border-[#C5DEC0]">
                    Verified
                  </span>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="poll-email"
                    className="block text-xs font-medium text-[#2B271F] mb-1.5"
                  >
                    Your email to notify when booked
                  </label>
                  <input
                    id="poll-email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D8CEBC] text-xs sm:text-sm text-[#2B271F] placeholder:text-[#8C8270] focus:outline-none focus:border-[#C8643F] focus:ring-1 focus:ring-[#C8643F]"
                  />
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-5 rounded-xl bg-[#C8643F] hover:bg-[#b05230] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording Vote...</span>
                  </>
                ) : (
                  <>
                    <span>Cast Vote &rarr;</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-[#8C8270] text-center leading-relaxed">
                This vote gauges community consensus and does not generate an RSVP or ticket fee.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
