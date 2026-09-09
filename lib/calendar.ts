/**
 * Calendar utilities for generating Google Calendar URLs and RFC 5545-compliant .ics files.
 */

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

  const startIso = formatIsoForCalendar(startDate);
  const endIso = formatIsoForCalendar(endDate);

  return { start: startDate, end: endDate, startIso, endIso };
}

/**
 * 1. Formats parameters for Google Calendar web deep-linking.
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const googleCalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${event.startIso}/${event.endIso}`,
    details: event.description,
    location: event.location,
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

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Actually Lets//Gathering Confirmation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowIso}`,
    `DTSTART:${event.startIso}`,
    `DTEND:${event.endIso}`,
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

