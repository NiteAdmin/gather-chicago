import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { SurveyResponse } from "@/types/survey";
export type { SurveyResponse };

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function saveResponse(data: Omit<SurveyResponse, "id" | "createdAt">): Promise<string> {
  const emailLower = data.email ? data.email.trim().toLowerCase() : "";
  const citySlug = (data.city || "chicago").toLowerCase();

  const sanitizedPayload = {
    city: citySlug,
    cityName: data.cityName || (citySlug.charAt(0).toUpperCase() + citySlug.slice(1)),
    name: data.name ? data.name.trim() : "",
    email: emailLower,
    phoneNumber: data.phoneNumber ? data.phoneNumber.trim() : null,
    smsOptIn: Boolean(data.smsOptIn),
    quarterlyReminder: typeof data.quarterlyReminder === "boolean" ? data.quarterlyReminder : false,
    gatherings: Array.isArray(data.gatherings) ? data.gatherings : [],
    customGathering: data.customGathering ? data.customGathering.trim() : null,
    dates: Array.isArray(data.dates) ? data.dates : [],
    customDate: data.customDate ? data.customDate.trim() : null,
    times: Array.isArray(data.times) ? data.times : [],
    customTime: data.customTime ? data.customTime.trim() : null,
    dayPref: data.dayPref ? data.dayPref.trim() : null,
    guests: data.guests ? data.guests.trim() : null,
    drink: data.drink ? data.drink.trim() : null,
    notes: data.notes ? data.notes.trim() : null,
  };

  // Idempotent Check: If response already exists for (email, city), update existing doc
  if (emailLower) {
    try {
      const q = query(
        collection(db, "responses"),
        where("email", "==", emailLower),
        where("city", "==", citySlug)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "responses", existingDoc.id), {
          ...sanitizedPayload,
          updatedAt: serverTimestamp(),
        });
        return existingDoc.id;
      }
    } catch (checkErr) {
      console.warn("Idempotent check query failed, falling back to new doc creation:", checkErr);
    }
  }

  const docRef = await addDoc(collection(db, "responses"), {
    ...sanitizedPayload,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function fetchResponses(): Promise<SurveyResponse[]> {
  try {
    const q = query(collection(db, "responses"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SurveyResponse[];
  } catch (error) {
    console.warn("Ordered fetch failed, falling back to basic fetch:", error);
    const querySnapshot = await getDocs(collection(db, "responses"));
    const responses = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SurveyResponse[];
    return responses.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }
}

export interface BroadcastLogData {
  city?: string;
  winningDate: string;
  timeWindow?: string;
  venueName?: string;
  venueAddress?: string;
  ticketUrl?: string;
  eventUrl?: string;
  customNote?: string;
  groupACount: number;
  groupBCount: number;
  totalDispatched: number;
  forceResend?: boolean;
}

export interface BroadcastRecord extends BroadcastLogData {
  id: string;
  dispatchedAt?: any;
}

export async function logBroadcast(data: BroadcastLogData): Promise<string> {
  const docRef = await addDoc(collection(db, "broadcasts"), {
    ...data,
    dispatchedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function fetchBroadcasts(city?: string): Promise<BroadcastRecord[]> {
  try {
    const q = query(collection(db, "broadcasts"), orderBy("dispatchedAt", "desc"));
    const querySnapshot = await getDocs(q);
    let broadcasts = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BroadcastRecord[];

    if (city && city !== "all") {
      const targetCity = city.toLowerCase();
      broadcasts = broadcasts.filter((b) => (b.city || "chicago").toLowerCase() === targetCity);
    }
    return broadcasts;
  } catch (error) {
    console.warn("Ordered broadcasts fetch failed, falling back to basic fetch:", error);
    try {
      const querySnapshot = await getDocs(collection(db, "broadcasts"));
      let broadcasts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BroadcastRecord[];

      if (city && city !== "all") {
        const targetCity = city.toLowerCase();
        broadcasts = broadcasts.filter((b) => (b.city || "chicago").toLowerCase() === targetCity);
      }

      return broadcasts.sort((a, b) => {
        const timeA = a.dispatchedAt?.toMillis ? a.dispatchedAt.toMillis() : (a.dispatchedAt ? new Date(a.dispatchedAt).getTime() : 0);
        const timeB = b.dispatchedAt?.toMillis ? b.dispatchedAt.toMillis() : (b.dispatchedAt ? new Date(b.dispatchedAt).getTime() : 0);
        return timeB - timeA;
      });
    } catch (fallbackError) {
      console.error("Failed to fetch broadcasts:", fallbackError);
      return [];
    }
  }
}

export async function getBroadcastById(id: string): Promise<BroadcastRecord | null> {
  try {
    const docRef = doc(db, "broadcasts", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BroadcastRecord;
    }
    return null;
  } catch (err) {
    console.error("Error fetching broadcast by ID:", err);
    return null;
  }
}

export async function getResponseById(id: string): Promise<SurveyResponse | null> {
  try {
    const docRef = doc(db, "responses", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SurveyResponse;
    }
    return null;
  } catch (err) {
    console.error("Error fetching response by ID:", err);
    return null;
  }
}




