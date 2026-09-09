import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SurveyResponse } from "@/types/survey";
import { CommunityEvent, OCTOBER_2026_EVENTS } from "@/lib/eventsConfig";

export interface ResolvedEvent extends CommunityEvent {
  attendanceStatus: 'attending' | 'open';
  matchingReason?: string;
}

export const AVAILABLE_VIBES: string[] = [
  "Moms Morning",
  "Ladies Morning",
  "Ladies Night",
  "Couples / Date Night",
  "Happy Hour",
  "Family-Friendly",
  "Prenatal & New Parents",
  "All Ages / Community",
  "Hiking",
  "City Walk",
  "Kayaking / Paddleboarding",
  "Outdoor Activities",
  "Golfing",
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
  responses: SurveyResponse[];
}> {
  let vibes: string[] = [];
  let savedRsvpIds: string[] = [];
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
  }

  return { vibes, savedRsvpIds, responses };
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
 * Check if the user's survey response explicitly selected a matching gathering vibe
 * for a specific event.
 */
function checkEventVibeMatch(eventId: string, gatherings: string[]): { isMatch: boolean; reason?: string } {
  for (const rawG of gatherings) {
    const g = rawG.toLowerCase().trim();

    // 1. Pizza Night (Family / Food)
    if (eventId.includes("pizza")) {
      if (g.includes("family") || g.includes("parents")) {
        return { isMatch: true, reason: `Matched your survey selection: "${rawG}"` };
      }
    }

    // 2. Morning Walk (Outdoor / City Walk)
    if (eventId.includes("walk")) {
      if (g.includes("city walk") || g.includes("outdoor")) {
        return { isMatch: true, reason: `Matched your survey selection: "${rawG}"` };
      }
    }

    // 3. Coffee & Casual Conversations (Mornings / Social)
    if (eventId.includes("coffee")) {
      if (g.includes("morning") || g.includes("coffee")) {
        return { isMatch: true, reason: `Matched your survey selection: "${rawG}"` };
      }
    }

    // 4. Fall Nature Stroll (Outdoor / Hiking)
    if (eventId.includes("stroll")) {
      if (g.includes("hiking") || g.includes("outdoor") || g.includes("nature")) {
        return { isMatch: true, reason: `Matched your survey selection: "${rawG}"` };
      }
    }

    // 5. Community Fall Social (Happy Hour / Evening Social)
    if (eventId.includes("fall-social")) {
      if (g.includes("happy hour") || g.includes("ladies night") || g.includes("date night") || g.includes("couples")) {
        return { isMatch: true, reason: `Matched your survey selection: "${rawG}"` };
      }
    }
  }

  return { isMatch: false };
}

/**
 * Maps configured events against the user's recorded survey responses and saved RSVPs
 * to determine which events they are attending vs. open to attend.
 *
 * Rules:
 * 1. Local session overrides take immediate precedence.
 * 2. Persisted rsvpEventIds from Firestore take second precedence.
 * 3. An event is marked 'attending' if the user's survey explicitly selected a matching gathering vibe.
 * 4. Otherwise, defaults to 'open' ("Open Gathering").
 */
export function resolveUserAttendance(
  events: CommunityEvent[] = OCTOBER_2026_EVENTS,
  responses: SurveyResponse[] = [],
  manualAttendanceOverrides?: Record<string, 'attending' | 'open'>,
  savedRsvpIds: string[] = [],
  userVibes?: string[]
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

    // 2. Saved RSVP in Firestore user profile
    if (savedRsvpIds.includes(event.id)) {
      return {
        ...event,
        attendanceStatus: 'attending',
        matchingReason: 'Saved in your member calendar',
      };
    }

    // 3. User vibes match (from users/{userId})
    if (userVibes && userVibes.length > 0) {
      const vibeCheck = checkEventVibeMatch(event.id, userVibes);
      if (vibeCheck.isMatch) {
        return {
          ...event,
          attendanceStatus: 'attending',
          matchingReason: vibeCheck.reason || 'Matched your member preferences',
        };
      }
    }

    // 4. Survey response vibe matching
    if (responses && responses.length > 0) {
      for (const res of responses) {
        const resCity = (res.city || 'chicago').toLowerCase();
        if (resCity !== event.city.toLowerCase() && resCity !== 'all') {
          continue;
        }

        // Special handling for Chicago Sep 26 Inaugural gathering:
        if (event.id === "chi-sep-26-gathering" || event.date === "2026-09-26") {
          const userDates = Array.isArray(res.dates)
            ? res.dates
            : typeof res.dates === "string"
            ? [res.dates]
            : [];
          const matchesDate = userDates.some((d: string) => {
            const dl = d.toLowerCase();
            return dl.includes("sep 26") || dl.includes("any date");
          });
          if (matchesDate) {
            return {
              ...event,
              attendanceStatus: 'attending',
              matchingReason: 'Matched your September 26 RSVP selection',
            };
          }
        }

        const userGatherings = Array.isArray(res.gatherings) ? res.gatherings : [];
        const vibeCheck = checkEventVibeMatch(event.id, userGatherings);

        if (vibeCheck.isMatch) {
          return {
            ...event,
            attendanceStatus: 'attending',
            matchingReason: vibeCheck.reason || 'Matched your survey vibe selection',
          };
        }
      }
    }

    // 5. Default to open
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
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingAttending = upcoming.filter((e) => e.attendanceStatus === "attending");
  const upcomingOpen = upcoming.filter((e) => e.attendanceStatus === "open");

  // Priority 1: Earliest upcoming event user is confirmed for (attending)
  // Fallback: Earliest upcoming open chapter gathering
  const spotlightEvent = upcomingAttending[0] || upcomingOpen[0] || upcoming[0] || null;

  return {
    upcoming,
    upcomingAttending,
    upcomingOpen,
    spotlightEvent,
  };
}

