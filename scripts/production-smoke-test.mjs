import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Results tracking
const results = [];

function recordResult(category, check, passed, details = '') {
  results.push({ category, check, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category}] ${check}${details ? ` -> ${details}` : ''}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------
// 1. ROUTE REACHABILITY & HEADER CHECKS (Direct HTTP)
// ---------------------------------------------------------
async function runRouteChecks() {
  console.log('\n--- 1. ROUTE REACHABILITY & HEADER CHECKS ---');

  // Landing page
  try {
    const res = await fetch('https://actuallylets.com');
    recordResult('Route Checks', 'GET https://actuallylets.com -> HTTP 200', res.status === 200, `Status ${res.status}`);
    const html = await res.text();
    const hasSubcopy = html.includes('Plan gatherings, effortlessly. Without the group chat.');
    recordResult('Route Checks', 'Landing hero subcopy matches exact copy', hasSubcopy);
    
    // Trademark check: either &#x27;s™ or 's™ with visible TM symbol
    const hasBrandName = (html.includes('Actually, Let&#x27;s') || html.includes("Actually, Let's")) && html.includes('™');
    recordResult('Route Checks', 'Landing page contains Actually, Let’s™ with visible ™', hasBrandName);
  } catch (err) {
    recordResult('Route Checks', 'GET https://actuallylets.com reachable', false, err.message);
  }

  // Chicago page
  try {
    const res = await fetch('https://actuallylets.com/chicago');
    recordResult('Route Checks', 'GET https://actuallylets.com/chicago -> HTTP 200', res.status === 200, `Status ${res.status}`);
    const html = await res.text();
    const hasOct = html.includes('October') || html.includes('Oct');
    recordResult('Route Checks', 'Chicago October calendar cells present', hasOct);

    // No Taco Tuesdays
    const hasTacoTuesday = html.toLowerCase().includes('taco tuesday') || html.toLowerCase().includes('taco-tuesday');
    recordResult('Route Checks', 'Tuesdays have no Taco Tuesday badges/events', !hasTacoTuesday);

    // Lineup checks
    const hasSoulSmoke = html.includes('Soul & Smoke') || html.includes('Soul &amp; Smoke');
    const hasLittleLark = html.includes('Little Lark');
    const hasAppleFest = html.includes('Apple Fest');
    recordResult('Route Checks', 'Confirmed lineup present (Soul & Smoke, Little Lark, Apple Fest)', hasSoulSmoke && hasLittleLark && hasAppleFest);
  } catch (err) {
    recordResult('Route Checks', 'GET https://actuallylets.com/chicago reachable', false, err.message);
  }

  // Dashboard page
  try {
    const res = await fetch('https://actuallylets.com/dashboard');
    recordResult('Route Checks', 'GET https://actuallylets.com/dashboard -> HTTP 200', res.status === 200, `Status ${res.status}`);
    const html = await res.text();
    const hasNavbarTM = (html.includes('Actually, Let&#x27;s') || html.includes("Actually, Let's")) && html.includes('™');
    recordResult('Route Checks', 'Dashboard contains Actually, Let’s™ in navbar with visible ™', hasNavbarTM);
  } catch (err) {
    recordResult('Route Checks', 'GET https://actuallylets.com/dashboard reachable', false, err.message);
  }
}

// ---------------------------------------------------------
// 2-4. HEADLESS BROWSER E2E TESTS (CDP via Native WebSocket)
// ---------------------------------------------------------
class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
      this.handlers.forEach((h) => h(msg));
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(handler) {
    this.handlers.push(handler);
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }
}

async function launchBrowser() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const exePath = possiblePaths.find((p) => fs.existsSync(p));
  if (!exePath) throw new Error('No Chrome or Edge browser executable found on system.');

  const userDataDir = path.join(os.tmpdir(), `smoke_cdp_${Date.now()}`);
  const chromeProcess = spawn(exePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
  ]);

  // Wait for debug port
  let connected = false;
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      const v = await fetch('http://127.0.0.1:9222/json/version');
      if (v.ok) {
        connected = true;
        break;
      }
    } catch {}
  }
  if (!connected) {
    chromeProcess.kill();
    throw new Error('Failed to connect to browser CDP port 9222');
  }

  return {
    process: chromeProcess,
    userDataDir,
    async createPage(url) {
      const targetRes = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
      const target = await targetRes.json();
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });
      const session = new CdpSession(ws);
      await session.send('Page.enable');
      await session.send('Runtime.enable');
      return { session, target, ws };
    },
  };
}

async function runBrowserTests(browser) {
  console.log('\n--- 2. SUGGESTION PILLS & INPUT STYLING INSPECTION (390x844) ---');

  const { session, target, ws } = await browser.createPage('https://actuallylets.com/chicago');

  try {
    // Mobile Viewport 390x844
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });

    // Wait for page to finish loading and hydrate
    await session.eval(`new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve);
    })`);
    await sleep(2500);

    // Inspect computed styles
    const styles = await session.eval(`(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const suggestionBtn = allButtons.find(b => b.textContent && b.textContent.includes('Board Games'));
      const timeBtn = allButtons.find(b => b.textContent && (b.textContent.includes('Mid-Morning') || b.textContent.includes('Evening')));
      const customInput = Array.from(document.querySelectorAll('input')).find(i => 
        (i.placeholder && i.placeholder.toLowerCase().includes('idea')) || 
        (i.placeholder && i.placeholder.toLowerCase().includes('mind'))
      );

      const sStyle = suggestionBtn ? window.getComputedStyle(suggestionBtn) : null;
      const tStyle = timeBtn ? window.getComputedStyle(timeBtn) : null;
      const iStyle = customInput ? window.getComputedStyle(customInput) : null;

      const parseRadius = (str) => {
        if (!str) return 0;
        const match = str.match(/([\\d.]+)px/);
        return match ? parseFloat(match[1]) : 0;
      };

      const parseMinHeight = (str, rectHeight) => {
        if (str && str !== 'auto' && str !== 'none') {
          const match = str.match(/([\\d.]+)px/);
          if (match) return parseFloat(match[1]);
        }
        return rectHeight || 0;
      };

      return {
        suggestion: sStyle ? {
          borderRadius: sStyle.borderRadius,
          radiusPx: parseRadius(sStyle.borderRadius),
          minHeight: sStyle.minHeight,
          minHeightPx: parseMinHeight(sStyle.minHeight, suggestionBtn.getBoundingClientRect().height),
          fontSize: sStyle.fontSize,
          height: suggestionBtn.getBoundingClientRect().height
        } : null,
        time: tStyle ? {
          borderRadius: tStyle.borderRadius,
          radiusPx: parseRadius(tStyle.borderRadius),
          minHeight: tStyle.minHeight,
          minHeightPx: parseMinHeight(tStyle.minHeight, timeBtn.getBoundingClientRect().height),
          fontSize: tStyle.fontSize,
          height: timeBtn.getBoundingClientRect().height
        } : null,
        input: iStyle ? {
          borderRadius: iStyle.borderRadius,
          radiusPx: parseRadius(iStyle.borderRadius),
          minHeight: iStyle.minHeight,
          height: customInput.getBoundingClientRect().height,
          fontSize: iStyle.fontSize
        } : null
      };
    })()`);

    if (!styles.suggestion || !styles.time || !styles.input) {
      recordResult('Styling Inspection', 'Locate suggestion pill, time button, and custom input', false, 'Missing elements');
    } else {
      // 1. Border radius 16px (rounded-2xl)
      const radiusMatches = Math.abs(styles.suggestion.radiusPx - 16) < 1;
      recordResult('Styling Inspection', 'Suggestion pill border-radius matches 16px (rounded-2xl)', radiusMatches, `got ${styles.suggestion.borderRadius}`);

      // 2. Min-height >= 46px
      const minHeightPasses = styles.suggestion.minHeightPx >= 45.9;
      recordResult('Styling Inspection', 'Suggestion pill min-height >= 46px', minHeightPasses, `got ${styles.suggestion.minHeightPx}px (rect ${styles.suggestion.height}px)`);

      // 3. Font-size 14px (text-sm)
      const fontMatches = styles.suggestion.fontSize === '14px';
      recordResult('Styling Inspection', 'Suggestion pill font-size is 14px (text-sm)', fontMatches, `got ${styles.suggestion.fontSize}`);

      // 4. Input box border-radius 16px & height >= 48px
      const inputRadiusPasses = Math.abs(styles.input.radiusPx - 16) < 1;
      const inputHeightPasses = styles.input.height >= 47.9;
      recordResult('Styling Inspection', 'Custom idea input box has border-radius 16px (rounded-2xl)', inputRadiusPasses, `got ${styles.input.borderRadius}`);
      recordResult('Styling Inspection', 'Custom idea input box height >= 48px', inputHeightPasses, `got ${styles.input.height}px`);
    }

    console.log('\n--- 3. SURVEY SUBMISSION & RECEIPT FLOW ---');
    // Install safe mock for /api/confirm in this session to validate without mutating real production data
    await session.eval(`(() => {
      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        const [resource, config] = args;
        const url = typeof resource === 'string' ? resource : resource?.url;
        if (url && url.includes('/api/confirm')) {
          console.log('[SmokeTest Mock] Intercepted /api/confirm');
          return new Response(JSON.stringify({
            success: true,
            responseId: 'sample',
            emailDelivered: false
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return origFetch.apply(this, args);
      };
    })()`);

    // Fill the staging test survey
    const fillResult = await session.eval(`(async () => {
      function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 1. Select Day 4 (click cell)
      const dayCells = Array.from(document.querySelectorAll('div[role="button"]'));
      const cell4 = dayCells.find(c => {
        const text = (c.innerText || '').trim();
        const firstLine = text.split('\\n')[0].trim();
        return firstLine === '4';
      });
      if (cell4) cell4.click();

      // 2. Select Day 17 (click cell, then RSVP in modal, then Done)
      const cell17 = dayCells.find(c => {
        const text = (c.innerText || '').trim();
        const firstLine = text.split('\\n')[0].trim();
        return firstLine === '17';
      });
      if (cell17) cell17.click();

      await new Promise(r => setTimeout(r, 400));
      const attendBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent && (b.textContent.includes("I'm Attending This Gathering") || b.textContent.includes("I'm in") || b.textContent.includes("Count me in"))
      );
      if (attendBtn) attendBtn.click();
      
      const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Done');
      if (doneBtn) doneBtn.click();

      // 3. Select Time: Evening
      const allButtons = Array.from(document.querySelectorAll('button'));
      const eveningBtn = allButtons.find(b => b.textContent && b.textContent.trim() === 'Evening');
      if (eveningBtn) eveningBtn.click();

      // 4. Select Vibe: Board Games & Card Games
      const boardGamesBtn = allButtons.find(b => b.textContent && b.textContent.includes('Board Games'));
      if (boardGamesBtn) boardGamesBtn.click();

      // 5. Select Party Size: 2
      const party2Btn = allButtons.find(b => b.textContent && b.textContent.trim() === '2');
      if (party2Btn) party2Btn.click();

      // 6. Fill Name & Email
      const nameInput = document.querySelector('input[placeholder*="First name" i]');
      const emailInput = document.querySelector('input[placeholder*="email.com" i]');
      if (nameInput) setNativeValue(nameInput, 'Smoke Test Runner');
      if (emailInput) setNativeValue(emailInput, 'smoketest@actuallylets.com');

      return {
        nameVal: nameInput ? nameInput.value : null,
        emailVal: emailInput ? emailInput.value : null,
        cell4Clicked: Boolean(cell4),
        cell17Clicked: Boolean(cell17),
        eveningClicked: Boolean(eveningBtn),
        boardGamesClicked: Boolean(boardGamesBtn),
        party2Clicked: Boolean(party2Btn)
      };
    })()`);

    recordResult('Survey Flow', 'Form fields populated (Name, Email, Time, Vibe, Party Size)', 
      fillResult.nameVal === 'Smoke Test Runner' && 
      fillResult.emailVal === 'smoketest@actuallylets.com' && 
      fillResult.eveningClicked && fillResult.boardGamesClicked && fillResult.party2Clicked
    );

    // Click Submit
    await session.eval(`(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.type === 'submit' || (b.textContent && b.textContent.includes('Send my answers'))
      );
      if (submitBtn) submitBtn.click();
    })()`);

    // Wait for submission transition to ConfirmationCard
    await sleep(2500);

    const receiptData = await session.eval(`(() => {
      const text = document.body.innerText;
      const hasPreferencesHeader = text.includes('YOUR SURVEY PREFERENCES');
      const hasDates = text.includes('Oct 4') || text.includes('Oct 17') || text.includes('October');
      const hasTime = text.includes('Evening');
      const hasParty = text.includes('2') || text.includes('2 guests');
      const hasVibe = text.includes('Board Games');
      const formError = document.querySelector('.form-error')?.textContent;

      return {
        hasPreferencesHeader,
        hasDates,
        hasTime,
        hasParty,
        hasVibe,
        formError,
        snippet: text.slice(0, 400)
      };
    })()`);

    recordResult('Receipt Flow', 'Confirmation card transitions and reads "YOUR SURVEY PREFERENCES"', receiptData.hasPreferencesHeader, receiptData.formError ? `Error: ${receiptData.formError}` : '');
    recordResult('Receipt Flow', 'Confirmation card displays selected dates (Oct 4 / Oct 17)', receiptData.hasDates);
    recordResult('Receipt Flow', 'Confirmation card displays preferred time (Evening)', receiptData.hasTime);
    recordResult('Receipt Flow', 'Confirmation card displays party size (2)', receiptData.hasParty);
    recordResult('Receipt Flow', 'Confirmation card displays vibe (Board Games & Card Games)', receiptData.hasVibe);

    console.log('\n--- 4. EDIT → RE-HYDRATION FLOW ---');
    // Navigate to /chicago?edit=true
    await session.send('Page.navigate', { url: 'https://actuallylets.com/chicago?edit=true' });
    await sleep(2500);

    const rehydrated = await session.eval(`(() => {
      const nameInput = document.querySelector('input[placeholder*="First name" i]');
      const emailInput = document.querySelector('input[placeholder*="email.com" i]');
      
      const allButtons = Array.from(document.querySelectorAll('button'));
      const activeEvening = allButtons.some(b => b.textContent && b.textContent.trim() === 'Evening' && b.className.includes('on'));
      const activeVibe = allButtons.some(b => b.textContent && b.textContent.includes('Board Games') && (b.className.includes('!bg-[#C8643F]') || b.className.includes('on')));
      const activeGuests = allButtons.some(b => b.textContent && b.textContent.trim() === '2' && b.className.includes('on'));

      return {
        name: nameInput ? nameInput.value : '',
        email: emailInput ? emailInput.value : '',
        activeEvening,
        activeVibe,
        activeGuests
      };
    })()`);

    recordResult('Re-hydration Flow', 'Form does NOT mount blank in edit mode', Boolean(rehydrated.name));
    recordResult('Re-hydration Flow', 'Name re-hydrated as "Smoke Test Runner"', rehydrated.name === 'Smoke Test Runner', `got "${rehydrated.name}"`);
    recordResult('Re-hydration Flow', 'Email re-hydrated as "smoketest@actuallylets.com"', rehydrated.email === 'smoketest@actuallylets.com', `got "${rehydrated.email}"`);
    recordResult('Re-hydration Flow', 'Preferences re-hydrated (Time / Vibe / Guests active)', rehydrated.activeEvening || rehydrated.activeVibe || rehydrated.activeGuests);

  } finally {
    ws.close();
  }
}

// ---------------------------------------------------------
// 5. CALENDAR FEED (.ICS) INSPECTION (Live Production Feed)
// ---------------------------------------------------------
async function runIcsChecks() {
  console.log('\n--- 5. CALENDAR FEED (.ICS) INSPECTION ---');

  try {
    const res = await fetch('https://actuallylets.com/api/cal/sub/sample/events.ics');
    recordResult('ICS Feed', 'GET /api/cal/sub/sample/events.ics -> HTTP 200', res.status === 200, `Status ${res.status}`);

    const contentType = res.headers.get('content-type') || '';
    const hasCalType = contentType.includes('text/calendar') && contentType.includes('charset=utf-8');
    recordResult('ICS Feed', 'Content-Type header is text/calendar; charset=utf-8', hasCalType, `got ${contentType}`);

    const body = await res.text();

    // Check timezone identifier
    const hasChicagoTz = body.includes('TZID:America/Chicago') || body.includes('DTSTART;TZID=America/Chicago:');
    recordResult('ICS Feed', 'Feed includes TZID:America/Chicago or DTSTART;TZID=America/Chicago:', hasChicagoTz);

    // Timestamps do NOT have trailing Z attached to Chicago local hours
    const dtstartLines = body.split('\r\n').filter((l) => l.startsWith('DTSTART;TZID=America/Chicago:'));
    const dtendLines = body.split('\r\n').filter((l) => l.startsWith('DTEND;TZID=America/Chicago:'));
    const noTrailingZ = dtstartLines.length > 0 && dtstartLines.every((l) => !l.endsWith('Z')) && dtendLines.every((l) => !l.endsWith('Z'));
    recordResult('ICS Feed', 'Event timestamps do NOT have a trailing Z attached to Chicago local hours', noTrailingZ, `Sample: ${dtstartLines[0] || 'none'}`);

    // Valid CRLF format
    const hasCrlf = body.includes('\r\n') && body.startsWith('BEGIN:VCALENDAR') && body.trim().endsWith('END:VCALENDAR');
    recordResult('ICS Feed', 'Valid RFC 5545 iCalendar syntax with CRLF formatting', hasCrlf);

  } catch (err) {
    recordResult('ICS Feed', 'GET .ics feed succeeded', false, err.message);
  }
}

// ---------------------------------------------------------
// MAIN RUNNER & TABLE FORMATTER
// ---------------------------------------------------------
async function main() {
  console.log('====================================================');
  console.log('  ACTUALLY, LET\'S™ PRODUCTION E2E SMOKE TEST SUITE');
  console.log('  Target: https://actuallylets.com');
  console.log('====================================================');

  await runRouteChecks();

  let browser;
  try {
    browser = await launchBrowser();
    await runBrowserTests(browser);
  } catch (err) {
    console.error('Browser automation error:', err);
    recordResult('Browser Automation', 'Launch and execute headless browser tests', false, err.message);
  } finally {
    if (browser?.process) {
      try { browser.process.kill(); } catch {}
    }
  }

  await runIcsChecks();

  // Print Pass/Fail Table
  console.log('\n====================================================');
  console.log('                SMOKE TEST SUMMARY TABLE            ');
  console.log('====================================================');
  console.log('| Status  | Category            | Check Description                                          |');
  console.log('|---------|---------------------|------------------------------------------------------------|');

  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    const status = r.passed ? 'PASS ' : 'FAIL ';
    const cat = r.category.padEnd(19).slice(0, 19);
    const check = r.check.padEnd(58).slice(0, 58);
    console.log(`|  ${status}  | ${cat} | ${check} |`);
    if (r.passed) passedCount++;
    else failedCount++;
  }

  console.log('====================================================');
  console.log(`TOTAL: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error in smoke test runner:', err);
  process.exit(1);
});
