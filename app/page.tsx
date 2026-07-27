'use client';

import React, { useState } from 'react';
import { saveResponse } from '@/lib/firebase';

const GATHERINGS = [
  "Moms morning",
  "Couples / date",
  "Ladies' night",
  "Singles mixer",
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

export default function Home() {
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
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCustomDate = customDate.trim();

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

    setSubmitting(true);

    try {
      await saveResponse({
        name: trimmedName,
        email: trimmedEmail,
        notes: notes.trim(),
        customDate: trimmedCustomDate,
        customTime: customTime.trim(),
        gatherings: selectedGatherings,
        dates: selectedDates,
        times: selectedTimes,
        dayPref: selectedDayPref,
        guests: selectedGuests,
        drink: selectedDrink,
      });
      setSubmitted(true);

      // Trigger confirmation email asynchronously (non-blocking)
      fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          dates: selectedDates,
          gatherings: selectedGatherings,
        }),
      }).catch((err) => {
        console.error('Confirmation email error:', err);
      });
    } catch (err: any) {
      console.error("Error submitting response:", err);
      setFormError('Something went wrong saving your response. Please try again.');
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

      <div className="wrap">
        <header className="top">
          <div className="eyebrow">Gather · Chicago</div>
          <h1>
            Let's find the <em>right time</em> to gather.
          </h1>
          <p className="sub">
            A rotating community series — yoga, mimosas, and good company. Tell me what activities you'd attend and when you're free. Takes about a minute.
          </p>
          <p className="sub" style={{ marginTop: '8px' }}>
            <strong style={{ color: 'var(--sage-deep)' }}>A portion of every ticket</strong> supports the Institute of Cultural Affairs (ICA), a local Chicago nonprofit working on community building and a more sustainable city.
          </p>
        </header>

        {submitted ? (
          <div className="card thanks">
            <div className="mark">🌿</div>
            <h2>Thank you, {name}!</h2>
            <p className="sub" style={{ margin: '0 auto' }}>
              Your answers are in. Watch your inbox for the invite once the date's locked.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="q">
                <div className="q-label">Which gatherings would you attend?</div>
                <div className="q-help">Pick all that appeal — this tells me what to plan next.</div>
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
                <div className="q-help">Upcoming weekends. Select all that work.</div>
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
                <div className="q-help">Pick any that suit you.</div>
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
                <div className="q-label">Anything else you'd love?</div>
                <textarea
                  placeholder="Optional — a cause, a vibe, a request…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button className="submit" type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send my answers'}
              </button>
              <p className="note">
                Your response is saved securely and shared with the organizer.
              </p>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
