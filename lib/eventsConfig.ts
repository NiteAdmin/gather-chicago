import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface CommunityEvent {
  id: string;
  city: string;
  title: string;
  date: string; // ISO format 'YYYY-MM-DD'
  displayDate: string; // e.g., 'Fri, Oct 9'
  timeWindow: string; // e.g., '6:30 PM – 9:00 PM CDT'
  category: 'food' | 'outdoor' | 'social' | 'wellness' | 'culture';
  categoryLabel?: string;
  icon: string; // fallback icon/emoji e.g. '🍕'
  iconName?: 'Compass' | 'Flame' | 'Pizza' | 'Footprints' | 'Coffee' | 'Trees' | 'Sparkles' | 'Activity' | string;
  venueName: string;
  venueAddress?: string;
  description: string;
  externalUrl?: string;
  externalUrlLabel?: string;
  partifulUrl?: string;
  status: 'upcoming' | 'past' | 'confirmed';
  hostAnnouncement?: string;
}

export const OCTOBER_2026_EVENTS: CommunityEvent[] = [
  {
    id: "chi-sep-26-gathering",
    city: "chicago",
    title: "Actually, Let’s Stretch & Sip — Moksha Yoga",
    date: "2026-09-26",
    displayDate: "Sat, Sep 26",
    timeWindow: "10:30 AM (10:00 AM – 12:00 PM CDT)",
    category: "wellness",
    categoryLabel: "WELLNESS & MOVEMENT",
    icon: "🧘",
    iconName: "Sparkles",
    venueName: "Moksha Yoga Center",
    venueAddress: "2528 W Armitage Ave, Chicago, IL",
    description: "Join us for a morning yoga session at Moksha Yoga Center. Bring a mat, grab a sip, and connect with fellow Chicago members.",
    externalUrl: "https://partiful.com/e/QSVMteLK2LBBOc3cQHKh",
    partifulUrl: "https://partiful.com/e/QSVMteLK2LBBOc3cQHKh",
    status: "confirmed",
    hostAnnouncement: "Excited to stretch and sip! Bring a friend and a mat!",
  },
  {
    id: "chi-2026-10-09-pizza",
    city: "chicago",
    title: "Family Night — Pizza",
    date: "2026-10-09",
    displayDate: "Fri, Oct 9",
    timeWindow: "6:00 PM – 8:30 PM CDT",
    category: "food",
    icon: "🍕",
    iconName: "Pizza",
    venueName: "Homeslice Pizza & Patio",
    venueAddress: "938 W Webster Ave, Chicago, IL 60614",
    description: "Kick off the weekend with artisan wood-fired pies, casual chatter, and a welcoming atmosphere for families and friends alike.",
    externalUrl: "https://partiful.com/e/actually-lets-pizza-night",
    partifulUrl: "https://partiful.com/e/actually-lets-pizza-night",
    status: "upcoming",
  },
  {
    id: "chi-2026-10-17-walk",
    city: "chicago",
    title: "Morning Walk",
    date: "2026-10-17",
    displayDate: "Sat, Oct 17",
    timeWindow: "9:30 AM – 11:00 AM CDT",
    category: "outdoor",
    icon: "👟",
    iconName: "Footprints",
    venueName: "Lincoln Park Conservatory & Nature Boardwalk",
    venueAddress: "2391 N Stockton Dr, Chicago, IL 60614",
    description: "Breathe in crisp autumn air on a breezy, social morning stroll around the Lincoln Park boardwalk. Coffee in hand encouraged!",
    externalUrl: "https://partiful.com/e/actually-lets-morning-walk",
    partifulUrl: "https://partiful.com/e/actually-lets-morning-walk",
    status: "upcoming",
  },
  {
    id: "chi-2026-10-24-coffee",
    city: "chicago",
    title: "Coffee & Casual Conversations",
    date: "2026-10-24",
    displayDate: "Sat, Oct 24",
    timeWindow: "10:00 AM – 12:00 PM CDT",
    category: "social",
    icon: "☕",
    iconName: "Coffee",
    venueName: "Colectivo Coffee Lincoln Park",
    venueAddress: "2530 N Clark St, Chicago, IL 60614",
    description: "Cozy warm lattes, seasonal pastries, and open community connection. Perfect for meeting neighborhood neighbors without agenda or pressure.",
    externalUrl: "https://partiful.com/e/actually-lets-coffee-connect",
    partifulUrl: "https://partiful.com/e/actually-lets-coffee-connect",
    status: "upcoming",
  },
  {
    id: "chi-2026-10-25-stroll",
    city: "chicago",
    title: "Fall Nature Stroll",
    date: "2026-10-25",
    displayDate: "Sun, Oct 25",
    timeWindow: "1:30 PM – 3:30 PM CDT",
    category: "outdoor",
    icon: "🌳",
    iconName: "Trees",
    venueName: "North Park Village Nature Center",
    venueAddress: "5801 N Pulaski Rd, Chicago, IL 60646",
    description: "Experience peak Chicago fall foliage along peaceful woodland trails and wetlands. Gentle walking pace, all skill levels welcome.",
    externalUrl: "https://partiful.com/e/actually-lets-fall-nature-stroll",
    partifulUrl: "https://partiful.com/e/actually-lets-fall-nature-stroll",
    status: "upcoming",
  },
  {
    id: "chi-2026-10-31-fall-social",
    city: "chicago",
    title: "Community Fall Social",
    date: "2026-10-31",
    displayDate: "Sat, Oct 31",
    timeWindow: "5:00 PM – 8:00 PM CDT",
    category: "social",
    icon: "🎃",
    iconName: "Flame",
    venueName: "Half Acre Beer Co — Balmoral Taproom & Garden",
    venueAddress: "2050 W Balmoral Ave, Chicago, IL 60625",
    description: "Celebrate Halloween and autumnal vibes with warm cider, seasonal bites, and friendly community gathering in the heated beer garden.",
    externalUrl: "https://partiful.com/e/actually-lets-fall-social",
    partifulUrl: "https://partiful.com/e/actually-lets-fall-social",
    status: "upcoming",
  },
];

/**
 * Returns all configured events for a given city and date range
 */
export function getEventsForCity(city: string = "chicago"): CommunityEvent[] {
  const targetCity = city.toLowerCase().trim();
  return OCTOBER_2026_EVENTS.filter(
    (e) => e.city.toLowerCase() === targetCity
  );
}

/**
 * Retrieve single event by ID
 */
export function getEventById(id: string): CommunityEvent | undefined {
  return OCTOBER_2026_EVENTS.find((e) => e.id === id);
}

/**
 * Fetches events with dynamic broadcast hydration for the target city from Firestore.
 */
export async function fetchHydratedEvents(city: string = "chicago"): Promise<CommunityEvent[]> {
  const targetCity = (city || "chicago").toLowerCase().trim();
  let baseEvents = OCTOBER_2026_EVENTS.filter(
    (e) => e.city.toLowerCase() === targetCity
  );

  try {
    let snap;
    try {
      const q = query(
        collection(db, "broadcasts"),
        where("city", "in", [targetCity, "chicago", "Chicago", "All", "all"])
      );
      snap = await getDocs(q);
    } catch {
      snap = await getDocs(collection(db, "broadcasts"));
    }

    if (snap && !snap.empty) {
      const records = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      // Filter to records matching city or 'All'
      const relevant = records.filter((r) => {
        const c = String(r.city || "").toLowerCase().trim();
        return c === targetCity || c === "all" || c === "";
      });

      const listToSort = relevant.length > 0 ? relevant : records;

      // Sort by dispatchedAt or createdAt desc
      listToSort.sort((a, b) => {
        const timeA = a.dispatchedAt?.toMillis
          ? a.dispatchedAt.toMillis()
          : a.dispatchedAt
          ? new Date(a.dispatchedAt).getTime()
          : a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : 0;
        const timeB = b.dispatchedAt?.toMillis
          ? b.dispatchedAt.toMillis()
          : b.dispatchedAt
          ? new Date(b.dispatchedAt).getTime()
          : b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : 0;
        return timeB - timeA;
      });

      const latest = listToSort[0];
      if (latest) {
        // Extract real announcement copy, checking all broadcast message fields
        const rawNote =
          latest.customMessage ||
          latest.message ||
          latest.announcementText ||
          latest.notes ||
          (latest.customNote && latest.customNote !== "Community date confirmed." ? latest.customNote : "");

        const verifiedExternalUrl = "https://partiful.com/e/QSVMteLK2LBBOc3cQHKh";
        const incomingUrl = latest.externalUrl || latest.ticketUrl || latest.eventUrl || latest.partifulUrl;
        const resolvedExternalUrl =
          incomingUrl && !incomingUrl.includes("test-preview")
            ? incomingUrl
            : verifiedExternalUrl;
        const resolvedExternalLabel = latest.externalUrlLabel || latest.ticketUrlLabel || latest.linkLabel;

        baseEvents = baseEvents.map((ev) => {
          if (ev.id === "chi-sep-26-gathering" || ev.date === "2026-09-26") {
            const hasCustomVenue =
              latest.venueName &&
              !latest.venueName.includes("The Joinery") &&
              !latest.venueName.includes("Lincoln Park");

            return {
              ...ev,
              venueName: hasCustomVenue ? latest.venueName.trim() : ev.venueName,
              venueAddress: hasCustomVenue && latest.venueAddress ? latest.venueAddress.trim() : ev.venueAddress,
              timeWindow: hasCustomVenue && latest.timeWindow ? latest.timeWindow.trim() : ev.timeWindow,
              externalUrl: resolvedExternalUrl,
              externalUrlLabel: resolvedExternalLabel || ev.externalUrlLabel,
              partifulUrl: resolvedExternalUrl,
              hostAnnouncement: rawNote && String(rawNote).trim() ? String(rawNote).trim() : ev.hostAnnouncement,
            };
          }
          return ev;
        });
      }
    }
  } catch (err) {
    console.warn("fetchHydratedEvents fallback to local config:", err);
  }

  return baseEvents;
}

/**
 * Filters and sorts events dynamically:
 * - Upcoming (date >= '2026-09-09')
 * - Splits into attending vs open given a list of rsvpEventIds
 */
export function filterUpcomingEvents(
  events: CommunityEvent[],
  rsvpEventIds: string[] = [],
  currentDateThreshold: string = "2026-09-09"
): {
  upcoming: CommunityEvent[];
  attending: CommunityEvent[];
  open: CommunityEvent[];
  spotlightEvent: CommunityEvent | null;
} {
  const upcoming = [...events]
    .filter((e) => e.date >= currentDateThreshold)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const attending = upcoming.filter((e) => rsvpEventIds.includes(e.id));
  const open = upcoming.filter((e) => !rsvpEventIds.includes(e.id));

  // Priority 1: Earliest upcoming event confirmed for attending
  // Fallback: Earliest upcoming open chapter gathering
  const spotlightEvent = attending[0] || open[0] || upcoming[0] || null;

  return {
    upcoming,
    attending,
    open,
    spotlightEvent,
  };
}
