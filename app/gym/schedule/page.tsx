"use client";
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Calendar, ChevronLeft, Award } from 'lucide-react';
import Link from 'next/link';

export default function SchedulePage() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const userId = webApp?.initDataUnsafe?.user?.id;
    
    if (userId) {
      fetch(`/api/gym/subscription/${userId}`)
        .then(res => res.json())
        .then(data => {
          setSub(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const calculateAutoChecks = (startDate: string, maxClasses: number) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const predictedSessions = Math.floor(diffDays / 2.33);
    return Math.min(predictedSessions, maxClasses); 
  };

  const totalBoxes = sub?.totalClasses || 0;
  const autoChecked = sub ? calculateAutoChecks(sub.startDate, totalBoxes) : 0;

  // Function to get Month Name for the labels
  const getMonthLabel = (startDate: string, monthOffset: number) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + monthOffset);
    return date.toLocaleString('default', { month: 'long' });
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 italic">Synchronizing Fight Camp...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-20">
      <header className="flex items-center gap-4 mb-8">
        <Link href="/gym/sagecombat"><ChevronLeft /></Link>
        <h1 className="text-2xl font-black uppercase italic">Training Progress</h1>
      </header>

      {sub ? (
        <div className="space-y-10">
          {/* Loop through 12-class chunks (1 month = 12 sessions at 3x per week) */}
          {[...Array(Math.ceil(totalBoxes / 12))].map((_, monthIndex) => (
            <div key={monthIndex} className="relative">
              {/* Monthly Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 bg-blue-500 rounded-full" />
                  <h3 className="text-sm font-black uppercase italic tracking-widest text-white">
                    {getMonthLabel(sub.startDate, monthIndex)}
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  Phase {monthIndex + 1}
                </span>
              </div>

              {/* Punch Card Grid for this month */}
              <div className="bg-zinc-900/40 p-5 rounded-[2rem] border border-zinc-800/50 grid grid-cols-4 gap-3">
                {[...Array(12)].map((_, i) => {
                  const globalIndex = (monthIndex * 12) + i;
                  if (globalIndex >= totalBoxes) return null; // Don't show boxes beyond the plan total

                  const isChecked = globalIndex < autoChecked;
                  return (
                    <div 
                      key={globalIndex} 
                      className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                        isChecked 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5' 
                          : 'border-zinc-800 bg-black/20 text-zinc-800'
                      }`}
                    >
                      {isChecked ? (
                        <ShieldCheck size={18} className="text-blue-500" />
                      ) : (
                        <span className="font-black text-[10px]">{globalIndex + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Reward Section if finished */}
          {autoChecked >= totalBoxes && (
             <div className="bg-blue-600 p-6 rounded-[2rem] text-center shadow-xl shadow-blue-900/20">
                <Award className="mx-auto mb-2 text-white" size={32} />
                <h4 className="font-black uppercase italic">Course Completed!</h4>
                <p className="text-[10px] text-blue-100 font-bold uppercase mt-1">Visit the desk for your certificate</p>
             </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
             <Calendar className="text-zinc-700" size={24} />
          </div>
          <h2 className="text-zinc-500 font-black uppercase italic">No Active Camp</h2>
          <p className="text-zinc-700 text-[10px] font-bold mt-2 px-10 leading-relaxed uppercase">
            Enroll in a plan to track your fight progress.
          </p>
          <Link href="/gym/sagecombat" className="mt-6 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase text-blue-500">
             View Plans
          </Link>
        </div>
      )}

      {sub && (
        <div className="fixed bottom-6 left-6 right-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-3xl flex justify-between items-center shadow-2xl">
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">Current Progress</p>
            <p className="text-lg font-black italic">{Math.floor((autoChecked / totalBoxes) * 100)}% COMPLETE</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-blue-500 font-black uppercase">{autoChecked} / {totalBoxes}</p>
             <p className="text-[10px] text-zinc-600 font-bold uppercase italic">Sessions</p>
          </div>
        </div>
      )}
    </div>
  );
}