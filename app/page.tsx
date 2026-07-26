'use client';

import React, { useState, useEffect } from 'react';
import { saveResponse, fetchResponses } from '@/lib/firebase';
import { SurveyResponse } from '@/types/survey';

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
  const [activeTab, setActiveTab] = useState<'respond' | 'results'>('respond');

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

  // Results state
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Admin Modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [winningDate, setWinningDate] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load responses when switching to results tab
  useEffect(() => {
    if (activeTab === 'results') {
      loadResults();
    }
  }, [activeTab]);

  const loadResults = async () => {
    setLoadingResults(true);
    try {
      const data = await fetchResponses();
      setResponses(data);
    } catch (err) {
      console.error("Failed to load results:", err);
    } finally {
      setLoadingResults(false);
    }
  };

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
    } catch (err: any) {
      console.error("Error submitting response:", err);
      setFormError('Something went wrong saving your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const writeInDates = responses.filter((r) => r.customDate).map((r) => `${r.customDate} — ${r.name}`);
  const writeInTimes = responses.filter((r) => r.customTime).map((r) => `${r.customTime} — ${r.name}`);

  const handleOpenAdminModal = () => {
    setWinningDate(topDateOption || DATES[0]);
    setEventDetails('Join us for a relaxing morning of yoga, mimosa toasts, and great conversation with local Chicago neighbors!');
    setEventLink('');
    setAdminPasscode('');
    setShowAdminModal(true);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    if (!adminPasscode.trim()) {
      setToastMessage({ type: 'error', text: 'Please enter the Admin Passcode.' });
      return;
    }

    setBroadcasting(true);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winningDate,
          eventDetails,
          eventLink: eventLink.trim() || undefined,
          adminSecret: adminPasscode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Broadcast failed');
      }

      setToastMessage({
        type: 'success',
        text: `Success! Email broadcast sent to ${data.recipientCount} attendees 🎉`,
      });

      setTimeout(() => {
        setShowAdminModal(false);
      }, 2500);
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Error sending announcement email.',
      });
    } finally {
      setBroadcasting(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Timestamp',
      'Name',
      'Email',
      'Will bring',
      'Gatherings',
      'Dates that work',
      'Write-in date',
      'Times',
      'Write-in time',
      'Day pref',
      'Drink',
      'Notes',
    ];

    const escapeCsv = (str: any) => `"${String(str == null ? '' : str).replace(/"/g, '""')}"`;

    const csvLines = [headers.map(escapeCsv).join(',')];

    responses.forEach((r) => {
      const line = [
        r.createdAt ? (r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toISOString() : String(r.createdAt)) : '',
        r.name,
        r.email,
        r.guests,
        (r.gatherings || []).join('; '),
        (r.dates || []).join('; '),
        r.customDate || '',
        (r.times || []).join('; '),
        r.customTime || '',
        r.dayPref || '',
        r.drink || '',
        r.notes || '',
      ];
      csvLines.push(line.map(escapeCsv).join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'gathering-responses.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderBars = (pairs: [string, number][]) => {
    const max = Math.max(1, ...pairs.map((p) => p[1]));
    return pairs.map(([label, count], idx) => {
      const pct = (count / max) * 100;
      const isLead = idx === 0 && count > 0;
      return (
        <div key={label} className="bar-row">
          <div className="bar-top">
            <span>{label}</span>
            <b>{count}</b>
          </div>
          <div className="bar-track">
            <div
              className={`bar-fill ${isLead ? 'lead' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      );
    });
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
          margin-bottom: 22px;
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

        .tabs {
          display: flex;
          gap: 6px;
          background: var(--cream-2);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 5px;
          margin: 22px 0 26px;
          width: fit-content;
        }

        .tab {
          appearance: none;
          border: 0;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          font-weight: 600;
          font-size: 0.92rem;
          color: var(--ink-soft);
          padding: 9px 20px;
          border-radius: 999px;
          transition: 0.2s;
        }

        .tab.active {
          background: var(--ink);
          color: var(--cream);
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
        input[type='password'],
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

        .link-btn {
          background: none;
          border: 0;
          color: var(--terra);
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.95rem;
          text-decoration: underline;
          margin-top: 14px;
        }

        .stat-row {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }

        .stat {
          flex: 1;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 16px 14px;
          text-align: center;
          box-shadow: var(--shadow);
        }

        .stat .n {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-weight: 900;
          font-size: 1.9rem;
          color: var(--sage-deep);
          line-height: 1;
        }

        .stat .l {
          font-size: 0.74rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-top: 6px;
        }

        .res-title {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bar-row {
          margin-bottom: 11px;
        }

        .bar-top {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          margin-bottom: 4px;
        }

        .bar-top b {
          font-weight: 600;
        }

        .bar-track {
          background: var(--cream-2);
          border-radius: 8px;
          height: 12px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: var(--sage);
          border-radius: 8px;
          transition: width 0.5s;
        }

        .bar-fill.lead {
          background: var(--terra);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }

        th,
        td {
          text-align: left;
          padding: 9px 8px;
          border-bottom: 1px solid var(--line);
        }

        th {
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 700;
        }

        td.em {
          color: var(--ink-soft);
        }

        .row-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .ghost {
          appearance: none;
          border: 1.5px solid var(--line);
          background: var(--card);
          color: var(--ink);
          font-family: inherit;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 11px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: 0.16s;
        }

        .ghost:hover {
          border-color: var(--sage);
        }

        .announce-btn {
          background: var(--terra);
          color: var(--cream);
          border: none;
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-weight: 600;
          font-size: 0.95rem;
          padding: 8px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: 0.2s;
          box-shadow: 0 4px 12px -4px var(--terra);
        }

        .announce-btn:hover {
          background: #b5582f;
        }

        .empty {
          text-align: center;
          color: var(--ink-soft);
          padding: 36px 10px;
          font-size: 0.96rem;
        }

        .note {
          font-size: 0.8rem;
          color: var(--ink-soft);
          margin-top: 14px;
          line-height: 1.45;
        }

        .loading {
          text-align: center;
          color: var(--ink-soft);
          padding: 30px;
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

        /* Admin Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(43, 39, 31, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 28px;
          max-width: 520px;
          width: 100%;
          box-shadow: var(--shadow);
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .modal-title {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--ink);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.4rem;
          color: var(--ink-soft);
          cursor: pointer;
        }

        .toast {
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.88rem;
          margin-bottom: 14px;
        }

        .toast.success {
          background: rgba(110, 127, 94, 0.18);
          border: 1px solid var(--sage-deep);
          color: var(--sage-deep);
        }

        .toast.error {
          background: rgba(200, 100, 63, 0.15);
          border: 1px solid var(--terra);
          color: var(--terra);
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

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'respond' ? 'active' : ''}`}
            onClick={() => setActiveTab('respond')}
          >
            Take the survey
          </button>
          <button
            className={`tab ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            View results
          </button>
        </div>

        {activeTab === 'respond' && (
          <div id="respondView">
            {submitted ? (
              <div className="card thanks">
                <div className="mark">🌿</div>
                <h2>Thank you, {name}!</h2>
                <p className="sub" style={{ margin: '0 auto' }}>
                  Your answers are in. Watch your inbox for the invite once the date's locked.
                </p>
                <button className="link-btn" onClick={() => setActiveTab('results')}>
                  See what everyone picked →
                </button>
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
                    Your response is saved securely and shared with the organizer (counting toward totals on the results tab).
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div id="resultsView">
            {loadingResults ? (
              <div className="loading">Loading responses from Firestore…</div>
            ) : responses.length === 0 ? (
              <div className="card">
                <div className="empty">
                  No responses yet.<br />
                  Share this app's link — answers will appear here automatically.
                </div>
              </div>
            ) : (
              <>
                <div className="stat-row">
                  <div className="stat">
                    <div className="n">{responses.length}</div>
                    <div className="l">Responses</div>
                  </div>
                  <div className="stat">
                    <div className="n">{totalEstimatedGuests}</div>
                    <div className="l">Est. guests</div>
                  </div>
                  <div className="stat">
                    <div className="n">{topDateOption ? topDateOption.split(',')[0] : '—'}</div>
                    <div className="l">Top day</div>
                  </div>
                </div>

                <div className="card">
                  <div className="res-title">
                    <span>📅 Best dates</span>
                    <button className="announce-btn" onClick={handleOpenAdminModal}>
                      📧 Announce Winning Date
                    </button>
                  </div>
                  {renderBars(dateTally)}
                </div>

                <div className="card">
                  <div className="res-title">⏰ Best times</div>
                  {renderBars(timeTally)}
                </div>

                <div className="card">
                  <div className="res-title">✨ What to plan next — gathering demand</div>
                  {renderBars(gathTally)}
                </div>

                <div className="card">
                  <div className="res-title">Quick splits</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '8px' }}>
                    Weekday vs weekend
                  </div>
                  {renderBars(dayTally)}
                  <div style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', margin: '14px 0 8px' }}>
                    Drinks
                  </div>
                  {renderBars(drinkTally)}
                </div>

                {(writeInDates.length > 0 || writeInTimes.length > 0) && (
                  <div className="card">
                    <div className="res-title">✍️ Write-in requests</div>
                    {writeInDates.length > 0 && (
                      <>
                        <div style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '6px' }}>
                          Dates
                        </div>
                        <ul style={{ margin: '0 0 10px 18px', fontSize: '0.92rem' }}>
                          {writeInDates.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    {writeInTimes.length > 0 && (
                      <>
                        <div style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '6px' }}>
                          Times
                        </div>
                        <ul style={{ margin: '0 0 0 18px', fontSize: '0.92rem' }}>
                          {writeInTimes.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                <div className="card">
                  <div className="res-title">Contact list ({responses.length})</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Bringing</th>
                          <th>Interested in</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.map((r, idx) => (
                          <tr key={r.id || idx}>
                            <td>{r.name}</td>
                            <td className="em">{r.email || '—'}</td>
                            <td className="em">{r.guests || '—'}</td>
                            <td className="em">{(r.gatherings || []).join(', ') || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="row-actions">
                    <button className="ghost" onClick={exportCSV}>
                      ⬇ Export CSV
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Admin Broadcast Modal */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📧 Broadcast Announcement</div>
              <button className="close-btn" onClick={() => setShowAdminModal(false)}>
                &times;
              </button>
            </div>

            {toastMessage && (
              <div className={`toast ${toastMessage.type}`}>{toastMessage.text}</div>
            )}

            <form onSubmit={handleSendBroadcast}>
              <div className="q">
                <div className="q-label">Winning Date</div>
                <input
                  type="text"
                  value={winningDate}
                  onChange={(e) => setWinningDate(e.target.value)}
                  placeholder="e.g. Sat, Aug 15"
                  required
                />
              </div>

              <div className="q">
                <div className="q-label">Event Details</div>
                <textarea
                  value={eventDetails}
                  onChange={(e) => setEventDetails(e.target.value)}
                  placeholder="Describe location, schedule, or bring-your-own items..."
                  required
                  rows={3}
                />
              </div>

              <div className="q">
                <div className="q-label">Ticket / RSVP Link (Optional)</div>
                <input
                  type="text"
                  value={eventLink}
                  onChange={(e) => setEventLink(e.target.value)}
                  placeholder="https://example.com/tickets"
                />
              </div>

              <div className="q">
                <div className="q-label">Admin Passcode *</div>
                <input
                  type="password"
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="Enter secret passcode"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShowAdminModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit"
                  style={{ flex: 2, padding: '12px' }}
                  disabled={broadcasting}
                >
                  {broadcasting ? 'Broadcasting...' : 'Send Broadcast Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
