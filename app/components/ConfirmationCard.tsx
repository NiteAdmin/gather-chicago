'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { generateCalendarDetails } from '@/lib/calendar';
import { BrandName } from '@/components/brand/BrandName';

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
  selectedDrink?: string;
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
  const [downloaded, setDownloaded] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.host);
    }
  }, []);

  const subId = responseId || 'sample';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://actuallylets.com';
  const defaultHost = siteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const defaultProtocol = siteUrl.startsWith('http:') ? 'http:' : 'https:';
  const host = origin || (typeof window !== 'undefined' && window.location.host ? window.location.host : defaultHost);
  const protocol = typeof window !== 'undefined' && window.location.protocol ? window.location.protocol : defaultProtocol;
  const httpFeedUrl = `${protocol}//${host}/api/cal/sub/${subId}/events.ics`;
  const webcalUrl = `webcal://${host}/api/cal/sub/${subId}/events.ics`;
  const googleWebSubUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpFeedUrl)}`;

  const calData = generateCalendarDetails({
    cityName,
    name,
    email,
    gatherings: selectedGatherings,
    customGathering,
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

  const handleCopyUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(httpFeedUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = httpFeedUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch (err) {
      console.error('Failed to copy feed URL:', err);
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

      {/* Summary Box */}
      <div style={{ backgroundColor: '#EDE4D3', borderRadius: '14px', padding: '16px 18px', textAlign: 'left', margin: '0 auto 24px', maxWidth: '480px', fontSize: '0.88rem', border: '1px solid #D8CEBC' }}>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4C5A40', fontWeight: 700, marginBottom: '10px' }}>
          Your Selected Choices
        </div>

        {allGatherings.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#6A6253', fontWeight: 500 }}>Vibes: </span>
            <span style={{ color: '#2B271F', fontWeight: 600 }}>{allGatherings.join(', ')}</span>
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
      <div style={{ margin: '24px auto 16px', maxWidth: '490px', padding: '20px 18px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #D8CEBC', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.15rem' }}>📅</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '1.08rem', color: '#2B271F' }}>
            Keep your schedule open
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#6A6253', marginBottom: '16px' }}>
          Choose how you&apos;d like to save this gathering series to your calendar.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>
          {/* Multi-Platform Subscribe Trigger Button */}
          <button
            type="button"
            onClick={() => setShowSubModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#27477D',
              color: '#FFFFFF',
              padding: '12px 18px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.18s, transform 0.1s',
              boxShadow: '0 4px 12px -2px rgba(39, 71, 125, 0.35)',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1e3863')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#27477D')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>📅 Subscribe to Live Calendar Updates</span>
          </button>

          <p style={{ fontSize: '0.76rem', color: '#6A6253', margin: '0 0 4px', fontStyle: 'italic', lineHeight: 1.4 }}>
            Subscribing keeps your calendar automatically updated if the venue or locked time changes. If the host finalizes a Partiful, Eventbrite, or venue link, it will sync directly into your calendar.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
            {/* Google Calendar Link */}
            <a
              href={calData.googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#C8643F',
                color: '#FFFFFF',
                padding: '10px 14px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.82rem',
                textDecoration: 'none',
                transition: 'background-color 0.18s',
                flex: '1 1 180px',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#b5582f')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#C8643F')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
              </svg>
              <span>Add to Google Cal</span>
            </a>

            {/* Download ICS Button */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#4C5A40',
                color: '#FFFFFF',
                padding: '10px 14px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.18s',
                flex: '1 1 180px',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#3c4733')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4C5A40')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{downloaded ? 'Downloaded! ✓' : 'Download .ics File'}</span>
            </button>
          </div>

          <p className="text-[11px] text-stone-500 text-center font-medium mt-1">
            Compatible with Partiful, Eventbrite, Google, Apple &amp; Outlook feeds.
          </p>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(43, 39, 31, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSubModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #D8CEBC',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px 22px',
              boxShadow: '0 20px 45px -15px rgba(43, 39, 31, 0.45)',
              textAlign: 'left',
              position: 'relative',
            }}
          >
            {/* Header with Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.74rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#27477D', fontWeight: 700 }}>
                  Live Calendar Subscription
                </div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.35rem', fontWeight: 800, color: '#2B271F', margin: '2px 0 0' }}>
                  Subscribe to Updates 📅
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                style={{
                  background: '#F4EEE2',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  color: '#6A6253',
                  fontWeight: 'bold',
                }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#6A6253', lineHeight: 1.45, margin: '0 0 14px' }}>
              Choose your preferred calendar platform. As survey votes close and the venue/time is locked in, your calendar will update automatically in the background. If the host finalizes a Partiful, Eventbrite, or venue link, it will sync directly into your calendar.
            </p>

            <p className="text-[11px] text-stone-500 font-medium -mt-2 mb-3.5">
              Compatible with Partiful, Eventbrite, Google, Apple &amp; Outlook feeds.
            </p>

            {/* Platform Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Google Calendar Web */}
              <a
                href={googleWebSubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowSubModal(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#FBF7EE',
                  border: '1.5px solid #E6DEC8',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: '#2B271F',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#F4EEE2';
                  e.currentTarget.style.borderColor = '#C8643F';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FBF7EE';
                  e.currentTarget.style.borderColor = '#E6DEC8';
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #D8CEBC', fontSize: '1.1rem', flexShrink: 0 }}>
                  🌐
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#2B271F' }}>
                    Google Calendar (Web)
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6A6253' }}>
                    1-Click add to Google Calendar via browser
                  </div>
                </div>
                <span style={{ fontSize: '0.9rem', color: '#C8643F', fontWeight: 'bold' }}>&rarr;</span>
              </a>

              {/* Option 2: Apple Calendar / Outlook / Default App */}
              <a
                href={webcalUrl}
                onClick={() => setShowSubModal(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#FBF7EE',
                  border: '1.5px solid #E6DEC8',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: '#2B271F',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#F4EEE2';
                  e.currentTarget.style.borderColor = '#27477D';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FBF7EE';
                  e.currentTarget.style.borderColor = '#E6DEC8';
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #D8CEBC', fontSize: '1.1rem', flexShrink: 0 }}>
                  📱
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#2B271F' }}>
                    Apple Calendar / Outlook
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6A6253' }}>
                    Launches your native calendar app to subscribe
                  </div>
                </div>
                <span style={{ fontSize: '0.9rem', color: '#27477D', fontWeight: 'bold' }}>&rarr;</span>
              </a>

              {/* Option 3: Copy Subscription Feed URL */}
              <button
                type="button"
                onClick={handleCopyUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: copied ? '#EAF3E7' : '#FBF7EE',
                  border: copied ? '1.5px solid #6E7F5E' : '1.5px solid #E6DEC8',
                  borderRadius: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
                onMouseOver={(e) => {
                  if (!copied) {
                    e.currentTarget.style.backgroundColor = '#F4EEE2';
                    e.currentTarget.style.borderColor = '#4C5A40';
                  }
                }}
                onMouseOut={(e) => {
                  if (!copied) {
                    e.currentTarget.style.backgroundColor = '#FBF7EE';
                    e.currentTarget.style.borderColor = '#E6DEC8';
                  }
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #D8CEBC', fontSize: '1.1rem', flexShrink: 0 }}>
                  📋
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: copied ? '#315C2B' : '#2B271F' }}>
                    {copied ? '✓ Copied Feed URL to Clipboard!' : 'Copy Live Calendar Feed URL'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: copied ? '#4C5A40' : '#6A6253' }}>
                    {copied ? 'Paste in your calendar app subscription settings' : 'Paste into any calendar app supporting iCal / Webcal'}
                  </div>
                </div>
                <span style={{ fontSize: '0.82rem', color: copied ? '#315C2B' : '#4C5A40', fontWeight: 600 }}>
                  {copied ? '✓' : 'Copy'}
                </span>
              </button>
            </div>

            {/* Quarterly Refresh Best Practice Callout */}
            <div className="bg-[#FAF7F0] border border-[#E4DBD0] rounded-xl p-3 text-xs text-stone-600 flex items-start gap-2.5 mt-3.5 leading-relaxed">
              <span className="text-sm shrink-0 mt-0.5">🔄</span>
              <div>
                <strong className="text-stone-800 font-semibold block mb-0.5">Set It &amp; Forget It (Quarterly Refresh):</strong>
                <span>Once connected, your live feed syncs automatically. We recommend a quick quarterly check-in to keep recurring schedules and seasonal calendars up to date.</span>
              </div>
            </div>

            {/* Subtle Toast / Notice on Copy */}
            {copied && (
              <div style={{ backgroundColor: '#E2EDE0', color: '#274E13', padding: '10px 14px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600, marginTop: '14px', textAlign: 'center', lineHeight: 1.4 }}>
                ✓ Subscription feed URL copied! Open your calendar settings &rarr; &ldquo;Subscribe to Calendar / Add by URL&rdquo; and paste.
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}
