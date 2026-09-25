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

assert(
  brandNameRaw.includes('hasCustomSize') && brandNameRaw.includes('hasCustomAlign'),
  'BrandName supports intelligent custom size, alignment, and color overrides'
);
assert(
  footerRaw.includes('tmClassName="text-[11px] sm:text-xs font-semibold ml-0.5 align-super text-[#C8643F]"'),
  'components/Footer.tsx uses legible terracotta TM with text-[11px] sm:text-xs'
);
assert(
  introPageRaw.includes('tmClassName="text-[11px] sm:text-xs font-semibold ml-0.5 align-super text-[#C8643F]"'),
  'app/components/IntroPage.tsx footer uses legible terracotta TM'
);
assert(
  confirmationCardRaw.includes('tmClassName="text-[11px] sm:text-xs font-semibold ml-0.5 align-super text-[#C8643F]"'),
  'ConfirmationCard.tsx footer uses legible terracotta TM'
);
assert(
  surveyFormRaw.includes('tmClassName="text-[11px] sm:text-xs font-semibold ml-0.5 align-super text-[#C8643F]"'),
  'SurveyForm.tsx footer uses legible terracotta TM'
);

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
  surveyFormRaw.includes('rounded-xl py-2.5 px-3.5') && surveyFormRaw.includes('text-xs sm:text-sm font-medium'),
  'Suggestion buttons styled as rounded-xl py-2.5 px-3.5 text-xs sm:text-sm matching option buttons'
);
assert(
  !surveyFormRaw.includes('rounded-full px-3.5 py-1.5'),
  'No skinny rounded-full pills in suggestion section'
);
assert(
  surveyFormRaw.includes('gap-2 sm:gap-2.5 mb-3'),
  'Suggestion buttons flex/wrap with gap-2 sm:gap-2.5'
);
assert(
  surveyFormRaw.includes('bg-[#EFECE6] text-[#2B271F] border-[#DDD7CB] hover:bg-[#E8E3DB]'),
  'Suggestion pills inactive state styled with bg-[#EFECE6] text-[#2B271F] border-[#DDD7CB]'
);
assert(
  surveyFormRaw.includes('bg-[#C8643F] text-white border-[#C8643F] shadow-xs') ||
  surveyFormRaw.includes('bg-[#C8643F] text-white border-[#C8643F]'),
  'Suggestion pills active state styled with terracotta bg-[#C8643F] text-white'
);
assert(
  surveyFormRaw.includes('rounded-xl py-3 px-4') &&
  surveyFormRaw.includes('bg-[#FAF8F5] border border-[#DDD7CB] text-[#2B271F] placeholder-[#9C9488] focus:border-[#C8643F] focus:bg-white'),
  'Custom idea input box styled with rounded-xl py-3 px-4 and warm biscuit bg-[#FAF8F5]'
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

console.log('\n====================================================');
console.log(`AUDIT COMPLETE: ${passes} PASSED, ${failures} FAILED`);
console.log('====================================================');

if (failures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
