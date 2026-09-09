"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";

interface PostRsvpAuthModalProps {
  isOpen: boolean;
  email: string;
  name?: string;
  onDismissGuest: () => void;
}

export default function PostRsvpAuthModal({
  isOpen,
  email,
  name,
  onDismissGuest,
}: PostRsvpAuthModalProps) {
  const router = useRouter();

  // State
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      if (isExistingUser) {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        setSuccessMsg("Signed in! Redirecting to your dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        // Create new user account
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

        // Dispatch verification email
        try {
          await sendEmailVerification(userCredential.user);
        } catch (verErr) {
          console.warn("Could not dispatch email verification:", verErr);
        }

        setSuccessMsg("Account created! Redirecting to your member dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
      }
    } catch (err: any) {
      console.error("Post-RSVP Auth error:", err);
      if (err.code === "auth/email-already-in-use") {
        setIsExistingUser(true);
        setErrorMsg("An account with this email already exists. Enter your password to sign in:");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setErrorMsg("Incorrect password. Please try again.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Password must be at least 6 characters long.");
      } else {
        setErrorMsg(err.message || "Failed to process account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in font-sans-hanken"
    >
      <div className="relative w-full max-w-lg bg-[#FBF7EE] border-2 border-[#D8CEBC] rounded-3xl p-6 sm:p-10 shadow-2xl animate-fade-in">
        {/* Close Button / Continue as Guest */}
        <button
          type="button"
          onClick={onDismissGuest}
          className="absolute top-4 right-4 p-2 text-[#8C8270] hover:text-[#2B271F] transition-colors rounded-full hover:bg-[#EDE4D3]/60 cursor-pointer"
          aria-label="Close and continue as guest"
          title="Continue as Guest"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-[#EEF5EB] text-[#3D5634] border border-[#C5DEC0] text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>RSVP CONFIRMED</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-serif-fraunces text-[#2B271F] tracking-tight">
            You&apos;re on the list! 🎉
          </h2>

          <p className="text-xs sm:text-sm text-[#6A6253] mt-2 leading-relaxed max-w-md mx-auto">
            {name ? `${name}, create` : "Create"} a member account to see your confirmed events, view the October community calendar, and access private venue details.
          </p>
        </div>

        {/* Error / Success Feedback Banners */}
        {errorMsg && (
          <div className="mb-4 p-3.5 bg-[#FDF2F0] border border-[#F5C2BA] text-[#A63A24] text-xs font-semibold rounded-2xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-[#EEF5EB] border border-[#C5DEC0] text-[#3D5634] text-xs font-semibold rounded-2xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form: Path A (Create Member Account / Sign In) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pre-filled & Readonly Email Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6A6253] mb-1.5 flex items-center justify-between">
              <span>Account Email</span>
              <span className="text-[10px] text-[#8C8270] font-normal flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#C8643F]" />
                <span>Locked to RSVP</span>
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C8270]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                readOnly
                value={email}
                className="w-full bg-[#EDE4D3]/50 border border-[#D8CEBC] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#2B271F] font-medium cursor-not-allowed select-all"
                title="Your email is pre-filled from your survey response."
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6A6253] mb-1.5">
              {isExistingUser ? "Enter Your Password" : "Create a Password"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C8270]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#D8CEBC] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8C8270] hover:text-[#2B271F] transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!isExistingUser && (
              <span className="text-[10px] text-[#8C8270] mt-1 block">
                Must be at least 6 characters. We&apos;ll email a verification link to confirm your account.
              </span>
            )}
          </div>

          {/* Path A Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#C8643F] hover:bg-[#b05230] text-white py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isExistingUser ? "Signing In..." : "Creating Account..."}</span>
                </>
              ) : isExistingUser ? (
                <>
                  <span>Sign In &amp; View Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Account &amp; View Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing User Toggle Link */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => {
              setIsExistingUser(!isExistingUser);
              setErrorMsg(null);
            }}
            className="text-xs text-[#8C8270] hover:text-[#2B271F] transition-colors underline cursor-pointer"
          >
            {isExistingUser
              ? "Need to create a new account instead?"
              : "Already have a password? Sign in here"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#D8CEBC]/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#FBF7EE] px-3 text-[#8C8270] font-semibold text-[10px] tracking-widest">
              OR
            </span>
          </div>
        </div>

        {/* Path B: Continue as Guest */}
        <div className="text-center">
          <button
            type="button"
            onClick={onDismissGuest}
            className="w-full bg-transparent hover:bg-[#EDE4D3]/50 text-[#6A6253] hover:text-[#2B271F] border border-[#D8CEBC] py-3 px-5 rounded-xl font-semibold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Continue as Guest</span>
            <span className="text-[11px] text-[#8C8270]">(View survey summary) →</span>
          </button>
          <p className="text-[11px] text-[#8C8270] mt-2.5 leading-tight">
            Your RSVP has already been saved. You can always claim your member account later.
          </p>
        </div>
      </div>
    </div>
  );
}
