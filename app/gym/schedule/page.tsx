"use client";
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Calendar, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function SchedulePage() {
  const [sub, setSub] = useState<any>(null);
  const isAdmin = typeof window !== 'undefined' && window.Telegram?.WebApp.initDataUnsafe?.user?.id.toString() === "795571382";

  // Dummy logic for "Auto-Checking" boxes based on date
  const calculateAutoChecks = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Assume 3 sessions per week (1 session every 2.3 days)
    return Math.min(Math.floor(diffDays / 2.3), 12); 
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex items-center gap-4 mb-8">
        <Link href="/gym/sagecombat"><ChevronLeft /></Link>
        <h1 className="text-2xl font-black uppercase italic">Training Progress</h1>
      </header>

      {/* PUNCH CARD GRID */}
      <div className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-2">
             <Calendar size={16} className="text-blue-400" />
             <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Current Plan: 3 Months</span>
           </div>
           <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-black">ACTIVE</span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[...Array(12)].map((_, i) => {
            const isChecked = i < 5; // Replace '5' with your auto-calculation logic
            return (
              <div 
                key={i} 
                className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all ${
                  isChecked ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10' : 'border-zinc-800 bg-black/50 text-zinc-700'
                }`}
              >
                {isChecked ? <ShieldCheck size={20} /> : <span className="font-black text-sm">{i + 1}</span>}
              </div>
            );
          })}
        </div>
      </div>
      
      <p className="mt-6 text-center text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
        Boxes check automatically based on your start date
      </p>
    </div>
  );
}