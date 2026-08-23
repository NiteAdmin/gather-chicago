'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { generateCalendarDetails } from '@/lib/calendar';

interface ConfirmationCardProps {
  name: string;
  email: string;
  cityName: string;
  selectedGatherings: string[];
  selectedDates: string[];
  customDate?: string;
  selectedTimes: string[];
  customTime?: string;
  selectedDrink?: string;
  selectedGuests?: string;
  onReset?: () => void;
}

export default function ConfirmationCard({
  name,
  email,
  cityName,
  selectedGatherings,
  selectedDates,
  customDate,
  selectedTimes,
  customTime,
  selectedDrink,
  selectedGuests,
  onReset,
}: ConfirmationCardProps) {
  const [downloaded, setDownloaded] = useState(false);

  const calData = generateCalendarDetails({
    cityName,
    name,
    email,
    gatherings: selectedGatherings,
    dates: selectedDates,
    times: selectedTimes,
    customDate,
    customTime,
  });

  const handleDownloadIcs = () => {
    try {
      const blob = new Blob([calData.icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', calData.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to download .ics calendar file', err);
    }
  };

  const allDates = [...selectedDates, customDate].filter(Boolean);
  const allTimes = [...selectedTimes, customTime].filter(Boolean);

  return (
    <div className="card thanks-card" style={{ padding: '32px 24px', textAlign: 'center', backgroundColor: '#FBF7EE', border: '1px solid #D8CEBC', borderRadius: '20px', boxShadow: '0 18px 40px -22px rgba(43, 39, 31, 0.45)' }}>
      {/* Visual Badge */}
      <div style={{ fontSize: '2.8rem', lineHeight: 1, marginBottom: '12px' }}>🌿</div>

      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '2rem', fontWeight: 900, color: '#2B271F', margin: '0 0 8px' }}>
        Thank you, {name || 'friend'}!
      </h2>

      <p style={{ color: '#6A6253', fontSize: '1.02rem', maxWidth: '44ch', margin: '0 auto 24px', lineHeight: 1.5 }}>
        Your availability and preferences for <strong>{cityName}</strong> are saved. We&apos;ll tally everyone&apos;s votes and email your invite to <span style={{ color: '#2B271F', fontWeight: 600 }}>{email}</span>.
      </p>

      {/* Summary Box */}
      <div style={{ backgroundColor: '#EDE4D3', borderRadius: '14px', padding: '16px 18px', textAlign: 'left', margin: '0 auto 24px', maxWidth: '480px', fontSize: '0.88rem', border: '1px solid #D8CEBC' }}>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4C5A40', fontWeight: 700, marginBottom: '10px' }}>
          Your Selected Choices
        </div>

        {selectedGatherings.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#6A6253', fontWeight: 500 }}>Vibes: </span>
            <span style={{ color: '#2B271F', fontWeight: 600 }}>{selectedGatherings.join(', ')}</span>
          </div>
        )}

        {allDates.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#6A6253', fontWeight: 500 }}>Preferred Dates: </span>
            <span style={{ color: '#2B271F', fontWeight: 600 }}>{allDates.join(', ')}</span>
          </div>
        )}

        {allTimes.length > 0 && (
          <div style={{ marginBottom: (selectedDrink || selectedGuests) ? '8px' : '0' }}>
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

      {/* Add to Calendar Section */}
      <div style={{ margin: '24px auto 16px', maxWidth: '480px', padding: '18px 16px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #D8CEBC' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.1rem' }}>📅</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '1.05rem', color: '#2B271F' }}>
            Save a placeholder on your calendar
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#6A6253', marginBottom: '14px' }}>
          Keep your schedule open while we lock in the winning date &amp; venue.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {/* Google Calendar Link */}
          <a
            href={calData.googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#C8643F',
              color: '#FFFFFF',
              padding: '11px 18px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.86rem',
              textDecoration: 'none',
              transition: 'background-color 0.18s, transform 0.1s',
              boxShadow: '0 4px 12px -2px rgba(200, 100, 63, 0.35)',
              flex: '1 1 200px',
              maxWidth: '230px',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#b5582f')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#C8643F')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
            </svg>
            <span>Google Calendar</span>
          </a>

          {/* Download ICS Button */}
          <button
            type="button"
            onClick={handleDownloadIcs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#4C5A40',
              color: '#FFFFFF',
              padding: '11px 18px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.86rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.18s, transform 0.1s',
              boxShadow: '0 4px 12px -2px rgba(76, 90, 64, 0.35)',
              flex: '1 1 200px',
              maxWidth: '230px',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#3c4733')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4C5A40')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{downloaded ? 'Downloaded! ✓' : 'Apple / .ICS File'}</span>
          </button>
        </div>
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
              Submit another RSVP
            </button>
          </>
        )}
      </div>

      {/* Compliance / Entity Footer */}
      <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #D8CEBC', fontSize: '0.78rem', color: '#6A6253', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>Actually, Let&apos;s</strong> &bull; Austin, TX &bull;{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = 'mailto:rsvp@actuallylets.com';
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
    </div>
  );
}
