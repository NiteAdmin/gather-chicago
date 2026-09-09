/**
 * Smart Calendar availability checker and conflict evaluator.
 * Handles client-side .ics RFC 5545 parsing and ephemeral Google Calendar freeBusy evaluations.
 * PRIVACY LOCK: Never stores, inspects, or transmits event summaries, descriptions, attendees, or titles.
 */

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface SlotAvailability {
  label: string;
  hasConflict: boolean;
  start?: Date;
  end?: Date;
}

/**
 * Parses an iCalendar date string (e.g. 20260926T100000Z, 20260926T100000, 20260926) into a Date object.
 */
export function parseIcsDate(value: string): Date | null {
  if (!value) return null;
  const cleanVal = value.trim().replace(/^.*:/, ''); // Strip parameter prefix if any (e.g., TZID=...)

  // Full ISO date-time with Z (UTC)
  const dtUtcMatch = cleanVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (dtUtcMatch) {
    const [, y, m, d, hh, mm, ss] = dtUtcMatch;
    return new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
  }

  // Date-time without Z (local)
  const dtLocalMatch = cleanVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (dtLocalMatch) {
    const [, y, m, d, hh, mm, ss] = dtLocalMatch;
    return new Date(+y, +m - 1, +d, +hh, +mm, +ss);
  }

  // All-day date (YYYYMMDD)
  const dMatch = cleanVal.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dMatch) {
    const [, y, m, d] = dMatch;
    return new Date(+y, +m - 1, +d, 0, 0, 0);
  }

  return null;
}

/**
 * Parses raw .ics file content for busy intervals (DTSTART -> DTEND).
 * MEMORY & PRIVACY OPTIMIZATION: Ignores all metadata (SUMMARY, DESCRIPTION, ATTENDEES).
 */
export function parseIcsBusyIntervals(icsContent: string): TimeInterval[] {
  const intervals: TimeInterval[] = [];
  if (!icsContent || typeof icsContent !== 'string') return intervals;

  const lines = icsContent.replace(/\r\n/g, '\n').replace(/\n /g, '').split('\n');
  let inEvent = false;
  let currentStart: Date | null = null;
  let currentEnd: Date | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentStart = null;
      currentEnd = null;
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && currentStart) {
        // If no DTEND specified, default duration is 1 hour
        const end = currentEnd || new Date(currentStart.getTime() + 60 * 60 * 1000);
        intervals.push({ start: currentStart, end });
      }
      inEvent = false;
      currentStart = null;
      currentEnd = null;
      continue;
    }

    if (inEvent) {
      if (line.startsWith('DTSTART')) {
        currentStart = parseIcsDate(line);
      } else if (line.startsWith('DTEND')) {
        currentEnd = parseIcsDate(line);
      }
      // Explicitly ignore SUMMARY, DESCRIPTION, ATTENDEE, LOCATION, etc.
    }
  }

  return intervals;
}

/**
 * Maps survey date options (e.g. "Sat, Sep 26", "Sun, Sep 27") into candidate intervals.
 */
export function getCandidateSlotIntervals(
  dates: string[],
  defaultHour = 10,
  durationHours = 2
): { label: string; start: Date; end: Date }[] {
  const currentYear = new Date().getFullYear();
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  return dates.map((label) => {
    let targetDate: Date | null = null;
    const match = label.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);

    if (match) {
      const monthStr = label.match(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i)?.[0].toLowerCase() || 'sep';
      const monthIndex = monthNames.indexOf(monthStr.slice(0, 3));
      const day = parseInt(match[1], 10);
      if (monthIndex !== -1 && !isNaN(day)) {
        targetDate = new Date(currentYear, monthIndex, day);
      }
    }

    // Default fallback
    if (!targetDate || isNaN(targetDate.getTime())) {
      targetDate = new Date(currentYear, 8, 26); // Default Sep 26
    }

    const start = new Date(targetDate);
    start.setHours(defaultHour, 0, 0, 0);

    const end = new Date(start);
    end.setHours(defaultHour + durationHours, 0, 0, 0);

    return { label, start, end };
  });
}

/**
 * Computes strictly constrained timeMin / timeMax ISO bounds covering candidate dates (00:00:00Z to 23:59:59Z).
 */
export function getSurveyDateBounds(candidateSlots: { start: Date; end: Date }[]): {
  timeMin: string;
  timeMax: string;
} {
  if (!candidateSlots || candidateSlots.length === 0) {
    const now = new Date();
    const future = new Date(Date.now() + 30 * 86400000);
    return { timeMin: now.toISOString(), timeMax: future.toISOString() };
  }

  let minTime = candidateSlots[0].start.getTime();
  let maxTime = candidateSlots[0].end.getTime();

  for (const slot of candidateSlots) {
    if (slot.start.getTime() < minTime) minTime = slot.start.getTime();
    if (slot.end.getTime() > maxTime) maxTime = slot.end.getTime();
  }

  const minDate = new Date(minTime);
  minDate.setUTCHours(0, 0, 0, 0);

  const maxDate = new Date(maxTime);
  maxDate.setUTCHours(23, 59, 59, 999);

  return {
    timeMin: minDate.toISOString(),
    timeMax: maxDate.toISOString(),
  };
}

/**
 * Evaluates candidate slots against a list of busy time intervals.
 * An interval conflicts if: slot.start < busy.end && slot.end > busy.start
 */
export function evaluateSlotConflicts(
  candidateSlots: { label: string; start: Date; end: Date }[],
  busyIntervals: TimeInterval[]
): SlotAvailability[] {
  return candidateSlots.map((slot) => {
    // "Any date" has no inherent conflict
    if (slot.label.toLowerCase().includes('any date') || slot.label.toLowerCase().includes('any')) {
      return {
        label: slot.label,
        hasConflict: false,
        start: slot.start,
        end: slot.end,
      };
    }

    const hasConflict = busyIntervals.some((busy) => {
      return slot.start < busy.end && slot.end > busy.start;
    });

    return {
      label: slot.label,
      hasConflict,
      start: slot.start,
      end: slot.end,
    };
  });
}

/**
 * Google Calendar freeBusy query using an ephemeral access token.
 * Queries freeBusy endpoint directly with strictly time-bounded window.
 * TOKEN LIFECYCLE: Access token is used strictly for this call in-memory and discarded.
 */
export async function fetchGoogleFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarId = 'primary'
): Promise<TimeInterval[]> {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: calendarId }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn('Google FreeBusy API error:', response.status, errBody);
      throw new Error(`Google Calendar Free/Busy returned status ${response.status}`);
    }

    const data = await response.json();
    const busyList = data.calendars?.[calendarId]?.busy || [];

    return busyList.map((item: { start: string; end: string }) => ({
      start: new Date(item.start),
      end: new Date(item.end),
    }));
  } catch (error) {
    console.error('Failed to fetch Google Free/Busy:', error);
    throw error;
  }
}
