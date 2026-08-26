'use client';

import React, { useState } from 'react';
import { SurveyResponse } from '@/types/survey';
import { formatPhoneNumber } from '@/lib/formatPhone';

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
const DRINKS = ["Mimosa", "Mocktail", "Both please"];

const DATES = [
  "Sat, Sep 26",
  "Sun, Sep 27",
  "Any date",
];

function formatCityName(slug: string): string {
  if (!slug) return 'Chicago';
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

  // Admin Broadcast Modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [winningDate, setWinningDate] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin SMS Broadcast state
  const [smsMessage, setSmsMessage] = useState('');
  const [showSmsConfirmModal, setShowSmsConfirmModal] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsToast, setSmsToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Contact list search and filter controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGathering, setFilterGathering] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

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
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const trimmedPasscode = passcode.trim();
    if (!trimmedPasscode) {
      setAuthError('Please enter the passcode.');
      return;
    }

    setAuthenticating(true);

    try {
      await fetchResults(trimmedPasscode, selectedCity);
      setAuthenticated(true);
      setAdminPasscode(trimmedPasscode);
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
        await fetchResults(passcode, newCity);
      } catch (err: any) {
        console.error('Failed to update city filter:', err);
      }
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

  const writeInGatherings = responses.filter((r) => r.customGathering).map((r) => `${r.customGathering} — ${r.name}`);
  const writeInDates = responses.filter((r) => r.customDate).map((r) => `${r.customDate} — ${r.name}`);
  const writeInTimes = responses.filter((r) => r.customTime).map((r) => `${r.customTime} — ${r.name}`);

  const smsOptedInResponses = responses.filter(
    (r) => r.smsOptIn && r.phoneNumber && r.phoneNumber.replace(/\D/g, '').length >= 10
  );

  const filteredResponses = responses.filter((r) => {
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

  const handleOpenAdminModal = () => {
    setWinningDate(topDateOption || DATES[0]);
    setEventDetails('Join us for a relaxing morning of yoga, mimosa toasts, and great conversation with local neighbors!');
    setEventLink('');
    setShowAdminModal(true);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    const activePasscode = adminPasscode.trim() || passcode.trim();

    if (!activePasscode) {
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
          adminSecret: activePasscode,
          city: selectedCity,
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
        text: `Success! ${data.sentCount} text message${data.sentCount === 1 ? '' : 's'} sent successfully to opted-in attendees 🎉`,
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
      'Timestamp',
      'Name',
      'Email',
      'Phone Number',
      'SMS Opt-In',
      'Will bring',
      'Gatherings',
      'Write-in gathering',
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
        r.city || 'chicago',
        r.createdAt ? (r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toISOString() : String(r.createdAt)) : '',
        r.name,
        r.email,
        r.phoneNumber ? `'${r.phoneNumber}` : '',
        r.smsOptIn ? 'Yes' : 'No',
        r.guests,
        (r.gatherings || []).join('; '),
        r.customGathering || '',
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
    link.setAttribute('download', `gathering-responses-${selectedCity}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFilteredCSV = () => {
    const headers = [
      'City',
      'Name',
      'Email',
      'Phone',
      'Bringing',
      'Interests',
      'Preferred Dates',
      'Preferred Times',
      'Notes',
    ];

    const escapeCsv = (str: any) => `"${String(str == null ? '' : str).replace(/"/g, '""')}"`;

    const csvLines = [headers.map(escapeCsv).join(',')];

    filteredResponses.forEach((r) => {
      const allGaths = [
        ...(Array.isArray(r.gatherings) ? r.gatherings : []),
        ...(r.customGathering ? [`"${r.customGathering}"`] : []),
      ].join('; ');

      const allDates = [
        ...(Array.isArray(r.dates) ? r.dates : []),
        ...(r.customDate ? [`"${r.customDate}"`] : []),
      ].join('; ');

      const allTimes = [
        ...(Array.isArray(r.times) ? r.times : []),
        ...(r.customTime ? [`"${r.customTime}"`] : []),
      ].join('; ');

      const line = [
        formatCityName(r.city || 'chicago'),
        r.name || '',
        r.email || '',
        r.phoneNumber ? `'${r.phoneNumber}` : '',
        r.guests || '',
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
          margin-bottom: 24px;
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
          margin-bottom: 22px;
        }

        .q:last-child {
          margin-bottom: 0;
        }

        .q-label {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 6px;
        }

        input[type='text'],
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
          <div className="eyebrow">ACTUALLY · MULTI-CITY ADMIN</div>
          <h1>
            Actually · <em>Admin Dashboard</em>
          </h1>
          <p className="sub">
            Protected survey results, guest analytics, and email broadcast controls per city.
          </p>
        </header>

        {!authenticated ? (
          <div className="card">
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.4rem', marginBottom: '14px' }}>
              🔒 Protected Admin Area
            </h2>
            <p className="sub" style={{ marginBottom: '20px' }}>
              Please enter the admin passcode to unlock survey results and access announcement controls.
            </p>

            {authError && <div className="form-error">{authError}</div>}

            <form onSubmit={handleLogin}>
              <div className="q">
                <div className="q-label">Admin Passcode</div>
                <input
                  type="password"
                  placeholder="Enter secret passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                />
              </div>

              <button className="submit" type="submit" disabled={authenticating}>
                {authenticating ? 'Authenticating…' : 'Unlock Dashboard'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            {/* City Filter Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', background: 'var(--card)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)' }}>
                📍 Filter by City:
              </span>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--line)',
                  background: 'var(--cream)',
                  fontFamily: 'inherit',
                  fontSize: '0.92rem',
                  color: 'var(--ink)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="all">🌍 All Cities</option>
                <option value="chicago">🏙️ Chicago</option>
                <option value="san-francisco">🌉 San Francisco</option>
                <option value="new-york">🗽 New York</option>
                <option value="austin">🤠 Austin</option>
              </select>
            </div>

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
                <span>📅 Best dates ({formatCityName(selectedCity)})</span>
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

            {(writeInGatherings.length > 0 || writeInDates.length > 0 || writeInTimes.length > 0) && (
              <div className="card">
                <div className="res-title">✍️ Write-in requests</div>
                {writeInGatherings.length > 0 && (
                  <>
                    <div style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '6px' }}>
                      Gathering Ideas &amp; Suggestions
                    </div>
                    <ul style={{ margin: '0 0 10px 18px', fontSize: '0.92rem' }}>
                      {writeInGatherings.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                <div className="res-title" style={{ margin: 0 }}>Contact list ({responses.length})</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
                    Showing <strong>{filteredResponses.length}</strong> of <strong>{responses.length}</strong> contacts
                    {(searchQuery || filterGathering !== 'all' || filterTime !== 'all' || filterDate !== 'all') && ' (Filtered)'}
                  </span>
                  <button
                    type="button"
                    onClick={exportFilteredCSV}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s',
                    }}
                    className="hover:border-[#C8643F] hover:text-[#C8643F]"
                  >
                    📥 Export CSV
                  </button>
                </div>
              </div>

              {/* Search & Filter Controls Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', margin: '14px 0 16px', background: 'var(--cream-2)', padding: '14px', borderRadius: '14px', border: '1px solid var(--line)' }}>
                {/* Search Bar */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                    🔍 Search Contacts
                  </label>
                  <input
                    type="text"
                    placeholder="Search name, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      color: 'var(--ink)',
                    }}
                  />
                </div>

                {/* Gathering / Interest Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                    ✨ Filter by Interest
                  </label>
                  <select
                    value={filterGathering}
                    onChange={(e) => setFilterGathering(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      color: 'var(--ink)',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Interests ({responses.length})</option>
                    {GATHERINGS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Time Slot Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                    ⏰ Filter by Time
                  </label>
                  <select
                    value={filterTime}
                    onChange={(e) => setFilterTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      color: 'var(--ink)',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Times</option>
                    {TIMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                    📅 Filter by Date
                  </label>
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      fontSize: '0.88rem',
                      fontFamily: 'inherit',
                      color: 'var(--ink)',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Dates</option>
                    {DATES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Clear / Reset Filters Button */}
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterGathering('all');
                      setFilterTime('all');
                      setFilterDate('all');
                    }}
                    disabled={!searchQuery && filterGathering === 'all' && filterTime === 'all' && filterDate === 'all'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--line)',
                      background: (searchQuery || filterGathering !== 'all' || filterTime !== 'all' || filterDate !== 'all') ? 'var(--terra)' : 'var(--cream-2)',
                      color: (searchQuery || filterGathering !== 'all' || filterTime !== 'all' || filterDate !== 'all') ? '#FFFFFF' : 'var(--ink-soft)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: (searchQuery || filterGathering !== 'all' || filterTime !== 'all' || filterDate !== 'all') ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                  >
                    ↺ Clear Filters
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>City</th>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>Name</th>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>Email</th>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>Phone</th>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>Bringing</th>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>Interests / Gatherings</th>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>Preferred Dates</th>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>Preferred Times</th>
                      <th style={{ verticalAlign: 'bottom', padding: '10px 8px', textAlign: 'left' }}>Notes / Suggestions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResponses.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                          No contacts match your current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredResponses.map((r, idx) => {
                        const rawGatherings = Array.isArray(r.gatherings) ? r.gatherings : [];
                        const rawDates = Array.isArray(r.dates) ? r.dates : [];
                        const rawTimes = Array.isArray(r.times) ? r.times : [];

                        return (
                          <tr key={r.id || idx} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                              <strong>{formatCityName(r.city || 'chicago')}</strong>
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '12px 8px', fontWeight: 600 }}>
                              {r.name || '—'}
                            </td>
                            <td className="em" style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                              {r.email ? (
                                <a href={`mailto:${r.email}`} style={{ color: 'var(--terra)', textDecoration: 'underline' }}>
                                  {r.email}
                                </a>
                              ) : '—'}
                            </td>
                            <td className="em" style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                              {r.phoneNumber ? (
                                <div>
                                  <div>{formatPhoneNumber(r.phoneNumber)}</div>
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: '8px',
                                    marginTop: '2px',
                                    backgroundColor: r.smsOptIn ? '#EAF0E6' : '#F4EEE2',
                                    color: r.smsOptIn ? '#3B5730' : '#8C8270',
                                    border: `1px solid ${r.smsOptIn ? '#BACFB2' : '#D8CEBC'}`,
                                    fontWeight: 600,
                                  }}>
                                    {r.smsOptIn ? '✓ SMS Opt-In' : 'No SMS'}
                                  </span>
                                </div>
                              ) : '—'}
                            </td>
                            <td className="em" style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                              {r.guests || '—'}
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '280px' }}>
                                {rawGatherings.map((g, gIdx) => (
                                  <span key={gIdx} style={{
                                    display: 'inline-block',
                                    backgroundColor: '#F4EEE2',
                                    border: '1px solid #D8CEBC',
                                    color: '#2B271F',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    lineHeight: 1.3,
                                  }}>
                                    {g}
                                  </span>
                                ))}
                                {r.customGathering && (
                                  <span style={{
                                    display: 'inline-block',
                                    backgroundColor: '#FBF0E4',
                                    border: '1px solid #E4C0A2',
                                    color: '#A24A28',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    lineHeight: 1.3,
                                  }}>
                                    ✍️ &ldquo;{r.customGathering}&rdquo;
                                  </span>
                                )}
                                {rawGatherings.length === 0 && !r.customGathering && <span style={{ color: 'var(--ink-soft)' }}>—</span>}
                              </div>
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '180px' }}>
                                {rawDates.map((d, dIdx) => (
                                  <span key={dIdx} style={{
                                    display: 'inline-block',
                                    backgroundColor: '#EAF0E6',
                                    border: '1px solid #BACFB2',
                                    color: '#3B5730',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    lineHeight: 1.3,
                                  }}>
                                    {d}
                                  </span>
                                ))}
                                {r.customDate && (
                                  <span style={{
                                    display: 'inline-block',
                                    backgroundColor: '#FDF7E7',
                                    border: '1px solid #E6D29A',
                                    color: '#826012',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    lineHeight: 1.3,
                                  }}>
                                    ✍️ {r.customDate}
                                  </span>
                                )}
                                {rawDates.length === 0 && !r.customDate && <span style={{ color: 'var(--ink-soft)' }}>—</span>}
                              </div>
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '180px' }}>
                                {rawTimes.map((t, tIdx) => (
                                  <span key={tIdx} style={{
                                    display: 'inline-block',
                                    backgroundColor: '#EAEFF8',
                                    border: '1px solid #B8CBEA',
                                    color: '#27477D',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    lineHeight: 1.3,
                                  }}>
                                    {t}
                                  </span>
                                ))}
                                {r.customTime && (
                                  <span style={{
                                    display: 'inline-block',
                                    backgroundColor: '#F5ECF8',
                                    border: '1px solid #D9BFDF',
                                    color: '#6A2E78',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    lineHeight: 1.3,
                                  }}>
                                    ✍️ {r.customTime}
                                  </span>
                                )}
                                {rawTimes.length === 0 && !r.customTime && <span style={{ color: 'var(--ink-soft)' }}>—</span>}
                              </div>
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                              {r.notes ? (
                                <span style={{ fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', display: 'block', maxWidth: '200px', wordBreak: 'break-word' }}>
                                  &ldquo;{r.notes}&rdquo;
                                </span>
                              ) : (
                                <span style={{ color: 'var(--ink-soft)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="row-actions">
                <button className="ghost" onClick={exportCSV}>
                  ⬇ Export All (CSV)
                </button>
                <button className="ghost" onClick={exportFilteredCSV}>
                  📥 Export Filtered ({filteredResponses.length} rows)
                </button>
              </div>
            </div>

            {/* SMS Broadcast Panel */}
            <div className="card">
              <div className="res-title">📱 SMS Broadcast Panel ({formatCityName(selectedCity)})</div>
              <p className="q-help" style={{ marginBottom: '14px' }}>
                Send an instant text message alert to attendees who opted into SMS updates.
              </p>

              <div style={{ background: 'var(--cream-2)', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.9rem', color: 'var(--sage-deep)', fontWeight: 600 }}>
                📲 Sending to {smsOptedInResponses.length} opted-in attendee{smsOptedInResponses.length === 1 ? '' : 's'} {selectedCity !== 'all' ? `in ${formatCityName(selectedCity)}` : 'across all cities'}
              </div>

              {smsToast && (
                <div className={`toast ${smsToast.type}`} style={{ marginBottom: '14px' }}>
                  {smsToast.text}
                </div>
              )}

              <div className="q">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div className="q-label" style={{ fontSize: '0.95rem' }}>SMS Message Text</div>
                  <span style={{ fontSize: '0.82rem', color: smsMessage.length >= 160 ? 'var(--terra)' : 'var(--ink-soft)', fontWeight: 600 }}>
                    {smsMessage.length} / 160 chars
                  </span>
                </div>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="e.g. Winner date selected! Check your email for details & RSVP tickets for Actually Let's Chicago."
                  maxLength={160}
                  rows={3}
                />
              </div>

              <button
                type="button"
                className="submit"
                style={{ marginTop: '8px', padding: '14px', background: 'var(--sage-deep)' }}
                disabled={!smsMessage.trim() || smsOptedInResponses.length === 0}
                onClick={() => setShowSmsConfirmModal(true)}
              >
                📲 Send SMS Broadcast ({smsOptedInResponses.length} Recipients)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Email Broadcast Modal */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📧 Broadcast Announcement ({formatCityName(selectedCity)})</div>
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
                  placeholder="e.g. Sat, Sep 12"
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

      {/* Admin SMS Broadcast Confirmation Modal */}
      {showSmsConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowSmsConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📲 Confirm SMS Broadcast</div>
              <button className="close-btn" onClick={() => setShowSmsConfirmModal(false)}>
                &times;
              </button>
            </div>

            <p style={{ margin: '12px 0 16px', color: 'var(--ink)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to send this text message to <strong>{smsOptedInResponses.length} opted-in attendee{smsOptedInResponses.length === 1 ? '' : 's'}</strong> ({formatCityName(selectedCity)})?
            </p>

            <div style={{ background: 'var(--cream)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)', fontStyle: 'italic', marginBottom: '20px', fontSize: '0.9rem', color: 'var(--ink)' }}>
              "{smsMessage}"
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
                onClick={() => setShowSmsConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="submit"
                style={{ flex: 2, padding: '12px', background: 'var(--sage-deep)' }}
                disabled={sendingSms}
                onClick={handleSendSmsBroadcast}
              >
                {sendingSms ? 'Sending SMS...' : 'Confirm & Send Texts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
