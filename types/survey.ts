export interface SurveyResponse {
  id?: string;
  createdAt?: any;
  city?: string;
  name: string;
  email: string;
  phoneNumber?: string;
  smsOptIn?: boolean;
  notes?: string;
  customDate?: string;
  customTime?: string;
  gatherings: string[];
  dates: string[];
  times: string[];
  dayPref: string;
  guests: string;
  drink: string;
}

export interface BroadcastPayload {
  winningDate: string;
  eventDetails: string;
  eventLink?: string;
  adminSecret: string;
}
