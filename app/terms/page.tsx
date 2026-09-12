import type { Metadata } from 'next';
import Link from 'next/link';
import MailtoButton from '@/app/components/MailtoButton';
import { BrandName } from '@/components/brand/BrandName';

export const metadata: Metadata = {
  title: "Terms & Conditions | Actually Let's",
  description: "Terms and Conditions, SMS messaging disclosures, and contact info for Actually Let's.",
};

export default function TermsPage() {
  return (
    <div style={{ backgroundColor: '#F4EEE2', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#2B271F' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', backgroundColor: '#FBF7EE', border: '1px solid #D8CEBC', borderRadius: '20px', padding: '32px 28px', boxShadow: '0 18px 40px -22px rgba(43, 39, 31, 0.45)' }}>
        <header style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8643F', fontWeight: 700, marginBottom: '8px' }}>
            ACTUALLY LET&apos;S
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '2.2rem', fontWeight: 900, margin: 0, color: '#2B271F' }}>
            Terms &amp; Conditions
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6A6253', marginTop: '6px' }}>Last updated: August 2026</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: '1.6', fontSize: '0.95rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>1. Program Description</h2>
            <p>
              <strong>Actually Let&apos;s</strong> provides transactional SMS notifications and event update communications for community gatherings, event confirmations, and availability polling.
            </p>
          </div>

          <div style={{ backgroundColor: '#EDE4D3', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #4C5A40' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4C5A40', marginBottom: '6px' }}>2. SMS Terms &amp; Rates Disclosure</h2>
            <p style={{ fontWeight: 500, margin: 0 }}>
              Message &amp; data rates may apply. Message frequency varies based on event schedules and user RSVPs. Reply <strong>STOP</strong> to cancel at any time. Reply <strong>HELP</strong> for customer support.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>3. Opt-Out Instructions</h2>
            <p>
              You can cancel the SMS service at any time. Simply text <strong>STOP</strong> to our number. Upon sending <strong>STOP</strong>, we will send a confirmation SMS to confirm that you have been unsubscribed. After this, you will no longer receive SMS messages from us.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>4. Customer Support &amp; Contact</h2>
            <p>
              If you experience issues with the messaging program, text <strong>HELP</strong> for assistance, or contact us directly at{' '}
              <MailtoButton style={{ color: '#C8643F', fontWeight: 600, textDecoration: 'underline', font: 'inherit', fontSize: 'inherit' }}>
                rsvp@actuallylets.com
              </MailtoButton>.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>5. Privacy Policy</h2>
            <p>
              Carriers are not liable for delayed or undelivered messages. Please review our <Link href="/privacy" style={{ color: '#C8643F', fontWeight: 600 }}>Privacy Policy</Link> for details regarding how we protect your information.
            </p>
          </div>

          <div style={{ backgroundColor: '#F4EEE2', padding: '16px 20px', borderRadius: '12px', border: '1px solid #D8CEBC' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2B271F', marginBottom: '8px' }}>6. Entity Disclosures</h2>
            <p style={{ margin: '0 0 6px' }}>
              <strong>Entity / DBA:</strong> Actually, Let&apos;s
            </p>
            <p style={{ margin: '0 0 6px' }}>
              <strong>Operational Region:</strong> Chicago, IL
            </p>
            <p style={{ margin: 0 }}>
              <strong>Email:</strong>{' '}
              <MailtoButton email="admin@actuallylets.com" style={{ color: '#C8643F', fontWeight: 600, textDecoration: 'underline', font: 'inherit', fontSize: 'inherit' }}>
                rsvp@actuallylets.com
              </MailtoButton>
            </p>
          </div>
        </section>

        <footer style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #D8CEBC', textAlign: 'center', fontSize: '0.85rem', color: '#6A6253', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <strong><BrandName /></strong> &middot; Chicago, IL &middot;{' '}
            <MailtoButton email="admin@actuallylets.com" style={{ color: '#C8643F', textDecoration: 'underline', font: 'inherit', fontSize: 'inherit' }}>
              rsvp@actuallylets.com
            </MailtoButton>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '4px' }}>
            <Link href="/chicago" style={{ color: '#C8643F', fontWeight: 600, textDecoration: 'none' }}>
              &larr; Back to Actually, Let&apos;s Chicago
            </Link>
            <span style={{ color: '#D8CEBC' }}>&middot;</span>
            <Link href="/privacy" style={{ color: '#6A6253', fontWeight: 600, textDecoration: 'underline' }}>
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
