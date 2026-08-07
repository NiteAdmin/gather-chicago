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
   ```bash
   git clone https://github.com/NiteAdmin/gather-chicago.git
   cd gather-chicago
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your local Resend, Firebase, and Turnstile keys in `.env.local`.

3. Start the dev server:
   ```bash
   npm run dev
   ```
   Head to [http://localhost:3000](http://localhost:3000) to preview locally.

## Security notes
- `.env.local` is ignored by git—never commit active API keys or secrets.
- All public docs use standard dummy numbers (`+15550199999`) and placeholder project IDs.

