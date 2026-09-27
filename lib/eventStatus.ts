import { useState, useEffect } from "react";

export type EventPhase = 'upcoming' | 'live' | 'afterglow' | 'archived';

/**
 * Evaluates the phase of an event relative to current client timestamp:
 * - 'upcoming': Current time is before event start
 * - 'live': Current time is between event start and event end
 * - 'afterglow': Current time is between event end and end + 48 hours
 * - 'archived': Current time is beyond 48 hours after event end
 */
export function getEventPhase(startDateStr: string, endDateStr?: string): EventPhase {
  try {
    const start = new Date(startDateStr).getTime();
    if (isNaN(start)) return 'upcoming';

    const end = endDateStr 
      ? new Date(endDateStr).getTime() 
      : start + (2.5 * 60 * 60 * 1000); // 2.5 hr fallback

    const now = Date.now();

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    if (now > end && now <= end + (48 * 60 * 60 * 1000)) return 'afterglow';
    return 'archived';
  } catch {
    return 'upcoming';
  }
}

export interface EventDateOptions {
  date: string;
  timeWindow?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
}

/**
 * Defensively extracts start and end ISO strings from an event record.
 * Supports explicit ISO dates, or parses 'YYYY-MM-DD' and human timeWindow strings.
 * Defaults to startTime + 2.5 hours if end time cannot be parsed.
 */
export function getEventDateTimes(event: EventDateOptions): { startIso: string; endIso: string } {
  // 1. Explicit ISO strings if present
  if (event.startDate && !isNaN(new Date(event.startDate).getTime())) {
    const startIso = new Date(event.startDate).toISOString();
    const explicitEnd = event.endDate || event.endTime;
    const endIso = explicitEnd && !isNaN(new Date(explicitEnd).getTime())
      ? new Date(explicitEnd).toISOString()
      : new Date(new Date(startIso).getTime() + 2.5 * 60 * 60 * 1000).toISOString();
    return { startIso, endIso };
  }

  // 2. Parse from date ("YYYY-MM-DD") and timeWindow (e.g., "10:30 AM (10:00 AM – 12:00 PM CDT)")
  try {
    let year = 2026;
    let month = 9;
    let day = 26;

    if (event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
      const parts = event.date.split('-').map(Number);
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }

    let startHour = 10;
    let startMinute = 0;
    let endHour = 12;
    let endMinute = 30;
    let hasExplicitEnd = false;

    if (event.timeWindow) {
      // If there is parenthesized time like "(10:00 AM – 12:00 PM CDT)", prioritize it
      const parenMatch = event.timeWindow.match(/\(([^)]+)\)/);
      const textToScan = parenMatch ? parenMatch[1] : event.timeWindow;
      const timeMatches = Array.from(textToScan.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/gi));

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
          hasExplicitEnd = true;
        }
      }
    }

    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    // America/Chicago is CDT (-05:00) from March to November, CST (-06:00) in winter
    const tzOffset = month >= 4 && month <= 10 ? "-05:00" : "-06:00";
    const startIso = `${year}-${pad(month)}-${pad(day)}T${pad(startHour)}:${pad(startMinute)}:00${tzOffset}`;

    let endIso: string;
    if (hasExplicitEnd) {
      endIso = `${year}-${pad(month)}-${pad(day)}T${pad(endHour)}:${pad(endMinute)}:00${tzOffset}`;
    } else {
      const startMs = new Date(startIso).getTime();
      endIso = new Date(startMs + 2.5 * 60 * 60 * 1000).toISOString();
    }

    return { startIso, endIso };
  } catch {
    const fallbackStart = event.date ? `${event.date}T10:00:00-05:00` : new Date().toISOString();
    const fallbackEnd = new Date(new Date(fallbackStart).getTime() + 2.5 * 60 * 60 * 1000).toISOString();
    return { startIso: fallbackStart, endIso: fallbackEnd };
  }
}

/**
 * Returns the EventPhase for an event object, accounting for completed flags.
 */
export function getCommunityEventPhase(event: EventDateOptions): EventPhase {
  if (event.status === 'completed' || event.status === 'past') {
    const { endIso } = getEventDateTimes(event);
    const end = new Date(endIso).getTime();
    const now = Date.now();
    if (now <= end + 48 * 60 * 60 * 1000) {
      return 'afterglow';
    }
    return 'archived';
  }

  const { startIso, endIso } = getEventDateTimes(event);
  return getEventPhase(startIso, endIso);
}

/**
 * Hydration-safe React hook that prevents SSR clock-skew and mismatch warnings.
 * Evaluates event phase only after mounting on the client.
 */
export function useEventPhase(event: EventDateOptions): {
  phase: EventPhase;
  isMounted: boolean;
} {
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<EventPhase>('upcoming');

  useEffect(() => {
    setIsMounted(true);
    setPhase(getCommunityEventPhase(event));
  }, [event.date, event.timeWindow, event.startDate, event.endDate, event.status]);

  return { phase: isMounted ? phase : 'upcoming', isMounted };
}

/**
 * Hook to guard client-only temporal evaluations
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
