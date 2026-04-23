"use client";

import React from 'react';
import { Check, Flame, Trophy } from 'lucide-react';

interface GymSub {
  duration: string;
   startDate: string; 
  name: string;
}

export default function PartnerProgress({ sub }: { sub: GymSub }) {
  
  // Helper to turn "1 Month" into 30, etc.
const parseDuration = (duration: string): number => {
  // 1. Convert everything to lowercase to ignore "M" vs "m"
  const d = duration?.toLowerCase() || "";
  
  // 2. Use .includes() to ignore the "s" at the end
  if (d.includes("year")) return 365;
  if (d.includes("6 month")) return 180;
  if (d.includes("3 month")) return 90;
  if (d.includes("1 month")) return 30;
  if (d.includes("week")) return 7;
  if (d.includes("day") || d.includes("session")) return 1;
  
  return 30; // Fallback
};

  const calculateProgress = (approvedAt: string) => {
    const start = new Date(approvedAt);
    const now = new Date();
    // Calculate difference in days
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const totalDays = parseDuration(sub.duration);
  const daysPassed = calculateProgress(sub.startDate); 
  const percentage = Math.min(100, Math.round((daysPassed / totalDays) * 100));

  return (
    <div className="w-full bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-6 backdrop-blur-md shadow-2xl">
      {/* Header Stats */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame size={16} className="text-orange-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Training Streak</span>
          </div>
          <h3 className="text-2xl font-black italic uppercase tracking-tighter">
            Day {daysPassed < totalDays ? daysPassed + 1 : totalDays} <span className="text-zinc-700 text-lg">/ {totalDays}</span>
          </h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 block mb-1">{percentage}% Complete</span>
          <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* The Cyber Grid */}
      <div className="grid grid-cols-7 gap-2">
        {[...Array(totalDays)].map((_, i) => {
          const isCompleted = i < daysPassed;
          const isCurrent = i === daysPassed;

          return (
            <div 
              key={i}
              className={`
                relative aspect-square rounded-xl border transition-all duration-500 flex items-center justify-center
                ${isCompleted 
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' 
                  : isCurrent 
                  ? 'bg-white/5 border-white animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                  : 'bg-black/40 border-zinc-800 text-zinc-700'}
              `}
            >
              {isCompleted ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                <span className="text-[9px] font-black">{i + 1}</span>
              )}
              
              {/* Special Icon for last day */}
              {i === totalDays - 1 && (
                <Trophy 
                  size={10} 
                  className={`absolute -top-1 -right-1 ${isCompleted ? 'text-yellow-500' : 'text-zinc-800'}`} 
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]" />
          <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Attendance Recorded</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-800" />
          <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Upcoming</span>
        </div>
      </div>
    </div>
  );
}