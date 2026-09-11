"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  User,
  X,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  LogOut,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User as FirebaseUser,
} from "firebase/auth";

interface UserNavButtonProps {
  className?: string;
}

export default function UserNavButton({ className = "" }: UserNavButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth Form State
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showDropdown]);

  const handleClick = () => {
    if (!user) {
      setAuthError(null);
      setAuthSuccessMsg(null);
      setShowModal(true);
      return;
    }

    // On desktop screens (>= 1024px):
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    if (isDesktop) {
      if (pathname !== "/dashboard") {
        router.push("/dashboard");
      } else {
        // Already on /dashboard: scroll smoothly to top, do not open floating popover over hero
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // On mobile screens (< 1024px): toggle mobile popover
    setShowDropdown((prev) => !prev);
  };

  const handleSignOut = async () => {
    setShowDropdown(false);
    await signOut(auth);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setAuthError("Please fill out both email and password.");
      return;
    }

    setSubmittingAuth(true);

    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        setShowModal(false);
        router.push("/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        // Send email verification
        try {
          await sendEmailVerification(userCredential.user);
        } catch (verificationErr) {
          console.warn("Could not send verification email:", verificationErr);
        }
        setAuthSuccessMsg("Account created! Redirecting to your dashboard...");
        setTimeout(() => {
          setShowModal(false);
          router.push("/dashboard");
        }, 1200);
      }
    } catch (err: any) {
      console.warn("Auth error:", err);
      let message = "Unable to sign in. Please verify your details and try again.";
      if (err?.code === "auth/invalid-credential") {
        message = "Incorrect email or password. If you haven't set a password yet, use the 'Forgot password?' option.";
      } else if (err?.code === "auth/user-not-found") {
        message = "No account found with this email. Please check your spelling or sign up.";
      } else if (err?.code === "auth/wrong-password") {
        message = "Incorrect password. Please try again.";
      } else if (err?.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please reset your password or try again later.";
      } else if (err?.code === "auth/email-already-in-use") {
        message = "An account with this email already exists. Try signing in.";
      } else if (err?.code === "auth/weak-password") {
        message = "Password must be at least 6 characters.";
      }
      setAuthError(message);
    } finally {
      setSubmittingAuth(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={user ? `Account menu for ${user.email}` : "Sign In or View Account"}
        aria-expanded={showDropdown}
        className={`relative group inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all duration-200 cursor-pointer ${
          user
            ? "bg-[#EDE4D3] border-[#4C5A40] text-[#4C5A40] hover:bg-[#E2D6C0] hover:scale-105"
            : "bg-[#FBF7EE] border-[#D8CEBC] text-[#6A6253] hover:text-[#2B271F] hover:border-[#C8643F] hover:scale-105 shadow-sm"
        }`}
        title={user ? `Account menu (${user.email})` : "Member Account"}
      >
        <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform" />

        {/* Status Indicator Dot */}
        {user ? (
          <span
            className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#4C5A40] border-2 border-[#F4EEE2] rounded-full"
            title="Authenticated"
          />
        ) : null}
      </button>

      {/* Authenticated Floating Dropdown (Mobile Only) */}
      {user && showDropdown && (
        <div
          role="menu"
          aria-label="Member Account Menu"
          className="lg:hidden absolute right-0 sm:right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-72 bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-5 shadow-2xl z-[9999] animate-fade-in"
        >
          {/* Avatar & Email + Close Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                role="img"
                aria-label={`Member avatar for ${user.email || "Chicago Member"}`}
                className="w-12 h-12 rounded-2xl bg-[#EDE4D3] text-[#4C5A40] flex items-center justify-center font-bold text-lg font-serif-fraunces shadow-inner shrink-0"
              >
                <span>{user.email ? user.email.charAt(0).toUpperCase() : "M"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#EEF5EB] text-[#3D5634] border border-[#C5DEC0] px-2 py-0.5 rounded-full inline-block mb-1">
                  VERIFIED MEMBER
                </span>
                <h3 className="text-sm font-bold text-[#2B271F] truncate" title={user.email || ""}>
                  {user.email}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDropdown(false)}
              aria-label="Close menu"
              className="p-1.5 text-[#8C8270] hover:text-[#2B271F] transition-colors rounded-full hover:bg-[#EDE4D3]/50 shrink-0 ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Member Metadata */}
          <div className="border-t border-[#D8CEBC]/60 py-3 text-xs space-y-1.5 text-[#6A6253]">
            <div className="flex items-center justify-between">
              <span>Chapter</span>
              <span className="font-semibold text-[#2B271F] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#C8643F]" />
                Chicago Chapter
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Member Since</span>
              <span className="font-semibold text-[#2B271F]">
                {user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : "September 2026"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-[#D8CEBC]/60 pt-3.5 flex flex-col gap-2">
            {pathname !== "/dashboard" && (
              <Link
                href="/dashboard"
                onClick={() => setShowDropdown(false)}
                className="w-full text-center text-xs font-semibold py-2.5 rounded-xl bg-[#EDE4D3] hover:bg-[#E2D6C0] text-[#2B271F] transition-colors"
              >
                Go to Member Dashboard →
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#8C8270] hover:text-[#A63A24] border border-[#D8CEBC] hover:border-[#F5C2BA] rounded-xl py-2 bg-white transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="relative w-full max-w-md bg-[#FBF7EE] border border-[#D8CEBC] rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-[#8C8270] hover:text-[#2B271F] transition-colors rounded-full hover:bg-[#EDE4D3]/50 cursor-pointer"
              aria-label="Close auth modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-[#C8643F]">
                MEMBER DASHBOARD
              </span>
              <h2 className="text-2xl font-bold font-serif-fraunces text-[#2B271F] mt-1">
                {mode === "signin" ? "Welcome Back" : "Claim Your Account"}
              </h2>
              <p className="text-xs sm:text-sm text-[#6A6253] mt-1.5 leading-relaxed">
                {mode === "signin"
                  ? "Sign in to access your RSVP sync, events calendar, and city updates."
                  : "Create your password to manage RSVPs and view your confirmed gathering schedule."}
              </p>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="grid grid-cols-2 p-1 bg-[#EDE4D3]/70 rounded-xl mb-5 text-xs font-bold text-[#6A6253]">
              <button
                type="button"
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

            {/* Feedback Banners */}
            {authSuccessMsg && (
              <div className="mb-4 p-3 bg-[#EEF5EB] border border-[#C5DEC0] text-[#3D5634] text-xs font-semibold rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {/* Auth Form */}
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (authError) setAuthError(null);
                  }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  className="w-full bg-[#FFFFFF] border border-[#D8CEBC] rounded-xl px-3.5 py-2.5 text-sm text-[#2B271F] focus:outline-none focus:border-[#C8643F] transition-colors"
                />
              </div>

              {authError && (
                <p className="text-xs text-[#E07A5F] bg-[#FAF7F2] border border-[#EBE3D5] rounded-lg p-2.5 mt-2">
                  {authError}
                </p>
              )}

              <button
                type="submit"
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
                    <span>Sign In to Dashboard</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create &amp; Claim Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-[#D8CEBC]/50 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  router.push("/dashboard");
                }}
                className="text-xs text-[#6A6253] hover:text-[#2B271F] underline transition-colors cursor-pointer"
              >
                Go directly to Dashboard page →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
