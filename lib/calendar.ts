/**
 * Calendar utilities for generating Google Calendar URLs and RFC 5545-compliant .ics files.
 */
import { CommunityEvent, splitEventTitle } from "@/lib/eventsConfig";

export interface CalendarEventOptions {
  cityName: string;
  name?: string;
  email?: string;
  gatherings?: string[];
  customGathering?: string | null;
  dates?: string[];
  times?: string[];
  customDate?: string | null;
  customTime?: string | null;
}

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startIso: string;
  endIso: string;
}

export function formatIsoForCalendar(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

export function formatLocalIsoForCalendar(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

/**
 * Parses user-selected date/time strings or falls back to a sensible slot.
 */
export function parseEventDates(options: CalendarEventOptions): {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  let targetDate: Date | null = null;

  // Try to parse the first selected date (e.g. "Sat, Sep 26", "Sun, Sep 27", etc.)
  const candidateDateStr = (options.dates && options.dates.length > 0) ? options.dates[0] : (options.customDate || '');
  
  if (candidateDateStr && !candidateDateStr.toLowerCase().includes('any date')) {
    const match = candidateDateStr.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    if (match) {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const monthStr = candidateDateStr.match(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i)?.[0].toLowerCase() || 'sep';
      const monthIndex = monthNames.indexOf(monthStr.slice(0, 3));
      const day = parseInt(match[1], 10);
      if (monthIndex !== -1 && !isNaN(day)) {
        // Automatic Year-Boundary Rollover:
        // If event month is earlier in calendar than current month (e.g. parsing Jan in Dec), roll to next year.
        const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
        targetDate = new Date(year, monthIndex, day);
      }
    }
  }

  // Fallback: If no date or "Any date" or past date, default to Sep 26, currentYear or next Saturday
  if (!targetDate || isNaN(targetDate.getTime()) || targetDate.getTime() < Date.now() - 86400000) {
    const sep26 = new Date(currentYear, 8, 26);
    if (sep26.getTime() >= Date.now() - 86400000) {
      targetDate = sep26;
    } else {
      targetDate = new Date();
      const dayOfWeek = targetDate.getDay();
      const daysUntilNextSaturday = (6 - dayOfWeek + 7) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + daysUntilNextSaturday);
    }
  }

  // Determine start hour based on selected time
  let startHour = 10;
  const durationHours = 2;

  const firstTime = (options.times && options.times.length > 0) ? options.times[0].toLowerCase() : (options.customTime?.toLowerCase() || '');
  if (firstTime.includes('early-morning') || firstTime.includes('8')) {
    startHour = 8;
  } else if (firstTime.includes('mid-morning') || firstTime.includes('10')) {
    startHour = 10;
  } else if (firstTime.includes('late-morning') || firstTime.includes('late am') || firstTime.includes('11')) {
    startHour = 11;
  } else if (firstTime.includes('afternoon') || firstTime.includes('2') || firstTime.includes('3')) {
    startHour = 14;
  } else if (firstTime.includes('evening') || firstTime.includes('6') || firstTime.includes('7')) {
    startHour = 18;
  }

  const startDate = new Date(targetDate);
  startDate.setHours(startHour, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setHours(startHour + durationHours, 0, 0, 0);

  const startIso = formatLocalIsoForCalendar(startDate);
  const endIso = formatLocalIsoForCalendar(endDate);

  return { start: startDate, end: endDate, startIso, endIso };
}

/**
 * 1. Formats parameters for Google Calendar web deep-linking.
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const cleanStartIso = event.startIso.replace(/Z$/i, '');
  const cleanEndIso = event.endIso.replace(/Z$/i, '');
  const googleCalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${cleanStartIso}/${cleanEndIso}`,
    details: event.description,
    location: event.location,
    ctz: 'America/Chicago',
  });
  return `https://calendar.google.com/calendar/render?${googleCalParams.toString()}`;
}

/**
 * RFC 5545-compliant .ics file content generation.
 */
export function generateIcsContent(event: CalendarEvent): string {
  const escapeIcsText = (str: string) =>
    (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const nowIso = formatIsoForCalendar(new Date());
  const uid = `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@actuallylets.com`;
  const cleanStartIso = event.startIso.replace(/Z$/i, '');
  const cleanEndIso = event.endIso.replace(/Z$/i, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Actually Lets//Gathering Confirmation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:America/Chicago',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowIso}`,
    `DTSTART;TZID=America/Chicago:${cleanStartIso}`,
    `DTEND;TZID=America/Chicago:${cleanEndIso}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * 2. Formats a clean .ics file blob URL for 1-click Apple Calendar / Outlook import.
 */
export function generateIcsBlobUrl(event: CalendarEvent): string {
  const content = generateIcsContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Higher-level helper bundling details, URLs, and filenames.
 */
export function generateCalendarDetails(options: CalendarEventOptions) {
  const { cityName } = options;
  const { start, end, startIso, endIso } = parseEventDates(options);

  const cityDisplayName = cityName || 'Chicago';
  const location = `${cityDisplayName === 'Chicago' ? 'Chicago, IL' : cityDisplayName === 'Austin' ? 'Austin, TX' : cityDisplayName}`;
  const title = `Actually, Let's — ${cityDisplayName} Gathering Series`;
  const description = `Community gathering series survey confirmed. Specific venue and details to follow.`;

  const event: CalendarEvent = {
    title,
    description,
    location,
    startIso,
    endIso,
  };

  const googleCalendarUrl = generateGoogleCalendarUrl(event);
  const icsContent = generateIcsContent(event);

  return {
    title,
    location,
    description,
    startDate: start,
    endDate: end,
    startIso,
    endIso,
    googleCalendarUrl,
    icsContent,
    fileName: `actually-lets-${cityDisplayName.toLowerCase().replace(/\s+/g, '-')}.ics`,
  };
}

/**
 * Generates a direct Google Calendar template URL for a CommunityEvent.
 * Format: https://calendar.google.com/calendar/render?action=TEMPLATE&text={title}&dates={start}/{end}&details={desc}&location={address}
 */
export function buildGoogleCalendarUrl(ev: CommunityEvent, dateStr?: string): string {
  const cleanTitle = splitEventTitle(ev.title, ev.brandPrefix).eventName;
  const eventTitle = `Actually, Let's — ${cleanTitle}`;
  const address = ev.venueAddress || ev.venueName || "Chicago, IL";
  const desc = `${ev.description || ''}\n\nOrganized by Actually, Let's™ · Chicago Chapter\nhttps://actuallylets.com`.trim();

  let year = 2026;
  let month = 10;
  let day = 16;

  if (ev.date && /^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
    const parts = ev.date.split('-').map(Number);
    year = parts[0];
    month = parts[1];
    day = parts[2];
  }

  if (dateStr) {
    const dMatch = dateStr.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    if (dMatch) {
      day = parseInt(dMatch[1], 10);
    }
  }

  let startHour = 18;
  let startMinute = 0;
  let endHour = 20;
  let endMinute = 30;

  if (ev.timeWindow) {
    const timeMatches = Array.from(ev.timeWindow.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/gi));
    if (timeMatches.length > 0) {
      let h1 = parseInt(timeMatches[0][1], 10);
      const m1 = timeMatches[0][2] ? parseInt(timeMatches[0][2], 10) : 0;
      const p1 = timeMatches[0][3].toUpperCase();
      if (p1 === 'PM' && h1 < 12) h1 += 12;
      if (p1 === 'AM' && h1 === 12) h1 = 0;
      startHour = h1;
      startMinute = m1;

      if (timeMatches.length > 1) {
        let h2 = parseInt(timeMatches[1][1], 10);
        const m2 = timeMatches[1][2] ? parseInt(timeMatches[1][2], 10) : 0;
        const p2 = timeMatches[1][3].toUpperCase();
        if (p2 === 'PM' && h2 < 12) h2 += 12;
        if (p2 === 'AM' && h2 === 12) h2 = 0;
        endHour = h2;
        endMinute = m2;
      } else {
        endHour = (startHour + 2) % 24;
        endMinute = startMinute;
      }
    }
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  const startIso = `${year}${pad(month)}${pad(day)}T${pad(startHour)}${pad(startMinute)}00`;
  const endIso = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMinute)}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle,
    dates: `${startIso}/${endIso}`,
    details: desc,
    location: address,
    ctz: 'America/Chicago',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

