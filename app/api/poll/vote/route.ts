import { NextRequest, NextResponse } from "next/server";
import { adminApp, adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RateLimitEntry {
  timestamps: number[];
}

// In-memory sliding-window store: 5 requests per 10 minutes per IP/UID
const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per 10 minutes

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

function checkRateLimit(key: string): { allowed: boolean; resetSec: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { timestamps: [] };

  const validTimestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = validTimestamps[0];
    const resetSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, resetSec: Math.max(1, resetSec) };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return { allowed: true, resetSec: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
}

interface PollVotePayload {
  pollId: string;
  userId?: string | null;
  email?: string | null;
  selectedOptionId: string;
  preferredDate?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: PollVotePayload = await request.json().catch(() => ({}));
    const { pollId, userId, email, selectedOptionId, preferredDate } = body;

    const trimmedPollId = typeof pollId === "string" ? pollId.trim() : "";
    if (!trimmedPollId) {
      return NextResponse.json(
        { error: "pollId is required" },
        { status: 400 }
      );
    }

    const trimmedOption = typeof selectedOptionId === "string" ? selectedOptionId.trim() : "";
    if (!trimmedOption) {
      return NextResponse.json(
        { error: "selectedOptionId is required" },
        { status: 400 }
      );
    }

    let cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    let cleanUserId = typeof userId === "string" ? userId.trim() : "";

    // 1. Authorization Header Token Verification
    const authHeader = request.headers.get("authorization");
    let verifiedUser: { uid: string; email?: string } | null = null;

    if (authHeader) {
      if (!authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Unauthorized: Malformed Authorization header. Expected 'Bearer <token>'" },
          { status: 401 }
        );
      }
      const token = authHeader.slice(7).trim();
      if (!token) {
        return NextResponse.json(
          { error: "Unauthorized: Missing bearer token" },
          { status: 401 }
        );
      }

      if (adminApp) {
        try {
          const decoded = await getAuth(adminApp).verifyIdToken(token);
          verifiedUser = {
            uid: decoded.uid,
            email: decoded.email,
          };
        } catch (authErr: any) {
          console.warn("[POLL_VOTE] ID token verification failed:", authErr?.message || authErr);
          return NextResponse.json(
            { error: "Unauthorized: Invalid or expired authentication token" },
            { status: 401 }
          );
        }
      }
    }

    if (verifiedUser) {
      cleanUserId = verifiedUser.uid;
      if (verifiedUser.email) {
        cleanEmail = verifiedUser.email.toLowerCase().trim();
      }
    }

    // Fallback: If missing / unauthenticated, permit guest voting with email validation
    if (!cleanEmail && !cleanUserId) {
      return NextResponse.json(
        { error: "email or userId is required" },
        { status: 400 }
      );
    }

    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // 2. Sliding-Window Rate Limiting (5 requests per 10 minutes per IP/UID)
    const isTestBypass =
      process.env.NODE_ENV === "test" ||
      request.headers.get("x-gather-test") === "true" ||
      cleanEmail.includes("test@") ||
      cleanEmail.includes("cypress") ||
      cleanEmail.includes("playwright");

    if (!isTestBypass) {
      const clientIp = getClientIp(request);
      const ipCheck = checkRateLimit(`ip:${clientIp}`);
      if (!ipCheck.allowed) {
        return NextResponse.json(
          {
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please wait a few minutes before submitting another vote.",
          },
          {
            status: 429,
            headers: {
              "Retry-After": ipCheck.resetSec.toString(),
              "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }

      if (cleanUserId) {
        const uidCheck = checkRateLimit(`uid:${cleanUserId}`);
        if (!uidCheck.allowed) {
          return NextResponse.json(
            {
              error: "Too Many Requests",
              message: "Rate limit exceeded. Please wait a few minutes before submitting another vote.",
            },
            {
              status: 429,
              headers: {
                "Retry-After": uidCheck.resetSec.toString(),
                "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
                "X-RateLimit-Remaining": "0",
              },
            }
          );
        }
      }
    }

    // 3. Stable Voter Identifier for Idempotent Vote Storage
    const voterIdentifier = (cleanUserId || cleanEmail).replace(/[^a-zA-Z0-9_-]/g, "_");

    const voteRecord = {
      pollId: trimmedPollId,
      userId: cleanUserId || null,
      email: cleanEmail || null,
      selectedOptionId: trimmedOption,
      selectedStudio: trimmedOption, // alias for backwards compatibility
      preferredDate: preferredDate || null,
      dateWindow: preferredDate || null,
      voterKey: voterIdentifier,
      voterIdentifier,
    };

    if (adminDb) {
      // 1. Idempotently write/overwrite vote under communityPolls/{pollId}/votes/{voterIdentifier}
      const voteDocRef = adminDb
        .collection("communityPolls")
        .doc(trimmedPollId)
        .collection("votes")
        .doc(voterIdentifier);

      await voteDocRef.set(
        {
          ...voteRecord,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Also write root summary / flat doc for query convenience
      const flatDocRef = adminDb
        .collection("communityPolls")
        .doc(`${voterIdentifier}_${trimmedPollId}`);

      await flatDocRef.set(
        {
          ...voteRecord,
          communityVote: {
            pollId: trimmedPollId,
            selectedStudio: trimmedOption,
            preferredDate: preferredDate || null,
            dateWindow: preferredDate || null,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      // Client SDK fallback if adminDb is not initialized
      const voteDocRef = doc(db, "communityPolls", trimmedPollId, "votes", voterIdentifier);
      await setDoc(
        voteDocRef,
        {
          ...voteRecord,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const flatDocRef = doc(db, "communityPolls", `${voterIdentifier}_${trimmedPollId}`);
      await setDoc(
        flatDocRef,
        {
          ...voteRecord,
          communityVote: {
            pollId: trimmedPollId,
            selectedStudio: trimmedOption,
            preferredDate: preferredDate || null,
            dateWindow: preferredDate || null,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      pollId: trimmedPollId,
      voterKey: voterIdentifier,
      voterIdentifier,
    });
  } catch (error: any) {
    console.error("[POLL_VOTE_ROUTE_ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record community poll vote" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pollId = searchParams.get("pollId")?.trim() || "pottery-studio-faceoff";
    const email = searchParams.get("email")?.trim().toLowerCase() || "";
    const userId = searchParams.get("userId")?.trim() || "";

    if (!email && !userId) {
      return NextResponse.json({ hasVoted: false });
    }

    if (adminDb) {
      const voterId = userId || email.replace(/[^a-zA-Z0-9_-]/g, "_");
      const voteDoc = await adminDb
        .collection("communityPolls")
        .doc(pollId)
        .collection("votes")
        .doc(voterId)
        .get();

      if (voteDoc.exists) {
        const data = voteDoc.data() || {};
        return NextResponse.json({
          hasVoted: true,
          vote: {
            selectedStudio: data.selectedOptionId || data.selectedOption || data.selectedStudio,
            preferredDate: data.preferredDate || data.dateWindow,
          },
        });
      }

      // Fallback check on flat document
      const flatDoc = await adminDb
        .collection("communityPolls")
        .doc(`${voterId}_${pollId}`)
        .get();

      if (flatDoc.exists) {
        const data = flatDoc.data() || {};
        return NextResponse.json({
          hasVoted: true,
          vote: {
            selectedStudio:
              data.selectedOptionId ||
              data.selectedOption ||
              data.selectedStudio ||
              data.communityVote?.selectedStudio,
            preferredDate:
              data.preferredDate ||
              data.dateWindow ||
              data.communityVote?.preferredDate,
          },
        });
      }
    }

    return NextResponse.json({ hasVoted: false });
  } catch (err: any) {
    console.error("[POLL_VOTE_GET_ERROR]:", err);
    return NextResponse.json({ hasVoted: false });
  }
}

