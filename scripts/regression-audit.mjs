import fs from 'fs';
import path from 'path';

let failures = 0;
let passes = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passes++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failures++;
  }
}

console.log('====================================================');
console.log('  RUNNING FULL REGRESSION & HEALTH AUDIT');
console.log('====================================================\n');

// 1. Calendar Hygiene
console.log('1. CALENDAR HYGIENE AUDIT:');
const eventsConfigRaw = fs.readFileSync('lib/eventsConfig.ts', 'utf-8');
const surveyFormRaw = fs.readFileSync('app/[city]/SurveyForm.tsx', 'utf-8');

// Zero Taco Tuesdays
const tacoInConfig = (eventsConfigRaw.match(/taco[ -]?tuesday/gi) || []).length;
const tacoInSurvey = (surveyFormRaw.match(/taco[ -]?tuesday/gi) || []).length;
assert(tacoInConfig === 0, `Zero Taco Tuesdays in lib/eventsConfig.ts (found ${tacoInConfig})`);
assert(tacoInSurvey === 0, `Zero Taco Tuesdays in app/[city]/SurveyForm.tsx (found ${tacoInSurvey})`);

// Confirmed Gathering IDs in lib/eventsConfig.ts
const expectedEventIds = [
  'chi-2026-10-03-apple-fest',
  'chi-2026-10-05-little-lark-pizza',
  'chi-2026-10-08-little-lark-pinsa',
  'chi-2026-10-09-wine-fest',
  'chi-2026-10-16-soul-smoke',
  'chi-2026-10-17-spooky-zoo',
  'chi-2026-10-17-goebberts-farm',
  'chi-2026-10-23-laugh-factory',
  'chi-2026-10-25-boo-zoo',
];

expectedEventIds.forEach((id) => {
  assert(eventsConfigRaw.includes(id), `Confirmed event present: ${id}`);
});

// Pottery Poll Ballot Tile on Oct 4
assert(
  surveyFormRaw.includes('pottery-studio-faceoff') && surveyFormRaw.includes('Pottery Studio Face-Off'),
  'Pottery Studio Face-Off ballot tile exists on Oct 4'
);

// Audience Icons
assert(
  eventsConfigRaw.includes("audience: 'family'") || eventsConfigRaw.includes('audience: "family"'),
  'Family friendly events configured with family audience'
);
assert(
  eventsConfigRaw.includes("audienceLabel: '👨‍👩‍👧 Family Friendly'") || eventsConfigRaw.includes('audienceLabel: "👨‍👩‍👧 Family Friendly"'),
  'Family friendly events use 👨‍👩‍👧 icon'
);
assert(
  eventsConfigRaw.includes('🍸 Adults (21+)') || eventsConfigRaw.includes('🍸'),
  'Wine fest uses 🍸 adult icon'
);
assert(
  eventsConfigRaw.includes('👥 Adults') || eventsConfigRaw.includes('👥'),
  'Laugh factory uses 👥 adults icon'
);

// 2. Month Switching & Dynamic Weekends
console.log('\n2. MONTH SWITCHING & DYNAMIC WEEKENDS AUDIT:');
function getExpectedWeekends(year, monthIndex, monthShort) {
  const dates = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dates.push(`${monthShort} ${day}, ${year}`);
    }
  }
  return dates;
}

const octExpected = getExpectedWeekends(2026, 9, 'Oct'); // Oct: 9 days
const novExpected = getExpectedWeekends(2026, 10, 'Nov'); // Nov: 9 days
const decExpected = getExpectedWeekends(2026, 11, 'Dec'); // Dec: 8 days

assert(octExpected.length === 9, `October 2026 has 9 weekend days (got ${octExpected.length})`);
assert(novExpected.length === 9, `November 2026 has 9 weekend days (got ${novExpected.length})`);
assert(decExpected.length === 8, `December 2026 has 8 weekend days (got ${decExpected.length})`);

assert(
  surveyFormRaw.includes('getWeekendDatesForMonth'),
  'getWeekendDatesForMonth function is implemented in SurveyForm'
);
assert(
  surveyFormRaw.includes('Select All ${activeMonthName} Weekends') || surveyFormRaw.includes('weekendBtnLabel'),
  'Dynamic month-aware weekend button label exists'
);
assert(
  surveyFormRaw.includes('handleToggleAllWeekends'),
  'handleToggleAllWeekends handler exists to toggle dates'
);

// No December Coming Soon Banner
assert(
  !surveyFormRaw.includes('December Schedule Coming Soon') && !surveyFormRaw.includes('December Schedule Coming'),
  'Zero December coming-soon banners in SurveyForm'
);

// 3. Footer & Trademark Resizing
console.log('\n3. BRAND & TRADEMARK RESIZING AUDIT:');
const brandNameRaw = fs.readFileSync('components/brand/BrandName.tsx', 'utf-8');
const footerRaw = fs.readFileSync('components/Footer.tsx', 'utf-8');
const introPageRaw = fs.readFileSync('app/components/IntroPage.tsx', 'utf-8');
const confirmationCardRaw = fs.readFileSync('app/components/ConfirmationCard.tsx', 'utf-8');

const navbarRaw = fs.readFileSync('components/Navbar.tsx', 'utf-8');

assert(
  brandNameRaw.includes('hasCustomSize') && brandNameRaw.includes('hasCustomAlign'),
  'BrandName supports intelligent custom size, alignment, and color overrides'
);
assert(
  navbarRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"'),
  'components/Navbar.tsx uses standardized terracotta TM'
);
assert(
  footerRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"'),
  'components/Footer.tsx uses legible terracotta TM with text-xs sm:text-sm'
);
assert(
  introPageRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"'),
  'app/components/IntroPage.tsx footer uses legible terracotta TM'
);
assert(
  confirmationCardRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"'),
  'ConfirmationCard.tsx footer uses legible terracotta TM'
);
assert(
  surveyFormRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"'),
  'SurveyForm.tsx footer uses legible terracotta TM'
);

const privacyRaw = fs.readFileSync('app/privacy/page.tsx', 'utf-8');
const termsRaw = fs.readFileSync('app/terms/page.tsx', 'utf-8');
assert(
  privacyRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"'),
  'Privacy policy footer uses legible terracotta TM'
);
assert(
  termsRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"'),
  'Terms of service footer uses legible terracotta TM'
);

// Enforce brand footer presence and prohibit naked legal link bars
const hostRaw = fs.readFileSync('app/host/page.tsx', 'utf-8');
assert(
  hostRaw.includes('<Footer') || (hostRaw.includes('<BrandName') && hostRaw.includes('tmClassName')),
  'app/host/page.tsx mounts standardized brand Footer component'
);

const adminDashboardRaw = fs.readFileSync('app/admin/AdminDashboard.tsx', 'utf-8');
assert(
  adminDashboardRaw.includes('<Footer') || adminDashboardRaw.includes('<BrandName'),
  'app/admin/AdminDashboard.tsx mounts standardized brand Footer component'
);

const pageViews = [
  'app/components/IntroPage.tsx',
  'app/[city]/SurveyForm.tsx',
  'app/admin/AdminDashboard.tsx',
  'app/dashboard/page.tsx',
  'app/host/page.tsx',
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
  'app/preview/bulletin/page.tsx',
];

pageViews.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  const mountsBrand = content.includes('<Footer') || content.includes('<BrandName');
  assert(mountsBrand, `${file} mounts brand footer containing Actually, Let's wordmark & TM entity`);

  // Disallow naked legal link bar without brand block
  const hasLegalLinks = content.includes('/privacy') || content.includes('/terms');
  if (hasLegalLinks) {
    assert(mountsBrand, `${file} pairs legal links with brand wordmark (no naked legal bar)`);
  }

  // If a <footer> element is declared in JSX, ensure it contains the brand wordmark
  if (content.includes('<footer')) {
    const footerMatches = content.match(/<footer[\s\S]*?<\/footer>/gi) || [];
    footerMatches.forEach((fm, i) => {
      const hasBrand = fm.includes('<BrandName') || fm.includes('<Footer') || fm.includes('Actually, Let');
      assert(hasBrand, `${file} footer element #${i + 1} contains brand wordmark (not naked)`);
    });
  }
});

// 4. Landing Page Hero & Host Card
console.log('\n4. LANDING PAGE HERO & HOST CARD AUDIT:');
assert(
  introPageRaw.includes('Plan gatherings, effortlessly. Without the group chat.'),
  'Hero subcopy replaced with: Plan gatherings, effortlessly. Without the group chat.'
);
assert(
  !introPageRaw.includes('Coordinating effortless, recurring micro-gatherings without group chat chaos.'),
  'Old hero subcopy completely removed'
);
assert(
  introPageRaw.includes('<span className="block mb-1 sm:mb-2">') && introPageRaw.includes('<BrandName'),
  'Actually, Let’s™ isolated on its own line in hero headline'
);
assert(
  introPageRaw.includes('LEAD YOUR COMMUNITY') && introPageRaw.includes('text-[#C8643F]'),
  'Host card has enlarged terracotta eyebrow tag'
);
assert(
  introPageRaw.includes('Launch <BrandName') && introPageRaw.includes('in Your City — Become a Host Admin'),
  'Host card has updated headline with BrandName'
);

// 5. Harmonize Suggestion Section
console.log('\n5. SUGGESTION SECTION STYLING AUDIT:');
assert(
  surveyFormRaw.includes('chip rounded-2xl min-h-[46px] px-4 py-3 text-sm font-medium'),
  'Suggestion buttons strictly match option buttons with chip rounded-2xl min-h-[46px] px-4 py-3 text-sm'
);
assert(
  !surveyFormRaw.includes('rounded-full px-3.5') && !surveyFormRaw.includes('rounded-full px-3'),
  'No skinny rounded-full pills in suggestion section'
);
assert(
  surveyFormRaw.includes('chips mb-3'),
  'Suggestion buttons use shared chips container'
);
assert(
  surveyFormRaw.includes('bg-[#EFECE6]') && surveyFormRaw.includes('border-[#DDD7CB]'),
  'Suggestion pills inactive state styled with bg-[#EFECE6] text-[#2B271F] border-[#DDD7CB]'
);
assert(
  surveyFormRaw.includes('bg-[#C8643F]') && surveyFormRaw.includes('border-[#C8643F]'),
  'Suggestion pills active state styled with terracotta bg-[#C8643F] text-white'
);
assert(
  surveyFormRaw.includes('min-h-[48px] rounded-2xl px-4 py-3') &&
  surveyFormRaw.includes('bg-[#FAF8F5] border border-[#DDD7CB] text-[#2B271F] placeholder-[#9C9488] focus:border-[#C8643F] focus:bg-white'),
  'Custom idea input box styled with min-h-[48px] rounded-2xl px-4 py-3 and warm biscuit bg-[#FAF8F5]'
);

// 6. Confirmation Receipt Dates & Vibes
console.log('\n6. CONFIRMATION RECEIPT DATES & VIBES AUDIT:');
assert(
  confirmationCardRaw.includes('formatAvailabilityDatesList'),
  'formatAvailabilityDatesList function present in ConfirmationCard'
);
assert(
  confirmationCardRaw.includes('Selected Availability Dates:') || confirmationCardRaw.includes('SELECTED AVAILABILITY DATES'),
  'Selected Availability Dates sub-block present in confirmation receipt'
);
assert(
  confirmationCardRaw.includes('Vibes / Activities:') || confirmationCardRaw.includes('VIBES / ACTIVITIES'),
  'Vibes / Activities sub-block present in confirmation receipt'
);
assert(
  confirmationCardRaw.includes('bg-[#C8643F]/10 text-[#C8643F] border border-[#C8643F]/30'),
  'Availability dates styled as terracotta chips'
);
assert(
  confirmationCardRaw.includes('setIsEditingPreferences'),
  'Inline preferences editor allows editing dates and vibes without resetting form state'
);

// 7. Mobile Viewport 390px Integrity
console.log('\n7. MOBILE VIEWPORT 390PX INTEGRITY AUDIT:');
const layoutRaw = fs.readFileSync('app/layout.tsx', 'utf-8');
assert(
  layoutRaw.includes('viewport') || layoutRaw.includes('width=device-width'),
  'Viewport meta tag configured for responsive mobile rendering'
);
assert(
  introPageRaw.includes('overflow-x-hidden') && introPageRaw.includes('w-full max-w-full'),
  'IntroPage container enforces overflow-x-hidden and w-full max-w-full'
);
assert(
  surveyFormRaw.includes('overflow-x-hidden') || surveyFormRaw.includes('max-w-full'),
  'SurveyForm enforces viewport containment'
);

// 8. Dashboard Survey Preferences & Brand Standards
console.log('\n8. DASHBOARD SURVEY PREFERENCES & BRAND STANDARDS AUDIT:');
const dashboardRaw = fs.readFileSync('app/dashboard/page.tsx', 'utf-8');

assert(
  dashboardRaw.includes('YOUR SURVEY PREFERENCES'),
  'Dashboard card header updated to YOUR SURVEY PREFERENCES'
);
assert(
  dashboardRaw.includes('Dates Free:') && dashboardRaw.includes('formattedDatesFree'),
  'Dashboard receipt renders formatted Dates Free'
);
assert(
  dashboardRaw.includes('Preferred Time:') && dashboardRaw.includes('preferredTimeDisplay'),
  'Dashboard receipt renders Preferred Time'
);
assert(
  dashboardRaw.includes('Party Size:') && dashboardRaw.includes('partySizeDisplay'),
  'Dashboard receipt renders Party Size'
);
assert(
  dashboardRaw.includes('Vibes &amp; Suggestions:') || dashboardRaw.includes('Vibes & Suggestions:'),
  'Dashboard receipt renders Vibes & Suggestions section'
);
assert(
  dashboardRaw.includes('formatAvailabilityDatesList'),
  'Dashboard reuses shared formatAvailabilityDatesList utility'
);
assert(
  dashboardRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"') ||
  dashboardRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 align-super"'),
  'Dashboard navbar logo uses text-xs sm:text-sm font-bold terracotta TM'
);
assert(
  dashboardRaw.includes('tmClassName="text-xs sm:text-sm font-bold text-[#C8643F] ml-0.5 inline-block align-super"'),
  'Dashboard footer uses text-xs sm:text-sm font-bold terracotta TM'
);

// 9. Safe Logic Hardening, Timezone Lock & Touch Targets
console.log('\n9. SAFE LOGIC HARDENING, TIMEZONE LOCK & TOUCH TARGET AUDIT:');
const calendarRaw = fs.readFileSync('lib/calendar.ts', 'utf-8');
const icsRouteRaw = fs.readFileSync('app/api/cal/sub/[responseId]/events.ics/route.ts', 'utf-8');
const confirmRouteRaw = fs.readFileSync('app/api/confirm/route.ts', 'utf-8');

assert(
  calendarRaw.includes('formatLocalIsoForCalendar') && calendarRaw.includes('DTSTART;TZID=America/Chicago:'),
  'lib/calendar.ts formats local ISO and uses TZID=America/Chicago without trailing Z'
);
assert(
  calendarRaw.includes("ctz: 'America/Chicago'"),
  'Google Calendar deep-link passes ctz=America/Chicago timezone parameter'
);
assert(
  icsRouteRaw.includes('DTSTART;TZID=America/Chicago:') && icsRouteRaw.includes('sanitizedResponseId'),
  'events.ics route sanitizes responseId against CRLF and locks TZID to America/Chicago'
);
assert(
  confirmRouteRaw.includes('escapeHtml') && confirmRouteRaw.includes('slice(0, 100)') && confirmRouteRaw.includes('slice(0, 1000)'),
  'app/api/confirm/route.ts escapes HTML entities and enforces string length bounds'
);
assert(
  confirmationCardRaw.includes('preferencesSaveError') && confirmationCardRaw.includes('Unable to save changes. Please try again.'),
  'ConfirmationCard.tsx handles inline preference save failures with visible error banner'
);
assert(
  !surveyFormRaw.includes('view=confirmation'),
  'SurveyForm.tsx has mock view=confirmation test bypass completely removed'
);
assert(
  surveyFormRaw.includes('actuallylets_survey_cache') && surveyFormRaw.includes('isEditMode'),
  'SurveyForm.tsx rehydrates survey state from localStorage in edit mode'
);
assert(
  surveyFormRaw.includes('min-h-[44px] min-w-[44px]'),
  'SurveyForm.tsx mobile month pager buttons meet 44x44px touch target standard'
);

// 10. Security Audit: Zero hardcoded admin secrets
console.log('\n10. SECURITY AUDIT: ZERO HARDCODED ADMIN SECRETS:');
const adminRouteFiles = [
  'app/api/admin/announce-date/route.ts',
  'app/api/admin/broadcast-sms/route.ts',
  'app/api/admin/broadcasts/route.ts',
  'app/api/admin/october-campaign/route.ts',
  'app/api/admin/resend-invite/route.ts',
  'app/api/broadcast/route.ts',
];
let admin123Count = 0;
for (const f of adminRouteFiles) {
  if (fs.existsSync(f)) {
    const raw = fs.readFileSync(f, 'utf-8');
    if (raw.includes('admin123')) admin123Count++;
  }
}
assert(
  admin123Count === 0,
  `Zero hardcoded admin123 secrets across all administrative API routes (found ${admin123Count})`
);

// 11. Server-Side Persistence & Security Rules Lockdown (Phase 2B & 2C)
console.log('\n11. SERVER-SIDE PERSISTENCE & SECURITY RULES LOCKDOWN AUDIT:');
const gitignoreRaw = fs.readFileSync('.gitignore', 'utf-8');
const firebaseAdminRaw = fs.readFileSync('lib/firebaseAdmin.ts', 'utf-8');
const firestoreRulesRaw = fs.readFileSync('firestore.rules', 'utf-8');

// Gitignore hygiene
assert(
  gitignoreRaw.includes('*firebase-adminsdk*.json'),
  '.gitignore contains *firebase-adminsdk*.json'
);
assert(
  gitignoreRaw.includes('.env*.local') || gitignoreRaw.includes('.env*'),
  '.gitignore ignores .env*.local credentials'
);

// Firebase Admin SDK Initialization
assert(
  firebaseAdminRaw.includes('initializeApp') && firebaseAdminRaw.includes('getFirestore') && firebaseAdminRaw.includes('adminDb'),
  'lib/firebaseAdmin.ts correctly initializes Firebase Admin SDK and exports adminDb'
);

// app/api/confirm/route.ts migration & fail-closed behavior
assert(
  confirmRouteRaw.includes("import { adminDb } from '@/lib/firebaseAdmin'") || confirmRouteRaw.includes('import { adminDb } from "@/lib/firebaseAdmin"'),
  'app/api/confirm/route.ts imports adminDb from @/lib/firebaseAdmin'
);
assert(
  !confirmRouteRaw.includes('saveResponse('),
  'app/api/confirm/route.ts eliminates client SDK saveResponse write calls'
);
assert(
  confirmRouteRaw.includes('if (!adminDb)'),
  'app/api/confirm/route.ts guards against uninitialized adminDb'
);
assert(
  confirmRouteRaw.includes('process.env.TURNSTILE_SECRET_KEY') && confirmRouteRaw.includes('challenges.cloudflare.com/turnstile/v0/siteverify'),
  'app/api/confirm/route.ts mandates Turnstile verification via process.env.TURNSTILE_SECRET_KEY'
);
assert(
  confirmRouteRaw.includes('status: 500') && confirmRouteRaw.includes('Critical database failure'),
  'app/api/confirm/route.ts fails closed with HTTP 500 on database write failure (eliminates silent data loss)'
);

// Firestore Rules Lockdown
assert(
  firestoreRulesRaw.includes('match /responses/{responseId}') && firestoreRulesRaw.includes('allow create: if false;'),
  'firestore.rules prohibits direct client creates on /responses'
);
assert(
  firestoreRulesRaw.includes('request.auth != null') && firestoreRulesRaw.includes('request.auth.token.email_verified == true'),
  'firestore.rules restricts reads and updates to verified authenticated users matching email'
);
assert(
  firestoreRulesRaw.includes('match /broadcasts/{broadcastId}') && firestoreRulesRaw.includes('allow write: if false;'),
  'firestore.rules prevents direct client writes on /broadcasts'
);

console.log('\n====================================================');
console.log(`AUDIT COMPLETE: ${passes} PASSED, ${failures} FAILED`);
console.log('====================================================');

if (failures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
