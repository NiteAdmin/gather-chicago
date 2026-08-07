export interface SurveyResponse {
  id?: string;
  createdAt?: any;
  city?: string;
  cityName?: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  smsOptIn?: boolean;
  notes?: string | null;
  customDate?: string | null;
  customTime?: string | null;
  gatherings?: string[];
  dates?: string[];
  times?: string[];
  dayPref?: string | null;
  guests?: string | null;
  drink?: string | null;
}

export interface BroadcastPayload {
  winningDate: string;
  eventDetails: string;
  eventLink?: string;
  adminSecret: string;
}
