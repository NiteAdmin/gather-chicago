'use client';

import { useState, useEffect } from "react";
import {
  EventDateOptions,
  EventPhase,
  getCommunityEventPhase,
} from "./eventStatus";

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
