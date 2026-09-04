'use client';

import React, { useState } from 'react';
import { SurveyResponse } from '@/types/survey';
import { formatPhoneNumber } from '@/lib/formatPhone';
import { BroadcastRecord } from '@/lib/firebase';

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

  // Announce Winning Date Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [modalStep, setModalStep] = useState<'configure' | 'review'>('configure');
  const [winningDate, setWinningDate] = useState('');
  const [eventTimeWindow, setEventTimeWindow] = useState('10:00 AM – 12:00 PM CDT');
  const [venueName, setVenueName] = useState('Lincoln Park Conservatory');
  const [venueAddress, setVenueAddress] = useState('2391 N Stockton Dr, Chicago, IL');
  const [eventLink, setEventLink] = useState('');
  const [hostNote, setHostNote] = useState("Can't wait to gather, stretch, and connect with everyone! Bring a mat if you have one, but we'll have extras.");
  const [confirmInput, setConfirmInput] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<'groupA' | 'groupB' | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [testEmail, setTestEmail] = useState('admin@actuallylets.com');
  const [isDispatching, setIsDispatching] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      setAuthError('Please enter the passcode.');
      return;
    }

    setAuthenticating(true);

    try {
      await Promise.all([
        fetchResults(trimmedPasscode, selectedCity),
        loadBroadcasts(selectedCity, trimmedPasscode),
      ]);
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
        await Promise.all([
          fetchResults(passcode, newCity),
          loadBroadcasts(newCity, passcode),
        ]);
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

  const selectedDateStr = winningDate || (topDateOption || DATES[0]);

  // Group A (Available): Contacts who voted for the selected date or selected "Any date"
  const groupA = responses.filter((r) => {
    const rDates = Array.isArray(r.dates) ? r.dates : [];
    const customDate = (r.customDate || '').toLowerCase();
    const hasWinningDate = rDates.includes(selectedDateStr);
    const hasAnyDate = rDates.some((d) => d.toLowerCase().includes('any date')) || customDate.includes('any date');
    const customMatch = customDate.includes(selectedDateStr.toLowerCase());
    return hasWinningDate || hasAnyDate || customMatch;
  });

  // Group B (Unavailable): Contacts who voted only for other dates
  const groupB = responses.filter((r) => {
    const inA = groupA.some((a) => (a.id && r.id && a.id === r.id) || (a.email && r.email && a.email.toLowerCase() === r.email.toLowerCase()));
    return !inA;
  });

  const handleOpenAdminModal = () => {
    const defaultDate = topDateOption || DATES[0];
    setWinningDate(defaultDate);
    setEventTimeWindow('10:00 AM – 12:00 PM CDT');
    setVenueName('Lincoln Park Conservatory');
    setVenueAddress('2391 N Stockton Dr, Chicago, IL');
    setEventLink('');
    setHostNote("Can't wait to gather, stretch, and connect with everyone! Bring a mat if you have one, but we'll have extras.");
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
          groupARecipients: groupA.map((r) => ({ name: r.name, email: r.email })),
          groupBRecipients: groupB.map((r) => ({ name: r.name, email: r.email })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Announcement dispatch failed.');
      }

      if (data.isDryRun) {
        setToastMessage({
          type: 'success',
          text: `🧪 Test mode success! Sent 2 sample preview emails (Group A & Group B) directly to ${data.testEmail || 'admin@actuallylets.com'}.`,
        });
      } else {
        setToastMessage({
          type: 'success',
          text: `🎉 Success! Live announcement broadcast sent to ${data.totalSent} attendees (${data.groupACount} Group A, ${data.groupBCount} Group B)!`,
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
        text: `✉️ Sent details to ${data.recipient} (Group ${data.group})!`,
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

        .history-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(43, 39, 31, 0.45);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.2s ease-out;
        }

        .history-drawer-content {
          background: var(--card);
          width: 100%;
          max-width: 520px;
          height: 100vh;
          overflow-y: auto;
          padding: 28px 24px;
          box-shadow: -4px 0 24px rgba(43, 39, 31, 0.15);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .mobile-scroll-hint {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-scroll-hint {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.78rem;
            color: #7C7267;
            margin-bottom: 8px;
            font-weight: 500;
          }
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

            {/* Confirmed Gathering Post-Broadcast Banner */}
            {broadcasts.length > 0 && (
              <div
                className="card confirmed-gathering-banner"
                style={{
                  background: 'linear-gradient(135deg, #FAF4EB 0%, #F5ECE0 100%)',
                  border: '2px solid #D8C3A8',
                  borderRadius: '16px',
                  padding: '20px 22px',
                  marginBottom: '22px',
                  boxShadow: '0 4px 16px rgba(162, 74, 40, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ flex: '1 1 320px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EAF0E6', border: '1px solid #BACFB2', color: '#3B5730', padding: '3px 10px', borderRadius: '12px', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      <span>🎉 Confirmed Gathering · {formatCityName(broadcasts[0].city || selectedCity)}</span>
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontFamily: 'Fraunces, Georgia, serif', fontSize: '1.45rem', color: '#2B271F' }}>
                      {broadcasts[0].winningDate}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '0.88rem', color: '#5A5243' }}>
                      <span>⏰ {broadcasts[0].timeWindow || '10:00 AM – 12:00 PM CDT'}</span>
                      <span>
                        📍 <strong>{broadcasts[0].venueName}</strong>
                        {broadcasts[0].venueAddress && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(`${broadcasts[0].venueName} ${broadcasts[0].venueAddress}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#C8643F', textDecoration: 'underline', marginLeft: '5px' }}
                          >
                            ({broadcasts[0].venueAddress}) ↗
                          </a>
                        )}
                      </span>
                    </div>
                    {broadcasts[0].customNote && (
                      <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#6A6253', fontStyle: 'italic', background: 'rgba(255,255,255,0.6)', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E6DEC8' }}>
                        &ldquo;{broadcasts[0].customNote}&rdquo;
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flex: '0 0 auto' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#EAF0E6', border: '1px solid #BACFB2', color: '#3B5730', padding: '3px 8px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 600 }}>
                        Group A: {broadcasts[0].groupACount}
                      </span>
                      <span style={{ background: '#F4EEE2', border: '1px solid #D8CEBC', color: '#6A6253', padding: '3px 8px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 600 }}>
                        Group B: {broadcasts[0].groupBCount}
                      </span>
                      <span style={{ background: '#EDE4D3', border: '1px solid #D8CEBC', color: '#2B271F', padding: '3px 8px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 700 }}>
                        Total: {broadcasts[0].totalDispatched} Notified
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setShowHistoryDrawer(true)}
                        style={{
                          background: '#FFFFFF',
                          border: '1.5px solid #D8CEBC',
                          color: '#2B271F',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        📜 View Broadcast History ({broadcasts.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAdminModal}
                        style={{
                          background: '#C8643F',
                          border: 'none',
                          color: '#FFFFFF',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(200, 100, 63, 0.25)',
                        }}
                      >
                        📢 Update Announcement
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

              {/* Mobile/Tablet Scroll Indicator */}
              <div className="text-xs text-[#8C827A] flex items-center gap-1.5 mb-2 md:hidden" style={{ fontSize: '0.78rem', color: '#8C827A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span>↔ Scroll horizontally to view all attendee details</span>
              </div>

              {/* Dedicated Table Scroll Wrapper */}
              <div className="w-full overflow-x-auto border border-[#E8E1D5] rounded-xl my-4 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]" style={{ overflowX: 'auto', width: '100%', borderRadius: '12px', border: '1px solid #E8E1D5', margin: '16px 0', background: '#FFFFFF', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
                <table style={{ minWidth: '1280px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#FAF7F2', borderBottom: '1.5px solid #E8E1D5' }}>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '90px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>CITY</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '130px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>NAME</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '200px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>EMAIL</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '130px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>PHONE</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '80px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>BRINGING</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '260px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>INTERESTS / GATHERINGS</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '180px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>PREFERRED DATES</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '160px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>PREFERRED TIMES</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'left', minWidth: '200px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>NOTES / CUSTOM</th>
                      <th style={{ verticalAlign: 'bottom', padding: '12px 10px', textAlign: 'center', minWidth: '130px', fontSize: '0.82rem', color: '#6A6253', fontWeight: 700 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResponses.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-soft)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                          No contacts match your current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredResponses.map((r, idx) => {
                        const rawGatherings = Array.isArray(r.gatherings) ? r.gatherings : [];
                        const rawDates = Array.isArray(r.dates) ? r.dates : [];
                        const rawTimes = Array.isArray(r.times) ? r.times : [];

                        return (
                          <tr key={r.id || idx} style={{ borderBottom: '1px solid #EFEAE1' }}>
                            <td style={{ verticalAlign: 'top', padding: '12px 10px', minWidth: '90px' }}>
                              <strong>{formatCityName(r.city || 'chicago')}</strong>
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '12px 10px', fontWeight: 600, minWidth: '130px' }}>
                              {r.name || '—'}
                            </td>
                            <td className="em" style={{ verticalAlign: 'top', padding: '12px 10px', minWidth: '200px' }}>
                              {r.email ? (
                                <a href={`mailto:${r.email}`} style={{ color: 'var(--terra)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                                  {r.email}
                                </a>
                              ) : '—'}
                            </td>
                            <td className="em" style={{ verticalAlign: 'top', padding: '12px 10px', minWidth: '130px' }}>
                              {r.phoneNumber ? (
                                <div>
                                  <div style={{ whiteSpace: 'nowrap' }}>{formatPhoneNumber(r.phoneNumber)}</div>
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: '8px',
                                    marginTop: '3px',
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
                            <td className="em" style={{ verticalAlign: 'top', padding: '12px 10px', minWidth: '80px' }}>
                              {r.guests || '—'}
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '12px 10px', minWidth: '260px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '320px', minWidth: '240px' }}>
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
                            <td style={{ verticalAlign: 'top', padding: '12px 10px', minWidth: '180px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minWidth: '160px' }}>
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
                            <td style={{ verticalAlign: 'top', padding: '12px 10px', minWidth: '160px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minWidth: '140px' }}>
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
                            <td style={{ verticalAlign: 'top', padding: '12px 10px', minWidth: '200px' }}>
                              {r.notes ? (
                                <span style={{ fontSize: '0.82rem', color: 'var(--ink)', fontStyle: 'italic', display: 'block', maxWidth: '240px', wordBreak: 'break-word', lineHeight: 1.4 }}>
                                  &ldquo;{r.notes}&rdquo;
                                </span>
                              ) : (
                                <span style={{ color: 'var(--ink-soft)' }}>—</span>
                              )}
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '12px 10px', textAlign: 'center', minWidth: '130px' }}>
                              {r.email && r.email.includes('@') ? (
                                <button
                                  type="button"
                                  onClick={() => handleResendInvite(r)}
                                  disabled={resendingEmail === r.email || broadcasts.length === 0}
                                  title={broadcasts.length === 0 ? 'Announce winning date first' : `Email event details to ${r.email}`}
                                  style={{
                                    background: (broadcasts.length === 0 || resendingEmail === r.email) ? '#F4EEE2' : '#FFFFFF',
                                    border: `1.5px solid ${broadcasts.length === 0 ? '#D8CEBC' : 'var(--terra)'}`,
                                    color: broadcasts.length === 0 ? '#8C8270' : 'var(--terra)',
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.76rem',
                                    fontWeight: 600,
                                    cursor: broadcasts.length === 0 ? 'not-allowed' : 'pointer',
                                    boxShadow: broadcasts.length === 0 ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap',
                                    opacity: resendingEmail === r.email ? 0.7 : 1,
                                  }}
                                >
                                  {resendingEmail === r.email ? '⏳ Sending...' : '✉️ Email Details'}
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.74rem', color: 'var(--ink-soft)', fontStyle: 'italic' }}>No email</span>
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

      {/* Admin Email Broadcast / Announce Winning Date Modal */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <div className="modal-title" style={{ fontSize: '1.15rem' }}>
                  📢 Announce Winning Date ({formatCityName(selectedCity)})
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                  Configure event details, venue, and review audience segmentation before dispatching.
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowAdminModal(false)}>
                &times;
              </button>
            </div>

            {/* Step navigation tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', background: 'var(--cream-2)', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setModalStep('configure')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: modalStep === 'configure' ? 'var(--card)' : 'transparent',
                  color: modalStep === 'configure' ? 'var(--ink)' : 'var(--ink-soft)',
                  boxShadow: modalStep === 'configure' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                1. Event Details Form
              </button>
              <button
                type="button"
                onClick={() => setModalStep('review')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: modalStep === 'review' ? 'var(--card)' : 'transparent',
                  color: modalStep === 'review' ? 'var(--ink)' : 'var(--ink-soft)',
                  boxShadow: modalStep === 'review' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                2. Review &amp; Segmentation Preview
              </button>
            </div>

            {toastMessage && (
              <div className={`toast ${toastMessage.type}`} style={{ marginBottom: '16px' }}>
                {toastMessage.text}
              </div>
            )}

            {modalStep === 'configure' ? (
              <div>
                {/* 1. Winning Date Selector */}
                <div className="q" style={{ marginBottom: '14px' }}>
                  <div className="q-label" style={{ fontSize: '0.88rem', marginBottom: '4px' }}>
                    🏆 Select Winning Date
                  </div>
                  <select
                    value={winningDate}
                    onChange={(e) => setWinningDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--line)',
                      background: 'var(--card)',
                      fontSize: '0.92rem',
                      fontFamily: 'inherit',
                      color: 'var(--ink)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {DATES.map((d) => (
                      <option key={d} value={d}>
                        {d} {topDateOption === d ? '🔥 (Top Poll Winner)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Event Time Window */}
                <div className="q" style={{ marginBottom: '14px' }}>
                  <div className="q-label" style={{ fontSize: '0.88rem', marginBottom: '4px' }}>
                    ⏰ Event Time Window
                  </div>
                  <input
                    type="text"
                    value={eventTimeWindow}
                    onChange={(e) => setEventTimeWindow(e.target.value)}
                    placeholder="e.g. 10:00 AM – 12:00 PM CDT"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--card)' }}
                  />
                </div>

                {/* 3. Venue Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div className="q" style={{ margin: 0 }}>
                    <div className="q-label" style={{ fontSize: '0.88rem', marginBottom: '4px' }}>
                      📍 Venue Name <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--ink-soft)' }}>(Optional)</span>
                    </div>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. Lincoln Park Conservatory (Optional)"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--card)' }}
                    />
                  </div>
                  <div className="q" style={{ margin: 0 }}>
                    <div className="q-label" style={{ fontSize: '0.88rem', marginBottom: '4px' }}>
                      🗺️ Venue Address <span style={{ fontSize: '0.76rem', fontWeight: 400, color: 'var(--ink-soft)' }}>(Optional)</span>
                    </div>
                    <input
                      type="text"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      placeholder="e.g. 2391 N Stockton Dr, Chicago, IL (Optional)"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--card)' }}
                    />
                  </div>
                </div>

                {/* 4. Ticket / RSVP Link */}
                <div className="q" style={{ marginBottom: '14px' }}>
                  <div className="q-label" style={{ fontSize: '0.88rem', marginBottom: '4px' }}>
                    🎟️ External RSVP / Ticket URL (Partiful, Eventbrite, Luma)
                  </div>
                  <input
                    type="text"
                    value={eventLink}
                    onChange={(e) => setEventLink(e.target.value)}
                    placeholder="https://partiful.com/e/... or https://eventbrite.com/..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--card)' }}
                  />
                </div>

                {/* 5. Custom Note from Lola */}
                <div className="q" style={{ marginBottom: '16px' }}>
                  <div className="q-label" style={{ fontSize: '0.88rem', marginBottom: '4px' }}>
                    ✍️ Custom Note from Lola (Host Note)
                  </div>
                  <textarea
                    value={hostNote}
                    onChange={(e) => setHostNote(e.target.value)}
                    placeholder="Write a personal note to the community..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--line)', background: 'var(--card)' }}
                  />
                </div>

                {/* Live Segmentation Quick Stat Pill */}
                <div style={{ background: 'var(--cream-2)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--ink)', fontWeight: 600 }}>
                    👥 Audience Preview for <strong>{selectedDateStr}</strong>:
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', background: '#EAF0E6', color: '#3B5730', border: '1px solid #BACFB2', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>
                      Group A (Available): {groupA.length}
                    </span>
                    <span style={{ fontSize: '0.78rem', background: '#F4EEE2', color: '#8C8270', border: '1px solid #D8CEBC', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>
                      Group B (Other): {groupB.length}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="ghost"
                    style={{ flex: 1 }}
                    onClick={() => setShowAdminModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="submit"
                    style={{ flex: 2, padding: '12px' }}
                    onClick={() => setModalStep('review')}
                  >
                    Continue to Review &amp; Preview →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDispatchAnnouncements}>
                {/* Event Summary Overview Card */}
                <div style={{ background: 'var(--cream-2)', borderRadius: '12px', padding: '14px 16px', border: '1px solid var(--line)', marginBottom: '16px', fontSize: '0.88rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--terra)', marginBottom: '6px', fontSize: '0.92rem' }}>
                    📌 Announcement Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>Winning Date:</span>
                    <strong>{selectedDateStr}</strong>
                    <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>Time Window:</span>
                    <span>{eventTimeWindow || 'TBD'}</span>
                    <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>Venue:</span>
                    <span>{venueName.trim() ? (venueAddress.trim() ? `${venueName.trim()} (${venueAddress.trim()})` : venueName.trim()) : (venueAddress.trim() || 'Location TBD')}</span>
                    {eventLink && (
                      <>
                        <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>RSVP Link:</span>
                        <span style={{ color: 'var(--terra)', wordBreak: 'break-all' }}>{eventLink}</span>
                      </>
                    )}
                    {hostNote && (
                      <>
                        <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>Host Note:</span>
                        <span style={{ fontStyle: 'italic' }}>&ldquo;{hostNote}&rdquo;</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Audience Segmentation Cards */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
                    📊 Audience Segmentation Preview ({responses.length} Total Contacts)
                  </div>

                  {/* Group A (Available) */}
                  <div style={{ background: '#FFFFFF', border: '1.5px solid #BACFB2', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#3B5730', fontSize: '0.9rem' }}>
                          🟢 Group A: Available Attendees ({groupA.length})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                          Voted for <strong>{selectedDateStr}</strong> or selected <strong>"Any date"</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedGroup(expandedGroup === 'groupA' ? null : 'groupA')}
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid #BACFB2',
                          background: '#EAF0E6',
                          color: '#3B5730',
                          cursor: 'pointer',
                        }}
                      >
                        {expandedGroup === 'groupA' ? 'Hide List ▲' : `View ${groupA.length} Attendees ▼`}
                      </button>
                    </div>

                    {expandedGroup === 'groupA' && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #BACFB2', maxHeight: '150px', overflowY: 'auto' }}>
                        {groupA.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', fontStyle: 'italic' }}>No attendees in this group.</div>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--ink)' }}>
                            {groupA.map((r, i) => (
                              <li key={r.id || i} style={{ marginBottom: '3px' }}>
                                <strong>{r.name}</strong> ({r.email || 'No email'}) — <span style={{ color: 'var(--ink-soft)' }}>Dates: {(r.dates || []).join(', ') || r.customDate || 'Any date'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Group B (Unavailable / Alternate Dates) */}
                  <div style={{ background: '#FFFFFF', border: '1.5px solid #D8CEBC', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#6A6253', fontSize: '0.9rem' }}>
                          ⚪ Group B: Other Date Attendees ({groupB.length})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                          Voted only for alternate dates (did not choose {selectedDateStr})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedGroup(expandedGroup === 'groupB' ? null : 'groupB')}
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid #D8CEBC',
                          background: '#F4EEE2',
                          color: '#6A6253',
                          cursor: 'pointer',
                        }}
                      >
                        {expandedGroup === 'groupB' ? 'Hide List ▲' : `View ${groupB.length} Attendees ▼`}
                      </button>
                    </div>

                    {expandedGroup === 'groupB' && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #D8CEBC', maxHeight: '150px', overflowY: 'auto' }}>
                        {groupB.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', fontStyle: 'italic' }}>No attendees in this group.</div>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--ink)' }}>
                            {groupB.map((r, i) => (
                              <li key={r.id || i} style={{ marginBottom: '3px' }}>
                                <strong>{r.name}</strong> ({r.email || 'No email'}) — <span style={{ color: 'var(--ink-soft)' }}>Dates: {(r.dates || []).join(', ') || r.customDate || 'None'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dry Run / Test Mode Toggle Box */}
                <div style={{
                  background: isDryRun ? '#F0F5ED' : '#FFF7F4',
                  border: `1.5px solid ${isDryRun ? '#6E7F5E' : '#C8643F'}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  transition: 'all 0.2s ease',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: isDryRun ? '#3B5730' : '#A24A28' }}>
                    <input
                      type="checkbox"
                      checked={isDryRun}
                      onChange={(e) => setIsDryRun(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4C5A40' }}
                    />
                    <span>🧪 Test Mode (Send preview exclusively to test email)</span>
                  </label>
                  {isDryRun ? (
                    <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#4C5A40' }}>
                      <p style={{ margin: '0 0 6px', lineHeight: 1.4 }}>
                        Sends 1 Group A and 1 Group B sample email directly to the address below. Zero emails will be sent to regular attendees.
                      </p>
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="admin@actuallylets.com"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #BACFB2',
                          fontSize: '0.85rem',
                          background: '#FFFFFF',
                          color: '#2B271F',
                        }}
                      />
                    </div>
                  ) : (
                    <p style={{ margin: '6px 0 0 28px', fontSize: '0.8rem', color: '#A24A28', lineHeight: 1.4 }}>
                      ⚠️ <strong>Live Mode Active:</strong> This will dispatch live announcements to all {groupA.length + groupB.length} contacts ({groupA.length} Group A, {groupB.length} Group B).
                    </p>
                  )}
                </div>

                {/* Safety Guard & Confirmation Text Lock */}
                <div style={{ background: '#FFF7F4', border: '1.5px solid var(--terra)', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>🔒</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--terra)' }}>
                      Safety Confirmation Lock
                    </span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--ink)', marginBottom: '10px', lineHeight: '1.45' }}>
                    To unlock {isDryRun ? 'test dispatch' : 'live announcement dispatch'}, type <strong>CONFIRM</strong> into the box below:
                  </p>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type CONFIRM to enable"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--terra)',
                      background: '#FFFFFF',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      color: 'var(--ink)',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="ghost"
                    style={{ flex: 1 }}
                    onClick={() => setModalStep('configure')}
                    disabled={isDispatching}
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="submit"
                    className="submit"
                    style={{
                      flex: 2,
                      padding: '12px',
                      background: (!isDispatching && confirmInput.trim().toUpperCase() === 'CONFIRM')
                        ? (isDryRun ? '#4C5A40' : 'var(--terra)')
                        : 'var(--line)',
                      color: (!isDispatching && confirmInput.trim().toUpperCase() === 'CONFIRM') ? '#FFFFFF' : 'var(--ink-soft)',
                      cursor: (!isDispatching && confirmInput.trim().toUpperCase() === 'CONFIRM') ? 'pointer' : 'not-allowed',
                    }}
                    disabled={isDispatching || confirmInput.trim().toUpperCase() !== 'CONFIRM'}
                  >
                    {isDispatching
                      ? 'Dispatching Announcements...'
                      : isDryRun
                      ? '🧪 Send Test Preview (2 Sample Emails)'
                      : '🚀 Dispatch Live Announcement to All Contacts'}
                  </button>
                </div>
              </form>
            )}
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

      {/* Broadcast History Drawer */}
      {showHistoryDrawer && (
        <div className="history-drawer-overlay" onClick={() => setShowHistoryDrawer(false)}>
          <div className="history-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--line)', paddingBottom: '12px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Fraunces, Georgia, serif', fontSize: '1.25rem', color: 'var(--ink)' }}>
                  📜 Broadcast History
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                  {formatCityName(selectedCity)} · {broadcasts.length} past announcement log{broadcasts.length === 1 ? '' : 's'}
                </div>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowHistoryDrawer(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--ink-soft)' }}
              >
                &times;
              </button>
            </div>

            {broadcasts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--ink-soft)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No broadcast announcements have been logged yet for this city view.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                      style={{
                        background: idx === 0 ? '#FAF7F2' : '#FFFFFF',
                        border: `1.5px solid ${idx === 0 ? '#D8C3A8' : '#E8E1D5'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--terra)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {idx === 0 ? '⭐ Latest Dispatch' : `Broadcast #${broadcasts.length - idx}`}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--ink-soft)' }}>
                          🕒 {formattedDate}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '4px' }}>
                        {b.winningDate}
                      </div>

                      <div style={{ fontSize: '0.84rem', color: '#5A5243', marginBottom: '8px', lineHeight: 1.4 }}>
                        <div>⏰ {b.timeWindow || '10:00 AM – 12:00 PM CDT'}</div>
                        <div>
                          📍 <strong>{b.venueName}</strong>{' '}
                          {b.venueAddress && (
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(`${b.venueName} ${b.venueAddress}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--terra)', textDecoration: 'underline' }}
                            >
                              ({b.venueAddress}) ↗
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Delivery Pills */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span style={{ background: '#EAF0E6', border: '1px solid #BACFB2', color: '#3B5730', padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                          Group A: {b.groupACount}
                        </span>
                        <span style={{ background: '#F4EEE2', border: '1px solid #D8CEBC', color: '#6A6253', padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                          Group B: {b.groupBCount}
                        </span>
                        <span style={{ background: '#EDE4D3', border: '1px solid #D8CEBC', color: '#2B271F', padding: '2px 7px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                          Total: {b.totalDispatched}
                        </span>
                      </div>

                      {b.customNote && (
                        <div style={{ fontSize: '0.78rem', color: '#6A6253', fontStyle: 'italic', background: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E8E1D5', marginTop: '6px' }}>
                          &ldquo;{b.customNote}&rdquo;
                        </div>
                      )}
                      {b.ticketUrl && (
                        <div style={{ marginTop: '6px', fontSize: '0.78rem' }}>
                          <a href={b.ticketUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline' }}>
                            🎟️ RSVP/Ticket URL ↗
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
    </>
  );
}
