"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  LogIn,
  UserPlus,
  LogOut,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Calendar as CalendarIcon,
  Copy,
  Check,
  Mail,
  Share2,
  Download,
  ExternalLink,
  Compass,
  SlidersHorizontal,
  X,
} from "lucide-react";
import EventIcon from "@/components/dashboard/EventIcon";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User as FirebaseUser,
} from "firebase/auth";
import UserNavButton from "@/components/nav/UserNavButton";
import MemberCalendar from "@/components/dashboard/MemberCalendar";
import DashboardHero from "@/components/dashboard/DashboardHero";
import { OCTOBER_2026_EVENTS, CommunityEvent, fetchHydratedEvents, splitEventTitle } from "@/lib/eventsConfig";
import {
  fetchUserRSVPs,
  fetchUserSavedRsvps,
  saveUserRsvps,
  saveUserEventOverride,
  saveUserVibes,
  loadUserData as loadUserFirestoreData,
  AVAILABLE_VIBES,
  partitionUpcomingEvents,
  resolveUserAttendance,
  ResolvedEvent,
} from "@/lib/userEvents";
import { SurveyResponse } from "@/types/survey";

export default function DashboardPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Events state with dynamic broadcast hydration
  const [baseEvents, setBaseEvents] = useState<CommunityEvent[]>(OCTOBER_2026_EVENTS);
  const [userResponses, setUserResponses] = useState<SurveyResponse[]>([]);
  const [savedRsvpIds, setSavedRsvpIds] = useState<string[]>([]);
  const [declinedEventIds, setDeclinedEventIds] = useState<string[]>([]);
  const [userVibes, setUserVibes] = useState<string[]>([]);
  const [isEditingVibes, setIsEditingVibes] = useState(false);
  const [selectedEditorVibes, setSelectedEditorVibes] = useState<string[]>([]);
  const [savingVibes, setSavingVibes] = useState(false);
  const [vibesSuccessMsg, setVibesSuccessMsg] = useState<string | null>(null);
  const [rsvpToast, setRsvpToast] = useState<string | null>(null);
  const [resolvedEvents, setResolvedEvents] = useState<ResolvedEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, "attending" | "open">>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHostEmail, setCopiedHostEmail] = useState(false);

  // Auth Form State for inline card when unauthenticated
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Load user RSVPs, vibes, and dynamically hydrated events from Firestore
  const loadUserData = useCallback(async (userEmail: string, userUid: string) => {
    setLoadingEvents(true);
    try {
      const [{ vibes, savedRsvpIds: savedIds, declinedEventIds: declinedIds, responses }, hydrated] = await Promise.all([
        loadUserFirestoreData(userUid, userEmail),
        fetchHydratedEvents("chicago"),
      ]);
      setBaseEvents(hydrated);
      setUserResponses(responses);
      setSavedRsvpIds(savedIds);
      setDeclinedEventIds(declinedIds || []);
      setUserVibes(vibes);
      const resolved = resolveUserAttendance(
        hydrated,
        responses,
        manualOverrides,
        savedIds,
        vibes,
        declinedIds || []
      );
      setResolvedEvents(resolved);
    } catch (err) {
      console.warn("Could not load user RSVPs:", err);
      setResolvedEvents(resolveUserAttendance(OCTOBER_2026_EVENTS, [], manualOverrides, []));
    } finally {
      setLoadingEvents(false);
    }
  }, [manualOverrides]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
      if (currentUser?.email && currentUser?.uid) {
        loadUserData(currentUser.email, currentUser.uid);
      } else {
        setUserResponses([]);
        setSavedRsvpIds([]);
        setDeclinedEventIds([]);
        setUserVibes([]);
        fetchHydratedEvents("chicago")
          .then((hydrated) => {
            setBaseEvents(hydrated);
            setResolvedEvents(resolveUserAttendance(hydrated, [], {}));
          })
          .catch(() => {
            setResolvedEvents(resolveUserAttendance(OCTOBER_2026_EVENTS, [], {}));
          });
      }
    });
    return () => unsubscribe();
  }, [loadUserData]);

  const handleToggleRSVP = async (eventId: string) => {
    // 1. Snapshot previous state for rollback
    const prevOverrides = { ...manualOverrides };
    const prevSavedRsvpIds = [...savedRsvpIds];
    const prevDeclinedIds = [...declinedEventIds];
    const prevResolvedEvents = [...resolvedEvents];

    const currentStatus =
      manualOverrides[eventId] ||
      resolvedEvents.find((e) => e.id === eventId)?.attendanceStatus ||
      "open";
    const newStatus: "attending" | "open" = currentStatus === "attending" ? "open" : "attending";

    // 2. Optimistically update local state for instantaneous feedback
    const updatedOverrides: Record<string, "attending" | "open"> = {
      ...manualOverrides,
      [eventId]: newStatus,
    };
    setManualOverrides(updatedOverrides);

    let nextSavedRsvpIds: string[];
    let nextDeclinedIds: string[];

    if (newStatus === "attending") {
      nextSavedRsvpIds = Array.from(new Set([...savedRsvpIds, eventId]));
      nextDeclinedIds = declinedEventIds.filter((id) => id !== eventId);
    } else {
      nextSavedRsvpIds = savedRsvpIds.filter((id) => id !== eventId);
      nextDeclinedIds = Array.from(new Set([...declinedEventIds, eventId]));
    }

    setSavedRsvpIds(nextSavedRsvpIds);
    setDeclinedEventIds(nextDeclinedIds);

    // Re-resolve events with session overrides and persistent decline state
    const updatedEvents = resolveUserAttendance(
      baseEvents,
      userResponses,
      updatedOverrides,
      nextSavedRsvpIds,
      userVibes,
      nextDeclinedIds
    );
    setResolvedEvents(updatedEvents);

    // 3. Persist to Firestore with error rollback & toast
    if (user?.uid) {
      try {
        await saveUserEventOverride(
          user.uid,
          eventId,
          newStatus,
          savedRsvpIds,
          declinedEventIds
        );
      } catch (err: any) {
        console.warn("Unable to persist RSVP override to Firestore, rolling back state:", err);
        setManualOverrides(prevOverrides);
        setSavedRsvpIds(prevSavedRsvpIds);
        setDeclinedEventIds(prevDeclinedIds);
        setResolvedEvents(prevResolvedEvents);
        setRsvpToast("Unable to update RSVP. Please check your connection and try again.");
        setTimeout(() => setRsvpToast(null), 4000);
      }
    }
  };

  const getMemberSince = () => {
    let dateObj: Date | null = null;
    if (user?.metadata?.creationTime) {
      dateObj = new Date(user.metadata.creationTime);
    } else if (userResponses.length > 0 && userResponses[0].createdAt) {
      const raw = userResponses[0].createdAt;
      dateObj = raw?.toDate ? raw.toDate() : new Date(raw);
    }
    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    return "September 2026";
  };

  const handleCopyInviteLink = () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://actuallylets.com";
    const refParam = user?.uid ? `?ref=${user.uid}` : "";
    const url = `${origin}/chicago${refParam}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2400);
  };

  const handleDownloadIcs = () => {
    const attendingEvents = resolvedEvents.filter((e) => e.attendanceStatus === "attending");
    if (attendingEvents.length === 0) {
      alert("You haven't RSVP’d to any gatherings yet. Please RSVP to at least one event in the calendar to download your calendar feed.");
      return;
    }

    const escapeIcs = (str: string) =>
      (str || "")
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r\n|\r|\n/g, "\\n");

    const nowIso = new Date().toISOString().replace(/[-:]|\.\d+/g, "");

    let icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Actually Lets//Chicago Member Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Actually Lets — Chicago Gatherings",
      "X-WR-TIMEZONE:America/Chicago",
    ];

    for (const ev of attendingEvents) {
      const dateParts = ev.date.split("-");
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);

      // Default to 18:00 - 20:30 CDT (UTC-5)
      let startH = 18;
      let startM = 0;
      let endH = 20;
      let endM = 30;

      const timeMatch = ev.timeWindow?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let sh = parseInt(timeMatch[1], 10);
        const sm = parseInt(timeMatch[2], 10);
        const sp = timeMatch[3].toUpperCase();
        if (sp === "PM" && sh !== 12) sh += 12;
        if (sp === "AM" && sh === 12) sh = 0;
        startH = sh;
        startM = sm;

        let eh = parseInt(timeMatch[4], 10);
        const em = parseInt(timeMatch[5], 10);
        const ep = timeMatch[6].toUpperCase();
        if (ep === "PM" && eh !== 12) eh += 12;
        if (ep === "AM" && eh === 12) eh = 0;
        endH = eh;
        endM = em;
      }

      // Chicago CDT is UTC-5
      const startDate = new Date(Date.UTC(year, month, day, startH + 5, startM, 0));
      const endDate = new Date(Date.UTC(year, month, day, endH + 5, endM, 0));

      const startIso = startDate.toISOString().replace(/[-:]|\.\d+/g, "");
      const endIso = endDate.toISOString().replace(/[-:]|\.\d+/g, "");
      const fullLocation = [ev.venueName, ev.venueAddress].filter(Boolean).join(", ");
      const externalUrl = ev.externalUrl || ev.partifulUrl;
      const urlLine = externalUrl ? `\\n\\nRSVP & Details: ${externalUrl}` : "";
      const noteLine = ev.hostAnnouncement ? `\\n\\nHost Announcement: ${ev.hostAnnouncement}` : "";

      icsLines.push(
        "BEGIN:VEVENT",
        `UID:${ev.id}-${user?.uid || "attendee"}@actuallylets.com`,
        `DTSTAMP:${nowIso}`,
        `DTSTART:${startIso}`,
        `DTEND:${endIso}`,
        `SUMMARY:${escapeIcs(ev.title)}`,
        `DESCRIPTION:${escapeIcs(ev.description)}${noteLine}${urlLine}`,
        `LOCATION:${escapeIcs(fullLocation)}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    }

    icsLines.push("END:VCALENDAR");

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "actually-lets-my-gatherings.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setAuthError("Please provide both email and password.");
      return;
    }

    setSubmittingAuth(true);

    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        try {
          await sendEmailVerification(userCredential.user);
        } catch (verErr) {
          console.warn("Could not send verification email:", verErr);
        }
        setAuthSuccessMsg("Account created! Welcome to your Actually, Let's dashboard.");
      }
    } catch (err: any) {
      console.error("Dashboard auth error:", err);
      let message = "Authentication failed. Please check your credentials.";
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        message = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        message = "An account with this email already exists. Try signing in.";
      } else if (err.code === "auth/weak-password") {
        message = "Password must be at least 6 characters.";
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setManualOverrides({});
    setSavedRsvpIds([]);
    setDeclinedEventIds([]);
    setUserVibes([]);
  };

  const handleSaveVibes = async () => {
    if (!user?.uid) {
      setUserVibes(selectedEditorVibes);
      const updatedEvents = resolveUserAttendance(
        baseEvents,
        userResponses,
        manualOverrides,
        savedRsvpIds,
        selectedEditorVibes,
        declinedEventIds
      );
      setResolvedEvents(updatedEvents);
      setVibesSuccessMsg("Preferences updated!");
      setTimeout(() => {
        setVibesSuccessMsg(null);
        setIsEditingVibes(false);
      }, 700);
      return;
    }

    setSavingVibes(true);
    try {
      await saveUserVibes(user.uid, selectedEditorVibes);
      setUserVibes(selectedEditorVibes);
      const updatedEvents = resolveUserAttendance(
        baseEvents,
        userResponses,
        manualOverrides,
        savedRsvpIds,
        selectedEditorVibes,
        declinedEventIds
      );
      setResolvedEvents(updatedEvents);
      setVibesSuccessMsg("Preferences saved!");
      setTimeout(() => {
        setVibesSuccessMsg(null);
        setIsEditingVibes(false);
      }, 700);
    } catch (err) {
      console.warn("Could not save user vibes:", err);
    } finally {
      setSavingVibes(false);
    }
  };

  // Dynamically partition events: filter upcoming (date >= '2026-09-09') & sort ascending
  const { upcomingAttending, spotlightEvent } = partitionUpcomingEvents(resolvedEvents);
  const attendingCount = upcomingAttending.length;

  const host = {
    name: "Lola",
    email: "admin@actuallylets.com",
    city: "Chicago",
  };

  const handleCopyHostEmail = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(host.email);
    }
    setCopiedHostEmail(true);
    setTimeout(() => setCopiedHostEmail(false), 2000);
  };

  const getHostSubtitle = (event: ResolvedEvent | null, city: string = "Chicago"): string => {
    if (!event) return `${city} Community Host`;
    const { eventName } = splitEventTitle(event.title, event.brandPrefix);
    if (event.venueName && eventName.includes(" — ")) {
      const parts = eventName.split(" — ");
      if (parts.length === 2) {
        const suffix = parts[1].trim().toLowerCase();
        const venue = event.venueName.toLowerCase();
        if (venue.startsWith(suffix)) {
          return `${parts[0].trim()} Host`;
        }
      }
    }
    return `${eventName.trim()} Host`;
  };

  const hostSubtitle = getHostSubtitle(spotlightEvent, host.city);

  // Active member vibes: priority to users/{uid}, fallback to survey responses
  const displayVibes =
    userVibes.length > 0
      ? userVibes
      : Array.from(
          new Set(
            userResponses.flatMap((r) =>
              Array.isArray(r.gatherings) ? r.gatherings : []
            )
          )
        );

  const renderDocket = () => (
    <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B271F] flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-[#C8643F]" />
          <span>Your Docket</span>
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E3A20] text-[#A3E699]">
          {attendingCount} ATTENDING
        </span>
      </div>

      {upcomingAttending.length > 0 ? (
        <div className="space-y-3 divide-y divide-[#D8CEBC]/40">
          {upcomingAttending.map((ev) => (
            <div key={ev.id} className="pt-3 first:pt-0">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#EDE4D3] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <EventIcon
                    iconName={ev.iconName}
                    eventId={ev.id}
                    category={ev.category}
                    fallbackIcon={ev.icon}
                    className="w-3.5 h-3.5 text-[#E07A5F]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#C8643F] flex items-center">
                    <span>Actually, Let&apos;s<span className="text-[0.55em] font-sans font-normal -top-[0.6em] relative ml-[1px] select-none text-stone-500">™</span></span>
                  </div>
                  <h4 className="text-xs font-bold text-[#2B271F] leading-tight">
                    {splitEventTitle(ev.title, ev.brandPrefix).eventName}
                  </h4>
                  <p className="text-[11px] font-semibold text-[#C8643F] mt-0.5">
                    {ev.displayDate} &bull; {ev.timeWindow.includes("10:30 AM") ? "10:30 AM" : ev.timeWindow.split(" (")[0]} &bull; {ev.venueName}
                  </p>
                  {ev.venueAddress && (
                    <p className="text-[10.5px] text-[#8C8270] truncate mt-0.5" title={`${ev.venueName} • ${ev.venueAddress}`}>
                      {ev.venueAddress}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-[#6A6253] space-y-2">
          <Compass className="w-6 h-6 text-[#8C8270] mx-auto opacity-70" />
          <p>No gatherings RSVP’d yet.</p>
          <p className="text-[11px] text-[#8C8270]">
            Tap <strong>RSVP</strong> on any event in the center calendar to lock in your spot.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2B271F] font-sans-hanken antialiased flex flex-col">
      <style jsx global>{`
        .font-serif-fraunces {
          font-family: 'Fraunces', var(--font-fraunces), Georgia, serif;
        }
        .font-sans-hanken {
          font-family: 'Hanken Grotesk', var(--font-hanken-grotesk), -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      {/* TOP HEADER */}
      <header className="border-b border-[#D8CEBC]/70 bg-[#F6F1EA] backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90 shrink-0"
          >
            <span className="font-serif-fraunces font-black text-xl sm:text-2xl text-[#2B271F] tracking-tight">
              Actually, Let&apos;s<span className="text-[0.55em] font-sans font-normal -top-[0.6em] relative ml-[1px] select-none text-stone-500">™</span>
            </span>
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest bg-[#EDE4D3] text-[#4C5A40] px-2 py-0.5 rounded-full font-bold">
              SERIES
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-[#6A6253]">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 hover:text-[#2B271F] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <UserNavButton className="lg:hidden" />
          </nav>
        </div>
      </header>

      {/* MAIN BODY CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {loadingUser ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#6A6253]">
            <Loader2 className="w-6 h-6 animate-spin text-[#C8643F]" />
            <p className="text-xs font-medium">Loading your member dashboard...</p>
          </div>
        ) : user ? (
          /* AUTHENTICATED RESPONSIVE 3-COLUMN LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ========================================================== */}
            {/* LEFT COLUMN (Desktop col 3 / Mobile step 4): Profile, Host Card & Vibe Tags */}
            {/* ========================================================== */}
            <aside className="order-2 lg:order-1 lg:col-span-3 space-y-5 static lg:sticky lg:top-8 self-start">
              {/* Profile Card (Desktop only, moved to UserNavButton dropdown on mobile) */}
              <div className="hidden lg:block bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3.5 mb-4">
                  <div
                    role="img"
                    aria-label={`Member avatar for ${user.email || "Chicago Member"}`}
                    className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#4C5A40] flex items-center justify-center font-bold text-lg font-serif-fraunces shadow-inner shrink-0"
                  >
                    <span>{user.email ? user.email.charAt(0).toUpperCase() : "M"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-[#EEF5EB] text-[#3D5634] border border-[#C5DEC0] px-2 py-0.5 rounded-full inline-block mb-1">
                      VERIFIED MEMBER
                    </span>
                    <h2 className="text-sm font-bold text-[#2B271F] truncate" title={user.email || ""}>
                      {user.email}
                    </h2>
                  </div>
                </div>

                <div className="border-t border-[#D8CEBC]/50 pt-3 text-xs space-y-1.5 text-[#6A6253]">
                  <div className="flex items-center justify-between">
                    <span>Chapter</span>
                    <span className="font-semibold text-[#2B271F] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C8643F]" />
                      Chicago, IL
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Member Since</span>
                    <span className="font-semibold text-[#2B271F]">{getMemberSince()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Sign out of account"
                  onClick={handleSignOut}
                  className="w-full mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#8C8270] hover:text-[#A63A24] border border-[#D8CEBC] hover:border-[#F5C2BA] rounded-xl py-2 bg-white transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Host Contact Card */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#EBE3D5] flex items-center justify-center font-serif font-bold text-sm text-[#2B271F] shadow-xs shrink-0"
                    aria-label={`Host ${host.name} avatar`}
                  >
                    <span>{host.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B271F]">
                      {host.name}
                    </h3>
                    <p className="text-[11px] text-[#8C8270] font-medium">{hostSubtitle}</p>
                  </div>
                </div>
                <p className="text-xs text-[#6A6253] leading-relaxed">
                  Have questions about venue access, food accommodations, or want to co-host a meetup?
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${host.email}?subject=${encodeURIComponent(`Actually Let's ${host.city} - Question for ${host.name} (${hostSubtitle})`)}`}
                      aria-label={`Contact ${host.city} host ${host.name} via email`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#EDE4D3] hover:bg-[#E2D6C0] text-[#2B271F] text-xs font-semibold transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#C8643F] shrink-0" />
                      <span className="truncate">Contact {host.name}</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyHostEmail}
                      aria-label={copiedHostEmail ? "Host email copied to clipboard" : `Copy host email ${host.email}`}
                      title={copiedHostEmail ? "Copied!" : `Copy ${host.email}`}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                        copiedHostEmail
                          ? "bg-[#EEF5EB] border-[#C5DEC0] text-[#3D5634]"
                          : "bg-white border-[#D8CEBC] hover:border-[#B5A995] text-[#2B271F]"
                      }`}
                    >
                      {copiedHostEmail ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#3D5634]" />
                          <span className="text-[11px] font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#8C8270]" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Direct visual display of host email for transparency */}
                  <div className="text-[11px] text-[#8C8270] flex items-center justify-between px-1">
                    <span className="font-mono truncate">{host.email}</span>
                    {copiedHostEmail && (
                      <span className="text-[#3D5634] font-medium text-[10px] ml-2 shrink-0">
                        Copied to clipboard
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/host?city=${host.city.toLowerCase()}`}
                    className="text-center text-[11px] font-semibold text-[#C8643F] hover:underline pt-0.5"
                  >
                    Host a community gathering &rarr;
                  </Link>
                </div>
              </div>

              {/* Survey Vibe Tags */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B271F] flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C827A]" />
                    <span>Your Survey Vibes</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEditorVibes(displayVibes.length > 0 ? displayVibes : AVAILABLE_VIBES.slice(0, 4));
                      setIsEditingVibes(true);
                    }}
                    className="text-[11px] font-semibold text-[#C8643F] hover:underline cursor-pointer"
                  >
                    Edit &rarr;
                  </button>
                </div>

                {displayVibes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {displayVibes.map((vibe, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-full text-xs bg-[#FAF7F2] border border-[#EBE3D5] text-[#6A6253]"
                      >
                        {vibe}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#6A6253] space-y-2">
                    <p>You haven&apos;t set specific gathering vibes yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEditorVibes(AVAILABLE_VIBES.slice(0, 4));
                        setIsEditingVibes(true);
                      }}
                      className="inline-block text-xs font-semibold text-[#C8643F] underline underline-offset-2 cursor-pointer text-left"
                    >
                      Take the 2-min survey &rarr;
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* ========================================================== */}
            {/* CENTER COLUMN (Desktop col 6 / Mobile steps 1, 2, 3) */}
            {/* ========================================================== */}
            <section className="order-1 lg:order-2 lg:col-span-6 space-y-6">
              {/* 1. DYNAMIC SPOTLIGHT HERO BANNER */}
              <DashboardHero
                events={resolvedEvents}
                onToggleRSVP={handleToggleRSVP}
              />

              {/* 2. DOCKET / ATTENDING MINI-FEED (Mobile only: stacks cleanly below Hero on < lg) */}
              <div className="block lg:hidden">
                {renderDocket()}
              </div>

              {/* 3. INTERACTIVE MEMBER CALENDAR */}
              {loadingEvents ? (
                <div className="p-12 text-center bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C8643F] mx-auto mb-2" />
                  <p className="text-xs text-[#6A6253]">Matching your survey RSVPs with the October lineup...</p>
                </div>
              ) : (
                <MemberCalendar
                  events={resolvedEvents}
                  onToggleRSVP={handleToggleRSVP}
                />
              )}
            </section>

            {/* ========================================================== */}
            {/* RIGHT COLUMN (Desktop col 3 / Mobile step 5): Docket, Sync & Invite */}
            {/* ========================================================== */}
            <aside className="order-3 lg:order-3 lg:col-span-3 space-y-5 static lg:sticky lg:top-8 self-start">
              {/* Gathering Docket (Desktop only: top of right sidebar) */}
              <div className="hidden lg:block">
                {renderDocket()}
              </div>

              {/* Add to Calendar Sync */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B271F] flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[#C8643F]" />
                  <span>Calendar Sync</span>
                </h3>
                <p className="text-xs text-[#6A6253] leading-relaxed">
                  Export your confirmed dates into Apple Calendar, Google Calendar, or Outlook.
                </p>
                <button
                  type="button"
                  aria-label="Download calendar feed as ICS file"
                  onClick={handleDownloadIcs}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#EDE4D3] hover:bg-[#E2D6C0] text-[#2B271F] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#C8643F]" />
                  <span>Download .ICS Feed</span>
                </button>
              </div>

              {/* Invite a Guest / Referral */}
              <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#C8643F]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2B271F]">
                    Bring a Guest
                  </h3>
                </div>
                <p className="text-xs text-[#6A6253] leading-relaxed">
                  Know someone in Chicago looking for low-pressure community gatherings? Share the chapter link.
                </p>
                <button
                  type="button"
                  aria-label="Copy Chicago chapter invite link to clipboard"
                  onClick={handleCopyInviteLink}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#C8643F] hover:bg-[#b05230] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Invite link copied to clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Chapter Link</span>
                    </>
                  )}
                </button>
              </div>
            </aside>
          </div>
        ) : (
          /* UNAUTHENTICATED INLINE CARD */
          <div className="max-w-md mx-auto bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-6 sm:p-8 shadow-md animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#C8643F] mx-auto flex items-center justify-center mb-3">
                <User className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C8643F]">
                MEMBER ACCESS
              </span>
              <h1 className="text-2xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                {mode === "signin" ? "Sign In to Your Dashboard" : "Claim Your Member Account"}
              </h1>
              <p className="text-xs sm:text-sm text-[#6A6253] mt-1.5 leading-relaxed">
                {mode === "signin"
                  ? "Access your RSVP confirmations, calendar sync feed, and gathering details."
                  : "Set a password for your account to manage your responses and sync event invites."}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-[#EDE4D3]/70 rounded-xl mb-5 text-xs font-bold text-[#6A6253]">
              <button
                type="button"
                aria-label="Switch to Sign In mode"
                onClick={() => {
                  setMode("signin");
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === "signin"
                    ? "bg-[#FBF7EE] text-[#2B271F] shadow-sm"
                    : "hover:text-[#2B271F]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                aria-label="Switch to Create Account mode"
                onClick={() => {
                  setMode("signup");
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === "signup"
                    ? "bg-[#FBF7EE] text-[#2B271F] shadow-sm"
                    : "hover:text-[#2B271F]"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-[#FDF2F0] border border-[#F5C2BA] text-[#A63A24] text-xs font-semibold rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccessMsg && (
              <div className="mb-4 p-3 bg-[#EEF5EB] border border-[#C5DEC0] text-[#3D5634] text-xs font-semibold rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                />
              </div>

              <button
                type="submit"
                aria-label={mode === "signin" ? "Sign in to your member account" : "Create and claim your member account"}
                disabled={submittingAuth}
                className="w-full bg-[#C8643F] hover:bg-[#b05230] text-white py-3 px-4 rounded-xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingAuth ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : mode === "signin" ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create &amp; Claim Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* VIBE PREFERENCE EDITOR MODAL */}
        {isEditingVibes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#D8CEBC]/60 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#C8643F]" />
                  <h3 className="font-serif-fraunces text-lg font-bold text-[#2B271F]">
                    Select Gathering Vibes
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingVibes(false)}
                  className="text-[#8C8270] hover:text-[#2B271F] p-1 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close vibe editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#6A6253] leading-relaxed">
                Pick the types of gatherings you’d love to attend in Chicago. Selections save directly to your member profile and customize your schedule.
              </p>

              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-1">
                {AVAILABLE_VIBES.map((vibe) => {
                  const isSelected = selectedEditorVibes.includes(vibe);
                  return (
                    <button
                      key={vibe}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedEditorVibes(selectedEditorVibes.filter((v) => v !== vibe));
                        } else {
                          setSelectedEditorVibes([...selectedEditorVibes, vibe]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#C8643F] text-white border-[#C8643F] shadow-xs"
                          : "bg-[#FAF7F2] text-[#6A6253] border-[#EBE3D5] hover:border-[#D8CEBC]"
                      }`}
                    >
                      {isSelected ? `✓ ${vibe}` : vibe}
                    </button>
                  );
                })}
              </div>

              {vibesSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-[#EEF5EB] border border-[#C5DEC0] text-[#3D5634] text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#52C41A]" />
                  <span>{vibesSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D8CEBC]/60">
                <button
                  type="button"
                  onClick={() => setIsEditingVibes(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8C8270] hover:text-[#2B271F] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveVibes}
                  disabled={savingVibes}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#C8643F] hover:bg-[#b05230] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingVibes ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Preferences</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#D8CEBC]/70 py-8 text-center text-xs text-[#6A6253] bg-[#EDE4D3]/40">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center items-center gap-3 sm:gap-4">
          <Link href="/" className="hover:text-[#2B271F] transition-colors">
            Home
          </Link>
          <span className="text-[#A89F91] select-none">&middot;</span>
          <Link href="/chicago" className="hover:text-[#2B271F] transition-colors">
            Chicago Chapter
          </Link>
          <span className="text-[#A89F91] select-none">&middot;</span>
          <Link href="/host" className="hover:text-[#2B271F] transition-colors">
            Become a Host
          </Link>
          <span className="text-[#A89F91] select-none">&middot;</span>
          <Link href="/privacy" className="hover:text-[#2B271F] transition-colors">
            Privacy Policy
          </Link>
          <span className="text-[#A89F91] select-none">&middot;</span>
          <Link href="/terms" className="hover:text-[#2B271F] transition-colors">
            Terms of Service
          </Link>
        </div>
      </footer>

      {/* RSVP ERROR TOAST NOTIFICATION */}
      {rsvpToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#2B271F] text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-[#E07A5F] shrink-0" />
          <span className="text-xs font-medium">{rsvpToast}</span>
        </div>
      )}
    </div>
  );
}
