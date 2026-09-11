# Actually, Let's™ — Brand Standards & Architecture Invariants

This document establishes the permanent architectural, design, and branding invariants for the **Actually, Let's™** codebase. All automated agents, developers, and contributors must strictly adhere to these specifications.

---

## 1. Brand Name & Trademark Standards

### 1.1 Official Mark & Capitalization
- The brand name is strictly **`Actually, Let's™`**.
- The trademark symbol is **mandatory**. Never omit the trademark symbol in user-facing surfaces (navbars, hero sections, card badges, modals, email dispatch templates, or footers).

### 1.2 Exact JSX Superscript Convention
Whenever rendering the brand in React / JSX, use the established superscript styling:
```tsx
Actually, Let&apos;s<sup className="text-[0.6em] font-bold ml-0.5 align-super">TM</sup>
```
For inline styles (e.g. emails or raw HTML containers):
```tsx
<strong>Actually, Let&apos;s<sup style={{ fontSize: '0.6em', fontWeight: 'bold', marginLeft: '2px', verticalAlign: 'super' }}>TM</sup></strong>
```

### 1.3 Isolation Principle (No Inline Concatenation)
- **The brand mark must ALWAYS be isolated** on its own line or eyebrow badge.
- **NEVER** run the brand name directly inline into descriptive copy, subtitles, or event titles (e.g., avoid `Actually, Let's ▪ Consensus-driven...`).
- When presenting an event title, use the centralized parser `splitEventTitle` from `@/lib/formatters` or the `BrandEventHeader` component (`@/components/brand/BrandEventHeader`) to guarantee the brand sits above the title on its own line.

### 1.4 List Separators & Typography Glyphs
- **Clean Midpoint Bullets**: Use `·` / `&middot;` with muted color styling (`text-[#A89F91]` or `var(--line)` / `var(--ink-soft)`) and proper horizontal spacing (`mx-1` or `gap-3 sm:gap-4`).
- **Forbidden Glyphs**: NEVER use black square glyphs (`▪`, U+25AA), heavy unstyled bullets (`•`), or pipe symbols (`|`) as section/navigation separators.

---

## 2. Design Tokens & Typography

### 2.1 Color Palette
| Token | Hex | CSS Variable | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Cream (Primary BG)** | `#F4EEE2` | `--cream`, `--background` | Main page backgrounds, viewport root |
| **Cream 2 (Secondary BG)** | `#EDE4D3` | `--cream-2` | Footer backgrounds, alternating rows |
| **Card Surface** | `#FBF7EE` | `--card` | Cards, input forms, popover surfaces |
| **Ink (Deep Text)** | `#2B271F` | `--ink`, `--foreground` | Primary headlines, authoritative text |
| **Ink Soft (Muted Text)** | `#6A6253` | `--ink-soft` | Subheadings, descriptions, nav links |
| **Terra (Primary Accent)** | `#C8643F` | `--terra` | Primary CTAs, active highlights, badges |
| **Terra Soft** | `#E08A63` | `--terra-soft` | Hover states, focus rings, subtle accents |
| **Sage Deep** | `#4C5A40` | `--sage-deep` | Eyebrow badges, confirmation status |
| **Sage** | `#6E7F5E` | `--sage` | Secondary badges, success states |
| **Line / Border** | `#D8CEBC` | `--line` | Dividers, card borders, input borders |

### 2.2 Typography
- **Headings & Brand**: Fraunces (`font-serif-fraunces` / `var(--font-fraunces)`)
- **Body & UI**: Hanken Grotesk (`font-sans-hanken` / `var(--font-hanken-grotesk)`)
- **Mono / Times**: Geist Mono (`--font-geist-mono`) or tabular numerals for timestamps

---

## 3. Mobile Layout & Stacking Invariants

### 3.1 Header & Stacking Context (`relative z-50`)
- The header/navbar container must maintain a high stacking context: `relative z-50` (or `sticky top-0 z-50`).
- **Overflow Rule**: NO `overflow-hidden` or `overflow-x-hidden` on parent wrappers containing dropdowns or menus. Clipping parent overflow breaks mobile navigation modals and popovers.

### 3.2 User Navigation Popover
- Popovers and dropdowns must be explicitly positioned and bounded:
  ```tsx
  className="absolute right-0 top-full mt-2 z-[9999] shadow-2xl w-[calc(100vw-2rem)] max-w-xs sm:w-72"
  ```
- Must never overflow the mobile screen edge; use `w-[calc(100vw-2rem)]` on mobile viewports to prevent horizontal layout blowout.

### 3.3 Hero / Main Stacking Hierarchy (`relative z-0`)
- The main wrapper and hero sections must declare `relative z-0`.
- In Chromium-based browsers, CSS `transform` animations (e.g. `translateY` on `animate-fade-in`) create a new local stacking context. Without `relative z-0` on main, transform animations can leak into a rival stacking plane and render above the navigation bar.

### 3.4 Strict Viewport Containment (360px+)
- The page layout must strictly satisfy:
  ```js
  document.documentElement.scrollWidth === window.innerWidth
  ```
  across **360px**, **375px**, and **390px** viewports.
- No unexpected horizontal scrolling, overflowing cards, or unbounded absolute elements.

---

## 4. Dashboard & Intake Flow Patterns

### 4.1 Intake Survey Flow (`/[city]`)
- **Fast Pass • Set It & Forget It**: The Google Calendar GIS integration + `.ics` calendar uploader card must remain at the **very top** of the survey card, directly above manual date and vibe selection options.
- The user must always have the path of least resistance (zero-friction automated availability import) as their primary action.

### 4.2 Pure Vector Iconography Standard
- Use **Lucide React** pure vector SVGs exclusively:
  - `<Users className="..." />` for community and gathering counts
  - `<Sparkles className="..." />` for highlight indicators
  - `<Calendar className="..." />` for date selection and calendar sync
  - `<UploadCloud className="..." />` for file uploads (.ics)
  - `<ShieldCheck className="..." />` for security and privacy notices
- **Anti-pattern**: NEVER use raw unstyled emoji glyphs (e.g., ✦, 👥, 🗓️, ✨) in headers, badges, buttons, or legal links.

### 4.3 Admin Dashboard Layout Invariants
- **Active Gathering Selector**: Must stack responsively on mobile (`flex-col sm:flex-row`) with strict truncation (`truncate text-ellipsis`).
- **Quick-Toggle Pills & Filters**: Must wrap cleanly with `flex-wrap` so filters never cause horizontal overflow on tablet or mobile viewports.

---

## 5. Zero-Hallucination Audit Protocol

When asked to audit, review, or propose improvements to this codebase:
1. **Audit Against Invariants**: Measure code strictly against the established rules in this document.
2. **No Arbitrary Refactoring**: NEVER propose unsolicited cosmetic changes, CSS restyling, or component rearchitectures without explicit instruction and approval.
3. **Verify Chromium Mobile Stacking**: Always check that z-index and CSS transform properties respect the `relative z-50` (nav) vs `relative z-0` (main) stacking contract.
4. **Mobile Width Verification**: Verify that no layout element breaches the 360px viewport threshold.
5. **Zero Compilation Errors**: Always run and confirm clean output from:
   ```bash
   npm run build
   ```
   Code changes are only complete when Next.js builds with 0 errors.
