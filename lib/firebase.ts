import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { SurveyResponse } from "@/types/survey";

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

export async function saveResponse(data: Omit<SurveyResponse, "id" | "createdAt">): Promise<string> {
  const sanitizedPayload = {
    city: data.city || "chicago",
    cityName: data.cityName || "Chicago",
    name: data.name ? data.name.trim() : "",
    email: data.email ? data.email.trim().toLowerCase() : "",
    phoneNumber: data.phoneNumber ? data.phoneNumber.trim() : null,
    smsOptIn: Boolean(data.smsOptIn),
    gatherings: Array.isArray(data.gatherings) ? data.gatherings : [],
    dates: Array.isArray(data.dates) ? data.dates : [],
    customDate: data.customDate ? data.customDate.trim() : null,
    notes: data.notes ? data.notes.trim() : null,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "responses"), sanitizedPayload);
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
