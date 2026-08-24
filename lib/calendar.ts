/**
 * Calendar utilities for generating Google Calendar URLs and .ics files.
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

/**
 * Parses user-selected date/time strings or falls back to a sensible upcoming weekend slot.
 */
function parseEventDates(options: CalendarEventOptions): { start: Date; end: Date } {
  const currentYear = new Date().getFullYear();
  let targetDate = new Date();

  // Try to parse the first selected date (e.g. "Sat, Sep 5", "Sun, Sep 13", etc.)
  const candidateDateStr = (options.dates && options.dates.length > 0) ? options.dates[0] : (options.customDate || '');
  
  if (candidateDateStr) {
    // Check if month name and day number can be extracted
    const match = candidateDateStr.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})/i);
    if (match) {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const monthStr = candidateDateStr.match(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i)?.[0].toLowerCase() || 'sep';
      const monthIndex = monthNames.indexOf(monthStr.slice(0, 3));
      const day = parseInt(match[1], 10);
      if (monthIndex !== -1 && !isNaN(day)) {
        targetDate = new Date(currentYear, monthIndex, day);
      }
    }
  }

  // Fallback: If date is in past or invalid, set to next Saturday 10:00 AM
  if (isNaN(targetDate.getTime()) || targetDate.getTime() < Date.now() - 86400000) {
    targetDate = new Date();
    const dayOfWeek = targetDate.getDay();
    const daysUntilNextSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + daysUntilNextSaturday);
  }

  // Determine start hour based on selected time
  let startHour = 10;
  let durationHours = 2;

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

  return { start: startDate, end: endDate };
}

function formatIsoForCalendar(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

export function generateCalendarDetails(options: CalendarEventOptions) {
  const { cityName, name, email, gatherings = [], customGathering, dates = [], times = [], customDate, customTime } = options;
  const { start, end } = parseEventDates(options);

  const allGatherings = [...gatherings, customGathering].filter(Boolean);
  const primaryActivity = allGatherings.length > 0 ? allGatherings.slice(0, 2).join(' & ') : 'Community Gathering';
  const title = `Actually, Let's ${cityName} - ${primaryActivity}`;
  const location = `${cityName}, Actually Let's Community Series`;

  const dateList = [...dates, customDate].filter(Boolean).join(', ') || 'Community Consensus';
  const timeList = [...times, customTime].filter(Boolean).join(', ') || 'TBD';
  const activitiesList = allGatherings.length > 0 ? allGatherings.join(', ') : 'All community activities';

  const description = [
    `Hi ${name || 'there'}! This calendar placeholder marks your RSVP for the Actually, Let's ${cityName} series.`,
    ``,
    `Your Selected Preferences:`,
    `• Gatherings: ${activitiesList}`,
    `• Preferred Dates: ${dateList}`,
    `• Preferred Times: ${timeList}`,
    ``,
    `We tally everyone's availability and will email your finalized gathering invite & ticket details to ${email || 'your email'}.`,
    ``,
    `Organizer: Actually, Let's (Austin, TX)`,
    `Contact: rsvp@actuallylets.com`,
    `Website: https://actuallylets.com`,
  ].join('\n');

  // Google Calendar URL
  const googleCalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatIsoForCalendar(start)}/${formatIsoForCalendar(end)}`,
    details: description,
    location: location,
  });
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${googleCalParams.toString()}`;

  // ICS File Content
  const escapeIcsText = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const nowIso = formatIsoForCalendar(new Date());
  const startIso = formatIsoForCalendar(start);
  const endIso = formatIsoForCalendar(end);
  const uid = `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@actuallylets.com`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Actually Lets//Gathering Confirmation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowIso}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return {
    title,
    location,
    description,
    startDate: start,
    endDate: end,
    googleCalendarUrl,
    icsContent,
    fileName: `actually-lets-${cityName.toLowerCase().replace(/\s+/g, '-')}.ics`,
  };
}
