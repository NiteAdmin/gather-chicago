export interface SurveyResponse {
  id?: string;
  createdAt?: any;
  updatedAt?: any;
  city?: string;
  cityName?: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  smsOptIn?: boolean;
  notes?: string | null;
  customGathering?: string | null;
  customDate?: string | null;
  customTime?: string | null;
  gatherings?: string[];
  dates?: string[];
  times?: string[];
  dayPref?: string | null;
  guests?: string | null;
  drink?: string | null;
  quarterlyReminder?: boolean;
  lastQuarterlyReminderSentAt?: any;
}

export interface BroadcastPayload {
  winningDate: string;
  eventDetails: string;
  eventLink?: string;
  adminSecret: string;
  city?: string;
}
