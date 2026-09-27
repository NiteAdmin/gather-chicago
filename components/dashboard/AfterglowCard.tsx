"use client";

import React, { useState, useEffect } from "react";

interface AfterglowCardProps {
  eventId: string;
  selectedReaction?: string;
  onSelectReaction?: (token: string) => void;
  variant?: 'light' | 'dark';
}

const AFTERGLOW_TOKENS = ['⚡ Energizing', '☕ Relaxed', '🌱 Deep Talk'] as const;

export default function AfterglowCard({
  eventId,
  selectedReaction: propSelectedReaction,
  onSelectReaction,
  variant = 'light',
}: AfterglowCardProps) {
  const [internalReaction, setInternalReaction] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && eventId) {
      const stored = localStorage.getItem(`afterglow_vibe_${eventId}`);
      if (stored) {
        setInternalReaction(stored);
      }
    }
  }, [eventId]);

  const activeReaction = propSelectedReaction || internalReaction;

  const handleSelect = (token: string) => {
    setInternalReaction(token);
    if (typeof window !== "undefined" && eventId) {
      localStorage.setItem(`afterglow_vibe_${eventId}`, token);
    }
    if (onSelectReaction) {
      onSelectReaction(token);
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2800);
  };

  if (variant === 'dark') {
    return (
      <div className="mt-4 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#F5B096] font-semibold">
            How was today&apos;s gathering?
          </p>
          <p className="text-xs text-[#D8CEBC]/80 mt-0.5">
            {savedNotice ? "Thanks for your feedback! Host Lola will see this." : "Tap a reaction to let the host know how it felt."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {AFTERGLOW_TOKENS.map((token) => {
            const isSelected = activeReaction === token;
            return (
              <button
                key={token}
                type="button"
                onClick={() => handleSelect(token)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#F5B096] bg-[#C8643F] text-white font-bold shadow-xs"
                    : "border-white/20 bg-white/10 hover:border-[#F5B096] hover:text-[#F5B096] text-white"
                }`}
              >
                {token}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-stone-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-stone-500 font-semibold">
          How was today&apos;s gathering?
        </p>
        <p className="text-xs text-stone-600 mt-0.5">
          {savedNotice ? "Thanks for your feedback! Host Lola will see this." : "Tap a reaction to let the host know how it felt."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {AFTERGLOW_TOKENS.map((token) => {
          const isSelected = activeReaction === token;
          return (
            <button
              key={token}
              type="button"
              onClick={() => handleSelect(token)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                isSelected
                  ? "border-[#C8643F] bg-[#F4EBE3] text-[#C8643F] font-bold shadow-2xs"
                  : "border-stone-300 bg-white hover:border-[#C8643F] hover:text-[#C8643F] text-stone-700"
              }`}
            >
              {token}
            </button>
          );
        })}
      </div>
    </div>
  );
}
