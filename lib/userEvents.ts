import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SurveyResponse } from "@/types/survey";
import { CommunityEvent, OCTOBER_2026_EVENTS } from "@/lib/eventsConfig";

export interface ResolvedEvent extends CommunityEvent {
  attendanceStatus: 'attending' | 'open';
  matchingReason?: string;
}

export const AVAILABLE_VIBES: string[] = [
  "Board Games & Card Games",
  "Casual Conversations & Coffee",
  "Family Night & Pizza",
  "Wine Tasting & Socials",
  "Stand-Up Comedy & Entertainment",
  "Down for Whatever",
];

/**
 * Store and update user preferences under users/{userId}
 */
export async function saveUserVibes(userId: string, vibes: string[]) {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { vibes, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Store and update user preferred free dates under users/{userId}
 */
export async function saveUserPreferredDates(userId: string, preferredDates: string[]) {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { preferredDates, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("saveUserPreferredDates error:", err);
  }
}

export async function fetchUserVibes(userId: string): Promise<string[] | null> {
  if (!userId) return null;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.vibes)) {
        return data.vibes as string[];
      }
    }
    return null;
  } catch (err) {
    console.warn("fetchUserVibes failed or offline:", err);
    return null;
  }
}

/**
 * Load user data from users/{userId} with fallback to survey responses
 */
export async function loadUserData(userId: string, userEmail?: string): Promise<{
  vibes: string[];
  savedRsvpIds: string[];
  declinedEventIds: string[];
  preferredDates: string[];
  responses: SurveyResponse[];
}> {
  let vibes: string[] = [];
  let savedRsvpIds: string[] = [];
  let declinedEventIds: string[] = [];
  let preferredDates: string[] = [];
  let responses: SurveyResponse[] = [];

  if (userId) {
    try {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.vibes) && data.vibes.length > 0) {
          vibes = data.vibes as string[];
        }
        if (Array.isArray(data?.rsvpEventIds)) {
          savedRsvpIds = data.rsvpEventIds as string[];
        }
        if (Array.isArray(data?.declinedEventIds)) {
          declinedEventIds = data.declinedEventIds as string[];
        }
        if (Array.isArray(data?.preferredDates)) {
          preferredDates = data.preferredDates as string[];
        }
      }
    } catch (err) {
      console.warn("loadUserData firestore error:", err);
    }
  }

  if (userEmail) {
    responses = await fetchUserRSVPs(userEmail);
    // If vibes not present in users/{userId}, fall back to original responses survey submission
    if (vibes.length === 0 && responses.length > 0) {
      const surveyVibes = responses.flatMap((r) =>
        Array.isArray(r.gatherings) ? r.gatherings : []
      );
      vibes = Array.from(new Set(surveyVibes));
    }
    // If preferredDates not present in users/{userId}, fall back to responses survey submission
    if (preferredDates.length === 0 && responses.length > 0) {
      const surveyDates = responses.flatMap((r) =>
        [...(r.dates || []), r.customDate].filter(Boolean) as string[]
      );
      preferredDates = Array.from(new Set(surveyDates));
    }
  }

  return { vibes, savedRsvpIds, declinedEventIds, preferredDates, responses };
}

/**
 * Fetch survey responses submitted by this user (Read-only query by email)
 */
export async function fetchUserRSVPs(userEmail: string): Promise<SurveyResponse[]> {
  if (!userEmail) return [];
  const normalizedEmail = userEmail.toLowerCase().trim();

  try {
    const q = query(
      collection(db, "responses"),
      where("email", "==", normalizedEmail)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SurveyResponse[];
  } catch (error) {
    console.warn("fetchUserRSVPs failed or offline:", error);
    return [];
  }
}

/**
 * Fetch persisted RSVP event IDs saved in users/{uid} in Firestore.
 */
export async function fetchUserSavedRsvps(uid: string): Promise<string[]> {
  if (!uid) return [];
  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.rsvpEventIds)) {
        return data.rsvpEventIds as string[];
      }
    }
    return [];
  } catch (err) {
    console.warn("fetchUserSavedRsvps failed or offline:", err);
    return [];
  }
}

/**
 * Fetch persisted declined/cancelled event IDs saved in users/{uid} in Firestore.
 */
export async function fetchUserDeclinedEvents(uid: string): Promise<string[]> {
  if (!uid) return [];
  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.declinedEventIds)) {
        return data.declinedEventIds as string[];
      }
    }
    return [];
  } catch (err) {
    console.warn("fetchUserDeclinedEvents failed or offline:", err);
    return [];
  }
}

/**
 * Save updated array of RSVP event IDs to users/{uid} in Firestore.
 */
export async function saveUserRsvps(uid: string, rsvpEventIds: string[]): Promise<void> {
  if (!uid) return;
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, { rsvpEventIds }, { merge: true });
  } catch (err: any) {
    console.warn("saveUserRsvps error:", err);
    throw err;
  }
}

/**
 * Persist explicit RSVP attendance or cancellation override to users/{uid} in Firestore.
 * Ensures an explicit cancellation ('open') is stored in declinedEventIds and removed from rsvpEventIds,
 * and vice-versa for 'attending'.
 */
export async function saveUserEventOverride(
  uid: string,
  eventId: string,
  status: 'attending' | 'open',
  currentRsvpIds: string[] = [],
  currentDeclinedIds: string[] = []
): Promise<{ rsvpEventIds: string[]; declinedEventIds: string[] }> {
  if (!uid) return { rsvpEventIds: currentRsvpIds, declinedEventIds: currentDeclinedIds };

  let updatedRsvps: string[];
  let updatedDeclined: string[];

  if (status === 'attending') {
    updatedRsvps = Array.from(new Set([...currentRsvpIds, eventId]));
    updatedDeclined = currentDeclinedIds.filter((id) => id !== eventId);
  } else {
    updatedRsvps = currentRsvpIds.filter((id) => id !== eventId);
    updatedDeclined = Array.from(new Set([...currentDeclinedIds, eventId]));
  }

  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(
      userDocRef,
      {
        rsvpEventIds: updatedRsvps,
        declinedEventIds: updatedDeclined,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn("saveUserEventOverride error:", err);
    throw err;
  }

  return { rsvpEventIds: updatedRsvps, declinedEventIds: updatedDeclined };
}

/**
 * Check if the user's survey response explicitly selected a specific date matching
 * this event's calendar date.
 * Non-committal choices like "any date", "any october weekend", "down for whatever"
 * do NOT auto-RSVP users to all events.
 */
export function checkEventDateMatch(
  event: CommunityEvent,
  userDates: string[],
  allEvents: CommunityEvent[] = OCTOBER_2026_EVENTS
): boolean {
  if (!userDates || userDates.length === 0 || !event.date) return false;

  const eventDate = event.date.trim(); // e.g. "2026-10-09" or "2026-09-26"
  const parts = eventDate.split('-');
  if (parts.length !== 3) return false;

  const monthNum = parseInt(parts[1], 10);
  const dayNum = parseInt(parts[2], 10);

  const monthNamesShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthNamesFull = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

  const shortMonth = monthNamesShort[monthNum - 1]; // "oct" or "sep"
  const fullMonth = monthNamesFull[monthNum - 1];   // "october" or "september"

  for (const rawDate of userDates) {
    if (!rawDate || typeof rawDate !== 'string') continue;
    const d = rawDate.trim().toLowerCase();

    // Skip generic non-committal options like "any date", "any october weekend", "down for whatever"
    if (d.includes("any date") || d.includes("any weekend") || d.includes("down for whatever") || d.includes("either works")) {
      continue;
    }

    // Direct match against event id
    if (d === event.id.toLowerCase() || d.includes(event.id.toLowerCase())) {
      return true;
    }

    // Direct match against event chipLabel
    const chip = (event.chipLabel || '').toLowerCase();
    if (chip && d.includes(chip)) {
      return true;
    }

    // Exact ISO match (e.g. "2026-10-09" or "10-09")
    const isIsoMatch = d.includes(eventDate);

    // Month + Day check
    const hasMonth = d.includes(shortMonth) || d.includes(fullMonth);
    const dayRegex = new RegExp(`(?:^|\\D)0?${dayNum}(?:\\D|$)`);
    const isDateMatch = isIsoMatch || (hasMonth && dayRegex.test(d));

    if (isDateMatch) {
      // Disambiguation for multiple events on the same day:
      // If other events share this exact same date, check if this rawDate was specifically targeted at a sibling event
      const siblingEvents = allEvents.filter((e) => e.date === event.date && e.id !== event.id);
      if (siblingEvents.length > 0) {
        const matchesSibling = siblingEvents.some((sibling) => {
          const sId = sibling.id.toLowerCase();
          const sChip = (sibling.chipLabel || '').toLowerCase();
          const sTitle = (sibling.title || '').toLowerCase();
          return (
            (sId && d.includes(sId)) ||
            (sChip && d.includes(sChip)) ||
            (sTitle && d.includes(sTitle))
          );
        });

        // If the date string specifically mentions a sibling event, but does NOT mention this event, do NOT match this event.
        if (matchesSibling) {
          const matchesCurrent =
            (chip && d.includes(chip)) ||
            (event.title && d.includes(event.title.toLowerCase()));
          if (!matchesCurrent) {
            continue;
          }
        }
      }

      return true;
    }
  }

  return false;
}

/**
 * Maps configured events against the user's recorded survey responses and saved RSVPs
 * to determine which events they are attending vs. open to attend.
 *
 * Rules:
 * 1. Local session overrides take immediate precedence.
 * 2. Explicit declinedEventIds take second precedence (strict short-circuit: cannot be resurrected).
 * 3. Persisted rsvpEventIds from Firestore take third precedence.
 * 4. Specific date match from Firestore survey responses (response.dates or response.eventIds).
 * 5. Otherwise, strictly defaults to 'open' ("Open to Join" / "Open Gathering").
 */
export function resolveUserAttendance(
  events: CommunityEvent[] = OCTOBER_2026_EVENTS,
  responses: SurveyResponse[] = [],
  manualAttendanceOverrides?: Record<string, 'attending' | 'open'>,
  savedRsvpIds: string[] = [],
  userVibes?: string[],
  declinedEventIds: string[] = []
): ResolvedEvent[] {
  const overrides = manualAttendanceOverrides || {};

  return events.map((event) => {
    // 1. Session-level manual toggle
    if (overrides[event.id]) {
      return {
        ...event,
        attendanceStatus: overrides[event.id],
        matchingReason: overrides[event.id] === 'attending' ? 'Manually RSVP’d from dashboard' : 'Open Gathering',
      };
    }

    // 2. Persistent Declined Event (Explicit user cancellation in Firestore)
    // STRICT SHORT-CIRCUIT: If user explicitly cancelled/declined this event,
    // NEVER let survey matching resurrect it to 'attending'!
    if (declinedEventIds.includes(event.id)) {
      return {
        ...event,
        attendanceStatus: 'open',
        matchingReason: 'Open Gathering — tap to RSVP',
      };
    }

    // 3. Saved RSVP in Firestore user profile
    if (savedRsvpIds.includes(event.id)) {
      return {
        ...event,
        attendanceStatus: 'attending',
        matchingReason: 'Saved in your member calendar',
      };
    }

    // 4. Specific match from Firestore survey responses (response.eventIds or response.dates)
    if (responses && responses.length > 0) {
      for (const res of responses) {
        const resCity = (res.city || 'chicago').toLowerCase();
        if (resCity !== event.city.toLowerCase() && resCity !== 'all') {
          continue;
        }

        // Direct eventId match (if survey recorded specific event IDs)
        if (res.eventIds && Array.isArray(res.eventIds) && res.eventIds.includes(event.id)) {
          return {
            ...event,
            attendanceStatus: 'attending',
            matchingReason: `Matched your survey selection (${event.displayDate})`,
          };
        }

        const userDates = [
          ...(Array.isArray(res.dates) ? res.dates : typeof res.dates === 'string' ? [res.dates] : []),
          ...(res.customDate ? [res.customDate] : []),
        ];

        if (checkEventDateMatch(event, userDates, events)) {
          return {
            ...event,
            attendanceStatus: 'attending',
            matchingReason: `Matched your survey date selection (${event.displayDate})`,
          };
        }
      }
    }

    // 5. Strictly default to open ("Open to Join")
    return {
      ...event,
      attendanceStatus: 'open',
      matchingReason: 'Open Gathering — tap to RSVP',
    };
  });
}

/**
 * Splits events into upcoming attending vs open, ordered chronologically ascending.
 */
export function partitionUpcomingEvents(
  events: ResolvedEvent[],
  currentDateThreshold: string = "2026-09-09"
): {
  upcoming: ResolvedEvent[];
  upcomingAttending: ResolvedEvent[];
  upcomingOpen: ResolvedEvent[];
  spotlightEvent: ResolvedEvent | null;
} {
  const upcoming = [...events]
    .filter((e) => e.date >= currentDateThreshold)
    .sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      // Ensure flagship chapter gathering takes precedence over legacy polled gathering
      if (a.id.includes("legacy") && !b.id.includes("legacy")) return 1;
      if (!a.id.includes("legacy") && b.id.includes("legacy")) return -1;
      return 0;
    });

  const upcomingAttending = upcoming.filter((e) => e.attendanceStatus === "attending");
  const upcomingOpen = upcoming.filter((e) => e.attendanceStatus === "open");

  // Priority 1: Earliest upcoming event user is confirmed for (attending)
  // Fallback: Earliest flagship upcoming open chapter gathering
  const spotlightEvent = upcomingAttending[0] || upcomingOpen[0] || upcoming[0] || null;

  return {
    upcoming,
    upcomingAttending,
    upcomingOpen,
    spotlightEvent,
  };
}

export interface RegisteredUser {
  id: string;
  name?: string;
  email?: string;
  rsvpEventIds?: string[];
  declinedEventIds?: string[];
  vibes?: string[];
  [key: string]: any;
}

export async function fetchAllUsers(): Promise<RegisteredUser[]> {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter((u: any) => {
        if (!u) return false;
        if (u.deleted === true || u.isDeleted === true || u.archived === true) return false;
        if (u._orphaned === true || u._deleted === true) return false;
        if (
          typeof u.status === 'string' &&
          ['deleted', 'archived', 'cancelled', 'canceled'].includes(u.status.toLowerCase())
        ) {
          return false;
        }
        return true;
      }) as RegisteredUser[];
  } catch (err) {
    console.warn("fetchAllUsers error:", err);
    return [];
  }
}

/**
 * Calculates active confirmed RSVPs for a given event, combining:
 * 1. Explicit rsvpEventIds from registered user profiles in users/{uid}
 * 2. Survey responses that match the event date/vibe criteria (via resolveUserAttendance)
 * Returns deduplicated headcount and attendee records with strict single-source-of-truth guards.
 */
export function calculateEventAttendance(
  event: CommunityEvent,
  users: RegisteredUser[] = [],
  responses: SurveyResponse[] = []
): {
  confirmedCount: number;
  attendingEmails: Set<string>;
  userRsvpCount: number;
  surveyMatchedCount: number;
} {
  const attendingEmails = new Set<string>();
  const declinedEmails = new Set<string>();

  // 1. Registered users with explicit RSVP or cancellation
  let userRsvpCount = 0;
  users.forEach((u) => {
    if (!u) return;
    if ((u as any).deleted || (u as any).isDeleted || (u as any).archived || (u as any)._orphaned) return;
    if (
      typeof (u as any).status === 'string' &&
      ['deleted', 'archived', 'cancelled', 'canceled'].includes((u as any).status.toLowerCase())
    ) {
      return;
    }

    const email = (u.email || "").trim().toLowerCase();
    if (Array.isArray(u.declinedEventIds) && u.declinedEventIds.includes(event.id)) {
      if (email) declinedEmails.add(email);
      return;
    }
    if (Array.isArray(u.rsvpEventIds) && u.rsvpEventIds.includes(event.id)) {
      userRsvpCount++;
      if (email) attendingEmails.add(email);
    }
  });

  // 2. Survey responses matched to this event
  let surveyMatchedCount = 0;
  responses.forEach((r) => {
    if (!r) return;
    if ((r as any).deleted || (r as any).isDeleted || (r as any).archived || (r as any)._orphaned) return;
    if (
      typeof (r as any).status === 'string' &&
      ['deleted', 'archived', 'cancelled', 'canceled'].includes((r as any).status.toLowerCase())
    ) {
      return;
    }

    const userEmail = (r.email || "").trim().toLowerCase();
    if (userEmail && declinedEmails.has(userEmail)) {
      return; // Skip explicitly cancelled users
    }

    // Single source of truth guard:
    // If user has a registered user account in `users`, their explicit `rsvpEventIds` is authoritative.
    // If this event is not in `rsvpEventIds`, do NOT resurrect them as attending via intake survey dates!
    if (userEmail) {
      const matchingUser = users.find(
        (u) => (u.email || "").trim().toLowerCase() === userEmail
      );
      if (matchingUser) {
        if (!Array.isArray(matchingUser.rsvpEventIds) || !matchingUser.rsvpEventIds.includes(event.id)) {
          return;
        }
      }
    }

    const resolved = resolveUserAttendance([event], [r], undefined, []);
    if (resolved[0]?.attendanceStatus === "attending") {
      surveyMatchedCount++;
      if (userEmail) attendingEmails.add(userEmail);
    }
  });

  const confirmedCount = attendingEmails.size;

  return {
    confirmedCount,
    attendingEmails,
    userRsvpCount,
    surveyMatchedCount,
  };
}

/**
 * Checks whether a contact from the survey responses list is attending a specific event.
 * Enforces single source of truth:
 * - If deleted/archived: returns false.
 * - If registered user exists: uses user profile's rsvpEventIds / declinedEventIds as sole authority.
 * - If survey-only: resolves attendance from survey response criteria.
 */
export function isContactAttendingEvent(
  contact: SurveyResponse,
  event: CommunityEvent,
  users: RegisteredUser[] = []
): boolean {
  if (!contact) return false;
  if ((contact as any).deleted || (contact as any).isDeleted || (contact as any).archived || (contact as any)._orphaned) {
    return false;
  }
  if (
    typeof (contact as any).status === 'string' &&
    ['deleted', 'archived', 'cancelled', 'canceled'].includes((contact as any).status.toLowerCase())
  ) {
    return false;
  }

  const email = (contact.email || "").trim().toLowerCase();

  // Check 1: User profile has saved RSVP or explicit decline for this event
  if (email) {
    const matchingUser = users.find(
      (u) => (u.email || "").trim().toLowerCase() === email
    );
    if (matchingUser) {
      if (
        Array.isArray(matchingUser.declinedEventIds) &&
        matchingUser.declinedEventIds.includes(event.id)
      ) {
        return false;
      }
      if (
        Array.isArray(matchingUser.rsvpEventIds) &&
        matchingUser.rsvpEventIds.includes(event.id)
      ) {
        return true;
      }
      // Single source of truth: User exists in member database but has NOT RSVP'd to this event.
      // Do not fall through to survey date matching to resurrect an un-RSVP'd member!
      return false;
    }
  }

  // Check 2: Survey date / vibe resolution (only for non-registered survey contacts)
  const resolved = resolveUserAttendance([event], [contact], undefined, []);
  return resolved[0]?.attendanceStatus === "attending";
}


