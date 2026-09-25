import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { splitEventTitle, SplitTitleResult } from "./formatters";

export { splitEventTitle };
export type { SplitTitleResult };

export type EventAudience = 'family' | 'adults' | 'all-adults' | '21+' | 'adults-21';

export function getAudienceBadge(audience?: EventAudience | string, label?: string): string | undefined {
  if (label) {
    return label.replace(/\bAll Adults\b/gi, "Adults").replace(/\bALL ADULTS\b/gi, "Adults");
  }
  if (!audience) return undefined;
  if (audience === 'family') return '👨‍👩‍👧 Family Friendly';
  if (audience === 'adults' || audience === 'all-adults') return '👥 Adults';
  if (audience === '21+' || audience === 'adults-21') return '🍸 Adults (21+)';
  return undefined;
}

export function getAudienceIcon(audience?: EventAudience | string, label?: string): string | null {
  if (audience === 'family' || label?.toLowerCase().includes('family')) {
    return '👨‍👩‍👧';
  }
  if (audience === '21+' || audience === 'adults-21' || label?.includes('21+')) {
    return '🍸';
  }
  if (audience === 'adults' || audience === 'all-adults' || label?.toLowerCase().includes('adult')) {
    return '👥';
  }
  return null;
}

export interface CommunityEvent {
  id: string;
  city: string;
  brandPrefix?: string;
  title: string;
  chipLabel?: string;
  date: string; // ISO format 'YYYY-MM-DD'
  displayDate: string; // e.g., 'Fri, Oct 9'
  timeWindow: string; // e.g., '6:30 PM – 9:00 PM CDT'
  category: 'food' | 'outdoor' | 'social' | 'wellness' | 'culture' | 'comedy' | 'stand-up';
  categoryLabel?: string;
  audience?: EventAudience;
  audienceLabel?: string; // e.g., '👨‍👩‍👧 Family Friendly', '🍸 Adults (21+)', '👥 Adults'
  icon: string; // fallback icon/emoji e.g. '🍕'
  iconName?: 'Compass' | 'Flame' | 'Pizza' | 'Footprints' | 'Coffee' | 'Trees' | 'Sparkles' | 'Activity' | 'Mic' | string;
  venueName: string;
  venueAddress?: string;
  description: string;
  externalUrl?: string;
  externalUrlLabel?: string;
  partifulUrl?: string;
  status: 'upcoming' | 'past' | 'confirmed';
  hostAnnouncement?: string;
  capacity?: number;
  rsvpCount?: number;
}

export const OCTOBER_2026_BASE_EVENTS: CommunityEvent[] = [
  {
    id: "chi-sep-26-gathering",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Stretch & Sip — Moksha Yoga",
    date: "2026-09-26",
    displayDate: "Sat, Sep 26",
    timeWindow: "10:30 AM (10:00 AM – 12:00 PM CDT)",
    category: "wellness",
    categoryLabel: "WELLNESS & MOVEMENT",
    audience: "adults",
    audienceLabel: "👥 Adults",
    icon: "🧘",
    iconName: "Sparkles",
    venueName: "Moksha Yoga Center",
    venueAddress: "2528 W Armitage Ave, Chicago, IL",
    description: "Join us for a morning yoga session at Moksha Yoga Center. Bring a mat, grab a sip, and connect with fellow Chicago members.",
    externalUrl: "https://partiful.com/e/QSVMteLK2LBBOc3cQHKh",
    partifulUrl: "https://partiful.com/e/QSVMteLK2LBBOc3cQHKh",
    status: "confirmed",
    hostAnnouncement: "Excited to stretch and sip! Bring a friend and a mat!",
    capacity: 30,
  },
  {
    id: "chi-2026-10-03-apple-fest",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Lincoln Square Ravenswood Apple Fest",
    chipLabel: "Apple Fest",
    date: "2026-10-03",
    displayDate: "Sat, Oct 3 & Sun, Oct 4",
    timeWindow: "10:00 AM – 1:00 PM CDT",
    category: "outdoor",
    categoryLabel: "COMMUNITY MARKET & OUTDOOR",
    audience: "family",
    audienceLabel: "👨‍👩‍👧 Family Friendly",
    icon: "👟",
    iconName: "Footprints",
    venueName: "Lincoln Square Ravenswood",
    venueAddress: "4505 N Lincoln Ave, Chicago, IL 60625",
    description: "Autumn weekend in Lincoln Square with local apple growers, hot spiced cider, fresh baked goods, and live street music along Lincoln Ave. Free admission ($5 suggested donation).",
    externalUrl: "https://www.lincolnsquare.org/apple-fest",
    externalUrlLabel: "Official Apple Fest Site",
    partifulUrl: "https://www.lincolnsquare.org/apple-fest",
    status: "upcoming",
    capacity: 50,
  },
  {
    id: "chi-2026-10-05-little-lark-pizza",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Little Lark — Free Margherita Pizza & Wine",
    chipLabel: "Free Pizza & Wine",
    date: "2026-10-05",
    displayDate: "Mon, Oct 5",
    timeWindow: "6:00 PM – 8:30 PM CDT",
    category: "food",
    categoryLabel: "FOOD & CASUAL GATHERING",
    audience: "family",
    audienceLabel: "👨‍👩‍👧 Family Friendly",
    icon: "🍕",
    iconName: "Pizza",
    venueName: "Little Lark",
    venueAddress: "3132 N Rockwell St, Chicago, IL 60618",
    description: "Ease into the week at Little Lark along the river. Receive a complimentary Margherita pizza with the purchase of any bottle of wine. Relaxed, welcoming atmosphere for families and neighbors.",
    externalUrl: "http://littlelarkchicago.com/",
    externalUrlLabel: "Little Lark Chicago",
    partifulUrl: "http://littlelarkchicago.com/",
    status: "upcoming",
    capacity: 30,
  },
  {
    id: "chi-2026-10-08-little-lark-pinsa",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Little Lark — Pinsa Night + $10 Wine",
    chipLabel: "Pinsa Night",
    date: "2026-10-08",
    displayDate: "Thu, Oct 8",
    timeWindow: "6:00 PM – 8:30 PM CDT",
    category: "food",
    categoryLabel: "FOOD & SOCIAL DINING",
    audience: "adults-21",
    audienceLabel: "🍸 Adults (21+)",
    icon: "🍕",
    iconName: "Pizza",
    venueName: "Little Lark",
    venueAddress: "3132 N Rockwell St, Chicago, IL 60618",
    description: "Crispy Roman-style pinsa flatbreads straight from the oven paired with $10 glasses of wine. Perfect mid-week gathering spot to share food and connect with friends.",
    externalUrl: "http://littlelarkchicago.com/",
    externalUrlLabel: "Little Lark Chicago",
    partifulUrl: "http://littlelarkchicago.com/",
    status: "upcoming",
    capacity: 30,
  },
  {
    id: "chi-2026-10-09-wine-fest",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Lincoln Park Wine Fest",
    chipLabel: "Wine Fest",
    date: "2026-10-09",
    displayDate: "Fri, Oct 9 – Sun, Oct 11",
    timeWindow: "5:00 PM – 10:00 PM CDT",
    category: "social",
    categoryLabel: "ADULT SOCIAL & TASTING",
    audience: "adults-21",
    audienceLabel: "🍸 Adults (21+)",
    icon: "☕",
    iconName: "Coffee",
    venueName: "Jonquil Park",
    venueAddress: "1001 W Wrightwood Ave, Chicago, IL 60614",
    description: "Jonquil Park transforms into an autumnal open-air wine garden featuring curated global varietals, food pairings, and acoustic music. GA from $30; VIP passes available.",
    externalUrl: "https://chicagoevents.com/event/lincoln-park-wine-fest/",
    externalUrlLabel: "Wine Fest Tickets",
    partifulUrl: "https://chicagoevents.com/event/lincoln-park-wine-fest/",
    status: "upcoming",
    capacity: 45,
  },
  {
    id: "chi-2026-10-16-soul-smoke",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Soul & Smoke BBQ",
    chipLabel: "Soul & Smoke BBQ",
    date: "2026-10-16",
    displayDate: "Fri, Oct 16",
    timeWindow: "6:00 PM – 8:30 PM CDT",
    category: "food",
    categoryLabel: "FOOD & COMMUNITY DINNER",
    audience: "adults-21",
    audienceLabel: "🍸 Adults (21+)",
    icon: "🔥",
    iconName: "Flame",
    venueName: "Location TBD",
    venueAddress: "Chicago, IL (Announced prior to event)",
    description: "Award-winning craft barbecue. Slow-smoked brisket, savory pulled pork, rich mac and cheese, and casual community picnic vibes.",
    externalUrl: "https://soulandsmoke.com",
    externalUrlLabel: "Soul & Smoke",
    partifulUrl: "https://soulandsmoke.com",
    status: "upcoming",
    capacity: 35,
  },
  {
    id: "chi-2026-10-17-spooky-zoo",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Spooky Zoo",
    chipLabel: "Spooky Zoo",
    date: "2026-10-17",
    displayDate: "Sat, Oct 17",
    timeWindow: "10:00 AM – 1:00 PM CDT",
    category: "outdoor",
    categoryLabel: "SEASONAL & ANIMALS",
    audience: "family",
    audienceLabel: "👨‍👩‍👧 Family Friendly",
    icon: "🌳",
    iconName: "Trees",
    venueName: "Lincoln Park Zoo",
    venueAddress: "2001 N Clark St, Chicago, IL 60614",
    description: "Lincoln Park Zoo's daytime trick-or-treating with music, animal viewing, and craft stations across the grounds. Free to attend—bring family or join fellow members for a relaxed autumn walk.",
    externalUrl: "https://www.lpzoo.org/event/spooky-zoo/",
    externalUrlLabel: "Zoo Event Details",
    partifulUrl: "https://www.lpzoo.org/event/spooky-zoo/",
    status: "upcoming",
    capacity: 60,
  },
  {
    id: "chi-2026-10-17-goebberts-farm",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Goebbert's Farm Fall Festival",
    chipLabel: "Goebbert's Farm",
    date: "2026-10-17",
    displayDate: "Sat, Oct 17",
    timeWindow: "11:00 AM – 1:00 PM CDT",
    category: "outdoor",
    categoryLabel: "SEASONAL & OUTDOOR",
    audience: "family",
    audienceLabel: "👨‍👩‍👧 Family Friendly",
    icon: "🌳",
    iconName: "Trees",
    venueName: "Goebbert's Farm",
    venueAddress: "42W813 Reinking Rd, Pingree Grove, IL 60140",
    description: "Fall festival out in Pingree Grove with pumpkin patches, fresh apple cider donuts, wagon rides, and farm attractions. A great seasonal weekend trip.",
    externalUrl: "https://goebbertspumpkinfarm.com/fall-festival/ticket-prices/",
    externalUrlLabel: "Festival Tickets",
    partifulUrl: "https://goebbertspumpkinfarm.com/fall-festival/ticket-prices/",
    status: "upcoming",
    capacity: 40,
  },
  {
    id: "chi-2026-10-23-laugh-factory",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Friday Night Stand Up Comedy at Laugh Factory Chicago",
    chipLabel: "Stand Up Comedy",
    date: "2026-10-23",
    displayDate: "Fri, Oct 23",
    timeWindow: "7:00 PM – 8:30 PM CDT",
    category: "comedy",
    categoryLabel: "STAND-UP COMEDY",
    audience: "adults-21",
    audienceLabel: "🍸 Adults (21+)",
    icon: "🎤",
    iconName: "Mic",
    venueName: "Laugh Factory Chicago",
    venueAddress: "3175 N Broadway, Chicago, IL 60657",
    description: "High-energy stand-up comedy showcase featuring top Chicago comics and national headliners on Belmont and Broadway. Tickets start from $29.51 with two-beverage minimum.",
    externalUrl: "https://www.eventbrite.com/e/friday-night-stand-up-comedy-at-laugh-factory-chicago-tickets-1999810695624",
    externalUrlLabel: "Comedy Tickets",
    partifulUrl: "https://www.eventbrite.com/e/friday-night-stand-up-comedy-at-laugh-factory-chicago-tickets-1999810695624",
    status: "upcoming",
    capacity: 30,
  },
  {
    id: "chi-2026-10-25-boo-zoo",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "BOO! at the Zoo",
    chipLabel: "BOO! at the Zoo",
    date: "2026-10-25",
    displayDate: "Sun, Oct 25",
    timeWindow: "10:00 AM – 6:00 PM CDT",
    category: "outdoor",
    categoryLabel: "SEASONAL & ANIMALS",
    audience: "family",
    audienceLabel: "👨‍👩‍👧 Family Friendly",
    icon: "🌳",
    iconName: "Trees",
    venueName: "Brookfield Zoo Chicago",
    venueAddress: "31st St & Golfview Ave, Brookfield, IL 60513",
    description: "Brookfield Zoo's Halloween gathering featuring pumpkin carving demos, carousel rides, and fall animal treats. Included with regular zoo admission.",
    externalUrl: "https://www.brookfieldzoo.org/events/boo-at-the-zoo",
    externalUrlLabel: "Brookfield Zoo Details",
    partifulUrl: "https://www.brookfieldzoo.org/events/boo-at-the-zoo",
    status: "upcoming",
    capacity: 50,
  },
  {
    id: "chi-legacy-polled-sep-26",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Sep 26 — Lincoln Park Conservatory (Polled Gathering)",
    date: "2026-09-26",
    displayDate: "Sat, Sep 26",
    timeWindow: "10:00 AM – 12:00 PM CDT",
    category: "outdoor",
    categoryLabel: "LEGACY POLLED GATHERING",
    audience: "family",
    audienceLabel: "👨‍👩‍👧 Family Friendly",
    icon: "🏛️",
    iconName: "Trees",
    venueName: "Lincoln Park Conservatory",
    venueAddress: "2391 N Stockton Dr, Chicago, IL 60614",
    description: "Initial polled community gathering at Lincoln Park Conservatory derived from chapter intake survey consensus.",
    externalUrl: "https://partiful.com/e/QSVMteLK2LBBOc3cQHKh",
    partifulUrl: "https://partiful.com/e/QSVMteLK2LBBOc3cQHKh",
    status: "confirmed",
    capacity: 35,
    rsvpCount: 24,
  },
];

export const NOVEMBER_2026_EVENTS: CommunityEvent[] = [
  {
    id: "chi-2026-11-07-board-games",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Board Games & Brews",
    date: "2026-11-07",
    displayDate: "Sat, Nov 7",
    timeWindow: "3:00 PM – 6:00 PM CST",
    category: "social",
    categoryLabel: "COMMUNITY SOCIAL & GAMES",
    audience: "adults",
    audienceLabel: "👥 Adults",
    icon: "🎲",
    iconName: "Sparkles",
    venueName: "Location TBD",
    venueAddress: "Chicago, IL (Announced prior to event)",
    description: "Afternoon meetup featuring tabletop board games, local craft brews, and warm social chatter. Drop in solo or bring friends—open tables for all experience levels.",
    externalUrl: "https://partiful.com/e/actually-lets-board-games-brews",
    partifulUrl: "https://partiful.com/e/actually-lets-board-games-brews",
    status: "upcoming",
    capacity: 30,
    rsvpCount: 14,
  },
  {
    id: "chi-2026-11-15-trail-coffee",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Morning Trail Walk & Coffee",
    date: "2026-11-15",
    displayDate: "Sun, Nov 15",
    timeWindow: "9:30 AM – 11:30 AM CST",
    category: "outdoor",
    categoryLabel: "OUTDOOR & ACTIVE",
    audience: "adults",
    audienceLabel: "👥 Adults",
    icon: "👟",
    iconName: "Footprints",
    venueName: "Location TBD",
    venueAddress: "Chicago, IL (Announced prior to event)",
    description: "Crisp autumn morning stroll along the trail taking in city skyline views, wrapping up with pour-overs and pastries.",
    externalUrl: "https://partiful.com/e/actually-lets-trail-walk-coffee",
    partifulUrl: "https://partiful.com/e/actually-lets-trail-walk-coffee",
    status: "upcoming",
    capacity: 35,
    rsvpCount: 22,
  },
  {
    id: "chi-2026-11-21-friendsgiving",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Friendsgiving Potluck Warmup",
    date: "2026-11-21",
    displayDate: "Sat, Nov 21",
    timeWindow: "6:00 PM – 9:00 PM CST",
    category: "food",
    categoryLabel: "FOOD & COMMUNITY DINNER",
    audience: "adults",
    audienceLabel: "👥 Adults",
    icon: "🥧",
    iconName: "Pizza",
    venueName: "Location TBD",
    venueAddress: "Chicago, IL (Announced prior to event)",
    description: "Kick off Thanksgiving week with a cozy neighborhood potluck warmup. Share seasonal autumn comfort foods, warm spiced cider, and convivial connection.",
    externalUrl: "https://partiful.com/e/actually-lets-friendsgiving-warmup",
    partifulUrl: "https://partiful.com/e/actually-lets-friendsgiving-warmup",
    status: "upcoming",
    capacity: 40,
    rsvpCount: 29,
  },
  {
    id: "chi-2026-11-29-book-swap",
    city: "chicago",
    brandPrefix: "Actually, Let's™",
    title: "Low-Key Book Swap & Chill",
    date: "2026-11-29",
    displayDate: "Sun, Nov 29",
    timeWindow: "2:00 PM – 4:30 PM CST",
    category: "social",
    categoryLabel: "COMMUNITY SOCIAL & CULTURE",
    audience: "adults",
    audienceLabel: "👥 Adults",
    icon: "📚",
    iconName: "Coffee",
    venueName: "Location TBD",
    venueAddress: "Chicago, IL (Announced prior to event)",
    description: "Cozy Sunday wind-down to ease out of the holiday weekend. Bring 1–2 books you love to trade, enjoy loose-leaf tea or signature lattes, and swap winter reading recs.",
    externalUrl: "https://partiful.com/e/actually-lets-book-swap-chill",
    partifulUrl: "https://partiful.com/e/actually-lets-book-swap-chill",
    status: "upcoming",
    capacity: 25,
    rsvpCount: 16,
  },
];

export const ALL_COMMUNITY_EVENTS: CommunityEvent[] = [
  ...OCTOBER_2026_BASE_EVENTS,
  ...NOVEMBER_2026_EVENTS,
];

export const OCTOBER_2026_EVENTS: CommunityEvent[] = ALL_COMMUNITY_EVENTS;
export const COMMUNITY_EVENTS: CommunityEvent[] = ALL_COMMUNITY_EVENTS;

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

export interface PollOption {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  price: string;
  dates: string;
  website: string;
}

export interface CommunityPoll {
  id: string;
  title: string;
  category: string;
  status: "poll"; // STRICTLY 'poll'
  pollDates: string[];
  audienceLabel?: string;
  options: PollOption[];
}

export const chicagoPotteryPoll: CommunityPoll = {
  id: "pottery-studio-faceoff",
  title: "Pottery Workshop Community Poll",
  category: "culture",
  status: "poll", // STRICTLY 'poll'
  pollDates: ["2026-10-04", "2026-11-14"],
  audienceLabel: "👥 Adults",
  options: [
    {
      id: "lincoln-square",
      name: "Lincoln Square Pottery Studio",
      neighborhood: "Lincoln Square",
      address: "4150 N Lincoln Ave, Chicago, IL",
      price: "$60 / person (2 hrs)",
      dates: "Sun, Oct 4 (10 AM or 12 PM)",
      website: "https://www.comeplaywithclay.com/classes",
    },
    {
      id: "gnarware",
      name: "GnarWare Workshop",
      neighborhood: "Pilsen",
      address: "1838 West Cermak Ave, Chicago, IL 60608",
      price: "$40 / person (2 hrs)",
      dates: "Sat, Nov 14 (Flexible Wed–Sun, 12 PM–8 PM)",
      website: "https://www.care.com/connect/gnarwareworkshop/providers/671-gnarware-workshop",
    },
  ],
};
