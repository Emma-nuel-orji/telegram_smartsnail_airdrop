"use client";

import WebApp from "@twa-dev/sdk";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Clock, Zap, Star, Trophy, Crown, Dumbbell, MapPin, ChevronLeft, UserPlus, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import PartnerProgress from "./PartnerProgress";

const GYM_BACKGROUND = "/images/bk.jpg";

export default function GymSubscriptions() {
  const searchParams = useSearchParams();
  const gymId = searchParams?.get('gymId') || '1';
  const gymName = searchParams?.get('gymName') || 'Partner Gym';
  
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [shells, setShells] = useState<number>(0);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (userId) setTelegramId(userId);
  }, []);

  useEffect(() => {
    if (!telegramId) return;
    async function fetchData() {
      try {
        const userRes = await fetch(`/api/user/${telegramId}`);
        const user = await userRes.json();
        if (user.nickname && user.name) setIsRegistered(true);
        setShells(Number(user.points));

        const subsRes = await fetch(`/api/services?partnerType=GYM&type=SUBSCRIPTION&gymId=${gymId}`);
        setSubscriptions(await subsRes.json());

        const res = await fetch(`/api/subscription/${telegramId}?gymId=${gymId}`);
        if (res.ok) {
          const subData = await res.json();
          if (subData.status === 'APPROVED') setActiveSub(subData);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    fetchData();
  }, [telegramId, gymId]);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <span className="text-blue-500 font-black italic uppercase tracking-tighter">Syncing Snail Pass...</span>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-blue-500">
      <Toaster position="top-center" />
      
      {/* --- REGISTRATION LOCK (COOL OVERLAY) --- */}
      {!isRegistered && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-8 backdrop-blur-xl">
          <div className="w-full max-w-sm bg-zinc-900/50 border border-zinc-800 p-8 rounded-[3rem] text-center shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-3xl mx-auto mb-6 flex items-center justify-center rotate-12 shadow-lg shadow-blue-500/20">
              <UserPlus className="text-white w-10 h-10 -rotate-12" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Access Denied</h2>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Your digital signature is missing. Complete your profile in the bot to unlock the gym vault.</p>
            <button 
              onClick={() => WebApp.close()} 
              className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase text-xs tracking-[0.2em] hover:bg-zinc-200 transition-all"
            >
              Initialize Profile
            </button>
          </div>
        </div>
      )}

      {/* --- DYNAMIC HEADER --- */}
      <div className="relative h-64 w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-[2px] opacity-40"
          style={{ backgroundImage: `url(${GYM_BACKGROUND})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        
        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <Link href="/gym" className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl">
              <ChevronLeft size={20} />
            </Link>
            <div className="px-4 py-2 bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-full flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Verified Member</span>
            </div>
          </div>

          <div className="pb-4">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
              {activeSub ? "Level Up" : "Snail Pass"}
            </h1>
            <div className="flex items-center gap-2 mt-2 opacity-60">
              <MapPin size={12} />
              <span className="text-xs font-bold uppercase tracking-widest">{decodeURIComponent(gymName)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 pb-20 -mt-8">
        {/* --- SHELLS WIDGET --- */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-4 rounded-3xl mb-8 flex items-center justify-between shadow-xl">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20 text-lg">🐚</div>
              <div>
                <span className="block text-[10px] text-zinc-500 font-black uppercase tracking-[0.1em]">Your Credits</span>
                <span className="text-xl font-black text-yellow-400">{shells.toLocaleString()} <span className="text-[10px] text-zinc-400 uppercase tracking-widest ml-1">Shells</span></span>
              </div>
           </div>
           <div className="h-10 w-[1px] bg-zinc-800" />
           <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400">Top Up +</button>
        </div>

        {/* --- ACTIVE CALENDAR (Appears only if Subscribed) --- */}
        {activeSub && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PartnerProgress sub={activeSub} />
            <div className="mt-4 bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-2xl flex items-center justify-between">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Plan: {activeSub.name}</span>
               <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active Access</span>
            </div>
          </div>
        )}

        {/* --- MEMBERSHIP PLANS GRID (Hidden if Subscribed) --- */}
        {!activeSub && (
          <>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 mb-6 text-center italic">Available Contracts</h2>
            <div className="grid grid-cols-1 gap-4">
              {subscriptions.map((sub) => (
                <div 
                  key={sub.id}
                  className="group relative bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] overflow-hidden hover:border-blue-500/50 transition-all active:scale-95 duration-300"
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                         <Dumbbell size={24} />
                       </div>
                       <div>
                         <h3 className="font-black italic uppercase tracking-tight text-lg">{sub.name}</h3>
                         <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{sub.duration} Access</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="block text-xl font-black italic">{sub.priceShells.toLocaleString()}</span>
                       <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Shells</span>
                    </div>
                  </div>
                  
                  <button 
                    className="w-full mt-6 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all"
                    onClick={() => console.log('Purchase logic here')}
                  >
                    Initiate Contract
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}