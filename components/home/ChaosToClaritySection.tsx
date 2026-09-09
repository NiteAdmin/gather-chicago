'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useInView } from 'framer-motion';
import {
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  Flame,
  VolumeX,
  RotateCcw,
  Link2,
  Cpu,
  CalendarDays,
  CheckCheck,
  ArrowRight,
  ExternalLink,
  Zap,
  Target,
  Battery,
  Wifi,
  Signal,
  Smile,
  Send,
} from 'lucide-react';

interface ChatMessage {
  id: number;
  sender: string;
  avatar: string;
  avatarColor: string;
  time: string;
  text: string;
  isMe?: boolean;
  dateDivider?: string;
  reaction?: {
    emoji: string;
    count: number;
  };
  typingDuration: number;
}

const CHAT_SEQUENCE: ChatMessage[] = [
  {
    id: 1,
    sender: 'Alex',
    avatar: 'AL',
    avatarColor: 'bg-indigo-100 text-indigo-700',
    time: '2:14 PM',
    dateDivider: 'Wednesday, 2:14 PM',
    text: "Who's free for dinner this weekend? Friday or Saturday? 🍕",
    reaction: { emoji: '👀', count: 3 },
    typingDuration: 600,
  },
  {
    id: 2,
    sender: 'Maya',
    avatar: 'MK',
    avatarColor: 'bg-[#E08A63] text-white',
    time: '3:02 PM',
    text: 'Friday I have spin class until 7:30. Can we do 8:30pm in Logan Square?',
    isMe: true,
    typingDuration: 700,
  },
  {
    id: 3,
    sender: 'Sam',
    avatar: 'SB',
    avatarColor: 'bg-amber-100 text-amber-800',
    time: '4:45 PM',
    text: 'Saturday only for me! Going-away drinks Friday 🥂',
    reaction: { emoji: '🤦‍♂️', count: 2 },
    typingDuration: 650,
  },
  {
    id: 4,
    sender: 'Jordan',
    avatar: 'JS',
    avatarColor: 'bg-emerald-100 text-emerald-800',
    time: '6:12 PM',
    text: 'Logan Square is 50 mins from me 😭 Can we do West Loop?',
    reaction: { emoji: '😭', count: 4 },
    typingDuration: 700,
  },
  {
    id: 5,
    sender: 'Marcus',
    avatar: 'MR',
    avatarColor: 'bg-purple-100 text-purple-800',
    time: '11:20 AM',
    dateDivider: 'Thursday, 11:20 AM',
    text: 'Did anyone actually book a table? Everywhere is fully booked for 8.',
    reaction: { emoji: '💀', count: 5 },
    typingDuration: 750,
  },
];

const GUEST_AVATARS = [
  { name: 'Alex', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { name: 'Maya', bg: 'bg-[#E08A63]', text: 'text-white' },
  { name: 'Sam', bg: 'bg-amber-100', text: 'text-amber-800' },
  { name: 'Jordan', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { name: 'Marcus', bg: 'bg-purple-100', text: 'text-purple-800' },
  { name: 'Chloe', bg: 'bg-[#C8643F]', text: 'text-white' },
  { name: 'David', bg: 'bg-[#4C5A40]', text: 'text-white' },
  { name: 'Elena', bg: 'bg-[#6A6253]', text: 'text-white' },
];

export default function ChaosToClaritySection() {
  const [activeTab, setActiveTab] = useState<'chaos' | 'clarity'>('chaos');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Viewport-Triggered Playback: trigger when at least 35% of the section enters the viewport
  const isInView = useInView(sectionRef, { once: true, amount: 0.35 });

  // Live Chat Simulation State
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [visibleReactions, setVisibleReactions] = useState<number[]>([]);
  const [typingSender, setTypingSender] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSeenStatus, setShowSeenStatus] = useState(false);
  const [chatCompleted, setChatCompleted] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Confined Internal Container Scrolling ONLY (No window scroll hijacking)
  useEffect(() => {
    if (activeTab === 'chaos' && chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [visibleMessages, typingSender, showSeenStatus, chatCompleted, activeTab]);

  // Clear all pending chat timeouts safely
  const clearAllChatTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  // Run or replay the staggered chat engine
  const startLiveChatSequence = useCallback(() => {
    clearAllChatTimeouts();
    setVisibleMessages([]);
    setVisibleReactions([]);
    setTypingSender(null);
    setUnreadCount(0);
    setShowSeenStatus(false);
    setChatCompleted(false);

    let cumulativeDelay = 300;

    CHAT_SEQUENCE.forEach((msg) => {
      // 1. Trigger typing indicator for this sender
      const typingTimer = setTimeout(() => {
        setTypingSender(msg.sender);
      }, cumulativeDelay);
      timeoutsRef.current.push(typingTimer);

      cumulativeDelay += msg.typingDuration;

      // 2. Reveal message and hide typing indicator
      const showMsgTimer = setTimeout(() => {
        setTypingSender(null);
        setVisibleMessages((prev) => [...prev, msg.id]);
        setUnreadCount((prev) => prev + 1);
      }, cumulativeDelay);
      timeoutsRef.current.push(showMsgTimer);

      // 3. Stagger emoji reaction ~250ms after bubble arrives
      if (msg.reaction) {
        const reactionTimer = setTimeout(() => {
          setVisibleReactions((prev) => [...prev, msg.id]);
        }, cumulativeDelay + 250);
        timeoutsRef.current.push(reactionTimer);
      }

      cumulativeDelay += 500;
    });

    // 4. Reveal "Read by everyone • 3 days ago" seen status line after Marcus
    const seenTimer = setTimeout(() => {
      setShowSeenStatus(true);
    }, cumulativeDelay + 200);
    timeoutsRef.current.push(seenTimer);

    // 5. Mark chat completed (reveals native failure pill + inline CTA)
    const finishTimer = setTimeout(() => {
      setChatCompleted(true);
      setUnreadCount(43); // Final chaotic unread count
    }, cumulativeDelay + 600);
    timeoutsRef.current.push(finishTimer);
  }, [clearAllChatTimeouts]);

  // Start chat animation ONLY when scrolled into view and in chaos tab
  useEffect(() => {
    if (isInView && activeTab === 'chaos') {
      startLiveChatSequence();
    } else {
      clearAllChatTimeouts();
    }
    return () => clearAllChatTimeouts();
  }, [isInView, activeTab, startLiveChatSequence, clearAllChatTimeouts]);

  // Detect touch devices to safely disable 3D tilt
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(hover: none)').matches
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // 3D Tilt Spring Motion
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 180, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 180, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['3deg', '-3deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-3deg', '3deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section ref={sectionRef} className="pt-8 pb-14 sm:py-16 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 bg-[#EDE4D3] text-[#C8643F] border border-[#D8CEBC] text-[11px] font-bold uppercase tracking-widest px-3.5 py-1 rounded-full mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chaos to Clarity</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold font-serif-fraunces text-[#2B271F] tracking-tight leading-snug">
            Why plans fall through — and how we fix them.
          </h2>

          <p className="mt-2.5 text-sm sm:text-base text-[#6A6253] leading-relaxed">
            Stop losing 3 days to group chat scheduling paralysis. See the difference between endless texting and automated consensus.
          </p>

          {/* Interactive Mode Toggle (Rock-solid stable tabs - No jumping/flying artifacts) */}
          <div className="mt-6 inline-flex p-1.5 bg-[#EDE4D3]/90 backdrop-blur-xs rounded-2xl border border-[#D8CEBC] shadow-inner max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('chaos')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === 'chaos'
                  ? 'bg-[#FBF7EE] text-[#A63A24] border border-[#D8CEBC]/70 shadow-sm'
                  : 'text-[#6A6253] hover:text-[#2B271F] border border-transparent'
              }`}
            >
              <Flame className="w-4 h-4 text-[#C8643F]" />
              <span>The Group Chat Hell</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('clarity')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === 'clarity'
                  ? 'bg-[#FBF7EE] text-[#4C5A40] border border-[#D8CEBC]/70 shadow-sm'
                  : 'text-[#6A6253] hover:text-[#2B271F] border border-transparent'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#6E7F5E]" />
              <span>The Actually, Let&apos;s Way</span>
            </button>
          </div>
        </div>

        {/* AUTHENTIC MOBILE PHONE MOCKUP SHELL (LOCKED 390px x 640px) */}
        <div style={{ perspective: 1000 }} className="w-full max-w-[390px] mx-auto">
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX: isTouchDevice ? 0 : rotateX,
              rotateY: isTouchDevice ? 0 : rotateY,
              transformStyle: 'preserve-3d',
            }}
            className="w-full max-w-[390px] h-[640px] mx-auto rounded-[46px] border-[8px] border-stone-800 bg-[#F5EFE6] shadow-2xl flex flex-col overflow-hidden relative transition-transform duration-100 ease-out"
          >
            {/* 1. TOP PINNED CHROME: Status Bar + Dynamic Island + Chat Header */}
            <div className="sticky top-0 z-20 bg-[#F5EFE6]/95 backdrop-blur-xs border-b border-stone-200/50 pb-2 px-3 pt-2 shrink-0 select-none">
              {/* TOP STATUS BAR & DYNAMIC ISLAND */}
              <div className="w-full flex items-center justify-between px-2 mb-1.5 select-none">
                {/* Left Time */}
                <span className="text-[11px] font-semibold text-stone-700 font-mono ml-1">
                  9:41
                </span>

                {/* Centered Dynamic Island */}
                <div className="w-22 h-4.5 bg-stone-900 rounded-full flex items-center justify-end px-2 shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-700/80" />
                </div>

                {/* Right Status Icons */}
                <div className="flex items-center gap-1 text-stone-700 mr-1 text-[10px]">
                  <Signal className="w-3 h-3" />
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chat Header inside Top Pinned Chrome */}
              {activeTab === 'chaos' ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#EBDDC8] flex items-center justify-center text-xs font-bold text-[#8C4A32] shadow-xs shrink-0">
                      💀
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-serif-fraunces font-bold text-xs sm:text-sm text-[#2B271F] truncate max-w-[140px]">
                          Weekend Dinner (12)
                        </h4>
                        <span className="text-[9px] bg-[#F3DDD7] text-[#A63A24] font-bold px-1.5 py-0.2 rounded-full border border-[#E9BEB5]">
                          {unreadCount > 0 ? `${unreadCount}` : 'Live'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8C8270] flex items-center gap-1">
                        <VolumeX className="w-2.5 h-2.5 text-[#A63A24]" />
                        <span>Muted &bull; 12 members</span>
                      </p>
                    </div>
                  </div>

                  {/* Replay & Action Icons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={startLiveChatSequence}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C4A32] hover:text-[#2B271F] bg-[#EDE4D3]/80 hover:bg-[#EDE4D3] px-2 py-1 rounded-lg border border-[#D8CEBC] transition-colors cursor-pointer"
                      title="Replay chat stream"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Replay</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#E5EDE0] flex items-center justify-center text-xs font-bold text-[#4C5A40] shadow-xs shrink-0">
                      ✨
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-serif-fraunces font-bold text-xs sm:text-sm text-[#2B271F] truncate max-w-[140px]">
                          Weekend Dinner (12)
                        </h4>
                        <span className="text-[9px] bg-[#EEF4E8] text-[#4C5A40] font-bold px-1.5 py-0.2 rounded-full border border-[#C6DCB8]">
                          Locked
                        </span>
                      </div>
                      <p className="text-[10px] text-[#6E7F5E] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#6E7F5E]" />
                        <span>8 of 8 confirmed &bull; Auto-synced</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-[#4C5A40] bg-[#EEF4E8] px-2 py-0.5 rounded-md border border-[#C6DCB8]">
                      8/8
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. AUTO-SCROLLING INTERNAL MESSAGE STREAM / CONTENT FEED (OVERSCROLL-CONTAIN) */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 space-y-3 scroll-smooth no-scrollbar"
            >
              <AnimatePresence mode="wait">
                {activeTab === 'chaos' ? (
                  /* 1. DYNAMIC CHAOS LIVE CHAT STREAM */
                  <motion.div
                    key="chaos-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="space-y-2.5"
                  >
                    {!isInView && visibleMessages.length === 0 && (
                      <div className="flex items-center justify-center min-h-[260px] text-xs text-stone-400 font-medium text-center px-4">
                        <span>Scroll down to play live group chat simulation...</span>
                      </div>
                    )}

                    {CHAT_SEQUENCE.map((msg) => {
                      const isVisible = visibleMessages.includes(msg.id);
                      if (!isVisible) return null;
                      const hasReaction = visibleReactions.includes(msg.id) && msg.reaction;

                      return (
                        <div key={msg.id} className="space-y-1">
                          {/* Centered Floating Sticky Day Divider */}
                          {msg.dateDivider && (
                            <div className="w-full flex justify-center py-1 select-none">
                              <div className="sticky top-1 z-10 bg-[#F5EFE6]/90 backdrop-blur-xs py-0.5 px-2.5 rounded-full text-[10px] font-medium text-stone-400 shadow-2xs">
                                {msg.dateDivider}
                              </div>
                            </div>
                          )}

                          {msg.isMe ? (
                            /* Outgoing message (Maya) */
                            <div className="flex items-end justify-end max-w-[85%] self-end ml-auto w-full">
                              <div className="flex flex-col items-end max-w-full">
                                <div className="relative w-fit px-3.5 py-2 rounded-2xl rounded-tr-xs bg-[#6E7F5E] text-stone-50 text-xs sm:text-[13px] shadow-xs ml-auto leading-relaxed">
                                  <span>{msg.text}</span>
                                  <span className="text-[9px] opacity-70 ml-1.5 inline-block float-right mt-1 select-none text-stone-200">
                                    {msg.time}
                                  </span>

                                  {hasReaction && msg.reaction && (
                                    <div className="absolute -bottom-2 right-2 bg-[#FAF7F0] border border-[#D8CEBC] rounded-full px-1.5 py-0.2 text-[9px] flex items-center gap-0.5 shadow-xs">
                                      <span>{msg.reaction.emoji}</span>
                                      <span className="font-bold text-[#6A6253] text-[8px]">{msg.reaction.count}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Incoming messages */
                            <div className="flex items-end gap-2 max-w-[85%] self-start w-full">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5 select-none font-bold text-[10px] shadow-2xs ${msg.avatarColor}`}
                                title={msg.sender}
                              >
                                {msg.avatar}
                              </div>

                              <div className="flex flex-col items-start max-w-full">
                                <span className="text-[10px] font-semibold text-stone-500 mb-0.5 ml-1">
                                  {msg.sender}
                                </span>

                                <div className="relative w-fit px-3.5 py-2 rounded-2xl rounded-tl-xs bg-[#FAF7F0] border border-[#E4DBD0] text-stone-800 text-xs sm:text-[13px] shadow-xs leading-relaxed">
                                  <span>{msg.text}</span>
                                  <span className="text-[9px] opacity-70 ml-1.5 inline-block float-right mt-1 select-none text-stone-400">
                                    {msg.time}
                                  </span>

                                  {hasReaction && msg.reaction && (
                                    <div className="absolute -bottom-2 right-2 bg-[#FAF7F0] border border-[#D8CEBC] rounded-full px-1.5 py-0.2 text-[9px] flex items-center gap-0.5 shadow-xs">
                                      <span>{msg.reaction.emoji}</span>
                                      <span className="font-bold text-[#6A6253] text-[8px]">{msg.reaction.count}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Clean Typing Indicator with Avatar */}
                    {typingSender && (
                      <div className="flex items-end gap-2 max-w-[85%] self-start w-full pt-0.5">
                        {(() => {
                          const typingMsg = CHAT_SEQUENCE.find((m) => m.sender === typingSender);
                          return (
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5 select-none font-bold text-[10px] shadow-2xs ${typingMsg?.avatarColor || 'bg-stone-200 text-stone-700'}`}
                            >
                              {typingMsg?.avatar || typingSender.slice(0, 2).toUpperCase()}
                            </div>
                          );
                        })()}
                        <div className="w-fit max-w-[80%] px-3 py-1.5 rounded-2xl rounded-tl-xs bg-[#FAF7F0] border border-[#E4DBD0] flex items-center gap-1.5 shadow-xs">
                          <span className="text-[10px] text-stone-500 font-medium">
                            {typingSender} is typing
                          </span>
                          <div className="flex items-center gap-0.5">
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                              className="w-1.2 h-1.2 rounded-full bg-[#C8643F]"
                            />
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                              className="w-1.2 h-1.2 rounded-full bg-[#C8643F]"
                            />
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                              className="w-1.2 h-1.2 rounded-full bg-[#C8643F]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* The "Seen By" Status Line */}
                    {showSeenStatus && (
                      <div className="flex items-center justify-end gap-1 text-[9px] text-stone-400 pt-0.5 pr-2">
                        <CheckCheck className="w-3 h-3 text-stone-400" />
                        <span>Read by everyone &bull; 3 days ago</span>
                      </div>
                    )}

                    {/* Failure State: Native Centered System Pill + Centered Transition CTA */}
                    {chatCompleted && (
                      <div className="pt-2 space-y-2 pb-1">
                        {/* Centered Failure Pill */}
                        <div className="w-full flex justify-center py-1 select-none">
                          <div className="text-[10px] font-medium text-stone-600 bg-stone-200/70 border border-stone-300/50 px-3 py-0.8 rounded-full shadow-xs flex items-center gap-1">
                            <span>❌ Table lost &bull; Plan abandoned after 72h of texting</span>
                          </div>
                        </div>

                        {/* Interactive Transition CTA */}
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => setActiveTab('clarity')}
                            className="inline-flex items-center gap-1.5 bg-[#2B271F] hover:bg-[#C8643F] text-[#FBF7EE] text-[11px] font-bold px-3.5 py-1.5 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-[#E08A63]" />
                            <span>Fix this with Actually, Let&apos;s</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* 2. "ACTUALLY, LET'S" RICH CHAT UNFURL VIEW */
                  <motion.div
                    key="clarity-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="space-y-3"
                  >
                    {/* 1. Link Drop Bubble from Alex with Avatar (The Hook) */}
                    <div className="flex items-end gap-2 max-w-[85%] self-start w-full">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mb-0.5 select-none font-bold text-[10px] shadow-2xs">
                        AL
                      </div>
                      <div className="flex flex-col items-start max-w-full">
                        <span className="text-[10px] font-semibold text-stone-500 mb-0.5 ml-1">
                          Alex &bull; Wednesday 2:15 PM
                        </span>
                        <div className="w-fit px-3.5 py-2 rounded-2xl rounded-tl-xs bg-[#FAF7F0] border border-[#E4DBD0] text-stone-800 text-xs shadow-xs flex items-center gap-1.5 flex-wrap leading-relaxed">
                          <span>Actually, let&apos;s just simplify this without 50 texts:</span>
                          <span className="font-bold text-[#C8643F] underline underline-offset-2 flex items-center gap-1">
                            actuallylets.com/plan/dinner
                            <ExternalLink className="w-3 h-3 inline" />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Autonomous Consensus Pass (The Result) */}
                    <div className="bg-[#FAF7F0] border border-[#6E7F5E]/40 rounded-2xl p-3 shadow-xs space-y-2.5 w-full mx-0">
                      {/* Eyebrow Badge & Event Title */}
                      <div className="border-b border-[#D8CEBC]/60 pb-2 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#4C5A40] bg-[#EEF4E8] border border-[#C6DCB8] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <Zap className="w-2.5 h-2.5 text-[#6E7F5E]" />
                            AUTONOMOUS CONSENSUS PASS
                          </span>
                          <span className="inline-flex items-center gap-0.5 bg-[#EEF4E8] text-[#4C5A40] border border-[#C6DCB8] text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            <Sparkles className="w-2.5 h-2.5 text-[#6E7F5E]" />
                            Auto-Locked
                          </span>
                        </div>
                        <h3 className="font-serif-fraunces font-bold text-xs sm:text-sm text-[#2B271F] leading-tight">
                          West Loop Rooftop &amp; Social Dinner
                        </h3>
                        <p className="text-[10px] text-[#6A6253] leading-snug">
                          Set it &amp; forget it &bull; Locked automatically once consensus was reached
                        </p>
                      </div>

                      {/* Smart Match Pills */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <div className="bg-[#FFFFFF] border border-[#D8CEBC]/80 rounded-lg px-2 py-1 flex items-center gap-1.5 text-[11px] text-[#2B271F] shadow-2xs">
                            <Clock className="w-3 h-3 text-[#C8643F] shrink-0" />
                            <span className="font-semibold truncate">Friday, Oct 24 &bull; 7:45 PM</span>
                          </div>

                          <div className="bg-[#FFFFFF] border border-[#D8CEBC]/80 rounded-lg px-2 py-1 flex items-center gap-1.5 text-[11px] text-[#2B271F] shadow-2xs">
                            <MapPin className="w-3 h-3 text-[#4C5A40] shrink-0" />
                            <span className="font-semibold truncate">Aba Rooftop (West Loop)</span>
                          </div>
                        </div>

                        <div className="bg-[#FFFFFF] border border-[#D8CEBC]/80 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#4C5A40] shadow-2xs">
                          <Target className="w-3 h-3 text-[#6E7F5E] shrink-0" />
                          <span className="font-medium truncate">Solved 4 schedule &amp; distance conflicts automatically</span>
                        </div>
                      </div>

                      {/* Overlapping 8/8 Avatar Strip with Checkmarks */}
                      <div className="bg-[#FFFFFF] border border-[#D8CEBC]/80 rounded-lg p-1.5 flex items-center justify-between gap-1.5">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {GUEST_AVATARS.map((guest, idx) => (
                            <div
                              key={idx}
                              className={`inline-block h-5 w-5 rounded-full ring-1.5 ring-white ${guest.bg} ${guest.text} text-[7px] font-bold flex items-center justify-center relative shadow-2xs`}
                              title={guest.name}
                            >
                              <span>{guest.name.slice(0, 2).toUpperCase()}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] font-bold text-[#4C5A40] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#6E7F5E]" />
                          <span>8 of 8 confirmed in 30 seconds</span>
                        </p>
                      </div>
                    </div>

                    {/* Centered Follow-Up System Message */}
                    <div className="w-full flex justify-center py-0.5 select-none">
                      <div className="text-[10px] text-stone-600 bg-[#6E7F5E]/10 border border-[#6E7F5E]/20 px-2.5 py-0.8 rounded-full flex items-center gap-1 shadow-2xs">
                        <Zap className="w-2.5 h-2.5 text-[#6E7F5E]" />
                        <span>Calendar invites synced &bull; Table reserved</span>
                      </div>
                    </div>

                    {/* 3-Step "Set It & Forget It" Workflow Strip */}
                    <div className="grid grid-cols-3 gap-2 w-full my-2.5">
                      {/* Card 1 */}
                      <div className="bg-[#FAF7F0] border border-[#D8CEBC] rounded-xl p-2 shadow-2xs flex flex-col justify-between">
                        <div className="w-4.5 h-4.5 rounded-md bg-[#EDE4D3] text-[#C8643F] flex items-center justify-center mb-1">
                          <Link2 className="w-2.5 h-2.5" />
                        </div>
                        <div>
                          <h5 className="text-[10px] font-bold text-[#2B271F] leading-tight">1. Drop One Link</h5>
                          <p className="text-[9px] text-[#6A6253] leading-tight mt-0.5">
                            Zero logins, apps, or friction
                          </p>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="bg-[#FAF7F0] border border-[#D8CEBC] rounded-xl p-2 shadow-2xs flex flex-col justify-between">
                        <div className="w-4.5 h-4.5 rounded-md bg-[#E5EDE0] text-[#4C5A40] flex items-center justify-center mb-1">
                          <Cpu className="w-2.5 h-2.5" />
                        </div>
                        <div>
                          <h5 className="text-[10px] font-bold text-[#2B271F] leading-tight">2. Auto-Consensus</h5>
                          <p className="text-[9px] text-[#6A6253] leading-tight mt-0.5">
                            Finds true group overlap instantly
                          </p>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="bg-[#FAF7F0] border border-[#D8CEBC] rounded-xl p-2 shadow-2xs flex flex-col justify-between">
                        <div className="w-4.5 h-4.5 rounded-md bg-[#E5EDE0] text-[#6E7F5E] flex items-center justify-center mb-1">
                          <CalendarDays className="w-2.5 h-2.5" />
                        </div>
                        <div>
                          <h5 className="text-[10px] font-bold text-[#2B271F] leading-tight">3. Set It &amp; Forget It</h5>
                          <p className="text-[9px] text-[#6A6253] leading-tight mt-0.5">
                            Locks &amp; syncs to calendars live
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. BOTTOM PINNED CHROME: Chat Input Dock / Action Dock + 3-Column Metric Bar + Home Swipe Pill */}
            <div className="sticky bottom-0 z-20 bg-[#F5EFE6]/95 backdrop-blur-xs border-t border-stone-200/50 pt-2 pb-2.5 px-3 shrink-0">
              {/* Native Chat Composer / Action Dock */}
              {activeTab === 'chaos' ? (
                <div className="flex items-center gap-1.5 mb-2 bg-[#FAF5EC] border border-[#E4DBD0] rounded-full px-2.5 py-1.5 shadow-2xs w-full">
                  <Smile className="w-4 h-4 text-stone-400 shrink-0 select-none" />
                  <div className="text-stone-400 text-[11px] sm:text-xs flex-1 font-normal select-none truncate">
                    Type a message...
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#C8643F] text-white flex items-center justify-center shrink-0 shadow-2xs select-none">
                    <Send className="w-3 h-3 translate-x-px" />
                  </div>
                </div>
              ) : (
                <div className="mb-2 w-full">
                  <div className="bg-[#6E7F5E] text-stone-50 text-xs font-semibold py-1.5 px-4 rounded-full text-center shadow-xs flex items-center justify-center gap-1.5 select-none w-full">
                    <Sparkles className="w-3.5 h-3.5 text-[#E5EDE0]" />
                    <span>✨ RSVP Confirmed &bull; Calendar Synced (8/8)</span>
                  </div>
                </div>
              )}

              {/* Unified Divide-X Metric Bar */}
              {activeTab === 'chaos' ? (
                <div className="grid grid-cols-3 divide-x divide-stone-300/60 bg-stone-100/70 rounded-xl border border-stone-200/60 py-1.5 px-1 text-center w-full mx-0">
                  <div>
                    <p className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider">
                      EFFORT
                    </p>
                    <p className="text-xs font-bold text-stone-800 mt-0.5">
                      43 Messages
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider">
                      MATCH
                    </p>
                    <p className="text-xs font-bold text-stone-800 mt-0.5">
                      0% Consensus
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider">
                      OUTCOME
                    </p>
                    <p className="text-xs font-bold text-rose-600 mt-0.5">
                      Abandoned
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 divide-x divide-stone-300/60 bg-stone-100/70 rounded-xl border border-stone-200/60 py-1.5 px-1 text-center w-full mx-0">
                  <div>
                    <p className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider">
                      EFFORT
                    </p>
                    <p className="text-xs font-bold text-stone-800 mt-0.5">
                      0 Minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider">
                      MATCH
                    </p>
                    <p className="text-xs font-bold text-stone-800 mt-0.5">
                      8 / 8 Confirmed
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider">
                      OUTCOME
                    </p>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                      Locked &amp; Booked
                    </p>
                  </div>
                </div>
              )}

              {/* BOTTOM HOME SWIPE INDICATOR */}
              <div className="w-28 h-1 bg-stone-400/60 rounded-full mx-auto mt-2 select-none" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}



