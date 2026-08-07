# Codebase Snapshot & Architecture Reference (Gather Chicago / Actually Let's)

This document provides a single-file architecture snapshot of the **Actually Let's** community event polling and RSVP platform for AI agents and code auditors.

---

## Directory Structure

```text
gather-chicago/
├── app/
│   ├── [city]/
│   │   ├── page.tsx
│   │   └── SurveyForm.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   └── AdminDashboard.tsx
│   ├── api/
│   │   ├── admin/
│   │   │   ├── broadcast-sms/
│   │   │   │   └── route.ts
│   │   │   └── results/
│   │   │       └── route.ts
│   │   ├── broadcast/
│   │   │   └── route.ts
│   │   └── confirm/
│   │       └── route.ts
│   ├── components/
│   │   └── IntroPage.tsx
│   ├── privacy/
│   │   └── page.tsx
│   ├── terms/
│   │   └── page.tsx
│   ├── globals.css
│   ├── icon.svg
│   ├── layout.tsx
│   ├── page.tsx
│   └── robots.ts
├── lib/
│   ├── firebase.ts
│   ├── formatPhone.ts
│   └── twilio.ts
├── types/
│   └── survey.ts
├── .env.example
├── next.config.ts
├── package.json
├── README.md
└── tsconfig.json
```

---

## Environment Variable Schema & Security Documentation

| Variable Name | Client/Server | Purpose | Standard Placeholder Value |
| :--- | :--- | :--- | :--- |
| `ADMIN_SECRET` | Server-Only | Admin dashboard authentication passcode | `your_admin_secret` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client-Side | Cloudflare Turnstile bot verification site key | `1x00000000000000000000AA` |
| `TURNSTILE_SECRET_KEY` | Server-Only | Cloudflare Turnstile siteverify secret key | `1x00000000000000000000AA00000000000` |
| `RESEND_API_KEY` | Server-Only | Resend transaction email dispatch API key | `re_123456789` |
| `RESEND_FROM_EMAIL` | Server-Only | Default email sender identity | `Actually Let's <rsvp@actuallylets.com>` |
| `TWILIO_ACCOUNT_SID` | Server-Only | Twilio SMS API account identifier | `ACXXXXXXXXXXXXXXXXAAAAAAAAAAAAAAAA` |
| `TWILIO_AUTH_TOKEN` | Server-Only | Twilio SMS API authentication token | `your_auth_token` |
| `TWILIO_PHONE_NUMBER` | Server-Only | Verified local US sender phone number | `+15550199999` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client-Side | Firebase web API key | `AIzaSyXXXXXXXXXXXXXXXX` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client-Side | Firebase authentication domain | `your-project-id.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client-Side | Firebase project identifier | `your-project-id` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client-Side | Firebase storage bucket | `your-project-id.firebasestorage.app` |

---

## Complete Source Code Bundle

### `package.json`
```json
{
  "name": "gather-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@marsidev/react-turnstile": "^1.5.4",
    "firebase": "^12.16.0",
    "firebase-admin": "^14.2.0",
    "next": "^16.2.12",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "resend": "^6.18.0",
    "twilio": "^6.0.2"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^10.8.0",
    "eslint-config-next": "^0.2.4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

### `.env.example`
```env
# Database & Secrets
ADMIN_SECRET=your_admin_secret

# Turnstile Bot Protection
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x00000000000000000000AA00000000000

# Resend Email
RESEND_API_KEY=re_123456789
RESEND_FROM_EMAIL=onboarding@resend.dev

# Twilio SMS
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXAAAAAAAAAAAAAAAA
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15550199999
```

### `README.md`
```markdown
# Actually Let's

A lightweight Next.js app for planning rotating community events, gathering date preferences, and sending instant RSVP confirmations.

## How it works
- **Live site:** [actuallylets.com](https://actuallylets.com/)
- **Active event:** Chicago series (`/chicago`)
- **Core setup:** Dynamic weekend date pickers, custom write-in dates/times, automated Resend email confirmations, Cloudflare Turnstile bot checks, and a simple host dashboard.

## Tech stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4 (`Fraunces` & `Hanken Grotesk` fonts)
- **Database:** Firebase Firestore
- **Emails:** Resend API
- **Bot Protection:** Cloudflare Turnstile
- **Hosting:** Vercel

## Local development

1. Clone the repo and install dependencies:
   \`\`\`bash
   git clone https://github.com/NiteAdmin/gather-chicago.git
   cd gather-chicago
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   Fill in your local Resend, Firebase, and Turnstile keys in \`.env.local\`.

3. Start the dev server:
   \`\`\`bash
   npm run dev
   \`\`\`
   Head to [http://localhost:3000](http://localhost:3000) to preview locally.

## Security notes
- \`.env.local\` is ignored by git—never commit active API keys or secrets.
- All public docs use standard dummy numbers (\`+15550199999\`) and placeholder project IDs.
```

### `types/survey.ts`
```typescript
export interface SurveyResponse {
  id?: string;
  createdAt?: any;
  city?: string;
  cityName?: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  smsOptIn?: boolean;
  notes?: string | null;
  customDate?: string | null;
  customTime?: string | null;
  gatherings?: string[];
  dates?: string[];
  times?: string[];
  dayPref?: string | null;
  guests?: string | null;
  drink?: string | null;
}

export interface BroadcastPayload {
  winningDate: string;
  eventDetails: string;
  eventLink?: string;
  adminSecret: string;
}
```

### `lib/firebase.ts`
```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { SurveyResponse } from "@/types/survey";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export async function saveResponse(data: Omit<SurveyResponse, "id" | "createdAt">): Promise<string> {
  const sanitizedPayload = {
    city: data.city || "chicago",
    cityName: data.cityName || "Chicago",
    name: data.name ? data.name.trim() : "",
    email: data.email ? data.email.trim().toLowerCase() : "",
    phoneNumber: data.phoneNumber ? data.phoneNumber.trim() : null,
    smsOptIn: Boolean(data.smsOptIn),
    gatherings: Array.isArray(data.gatherings) ? data.gatherings : [],
    dates: Array.isArray(data.dates) ? data.dates : [],
    customDate: data.customDate ? data.customDate.trim() : null,
    times: Array.isArray(data.times) ? data.times : [],
    customTime: data.customTime ? data.customTime.trim() : null,
    dayPref: data.dayPref ? data.dayPref.trim() : null,
    guests: data.guests ? data.guests.trim() : null,
    drink: data.drink ? data.drink.trim() : null,
    notes: data.notes ? data.notes.trim() : null,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "responses"), sanitizedPayload);
  return docRef.id;
}

export async function fetchResponses(): Promise<SurveyResponse[]> {
  try {
    const q = query(collection(db, "responses"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SurveyResponse[];
  } catch (error) {
    console.warn("Ordered fetch failed, falling back to basic fetch:", error);
    const querySnapshot = await getDocs(collection(db, "responses"));
    const responses = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SurveyResponse[];
    return responses.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }
}
```

### `lib/formatPhone.ts`
```typescript
/**
 * Formats a raw phone number string into US standard format: (XXX) XXX-XXXX
 * Gracefully handles incomplete input while typing.
 */
export function formatPhoneNumber(value: string): string {
  if (!value) return value;
  
  // Strip all non-digit characters
  const phoneNumber = value.replace(/\D/g, '');
  const phoneNumberLength = phoneNumber.length;
  
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}
```

### `lib/twilio.ts`
```typescript
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

export const twilioClient =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Converts a phone number string into E.164 format (+1 followed by 10 digits).
 */
export function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (phone.trim().startsWith("+")) {
    return `+${digits}`;
  }
  return `+1${digits}`;
}

/**
 * Sends an automated SMS message via Twilio.
 * @param to Phone number (will be converted to E.164 format)
 * @param body Message text
 */
export async function sendSms(to: string, body: string) {
  if (!accountSid || !authToken || !fromPhone || !twilioClient) {
    console.warn(
      "Twilio SMS skipped: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER not configured in environment variables."
    );
    return null;
  }

  try {
    const formattedTo = formatE164(to);
    const message = await twilioClient.messages.create({
      body,
      from: fromPhone,
      to: formattedTo,
    });
    console.log(`Twilio SMS successfully sent to ${formattedTo}. SID: ${message.sid}`);
    return message;
  } catch (error: any) {
    console.error("Twilio SMS delivery error:", error);
    return null;
  }
}
```

### `app/globals.css`
```css
@import "tailwindcss";

:root {
  --background: #F4EEE2;
  --foreground: #2B271F;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: #F4EEE2;
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

### `app/layout.tsx`
```tsx
import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Actually Let's | Event Availability",
    template: "%s",
  },
  description: "A rotating community series — yoga, mimosas, and good company.",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hankenGrotesk.variable} h-full antialiased bg-[#F4EEE2]`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#F4EEE2]">{children}</body>
    </html>
  );
}
```

### `app/page.tsx`
```tsx
import React, { Suspense } from 'react';
import IntroPage from './components/IntroPage';

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialVariant = resolvedSearchParams?.variant || '1';

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4EEE2]" />}>
      <IntroPage initialVariant={initialVariant} />
    </Suspense>
  );
}
```

### `app/components/IntroPage.tsx`
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface IntroPageProps {
  initialVariant?: string;
}

export default function IntroPage({ initialVariant = '1' }: IntroPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantFromQuery = searchParams.get('variant');

  const [activeVariant, setActiveVariant] = useState<string>(
    variantFromQuery || initialVariant || '1'
  );

  useEffect(() => {
    if (variantFromQuery && ['1', '2', '3'].includes(variantFromQuery)) {
      setActiveVariant(variantFromQuery);
    }
  }, [variantFromQuery]);

  const handleVariantSwitch = (v: string) => {
    setActiveVariant(v);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', v);
    window.history.pushState({}, '', url.toString());
  };

  // Cycler text state for Variant 3
  const rotatingActivities = [
    'yoga & mimosas',
    'rooftop mocktails',
    'ladies’ night dinners',
    'family-friendly parks',
    'new parent brunches',
  ];
  const [activityIndex, setActivityIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % rotatingActivities.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [rotatingActivities.length]);

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2B271F] selection:bg-[#E08A63]/30">
      {/* Dynamic Keyframes & Brand CSS Variables */}
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
          --shadow: 0 18px 40px -22px rgba(43, 39, 31, 0.22);
          --shadow-hover: 0 24px 50px -18px rgba(43, 39, 31, 0.32);
        }

        html {
          scroll-behavior: smooth;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.15);
          }
        }

        @keyframes cardFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .animate-fade-in {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-fade-in-delayed {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
          opacity: 0;
        }

        .animate-fade-in-delayed-2 {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
          opacity: 0;
        }

        .font-serif-fraunces {
          font-family: 'Fraunces', var(--font-fraunces), Georgia, serif;
        }

        .font-sans-hanken {
          font-family: 'Hanken Grotesk', var(--font-hanken-grotesk), -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      {/* STAKEHOLDER VARIANT REVIEW TOOLBAR */}
      <aside aria-label="Stakeholder Review Bar" className="sticky top-0 z-50 bg-[#2B271F] text-[#F4EEE2] px-4 py-2.5 shadow-md border-b border-[#4C5A40]">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#E08A63] animate-pulse" />
            <span className="font-medium tracking-wide uppercase text-[11px] text-[#D8CEBC]">
              Stakeholder Review Mode
            </span>
            <span className="hidden sm:inline text-[#6A6253]">|</span>
            <span className="hidden sm:inline text-[#D8CEBC]/90 font-serif-fraunces italic">
              Actually Let’s Landing Page
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1F1B15] p-1 rounded-full border border-[#4C5A40]/40">
            <button
              onClick={() => handleVariantSwitch('1')}
              className={`px-3 py-1 rounded-full transition-all font-medium ${
                activeVariant === '1'
                  ? 'bg-[#C8643F] text-white shadow-sm'
                  : 'text-[#D8CEBC] hover:text-white'
              }`}
            >
              1. Editorial Warmth
            </button>
            <button
              onClick={() => handleVariantSwitch('2')}
              className={`px-3 py-1 rounded-full transition-all font-medium ${
                activeVariant === '2'
                  ? 'bg-[#6E7F5E] text-white shadow-sm'
                  : 'text-[#D8CEBC] hover:text-white'
              }`}
            >
              2. Split Canvas
            </button>
            <button
              onClick={() => handleVariantSwitch('3')}
              className={`px-3 py-1 rounded-full transition-all font-medium ${
                activeVariant === '3'
                  ? 'bg-[#4C5A40] text-white shadow-sm'
                  : 'text-[#D8CEBC] hover:text-white'
              }`}
            >
              3. Card Deck
            </button>
          </div>
        </div>
      </aside>

      {/* TOP NAVIGATION BAR */}
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between font-sans-hanken">
        <Link href="/" className="group flex items-center gap-2 text-decoration-none">
          <span className="text-xl font-bold font-serif-fraunces tracking-tight text-[#2B271F] group-hover:text-[#C8643F] transition-colors">
            Actually Let’s
          </span>
          <span className="text-[11px] uppercase tracking-widest text-[#C8643F] font-semibold bg-[#EDE4D3] px-2 py-0.5 rounded-full">
            Series
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-[#6A6253]">
          <a
            href="#cities"
            className="hover:text-[#2B271F] transition-colors hidden sm:inline"
          >
            Cities
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#2B271F] transition-colors"
          >
            How It Works
          </a>
          <Link
            href="/chicago"
            className="bg-[#2B271F] hover:bg-[#C8643F] text-[#FBF7EE] px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow"
          >
            Chicago RSVP →
          </Link>
        </nav>
      </header>

      {/* VARIANT 1: EDITORIAL WARMTH */}
      {activeVariant === '1' && (
        <main className="max-w-4xl mx-auto px-6 pt-8 pb-24 font-sans-hanken">
          {/* HERO */}
          <section className="text-center pt-8 pb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-[#EDE4D3] text-[#C8643F] text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-6 border border-[#D8CEBC]/60">
              <span className="w-2 h-2 rounded-full bg-[#C8643F]" />
              Community-Led Gatherings
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-serif-fraunces text-[#2B271F] leading-[1.05] tracking-tight max-w-3xl mx-auto">
              Gatherings people <em className="italic font-normal text-[#4C5A40]">actually</em> want to attend.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-[#6A6253] max-w-2xl mx-auto leading-relaxed">
              No more chaotic group chats or lukewarm RSVPs. We tally neighborhood availability, pick the winning date, and host relaxed yoga mornings, mimosa brunches, and evening mixers.
            </p>

            {/* CITY TEASER PILLS */}
            <div id="cities" className="mt-10 pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/chicago"
                className="group flex items-center gap-2.5 bg-[#FBF7EE] hover:bg-white border-2 border-[#C8643F] text-[#2B271F] px-5 py-2.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all scale-100 hover:scale-[1.02]"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#6E7F5E] animate-pulse" />
                <span className="font-semibold text-sm">Chicago</span>
                <span className="text-xs bg-[#EDE4D3] text-[#C8643F] font-bold px-2 py-0.5 rounded-full">
                  Active Series
                </span>
                <span className="text-[#C8643F] group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>

              <div className="flex items-center gap-2 bg-[#EDE4D3]/70 border border-[#D8CEBC] text-[#6A6253] px-4 py-2.5 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-[#A89F91]" />
                <span>Austin</span>
                <span className="text-[11px] text-[#6A6253] bg-[#D8CEBC]/50 px-2 py-0.5 rounded-full">
                  Launching Soon
                </span>
              </div>

              <div className="flex items-center gap-2 bg-[#EDE4D3]/70 border border-[#D8CEBC] text-[#6A6253] px-4 py-2.5 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-[#A89F91]" />
                <span>New York</span>
                <span className="text-[11px] text-[#6A6253] bg-[#D8CEBC]/50 px-2 py-0.5 rounded-full">
                  Coming 2027
                </span>
              </div>
            </div>

            {/* SMOOTH SCROLL ANCHOR */}
            <div className="mt-12">
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-[#6A6253] hover:text-[#2B271F] transition-colors py-2 px-4 rounded-full border border-transparent hover:border-[#D8CEBC]"
              >
                <span>Explore how it works</span>
                <span className="text-base animate-bounce">↓</span>
              </a>
            </div>
          </section>

          {/* 3-CARD HOW IT WORKS GRID */}
          <section id="how-it-works" className="pt-16 pb-12 animate-fade-in-delayed">
            <div className="text-center mb-12">
              <span className="text-xs uppercase tracking-widest font-bold text-[#4C5A40]">
                Simple & Consensus-Driven
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-2">
                How Actually Let’s Works
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-7 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="text-4xl font-bold font-serif-fraunces text-[#C8643F]/30 group-hover:text-[#C8643F]/60 transition-colors mb-4">
                  01
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F] mb-2">
                  Vote on Vibes & Dates
                </h3>
                <p className="text-sm text-[#6A6253] leading-relaxed">
                  Pick the gathering styles you’d love (moms morning, ladies’ night, couples date) and mark the exact dates and times that fit your real calendar.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-7 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="text-4xl font-bold font-serif-fraunces text-[#4C5A40]/30 group-hover:text-[#4C5A40]/60 transition-colors mb-4">
                  02
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F] mb-2">
                  Real-Time Consensus
                </h3>
                <p className="text-sm text-[#6A6253] leading-relaxed">
                  Our system aggregates neighborhood availability in real-time. Once critical mass aligns on a winning slot, the host venue is confirmed.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-7 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="text-4xl font-bold font-serif-fraunces text-[#6E7F5E]/30 group-hover:text-[#6E7F5E]/60 transition-colors mb-4">
                  03
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F] mb-2">
                  Invite & Give Back
                </h3>
                <p className="text-sm text-[#6A6253] leading-relaxed">
                  You receive an official ticket link with guaranteed attendance. A portion of every ticket directly supports local cultural & sustainability non-profits.
                </p>
              </div>
            </div>
          </section>

          {/* FINAL CTA SECTION */}
          <section className="mt-8 bg-[#EDE4D3] border border-[#D8CEBC] rounded-3xl p-8 sm:p-12 text-center shadow-sm animate-fade-in-delayed-2">
            <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F]">
              Ready to begin?
            </h2>
            <p className="mt-3 text-base text-[#6A6253] max-w-md mx-auto">
              Takes about 60 seconds. Pick your favorite days for Chicago and shape the upcoming gathering.
            </p>
            <div className="mt-8">
              <Link
                href="/chicago"
                className="inline-flex items-center justify-center gap-3 bg-[#C8643F] hover:bg-[#B35532] text-white text-base font-semibold px-8 py-4 rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <span>Find your time in Chicago</span>
                <span className="text-lg">→</span>
              </Link>
            </div>
            <p className="mt-4 text-xs text-[#6A6253]">
              Free to submit · Instant email confirmation with preferred times
            </p>
          </section>
        </main>
      )}

      {/* VARIANT 2: SPLIT CANVAS */}
      {activeVariant === '2' && (
        <main className="max-w-5xl mx-auto px-6 pt-6 pb-24 font-sans-hanken">
          {/* HERO SPLIT */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-8 pb-16 animate-fade-in">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#4C5A40] text-[#FBF7EE] text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
                <span>🌿</span>
                Consensus-Powered Events
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-serif-fraunces text-[#2B271F] leading-[1.08] tracking-tight">
                Bringing back the warmth of gathering <em className="italic font-normal text-[#C8643F]">in person</em>.
              </h1>

              <p className="text-base sm:text-lg text-[#6A6253] leading-relaxed max-w-xl">
                We make city life feel like a village again. Pick your favorite vibes, vote for times that work for you, and we’ll match you with curated groups and warm venues.
              </p>

              {/* City Row */}
              <div id="cities" className="pt-2 flex flex-wrap gap-2.5">
                <Link
                  href="/chicago"
                  className="inline-flex items-center gap-2 bg-[#2B271F] hover:bg-[#C8643F] text-white px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-[#6E7F5E]" />
                  <span>Chicago · Open Now</span>
                  <span>→</span>
                </Link>
                <span className="inline-flex items-center gap-1.5 bg-[#EDE4D3] text-[#6A6253] px-3.5 py-2 rounded-full text-xs font-medium border border-[#D8CEBC]">
                  Austin (Soon)
                </span>
                <span className="inline-flex items-center gap-1.5 bg-[#EDE4D3] text-[#6A6253] px-3.5 py-2 rounded-full text-xs font-medium border border-[#D8CEBC]">
                  NYC (2027)
                </span>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link
                  href="/chicago"
                  className="bg-[#C8643F] hover:bg-[#B35532] text-white px-6 py-3.5 rounded-full font-semibold text-sm shadow-md transition-all"
                >
                  Shape Chicago Gatherings →
                </Link>
                <a
                  href="#how-it-works"
                  className="text-xs uppercase tracking-widest font-bold text-[#4C5A40] hover:text-[#2B271F] transition-colors"
                >
                  See timeline ↓
                </a>
              </div>
            </div>

            {/* Right Column: Interactive Live Preview Card */}
            <div className="lg:col-span-5 bg-[#4C5A40] text-[#FBF7EE] p-8 rounded-3xl shadow-xl border border-[#394430] space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#6E7F5E]/40 pb-4">
                <span className="text-xs font-mono tracking-wider uppercase text-[#D8CEBC]">
                  Live Pulse · Chicago
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#E08A63] bg-[#2B271F]/40 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#E08A63] animate-ping" />
                  Survey Active
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-[#D8CEBC] uppercase font-bold tracking-wider">
                    Current Top Gatherings
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="bg-[#3A4531] p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span>☕ Moms Morning</span>
                      <span className="font-bold text-[#E08A63]">Leading Vote</span>
                    </div>
                    <div className="bg-[#3A4531] p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span>🥂 Couples / Date Night</span>
                      <span className="font-bold text-[#D8CEBC]">Strong Contender</span>
                    </div>
                    <div className="bg-[#3A4531] p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span>✨ Ladies’ Night</span>
                      <span className="font-bold text-[#D8CEBC]">Trending</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#6E7F5E]/40 text-xs text-[#D8CEBC]/80 italic">
                  “A portion of every ticket supports the Institute of Cultural Affairs (ICA), Chicago.”
                </div>
              </div>

              <Link
                href="/chicago"
                className="block text-center w-full bg-[#FBF7EE] hover:bg-white text-[#2B271F] font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow"
              >
                Cast Your Availability Vote
              </Link>
            </div>
          </section>

          {/* VERTICAL TIMELINE HOW IT WORKS */}
          <section id="how-it-works" className="pt-16 pb-12 border-t border-[#D8CEBC]/60">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <span className="text-xs uppercase tracking-widest font-bold text-[#C8643F]">
                The Three-Step Loop
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                How our consensus model works
              </h2>
            </div>

            <div className="max-w-xl mx-auto relative pl-8 border-l-2 border-[#6E7F5E]/40 space-y-10">
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-[#C8643F] text-white flex items-center justify-center font-bold text-sm shadow">
                  1
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Submit Your Availability
                </h3>
                <p className="mt-2 text-sm text-[#6A6253] leading-relaxed">
                  Select gathering themes you care about, pick the dates and times that work for you, and write in any custom preferences in 60 seconds.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-[#4C5A40] text-white flex items-center justify-center font-bold text-sm shadow">
                  2
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Neighborhood Consensus Tally
                </h3>
                <p className="mt-2 text-sm text-[#6A6253] leading-relaxed">
                  When enough neighbors align on the same calendar window, we reserve space at a curated local venue and set the program.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="absolute -left-[45px] top-0 w-8 h-8 rounded-full bg-[#6E7F5E] text-white flex items-center justify-center font-bold text-sm shadow">
                  3
                </div>
                <h3 className="text-xl font-bold font-serif-fraunces text-[#2B271F]">
                  Gather, Meet & Connect
                </h3>
                <p className="mt-2 text-sm text-[#6A6253] leading-relaxed">
                  Receive your email invitation and RSVP ticket link. Enjoy relaxed, non-awkward conversations with verified local guests.
                </p>
              </div>
            </div>
          </section>

          {/* FINAL CTA BAR */}
          <section className="mt-12 bg-[#4C5A40] text-[#FBF7EE] rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif-fraunces">
                Ready to begin?
              </h2>
              <p className="text-sm text-[#D8CEBC] mt-1 max-w-md">
                Lock in your Chicago vote today and be first on the invite list.
              </p>
            </div>
            <Link
              href="/chicago"
              className="whitespace-nowrap bg-[#E08A63] hover:bg-[#C8643F] text-white font-semibold px-8 py-4 rounded-full shadow-md transition-all text-sm uppercase tracking-wide"
            >
              Start Chicago RSVP →
            </Link>
          </section>
        </main>
      )}

      {/* VARIANT 3: INTERACTIVE CARD DECK */}
      {activeVariant === '3' && (
        <main className="max-w-4xl mx-auto px-6 pt-6 pb-24 font-sans-hanken">
          {/* HERO */}
          <section className="text-center pt-8 pb-14 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-[#FBF7EE] text-[#4C5A40] border border-[#D8CEBC] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-sm">
              <span>✦</span>
              Consensus-Driven Community
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold font-serif-fraunces text-[#2B271F] leading-[1.1] tracking-tight max-w-3xl mx-auto">
              Let’s make time for{' '}
              <span className="inline-block text-[#C8643F] transition-all duration-300 font-serif-fraunces underline decoration-[#E08A63]/50 decoration-wavy underline-offset-8">
                {rotatingActivities[activityIndex]}
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#6A6253] max-w-2xl mx-auto leading-relaxed">
              We replace guesswork with community consensus. Vote on your preferred gatherings and dates, and we’ll coordinate the rest.
            </p>

            {/* CITY DECK */}
            <div id="cities" className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              {/* Chicago Card */}
              <Link
                href="/chicago"
                className="bg-[#FBF7EE] hover:bg-white border-2 border-[#C8643F] p-5 rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    Chicago
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6E7F5E] animate-pulse" />
                </div>
                <p className="text-xs text-[#6A6253] mb-3">
                  Fall Series survey open. Voting in progress across Lincoln Park, Lakeview, and West Loop.
                </p>
                <div className="text-xs font-bold text-[#C8643F] flex items-center gap-1 group-hover:gap-2 transition-all">
                  <span>Enter RSVP</span>
                  <span>→</span>
                </div>
              </Link>

              {/* Austin Card */}
              <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-5 rounded-2xl opacity-80">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    Austin
                  </span>
                  <span className="text-[10px] bg-[#D8CEBC] text-[#6A6253] px-2 py-0.5 rounded-full font-bold uppercase">
                    Soon
                  </span>
                </div>
                <p className="text-xs text-[#6A6253]">
                  Waitlist opening soon for South Congress & East Austin community circles.
                </p>
              </div>

              {/* NYC Card */}
              <div className="bg-[#EDE4D3]/60 border border-[#D8CEBC] p-5 rounded-2xl opacity-80">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif-fraunces font-bold text-lg text-[#2B271F]">
                    New York
                  </span>
                  <span className="text-[10px] bg-[#D8CEBC] text-[#6A6253] px-2 py-0.5 rounded-full font-bold uppercase">
                    2027
                  </span>
                </div>
                <p className="text-xs text-[#6A6253]">
                  Brooklyn & Manhattan gatherings launching in the next phase.
                </p>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="mt-10">
              <a
                href="#how-it-works"
                className="text-xs uppercase tracking-widest font-bold text-[#6A6253] hover:text-[#2B271F] transition-colors"
              >
                How the deck works ↓
              </a>
            </div>
          </section>

          {/* INTERACTIVE STEP DECK */}
          <section id="how-it-works" className="pt-14 pb-12">
            <div className="text-center mb-10">
              <span className="text-xs uppercase tracking-widest font-bold text-[#4C5A40]">
                The Experience Deck
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                How It Works
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#C8643F] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                    You Choose Your Ideal Time & Vibe
                  </h3>
                  <p className="text-sm text-[#6A6253] mt-1">
                    Select activities you genuinely enjoy and pick any dates or write-in times that work for your schedule.
                  </p>
                </div>
              </div>

              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#4C5A40] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                    We Tally Neighborhood Consensus
                  </h3>
                  <p className="text-sm text-[#6A6253] mt-1">
                    No awkward attendance guarantees required upfront. We only lock dates once enough guests commit.
                  </p>
                </div>
              </div>

              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#6E7F5E] font-serif-fraunces font-bold text-xl flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-fraunces text-[#2B271F]">
                    You Receive Direct Invite & Ticket RSVP
                  </h3>
                  <p className="text-sm text-[#6A6253] mt-1">
                    Once unlocked, receive your private ticket link and gather in a warm, welcoming local space.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FINAL CTA ELEVATED CARD */}
          <section className="mt-8 bg-gradient-to-br from-[#FBF7EE] to-[#EDE4D3] border-2 border-[#D8CEBC] rounded-3xl p-8 sm:p-12 text-center shadow-lg">
            <span className="text-xs uppercase tracking-widest font-bold text-[#C8643F]">
              Ready to begin?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] mt-2">
              Shape Chicago’s Next Gathering
            </h2>
            <p className="text-sm text-[#6A6253] max-w-md mx-auto mt-2">
              Takes just a minute to cast your dates and preferences.
            </p>
            <div className="mt-7">
              <Link
                href="/chicago"
                className="inline-flex items-center gap-2.5 bg-[#2B271F] hover:bg-[#C8643F] text-white px-8 py-4 rounded-full font-semibold text-sm tracking-wide shadow-md hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                <span>Ready to begin? RSVP Chicago</span>
                <span>→</span>
              </Link>
            </div>
          </section>
        </main>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#D8CEBC]/70 py-10 text-center text-xs text-[#6A6253] font-sans-hanken bg-[#EDE4D3]/40">
        <div className="max-w-4xl mx-auto px-6 space-y-3">
          <div className="flex justify-center items-center gap-4 text-xs font-medium">
            <Link href="/chicago" className="hover:text-[#2B271F] underline">Chicago Series</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[#2B271F]">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#2B271F]">Terms</Link>
          </div>
          <p>
            Actually Let’s · A portion of every ticket supports local community & sustainability initiatives.
          </p>
        </div>
      </footer>
    </div>
  );
}
```

### `app/[city]/page.tsx`
```tsx
import type { Metadata } from 'next';
import SurveyForm from './SurveyForm';

type Props = {
  params: Promise<{ city: string }>;
};

function formatCityName(slug: string): string {
  if (!slug) return 'Chicago';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const rawCity = resolvedParams?.city || 'chicago';
  const cityName = formatCityName(rawCity);
  return {
    title: `Actually · ${cityName} | Event Availability & Preferences`,
  };
}

import { notFound } from 'next/navigation';

export default async function CityPage({ params }: Props) {
  const resolvedParams = await params;
  const rawCity = resolvedParams?.city?.toLowerCase() || '';

  if (rawCity === 'robots.txt' || rawCity === 'favicon.ico' || rawCity === 'sitemap.xml') {
    notFound();
  }

  return <SurveyForm params={params} />;
}
```

### `app/[city]/SurveyForm.tsx`
```tsx
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
  "Sat, Sep 5",
  "Sun, Sep 6",
  "Sat, Sep 12",
  "Sun, Sep 13",
  "Sat, Sep 19",
  "Sun, Sep 20",
  "Sat, Sep 26",
  "Sun, Sep 27",
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
        times: Array.isArray(selectedTimes) ? selectedTimes : [],
        customTime: customTime.trim() || null,
        dayPref: selectedDayPref || null,
        guests: selectedGuests || null,
        drink: selectedDrink || null,
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
          background: var(--cream);
          border: 1px solid var(--line);
          color: var(--ink);
          padding: 10px 16px;
          border-radius: 999px;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          user-select: none;
        }

        .chip:hover {
          border-color: var(--terra-soft);
          background: #FAF5EB;
        }

        .chip.on {
          background: var(--sage-deep);
          color: var(--cream);
          border-color: var(--sage-deep);
          font-weight: 500;
        }

        input[type="text"],
        input[type="email"],
        input[type="tel"],
        textarea {
          width: 100%;
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 14px;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s;
        }

        input:focus,
        textarea:focus {
          border-color: var(--terra);
          background: #FAF5EB;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 540px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
          h1 {
            font-size: 2.1rem;
          }
          .wrap {
            padding: 20px 14px 60px;
          }
        }

        .btn-submit {
          width: 100%;
          background: var(--terra);
          color: var(--cream);
          border: none;
          border-radius: 999px;
          padding: 16px 24px;
          font-size: 1.05rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 10px 24px -10px rgba(200, 100, 63, 0.7);
          transition: transform 0.12s ease, background-color 0.15s ease;
        }

        .btn-submit:hover:not(:disabled) {
          background: #B85530;
          transform: translateY(-1px);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert-error {
          background: #FDF0EC;
          border: 1px solid var(--terra-soft);
          color: #8C3415;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 0.9rem;
          margin-bottom: 16px;
        }

        .thanks {
          text-align: center;
          padding: 40px 20px;
        }

        .thanks h2 {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-size: 2rem;
          margin-bottom: 8px;
        }

        .thanks p {
          color: var(--ink-soft);
          max-width: 40ch;
          margin: 0 auto;
        }

        .leaf-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
          display: inline-block;
        }
      `}</style>

      <div className="wrap">
        <header className="top">
          <Link href="/" className="eyebrow" style={{ textDecoration: 'none' }}>
            ACTUALLY · {cityName.toUpperCase()}
          </Link>
          <h1>
            Let's find the <em>right time</em> to gather in {cityName}.
          </h1>
          <p className="sub">
            A rotating community series — yoga, mimosas, and good company in {cityName}. Tell us what activities you'd attend and when you're free. Takes about a minute.
          </p>
          {isChicago && (
            <p className="sub" style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--ink)' }}>
              <strong>A portion of every ticket</strong> supports the Institute of Cultural Affairs (ICA), a local Chicago nonprofit working on community building and a more sustainable city.
            </p>
          )}
        </header>

        {submitted ? (
          <div className="card thanks">
            <span className="leaf-icon">🌿</span>
            <h2>Thank you, {name || 'neighbor'}!</h2>
            <p>
              Your answers for {cityName} are in. Watch your inbox for the invite once the date's locked.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}

            {/* HoneyPot Bot Trap (Visually Hidden) */}
            <div
              style={{
                opacity: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                height: 0,
                width: 0,
                zIndex: -1,
                overflow: 'hidden',
              }}
              aria-hidden="true"
            >
              <label htmlFor="website_url">Website URL (leave empty)</label>
              <input
                type="text"
                id="website_url"
                name="website_url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="card">
              <div className="q">
                <div className="q-label">What sounds fun?</div>
                <div className="q-help">Pick as many as you'd genuinely show up for.</div>
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
            </div>

            <div className="card">
              <div className="q">
                <div className="q-label">Which dates work for you?</div>
                <div className="q-help">Pick every option you could make. More dates = easier to match.</div>
                <div className="chips">
                  {DATES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`chip ${selectedDates.includes(d) ? 'on' : ''}`}
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
              <div className="q">
                <div className="q-label">Where should we send the invite?</div>
                <div className="q-help">We'll only email you when a date is confirmed.</div>
                <div className="grid-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <input
                    type="tel"
                    placeholder="Phone number (optional, for SMS updates: e.g. (555) 000-0000)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                  />
                  {phoneError && (
                    <div style={{ color: 'var(--terra)', fontSize: '0.82rem', marginTop: '4px' }}>
                      {phoneError}
                    </div>
                  )}

                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="smsOptIn"
                      checked={smsOptIn}
                      onChange={(e) => setSmsOptIn(e.target.checked)}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <label
                      htmlFor="smsOptIn"
                      style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', lineHeight: '1.4', cursor: 'pointer' }}
                    >
                      By checking this box, you agree to receive SMS event updates from <strong>Actually Let's</strong>. Message frequency varies. Message &amp; data rates may apply. Reply <strong>STOP</strong> to cancel or <strong>HELP</strong> for help. See our <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline' }}>Privacy Policy</a> and <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--terra)', textDecoration: 'underline' }}>Terms of Service</a>.
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <textarea
                    rows={2}
                    placeholder="Anything else? (dietary restrictions, neighborhoods you love, etc.)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Cloudflare Turnstile Bot Verification */}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => console.warn("Turnstile widget encountered an issue.")}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>

              <div style={{ marginTop: '20px' }}>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Sending…' : "I'm in — let me know when →"}
                </button>
              </div>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                <Link href="/privacy" style={{ color: 'var(--ink-soft)', textDecoration: 'underline', marginRight: '10px' }}>
                  Privacy Policy
                </Link>
                •
                <Link href="/terms" style={{ color: 'var(--ink-soft)', textDecoration: 'underline', marginLeft: '10px' }}>
                  Terms of Service
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
```

### `app/api/confirm/route.ts`
```typescript
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { fetchResponses, saveResponse } from "@/lib/firebase";
import { sendSms } from "@/lib/twilio";

// In-memory sliding window IP rate limiter (3 requests per 15 minutes)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const ipRequestMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true; // Rate limited
  }

  timestamps.push(now);
  ipRequestMap.set(ip, timestamps);
  return false;
}

export async function POST(req: Request) {
  console.log('--- CONFIRM EMAIL REQUEST RECEIVED ---');

  // Extract client IP address
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  // IP Rate Limiting Check
  if (checkRateLimit(ip)) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      { error: "Too many RSVP requests from this IP. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      city,
      cityName,
      name,
      email,
      phoneNumber,
      smsOptIn = false,
      dates = [],
      gatherings = [],
      website_url,
      turnstileToken,
    } = body;

    // Honeypot check: If visually hidden website_url field is filled, silently return success
    if (website_url && typeof website_url === "string" && website_url.trim().length > 0) {
      console.warn("Honeypot triggered! Silently rejecting bot submission.");
      return NextResponse.json({ success: true, botTrapped: true });
    }

    // Cloudflare Turnstile Server-Side Token Verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || "1x00000000000000000000AA00000000000";
    if (turnstileToken && turnstileSecret) {
      try {
        const verifyFormData = new URLSearchParams();
        verifyFormData.append("secret", turnstileSecret);
        verifyFormData.append("response", turnstileToken);
        if (ip) verifyFormData.append("remoteip", ip);

        const verifyRes = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            body: verifyFormData,
          }
        );

        const verifyOutcome = await verifyRes.json();
        if (!verifyOutcome.success) {
          console.warn("Turnstile verification failed:", verifyOutcome);
          return NextResponse.json(
            { error: "Turnstile bot verification failed. Please try again." },
            { status: 403 }
          );
        }
      } catch (tsError) {
        console.error("Turnstile verification API error:", tsError);
      }
    }

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Sanitize phone number by stripping non-digit characters
    const sanitizedPhone =
      typeof phoneNumber === "string" && phoneNumber.trim()
        ? phoneNumber.replace(/\D/g, "")
        : undefined;
    const sanitizedSmsOptIn = Boolean(smsOptIn);

    console.log('Incoming Payload:', {
      name: trimmedName,
      email: trimmedEmail,
      phoneNumber: sanitizedPhone,
      smsOptIn: sanitizedSmsOptIn,
      dates,
      gatherings,
      turnstileVerified: Boolean(turnstileToken),
    });

    if (!trimmedName || !trimmedEmail || !trimmedEmail.includes("@")) {
      console.error('Validation failed: Name or email missing');
      return NextResponse.json(
        { error: "Name and a valid email address are required" },
        { status: 400 }
      );
    }

    // Duplicate Uniqueness Check in Firestore responses
    const existingResponses = await fetchResponses();
    const isDuplicate = existingResponses.some((r) => {
      const existingEmail = r.email ? r.email.trim().toLowerCase() : "";
      const existingPhone = r.phoneNumber ? r.phoneNumber.replace(/\D/g, "") : "";

      const emailMatch = existingEmail && existingEmail === trimmedEmail;
      const phoneMatch =
        sanitizedPhone && sanitizedPhone.length > 0 && existingPhone && existingPhone === sanitizedPhone;

      return emailMatch || phoneMatch;
    });

    if (isDuplicate) {
      console.warn(`Duplicate RSVP detected for email: ${trimmedEmail} or phone: ${sanitizedPhone}`);
      return NextResponse.json(
        { error: "This phone number or email has already RSVP'd for this event!" },
        { status: 400 }
      );
    }

    // Save to Firestore with sanitized payload (mapping all undefined values to null or arrays)
    try {
      await saveResponse({
        city: typeof city === "string" ? city : "chicago",
        cityName: typeof cityName === "string" ? cityName : "Chicago",
        name: trimmedName,
        email: trimmedEmail,
        phoneNumber: sanitizedPhone ? sanitizedPhone : null,
        smsOptIn: sanitizedSmsOptIn,
        dates: Array.isArray(dates) ? dates : [],
        gatherings: Array.isArray(gatherings) ? gatherings : [],
        customDate: typeof body.customDate === "string" ? body.customDate.trim() : null,
        times: Array.isArray(body.times) ? body.times : [],
        customTime: typeof body.customTime === "string" ? body.customTime.trim() : null,
        dayPref: typeof body.dayPref === "string" ? body.dayPref.trim() : null,
        guests: typeof body.guests === "string" ? body.guests.trim() : null,
        drink: typeof body.drink === "string" ? body.drink.trim() : null,
        notes: typeof body.notes === "string" ? body.notes.trim() : null,
      });
    } catch (dbErr) {
      console.error("Firestore server-side save error:", dbErr);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('Resend Error: RESEND_API_KEY is not configured in environment variables');
      return NextResponse.json(
        { error: "Server error: RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    const gatheringsListHtml =
      Array.isArray(gatherings) && gatherings.length > 0
        ? `<ul style="margin: 8px 0 16px 20px; padding: 0; color: #2B271F;">
            ${gatherings.map((g: string) => `<li style="margin-bottom: 4px;">${g}</li>`).join("")}
          </ul>`
        : `<p style="color: #6A6253; font-style: italic;">None selected</p>`;

    const customDateHtml =
      body.customDate && typeof body.customDate === "string" && body.customDate.trim()
        ? `<li style="margin-bottom: 4px; color: #2B271F;"><strong>Suggested Date:</strong> ${body.customDate.trim()}</li>`
        : "";

    const hasDates = Array.isArray(dates) && dates.length > 0;
    const datesListHtml =
      hasDates || customDateHtml
        ? `<ul style="margin: 8px 0 16px 20px; padding: 0; color: #2B271F;">
            ${hasDates ? dates.map((d: string) => `<li style="margin-bottom: 4px;">${d}</li>`).join("") : ""}
            ${customDateHtml}
          </ul>`
        : `<p style="color: #6A6253; font-style: italic;">None selected</p>`;

    const timesList = Array.isArray(body.times) ? body.times : [];
    const customTimeStr =
      typeof body.customTime === "string" && body.customTime.trim()
        ? body.customTime.trim()
        : null;

    const timesItemsHtml = [
      ...timesList.map((t: string) => `<li style="margin-bottom: 4px;">${t}</li>`),
      customTimeStr
        ? `<li style="margin-bottom: 4px;"><strong>Suggested Time:</strong> ${customTimeStr}</li>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const timesSectionHtml =
      timesItemsHtml.length > 0
        ? `<h3 style="color: #4C5A40; margin: 16px 0 4px;">⏰ Times that work for you:</h3>
     <ul style="margin: 8px 0 16px 20px; padding: 0; color: #2B271F;">
       ${timesItemsHtml}
     </ul>`
        : "";

    const notesSectionHtml =
      body.notes && typeof body.notes === "string" && body.notes.trim()
        ? `<h3 style="color: #4C5A40; margin: 16px 0 4px;">💬 Your write-in notes / requests:</h3>
           <p style="margin: 4px 0 16px 20px; color: #2B271F; font-style: italic; background-color: #EDE4D3; padding: 10px 14px; border-radius: 8px;">
             "${body.notes.trim()}"
           </p>`
        : "";

    const targetCityName = typeof cityName === "string" ? cityName : "Chicago";

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2B271F; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #F4EEE2; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #C8643F; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Actually Let's · ${targetCityName}</h2>
          <h1 style="color: #2B271F; font-size: 26px; margin: 0;">Thanks for your input, ${trimmedName}! 🌿</h1>
        </div>
        
        <div style="background-color: #FBF7EE; border: 1px solid #D8CEBC; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <p style="font-size: 16px; line-height: 1.5; color: #2B271F; margin-top: 0;">
            We received your availability and preferences for the upcoming Actually Let's ${targetCityName} community series.
          </p>
          
          <h3 style="color: #4C5A40; margin: 16px 0 4px;">✨ Gatherings you'd attend:</h3>
          ${gatheringsListHtml}

          <h3 style="color: #4C5A40; margin: 16px 0 4px;">📅 Dates that work for you:</h3>
          ${datesListHtml}

          ${timesSectionHtml}

          ${notesSectionHtml}

          <div style="background-color: #EDE4D3; padding: 14px; border-radius: 8px; margin-top: 16px;">
            <p style="margin: 0; font-size: 14px; color: #4C5A40; font-weight: bold;">
              What happens next?
            </p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #6A6253; line-height: 1.4;">
              Once survey responses close, we'll tally the winning date and email you an official invite details & ticket RSVP link!
            </p>
          </div>
        </div>

        <p style="font-size: 13px; color: #6A6253; text-align: center; margin: 0;">
          A portion of every ticket supports local community building and sustainability efforts.
        </p>
      </div>
    `;

    const resendFromEmail = process.env.RESEND_FROM_EMAIL || "Actually Let's <rsvp@actuallylets.com>";

    const customDateText =
      body.customDate && typeof body.customDate === "string" && body.customDate.trim()
        ? `- Suggested Date: ${body.customDate.trim()}`
        : "";

    const datesText =
      [
        ...(Array.isArray(dates) ? dates.map((d: string) => `- ${d}`) : []),
        ...(customDateText ? [customDateText] : []),
      ].join("\n") || "None selected";

    const customTimeText =
      body.customTime && typeof body.customTime === "string" && body.customTime.trim()
        ? `- Suggested Time: ${body.customTime.trim()}`
        : "";

    const timesText =
      [
        ...(Array.isArray(body.times) ? body.times.map((t: string) => `- ${t}`) : []),
        ...(customTimeText ? [customTimeText] : []),
      ].join("\n");

    const timesSectionText = timesText
      ? `\n\nTimes that work for you:\n${timesText}`
      : "";

    const notesText =
      body.notes && typeof body.notes === "string" && body.notes.trim()
        ? `\n\nYour write-in notes / requests:\n"${body.notes.trim()}"`
        : "";

    const emailText = `Actually Let's · ${targetCityName}\n\nThanks for your input, ${trimmedName}! 🌿\n\nWe received your availability and preferences for the upcoming Actually Let's ${targetCityName} community series.\n\nGatherings you'd attend:\n${
      Array.isArray(gatherings) && gatherings.length > 0
        ? gatherings.map((g: string) => `- ${g}`).join("\n")
        : "None selected"
    }\n\nDates that work for you:\n${datesText}${timesSectionText}${notesText}\n\nWhat happens next?\nOnce survey responses close, we'll tally the winning date and email you an official invite details & ticket RSVP link!\n\nA portion of every ticket supports local community building and sustainability efforts.`;

    let resendId: string | undefined = undefined;
    try {
      const emailResponse = await resend.emails.send({
        from: resendFromEmail,
        to: [trimmedEmail],
        subject: `Got your availability for Actually Let's ${targetCityName}! 🎉`,
        html: emailHtml,
        text: emailText,
      });

      if (emailResponse.error) {
        console.warn('[RESEND SANDBOX WARNING]: Could not send email to external address in test mode:', emailResponse.error.message || emailResponse.error);
      } else {
        console.log('Confirmation email sent successfully:', emailResponse.data);
        resendId = emailResponse.data?.id;
      }
    } catch (resendErr: any) {
      console.warn('[RESEND SANDBOX WARNING]: Could not send email to external address in test mode:', resendErr.message);
    }

    // Send automated Twilio SMS if user opted in and provided a valid 10-digit phone number
    if (sanitizedSmsOptIn && sanitizedPhone && sanitizedPhone.length === 10) {
      try {
        const formattedE164 = `+1${sanitizedPhone}`;
        const targetCityName = typeof cityName === "string" ? cityName : "Chicago";

        // Plain-text SMS template (No URLs/links) to bypass carrier spam filters
        const smsMessage = `Actually Let's: Hi ${trimmedName}, your RSVP for ${targetCityName} is confirmed! Reply STOP to opt out.`;

        console.log(`Triggering Twilio confirmation SMS to ${formattedE164}...`);
        const message = await sendSms(formattedE164, smsMessage);

        if (message) {
          console.log(`[TWILIO DIAGNOSTIC] SID: ${message.sid} | Status: ${message.status} | ErrorCode: ${message.errorCode || 'None'} | ErrorMsg: ${message.errorMessage || 'None'}`);
        }
      } catch (twilioError: any) {
        console.error('[TWILIO API ERROR]', twilioError.code, twilioError.message);
      }
    }

    return NextResponse.json({
      success: true,
      resendId: resendId,
    });
  } catch (error: any) {
    console.error('Resend Error:', error);
    return NextResponse.json(
      { error: error.message || "Failed to send confirmation email" },
      { status: 500 }
    );
  }
}
```

### `app/api/broadcast/route.ts`
```typescript
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { fetchResponses } from "@/lib/firebase";
import { BroadcastPayload } from "@/types/survey";

export async function POST(req: Request) {
  try {
    const body: BroadcastPayload = await req.json();
    const { winningDate, eventDetails, eventLink, adminSecret } = body;

    const expectedSecret = process.env.ADMIN_SECRET || "your_admin_secret";
    if (!adminSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Incorrect admin passcode" },
        { status: 401 }
      );
    }

    if (!winningDate || !eventDetails) {
      return NextResponse.json(
        { error: "Winning date and event details are required" },
        { status: 400 }
      );
    }

    const responses = await fetchResponses();
    const emails = Array.from(
      new Set(
        responses
          .map((r) => r.email?.trim())
          .filter((e): e is string => Boolean(e && e.includes("@")))
      )
    );

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "No valid recipient email addresses found in survey responses" },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Server error: RESEND_API_KEY is not configured in environment variables" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2B271F; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #F4EEE2; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #C8643F; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Gather · Chicago</h2>
          <h1 style="color: #2B271F; font-size: 28px; margin: 0;">It's Official! We're Gathering 🎉</h1>
        </div>
        
        <div style="background-color: #FBF7EE; border: 1px solid #D8CEBC; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h3 style="color: #4C5A40; margin-top: 0;">📅 Winning Date:</h3>
          <p style="font-size: 20px; font-weight: bold; color: #C8643F; margin-bottom: 16px;">${winningDate}</p>
          
          <h3 style="color: #4C5A40; margin-top: 0;">✨ Event Details:</h3>
          <p style="white-space: pre-wrap; line-height: 1.6; color: #2B271F;">${eventDetails}</p>
          
          ${
            eventLink
              ? `<div style="margin-top: 24px; text-align: center;">
                  <a href="${eventLink}" target="_blank" style="background-color: #C8643F; color: #F4EEE2; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Get Tickets / RSVP Here →</a>
                </div>`
              : ""
          }
        </div>
        
        <p style="font-size: 13px; color: #6A6253; text-align: center;">
          Thank you for taking part in the community survey. See you soon! 🌿
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Gather Chicago <onboarding@resend.dev>",
      to: emails,
      subject: `🎉 Gathering Date Locked: ${winningDate}!`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      recipientCount: emails.length,
      resendId: emailResponse.data?.id,
    });
  } catch (error: any) {
    console.error("Broadcast route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send broadcast email" },
      { status: 500 }
    );
  }
}
```

### `app/api/admin/broadcast-sms/route.ts`
```typescript
import { NextResponse } from "next/server";
import { fetchResponses } from "@/lib/firebase";
import { sendSms } from "@/lib/twilio";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, adminSecret, city } = body;

    // Verify Admin Passcode
    const expectedSecret = process.env.ADMIN_SECRET || "your_admin_secret";
    if (!adminSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Incorrect admin passcode" },
        { status: 401 }
      );
    }

    // Validate SMS message length (max 160 characters)
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    if (!trimmedMessage) {
      return NextResponse.json(
        { error: "SMS message text is required." },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 160) {
      return NextResponse.json(
        { error: "SMS message exceeds maximum length of 160 characters." },
        { status: 400 }
      );
    }

    // Fetch all Firestore survey responses
    const allResponses = await fetchResponses();

    // Filter responses where smsOptIn === true and valid phoneNumber exists
    const targetCity = typeof city === "string" ? city.toLowerCase() : "all";

    const optedInResponses = allResponses.filter((r) => {
      const matchesSmsOptIn = Boolean(r.smsOptIn);
      const sanitizedPhone = r.phoneNumber ? r.phoneNumber.replace(/\D/g, "") : "";
      const hasValidPhone = sanitizedPhone.length >= 10;

      if (!matchesSmsOptIn || !hasValidPhone) return false;

      if (targetCity !== "all") {
        const docCity = (r.city || "chicago").toLowerCase();
        return docCity === targetCity;
      }

      return true;
    });

    // Extract unique 10-digit phone numbers
    const uniquePhones = Array.from(
      new Set(
        optedInResponses
          .map((r) => r.phoneNumber?.replace(/\D/g, "").slice(-10))
          .filter((p): p is string => Boolean(p && p.length === 10))
      )
    );

    if (uniquePhones.length === 0) {
      return NextResponse.json(
        { error: "No opted-in SMS recipients with valid phone numbers found for this city selection." },
        { status: 400 }
      );
    }

    console.log(`Broadcasting SMS to ${uniquePhones.length} recipients...`);

    // Send SMS texts in parallel using Twilio
    const sendResults = await Promise.allSettled(
      uniquePhones.map((phone) => {
        const e164Phone = `+1${phone}`;
        return sendSms(e164Phone, trimmedMessage);
      })
    );

    const sentCount = sendResults.filter(
      (res) => res.status === "fulfilled" && res.value !== null
    ).length;

    const failedCount = uniquePhones.length - sentCount;

    return NextResponse.json({
      success: true,
      recipientCount: uniquePhones.length,
      sentCount,
      failedCount,
    });
  } catch (error: any) {
    console.error("Admin SMS broadcast route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send SMS broadcast" },
      { status: 500 }
    );
  }
}
```

### `app/api/admin/results/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { passcode, city } = await request.json().catch(() => ({}));

    // Check passcode against environment variable
    if (!passcode || passcode !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized passcode' }, { status: 401 });
    }

    // Fetch responses using client SDK instance on server side
    const snapshot = await getDocs(collection(db, 'responses'));
    let responses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by city if specified and not 'all'
    if (city && typeof city === 'string' && city.toLowerCase() !== 'all') {
      const targetCity = city.toLowerCase();
      responses = responses.filter((r: any) => {
        // Fallback unassigned/legacy documents to 'chicago'
        const docCity = (r.city || 'chicago').toLowerCase();
        return docCity === targetCity;
      });
    }

    return NextResponse.json({ responses });
  } catch (error: any) {
    console.error('Error fetching admin results:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch results' }, { status: 500 });
  }
}
```

### `app/admin/page.tsx`
```tsx
import type { Metadata } from 'next';
import AdminDashboard from './AdminDashboard';

export const metadata: Metadata = {
  title: 'Actually · Admin Dashboard',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
```

### `app/admin/AdminDashboard.tsx`
```tsx
'use client';

import React, { useState } from 'react';
import { SurveyResponse } from '@/types/survey';

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
const DRINKS = ["Mimosa", "Mocktail", "Both please"];

const DATES = [
  "Sat, Sep 5",
  "Sun, Sep 6",
  "Sat, Sep 12",
  "Sun, Sep 13",
  "Sat, Sep 19",
  "Sun, Sep 20",
  "Sat, Sep 26",
  "Sun, Sep 27",
];

export default function AdminDashboard() {
  const [passcode, setPasscode] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('chicago');

  // Broadcast modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [winningDate, setWinningDate] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastToast, setBroadcastToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SMS Broadcast modal state
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [showSmsConfirmModal, setShowSmsConfirmModal] = useState(false);
  const [smsToast, setSmsToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchResults = async (authPass: string, city: string = selectedCity) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: authPass, city }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setResponses(data.responses || []);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    fetchResults(passcode.trim(), selectedCity);
  };

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    if (authenticated && passcode) {
      fetchResults(passcode.trim(), newCity);
    }
  };

  const computeTally = (field: 'gatherings' | 'dates' | 'times' | 'dayPref' | 'drink', universe: string[]) => {
    const counts: Record<string, number> = {};
    universe.forEach((item) => (counts[item] = 0));

    responses.forEach((r) => {
      const val = r[field];
      if (Array.isArray(val)) {
        val.forEach((item) => {
          if (counts[item] !== undefined) counts[item]++;
          else counts[item] = 1;
        });
      } else if (typeof val === 'string' && val) {
        if (counts[val] !== undefined) counts[val]++;
        else counts[val] = 1;
      }
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const gatheringTally = computeTally('gatherings', GATHERINGS);
  const dateTally = computeTally('dates', DATES);
  const timeTally = computeTally('times', TIMES);
  const dayPrefTally = computeTally('dayPref', DAYPREF);
  const drinkTally = computeTally('drink', DRINKS);

  const writeInDates = responses.filter((r) => r.customDate).map((r) => `${r.customDate} — ${r.name}`);
  const writeInTimes = responses.filter((r) => r.customTime).map((r) => `${r.customTime} — ${r.name}`);
  const writeInNotes = responses.filter((r) => r.notes).map((r) => `"${r.notes}" — ${r.name}`);

  // Count valid opted-in phone numbers
  const optedInCount = responses.filter((r) => {
    const hasSms = Boolean(r.smsOptIn);
    const sanitizedPhone = r.phoneNumber ? r.phoneNumber.replace(/\D/g, '') : '';
    return hasSms && sanitizedPhone.length >= 10;
  }).length;

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winningDate.trim() || !eventDetails.trim()) {
      alert('Please fill in both winning date and event details.');
      return;
    }

    setBroadcasting(true);
    setBroadcastToast(null);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winningDate: winningDate.trim(),
          eventDetails: eventDetails.trim(),
          eventLink: eventLink.trim() || undefined,
          adminSecret: passcode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch broadcast emails');
      }

      setBroadcastToast({
        type: 'success',
        text: `Success! Broadcast emails sent to ${data.recipientCount} attendees.`,
      });
      setShowBroadcastModal(false);
      setWinningDate('');
      setEventDetails('');
      setEventLink('');
    } catch (err: any) {
      setBroadcastToast({
        type: 'error',
        text: err.message || 'Error broadcasting email to recipients.',
      });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSendSmsBroadcast = async () => {
    if (!smsMessage.trim()) return;

    setSendingSms(true);
    setSmsToast(null);

    try {
      const res = await fetch('/api/admin/broadcast-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: smsMessage.trim(),
          adminSecret: passcode.trim(),
          city: selectedCity,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch SMS broadcast');
      }

      setSmsToast({
        type: 'success',
        text: `Success! Sent ${data.sentCount} SMS text message(s) successfully.${data.failedCount > 0 ? ` (${data.failedCount} failed)` : ''}`,
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
          min-height: 100vh;
          line-height: 1.5;
        }

        .wrap {
          max-width: 900px;
          margin: 0 auto;
          padding: 30px 20px 80px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dash-title {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-size: 2.2rem;
          font-weight: 900;
          color: var(--ink);
        }

        .actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          background: var(--terra);
          color: var(--cream);
          border: none;
          padding: 10px 18px;
          border-radius: 999px;
          font-family: inherit;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .btn:hover {
          background: #B85530;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--ink);
        }

        .btn-outline:hover {
          background: var(--cream-2);
        }

        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 24px 22px;
          box-shadow: var(--shadow);
          margin-bottom: 20px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 700px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .res-title {
          font-family: 'Fraunces', var(--font-fraunces), serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--sage-deep);
          margin-bottom: 14px;
        }

        .bar-row {
          margin-bottom: 12px;
        }

        .bar-top {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          margin-bottom: 4px;
        }

        .bar-track {
          background: var(--cream-2);
          border-radius: 999px;
          height: 10px;
          overflow: hidden;
        }

        .bar-fill {
          background: var(--sage);
          height: 100%;
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .bar-fill.lead {
          background: var(--terra);
        }

        .write-in-list {
          list-style: none;
          font-size: 0.9rem;
          color: var(--ink);
        }

        .write-in-list li {
          padding: 8px 0;
          border-bottom: 1px solid var(--line);
        }

        .write-in-list li:last-child {
          border-bottom: none;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(43, 39, 31, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal-content {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          max-width: 500px;
          width: 100%;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .toast {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 0.9rem;
        }

        .toast-success {
          background: #EAF2E8;
          color: #2F5927;
          border: 1px solid #C4DEC0;
        }

        .toast-error {
          background: #FDF0EC;
          color: #8C3415;
          border: 1px solid var(--terra-soft);
        }
      `}</style>

      <div className="wrap">
        {!authenticated ? (
          <div className="card" style={{ maxWidth: '420px', margin: '80px auto 0' }}>
            <h1 className="res-title" style={{ fontSize: '1.4rem', textAlign: 'center', marginBottom: '8px' }}>
              Actually Admin
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Enter passcode to access host availability dashboard.
            </p>

            {error && <div className="toast toast-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <input
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--line)',
                  background: 'var(--cream)',
                  marginBottom: '14px',
                  fontSize: '1rem',
                }}
                required
              />
              <button
                type="submit"
                className="btn"
                style={{ width: '100%', padding: '12px' }}
                disabled={loading}
              >
                {loading ? 'Checking…' : 'Access Dashboard →'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="dashboard-header">
              <div>
                <h1 className="dash-title">Host Dashboard</h1>
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
                  {responses.length} response{responses.length === 1 ? '' : 's'} recorded for <strong>{selectedCity.toUpperCase()}</strong>
                </p>
              </div>

              <div className="actions">
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: '1px solid var(--line)',
                    background: 'var(--cream)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="chicago">Chicago</option>
                  <option value="all">All Cities</option>
                </select>

                <button className="btn btn-outline" onClick={exportCSV}>
                  Export CSV
                </button>

                <button className="btn" onClick={() => setShowBroadcastModal(true)}>
                  Broadcast Email
                </button>

                <button
                  className="btn"
                  style={{ background: 'var(--sage-deep)' }}
                  onClick={() => setShowSmsModal(true)}
                >
                  Broadcast SMS ({optedInCount})
                </button>
              </div>
            </div>

            {broadcastToast && (
              <div className={`toast toast-${broadcastToast.type}`}>
                {broadcastToast.text}
              </div>
            )}

            {smsToast && (
              <div className={`toast toast-${smsToast.type}`}>
                {smsToast.text}
              </div>
            )}

            <div className="grid-2">
              <div className="card">
                <div className="res-title">✨ Popular Gatherings</div>
                {renderBars(gatheringTally)}
              </div>

              <div className="card">
                <div className="res-title">📅 Top Dates</div>
                {renderBars(dateTally)}
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="res-title">⏰ Best times</div>
                {renderBars(timeTally)}
              </div>

              <div className="card">
                <div className="res-title">🗓 Weekday vs Weekend</div>
                {renderBars(dayPrefTally)}

                <div className="res-title" style={{ marginTop: '24px' }}>🥂 Drink Preferences</div>
                {renderBars(drinkTally)}
              </div>
            </div>

            {writeInDates.length > 0 && (
              <div className="card">
                <div className="res-title">✍️ Write-in Suggested Dates</div>
                <ul className="write-in-list">
                  {writeInDates.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {writeInTimes.length > 0 && (
              <div className="card">
                <div className="res-title">✍️ Write-in Suggested Times</div>
                <ul className="write-in-list">
                  {writeInTimes.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {writeInNotes.length > 0 && (
              <div className="card">
                <div className="res-title">💬 Notes &amp; Special Requests</div>
                <ul className="write-in-list">
                  {writeInNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* BROADCAST EMAIL MODAL */}
            {showBroadcastModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h2 className="res-title" style={{ fontSize: '1.4rem' }}>
                    Broadcast Date Lock Email
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    This will send an announcement email to all {responses.length} survey respondents.
                  </p>

                  <form onSubmit={handleBroadcast}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                        Winning Date
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Saturday, September 19 at 10:30 AM"
                        value={winningDate}
                        onChange={(e) => setWinningDate(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid var(--line)',
                          background: 'var(--cream)',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                        Event Details &amp; Venue
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Venue location, host notes, what to bring…"
                        value={eventDetails}
                        onChange={(e) => setEventDetails(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid var(--line)',
                          background: 'var(--cream)',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                        Ticket / RSVP Link (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://eventbrite.com/…"
                        value={eventLink}
                        onChange={(e) => setEventLink(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid var(--line)',
                          background: 'var(--cream)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setShowBroadcastModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn" disabled={broadcasting}>
                        {broadcasting ? 'Sending…' : 'Send Broadcast Email →'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* BROADCAST SMS MODAL */}
            {showSmsModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h2 className="res-title" style={{ fontSize: '1.4rem' }}>
                    Broadcast SMS Update
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    Send an automated SMS message to all <strong>{optedInCount}</strong> opted-in guests for {selectedCity.toUpperCase()}.
                  </p>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      SMS Text ({160 - smsMessage.length} characters remaining)
                    </label>
                    <textarea
                      rows={3}
                      maxLength={160}
                      placeholder="e.g. Actually Let's: Chicago date locked for Sat Sep 19 at 10:30am! Check your email for tickets."
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--cream)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setShowSmsModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ background: 'var(--sage-deep)' }}
                      disabled={!smsMessage.trim() || optedInCount === 0}
                      onClick={() => setShowSmsConfirmModal(true)}
                    >
                      Review &amp; Send SMS →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SMS CONFIRMATION DIALOG */}
            {showSmsConfirmModal && (
              <div className="modal-overlay" style={{ zIndex: 1100 }}>
                <div className="modal-content" style={{ maxWidth: '420px' }}>
                  <h3 className="res-title" style={{ fontSize: '1.2rem', color: 'var(--terra)' }}>
                    Confirm SMS Blast
                  </h3>
                  <p style={{ fontSize: '0.9rem', marginBottom: '14px' }}>
                    Are you sure you want to send this text message to <strong>{optedInCount}</strong> verified phone numbers?
                  </p>

                  <div style={{ background: 'var(--cream)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                    "{smsMessage}"
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setShowSmsConfirmModal(false)}
                      disabled={sendingSms}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ background: 'var(--terra)' }}
                      onClick={handleSendSmsBroadcast}
                      disabled={sendingSms}
                    >
                      {sendingSms ? 'Broadcasting…' : 'Yes, Send Broadcast →'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
```

### `app/privacy/page.tsx`
```tsx
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
              Your information is used solely to tally event availability, send transactional event updates, RSVP links, and administrative notifications related to your Actually Let's community events.
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
```

### `app/terms/page.tsx`
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Terms & Conditions | Actually Let's",
  description: "Terms and Conditions and SMS messaging disclosures for Actually Let's.",
};

export default function TermsPage() {
  return (
    <div style={{ backgroundColor: '#F4EEE2', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Hanken Grotesk', sans-serif", color: '#2B271F' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', backgroundColor: '#FBF7EE', border: '1px solid #D8CEBC', borderRadius: '20px', padding: '32px 28px', boxShadow: '0 18px 40px -22px rgba(43, 39, 31, 0.45)' }}>
        <header style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8643F', fontWeight: 700, marginBottom: '8px' }}>
            ACTUALLY LET'S
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
              <strong>Actually Let's</strong> provides transactional SMS notifications and event update communications for community gatherings, event confirmations, and availability polling.
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
              You can cancel the SMS service at any time. Simply text <strong>STOP</strong> to our toll-free number. Upon sending <strong>STOP</strong>, we will send a confirmation SMS to confirm that you have been unsubscribed. After this, you will no longer receive SMS messages from us.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>4. Customer Support</h2>
            <p>
              If you experience issues with the messaging program, text <strong>HELP</strong> for assistance, or contact us directly at support@actuallylets.com.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4C5A40', marginBottom: '8px' }}>5. Privacy Policy</h2>
            <p>
              Carriers are not liable for delayed or undelivered messages. Please review our <Link href="/privacy" style={{ color: '#C8643F', fontWeight: 600 }}>Privacy Policy</Link> for details regarding how we protect your information.
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
```

### `app/robots.ts`
```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://actuallylets.com/sitemap.xml',
  };
}
```
