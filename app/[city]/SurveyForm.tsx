'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { saveResponse } from '@/lib/firebase';
import { formatPhoneNumber } from '@/lib/formatPhone';
import { Turnstile } from '@marsidev/react-turnstile';

const GATHERINGS = [
  "Moms morning",
  "Couples / date",
  "Ladies' night",
  "Family-friendly",
  "Prenatal & new parents",
  "All ages / community",
];

const TIMES = [
  "Mid-morning (9–10)",
  "Late AM (11)",
  "Afternoon",
  "Evening",
];

const DAYPREF = ["Weekend", "Weekday", "Either works"];
const GUESTS = ["Just me", "2", "3", "4+"];
const DRINKS = ["Mimosa", "Mocktail", "Both please"];

const DATES = [
  "Sat, Aug 8",
  "Sun, Aug 9",
  "Sat, Aug 15",
  "Sun, Aug 16",
  "Sat, Aug 22",
  "Sun, Aug 23",
  "Sat, Aug 29",
  "Sun, Aug 30",
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
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedDayPref, setSelectedDayPref] = useState<string>('');
  const [selectedGuests, setSelectedGuests] = useState<string>('');
  const [selectedDrink, setSelectedDrink] = useState<string>('');

  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(''); // Visually hidden honeypot field
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const toggleChip = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
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
        dates: Array.isArray(selectedDates) ? selectedDates : [],
        gatherings: Array.isArray(selectedGatherings) ? selectedGatherings : [],
        customDate: trimmedCustomDate || null,
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

      setSubmitted(true);
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
          margin: 0;
          padding: 0;
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
          font-size: 0.72rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--terra);
          font-weight: 700;
          margin-bottom: 10px;
          display: inline-block;
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
          <Link href="/" className="eyebrow" style={{ display: 'inline-block', minHeight: '1.2rem' }}>
            ACTUALLY · {cityName.toUpperCase()}
          </Link>
          <h1 style={{ minHeight: '3.2rem' }}>
            Let's find the <em>right time</em> to gather in {cityName}.
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
          <div className="card thanks">
            <div className="mark">🌿</div>
            <h2>Thank you, {name}!</h2>
            <p className="sub" style={{ margin: '0 auto' }}>
              Your answers for {cityName} are in. Watch your inbox for the invite once the date's locked.
            </p>
          </div>
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
              </div>

              <div className="q">
                <div className="q-label">Which dates could you make?</div>
                <div className="chips">
                  {DATES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`chip date ${selectedDates.includes(d) ? 'on' : ''}`}
                      onClick={() => toggleChip(selectedDates, setSelectedDates, d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Another date that works for you? Type it here…"
                  style={{ marginTop: '11px' }}
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
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

              <button className="submit" type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send my answers'}
              </button>
              <p className="note">
                Your response is saved securely and shared with the organizer.
              </p>

              {/* A2P 10DLC Footer Legal Links */}
              <div className="footer-legal" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline', marginRight: '12px' }}>
                  Privacy Policy
                </a>
                <span style={{ color: 'var(--line)' }}>&bull;</span>
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline', marginLeft: '12px' }}>
                  Terms of Service
                </a>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
