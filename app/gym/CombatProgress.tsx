"use client";

import React from 'react';
import { Check, Skull, Clock } from 'lucide-react';

interface CombatProgressProps {
  sub: {
    startDate: string;
    trainingDays: number[]; // e.g., [1, 3, 5]
    planTitle: string;
  };
  needsSchedule: boolean;
}

export default function CombatProgress({ sub, needsSchedule }: CombatProgressProps) {
  const totalDays = 31; // Displays a full month view
  const today = new Date();
  const start = new Date(sub.startDate);

  // --- STATE: PAID BUT NO SCHEDULE YET ---
  if (needsSchedule) {
    return (
      <div className="w-full bg-zinc-900/40 border border-dashed border-orange-500/30 rounded-[2.5rem] p-10 text-center backdrop-blur-md">
        <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
          <Clock className="text-orange-500 animate-pulse" size={32} />
        </div>
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Initializing...</h3>
        <p className="text-zinc-500 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold leading-relaxed">
          Waiting for Sage Admin to <br /> sync your training days.
        </p>
      </div>
    );
  }

  // --- STATE: ACTIVE TRAINING GRID ---
  return (
    <div className="w-full bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-6 backdrop-blur-md border-t-orange-500/40 shadow-2xl shadow-orange-950/20">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-[0_0_12px_#ea580c]" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block leading-none">Sage Combat</span>
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">Verified Fighter</span>
          </div>
        </div>
        <Skull size={18} className="text-orange-600 opacity-80" />
      </div>

      <div className="grid grid-cols-7 gap-2.5">
        {[...Array(totalDays)].map((_, i) => {
          const slotDate = new Date(start);
          slotDate.setDate(start.getDate() + i);
          
          const dayOfWeek = slotDate.getDay();
          const isTrainingDay = sub.trainingDays.includes(dayOfWeek);
          const isPassed = slotDate <= today;
          const isToday = slotDate.toDateString() === today.toDateString();

          return (
            <div 
              key={i}
              className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all duration-700 relative overflow-hidden
                ${isTrainingDay && isPassed 
                  ? 'bg-orange-600/20 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.15)]' 
                  : isTrainingDay
                  ? 'bg-zinc-800/40 border-orange-600/30 text-zinc-500' // Future training day
                  : 'bg-black/40 border-zinc-900/50 text-zinc-800'} 
                ${isToday && isTrainingDay ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-black' : ''}
              `}
            >
              {/* Day Number (Tiny) */}
              <span className="absolute top-1 left-1 text-[7px] font-bold opacity-40">
                {slotDate.getDate()}
              </span>

              {/* Main Icon Logic */}
              {isTrainingDay ? (
                isPassed ? (
                  <Check size={14} strokeWidth={4} className="drop-shadow-[0_0_5px_rgba(234,88,12,0.5)]" />
                ) : (
                  <span className="text-[8px] font-black italic tracking-tighter opacity-60">FIGHT</span>
                )
              ) : (
                <div className="w-1 h-1 rounded-full bg-zinc-800" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-800/50 flex justify-center items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Training</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Rest</span>
        </div>
      </div>
    </div>
  );
}