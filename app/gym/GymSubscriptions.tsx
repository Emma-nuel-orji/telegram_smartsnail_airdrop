"use client";

import WebApp from "@twa-dev/sdk";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Clock, Zap, Star, Trophy, Crown, Dumbbell, MapPin, ChevronLeft, UserPlus, ShieldCheck, Loader2 } from "lucide-react";
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
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // NEW: Dynamic Admin State
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
    if (userId) setTelegramId(userId);
  }, []);

  useEffect(() => {
    if (!telegramId) return;
    async function fetchData() {
      try {
        // 1. Fetch User Profile & Permissions
        const userRes = await fetch(`/api/user/${telegramId}`);
        const userData = await userRes.json();
        
        // Dynamic Check: Is this person a registered user?
        if (userData.nickname && userData.name) setIsRegistered(true);
        
        // Dynamic Check: Is this person an Admin in the DB?
        // (Assuming your /api/user endpoint returns a 'permissions' array from the Admin model)
        if (userData.permissions?.includes('SUPERADMIN') || userData.permissions?.includes('GYM_ADMIN')) {
          setIsAdmin(true);
        }

        setShells(Number(userData.points || 0));

        // 2. Fetch Available Plans
        const subsRes = await fetch(`/api/services?partnerType=GYM&type=SUBSCRIPTION&gymId=${gymId}`);
        setSubscriptions(await subsRes.json());

        // 3. Check for Active Subscription
        const res = await fetch(`/api/subscription/${telegramId}?gymId=${gymId}`);
        if (res.ok) {
          const subData = await res.json();
          if (subData && subData.status === 'ACTIVE') {
            setActiveSub(subData);
          }
        }
      } catch (err) { 
        console.error("Fetch Error:", err); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchData();
  }, [telegramId, gymId]);

  // DYNAMIC ACCESS: If they are registered OR they are an admin, let them in.
  const hasAccess = isRegistered || isAdmin;

  const handlePurchase = async (plan: any) => {
    if (shells < Number(plan.priceShells)) {
      return toast.error("Insufficient Shells! 🐚");
    }

    const confirmPurchase = confirm(`Enroll in ${plan.name}?`);
    if (!confirmPurchase) return;

    setPurchasing(plan.id);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: telegramId,
          serviceId: plan.id,
          planTitle: plan.name,
          duration: plan.duration,
          planType: "GYM",
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success("🏋️ Access granted.");
        window.location.reload();
      }
    } catch (error) {
      toast.error("Error connecting to vault.");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
      <span className="text-blue-500 font-black italic uppercase tracking-tighter">Verifying Credentials...</span>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#050505] text-white">
      <Toaster position="top-center" />
      
      {/* --- DYNAMIC REGISTRATION LOCK --- */}
      {!hasAccess && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-8 backdrop-blur-xl">
          <div className="w-full max-w-sm bg-zinc-900/50 border border-zinc-800 p-8 rounded-[3rem] text-center">
            <UserPlus className="text-blue-500 w-16 h-16 mx-auto mb-6" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Access Denied</h2>
            <p className="text-zinc-500 text-sm mb-8">Complete your profile in the bot to unlock the gym vault.</p>
            <button onClick={() => WebApp.close()} className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase text-xs">
              Initialize Profile
            </button>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${GYM_BACKGROUND})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505]" />
        
        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <Link href="/gym" className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl">
              <ChevronLeft size={20} />
            </Link>
            
            {/* DYNAMIC CLOCK ICON: Only visible if the DB says they are an Admin */}
            {isAdmin && (
              <Link href="/gym/manager" className="p-3 bg-blue-600/20 backdrop-blur-md border border-blue-500/50 rounded-2xl hover:bg-blue-600 transition-all">
                <Clock size={20} className="text-blue-400" />
              </Link>
            )}
          </div>

          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter">
              {activeSub ? "Level Up" : "Snail Pass"}
            </h1>
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">{decodeURIComponent(gymName)}</span>
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

        {/* --- ACTIVE CALENDAR --- */}
        {activeSub && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PartnerProgress sub={activeSub} />
            <div className="mt-4 bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-2xl flex items-center justify-between">
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Plan: {activeSub.planTitle}</span>
               <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active Access</span>
            </div>
          </div>
        )}

        {/* --- PLANS GRID --- */}
        {!activeSub && (
          <>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 mb-6 text-center italic">Available Contracts</h2>
            <div className="grid grid-cols-1 gap-4">
              {subscriptions.map((sub) => (
                <div 
                  key={sub.id}
                  className="group relative bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2.5rem] overflow-hidden hover:border-blue-500/50 transition-all duration-300"
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
                       <span className="block text-xl font-black italic">{Number(sub.priceShells).toLocaleString()}</span>
                       <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Shells</span>
                    </div>
                  </div>
                  
                  <button 
                    disabled={purchasing === sub.id}
                    className="w-full mt-6 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all flex items-center justify-center"
                    onClick={() => handlePurchase(sub)}
                  >
                    {purchasing === sub.id ? <Loader2 className="animate-spin" /> : "Initiate Contract"}
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