import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Privacy Policy | Actually Let's",
  description: "Privacy Policy and carrier SMS disclosure for Actually Let's.",
};

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: '#F4EEE2', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#2B271F' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', backgroundColor: '#FBF7EE', border: '1px solid #D8CEBC', borderRadius: '20px', padding: '32px 28px', boxShadow: '0 18px 40px -22px rgba(43, 39, 31, 0.45)' }}>
        <header style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8643F', fontWeight: 700, marginBottom: '8px' }}>
            ACTUALLY LET'S
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '2.2rem', fontWeight: 900, margin: 0, color: '#2B271F' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6A6253', marginTop: '6px' }}>Last updated: August 2026</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: '1.6', fontSize: '0.95rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>1. Information We Collect</h2>
            <p>
              When you RSVP or submit availability for events through <strong>Actually Let's</strong>, we collect your name, email address, availability preferences, and (if provided) phone number.
            </p>
          </div>

          <div style={{ backgroundColor: '#EDE4D3', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #C8643F' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#C8643F', marginBottom: '6px' }}>2. Mobile &amp; SMS Data Non-Sharing Policy</h2>
            <p style={{ fontWeight: 500, margin: 0 }}>
              <strong>No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.</strong> All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>3. How We Use Your Information</h2>
            <p>
              Your information is used solely to tally event availability, send transactional event updates, RSVP links, and administrative notifications related to your Gather community events.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>4. Opt-Out &amp; Assistance</h2>
            <p>
              You may opt out of receiving SMS notifications at any time by replying <strong>STOP</strong> to any SMS message. For support, reply <strong>HELP</strong> or contact us directly.
            </p>
          </div>
        </section>

        <footer style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #D8CEBC', textAlign: 'center', fontSize: '0.85rem', color: '#6A6253' }}>
          <Link href="/chicago" style={{ color: '#C8643F', fontWeight: 600, textDecoration: 'none' }}>
            &larr; Back to Actually Let's Chicago
          </Link>
        </footer>
      </div>
    </div>
  );
}
