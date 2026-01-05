'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

/* ---------------- TYPES ---------------- */

type TrainingPlan = {
  title: string;
  frequency: string;
  duration: string;
  totalSessions: number;
  price: number;
};

/* ---------------- MOCK DATA (replace with API later) ---------------- */

// Example: someone already paid
const USER_PLAN = {
  totalSessions: 48,
  usedSessions: 8,
  nextSessionAt: new Date(Date.now() + 1000 * 60 * 60 * 26), // 26 hours from now
};

// If user has NOT paid, show plans
const PLANS: TrainingPlan[] = [
  {
    title: 'Group Classes',
    frequency: 'Mon • Wed • Fri (8–10am)',
    duration: '6 Months',
    totalSessions: 72,
    price: 100000,
  },
  {
    title: '1 on 1 Coaching',
    frequency: 'Custom Schedule',
    duration: '6 Months',
    totalSessions: 48,
    price: 200000,
  },
  {
    title: 'Custom Plan',
    frequency: 'Personalized Deal',
    duration: 'Flexible',
    totalSessions: 48,
    price: 100000,
  },
];

/* ---------------- HELPERS ---------------- */

const getTimeRemaining = (date: Date) => {
  const diff = +date - +new Date();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

/* ---------------- COMPONENT ---------------- */

export default function sagecombat() {
  const [timer, setTimer] = useState<string>('Calculating...');
  const { usedSessions, totalSessions, nextSessionAt } = USER_PLAN;
  const remainingSessions = totalSessions - usedSessions;

  /* Countdown logic */
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(nextSessionAt);
      if (!remaining) {
        setTimer('Session ongoing or completed');
        clearInterval(interval);
      } else {
        setTimer(
          `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hasActivePlan = totalSessions > 0;

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6 space-y-6">

      {/* HEADER */}
      <h1 className="text-2xl font-black uppercase tracking-tight">
        Boxing Classes
      </h1>

      {/* COUNTDOWN */}
      {hasActivePlan && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <p className="text-xs uppercase text-zinc-500 font-bold mb-2">
            Next Session Starts In
          </p>
          <p className="text-3xl font-black text-yellow-400 tabular-nums">
            {timer}
          </p>
        </div>
      )}

      {/* SESSION TRACKER */}
      {hasActivePlan && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-zinc-400 uppercase text-xs font-bold tracking-widest">
              Training Progress
            </h3>
            <span className="text-2xl font-black">
              {usedSessions}
              <span className="text-zinc-600 text-sm">/{totalSessions}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Array.from({ length: totalSessions }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                className={`w-6 h-6 rounded-md flex items-center justify-center ${
                  i < usedSessions
                    ? 'bg-yellow-400 text-black'
                    : 'bg-zinc-800 border border-zinc-700'
                }`}
              >
                {i < usedSessions && <Check size={14} strokeWidth={3} />}
              </motion.div>
            ))}
          </div>

          <p className="mt-4 text-xs text-zinc-500 italic">
            Used: {usedSessions} sessions • Remaining: {remainingSessions}
          </p>
        </div>
      )}

      {/* PLANS (only if no active plan) */}
      {!hasActivePlan && (
        <div className="space-y-4">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`p-6 rounded-3xl border-2 ${
                plan.title === 'Group Classes'
                  ? 'border-yellow-400 bg-zinc-900'
                  : 'border-zinc-800 bg-zinc-900/60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  {plan.title === 'Group Classes' && (
                    <span className="text-yellow-400 text-[10px] font-bold uppercase">
                      Recommended
                    </span>
                  )}
                  <h2 className="text-2xl font-black uppercase italic">
                    {plan.title}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    ₦{plan.price.toLocaleString()}
                  </p>
                  <p className="text-zinc-500 text-xs">Total</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="bg-zinc-800 p-2 rounded-lg">
                  🥊 {plan.frequency}
                </div>
                <div className="bg-zinc-800 p-2 rounded-lg">
                  📅 {plan.duration}
                </div>
              </div>

              {plan.title === 'Custom Plan' && (
                <p className="mt-3 text-xs text-zinc-500">
                  Personalized schedules, exclusive availability & extended timelines.
                </p>
              )}

              <button className="w-full mt-6 py-3 bg-white text-black font-black uppercase rounded-xl active:scale-95 transition-transform">
                Select Plan
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
