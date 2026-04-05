"use client";

import WebApp from "@twa-dev/sdk";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Clock, Dumbbell, ChevronLeft, UserPlus, Loader2, Sparkles, Zap } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import PartnerProgress from "./PartnerProgress";
import { motion, AnimatePresence } from "framer-motion";

const GYM_BACKGROUND = "/images/bk.jpg";

export default function GymSubscriptions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gymId = searchParams?.get('gymId');
  const gymName = searchParams?.get('gymName') || 'Partner Gym';
  
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [shells, setShells] = useState<number>(0);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const LILBURN_PARTNER_ID = "684d8d8c86d4f1a3ebf72669";
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;


console.log("🔍 URL CHECK:", { gymId, gymName, rawParams: searchParams?.toString() });
useEffect(() => {
    // 1. Get Telegram User ID
    const userId = webApp?.initDataUnsafe?.user?.id?.toString();
    if (userId) setTelegramId(userId);
  }, [webApp]);

  useEffect(() => {
    // 2. The "Patient" Firewall
    // Stay in loading state until we have both a user and a gymId
    if (!telegramId || !gymId) {
      console.log("⏳ Waiting for Telegram ID and Gym ID...");
      return; 
    }

    // 3. Validation: If the ID is clearly broken, stop loading and show "Offline"
    if (gymId.length !== 24) {
      console.warn("⛔ INVALID ID FORMAT:", gymId);
      setLoading(false);
      return;
    }

    async function fetchData() {
      console.log("📡 API CALL STARTING for Gym:", gymId);
      setLoading(true); 
      
      try {
        const [userRes, subsRes, activeRes] = await Promise.all([
          fetch(`/api/user/${telegramId}`),
          fetch(`/api/services?partnerType=GYM&type=SUBSCRIPTION&partnerId=${gymId}`),
          fetch(`/api/subscription/${telegramId}?partnerId=${gymId}`)
        ]);

        // Check if any requests failed fundamentally
        if (!userRes.ok || !subsRes.ok) throw new Error("API Route Failure");

        const userData = await userRes.json();
        const subsData = await subsRes.json();
        
        // Update User State
        setShells(Number(userData.points || 0));
        setIsRegistered(!!(userData.nickname && userData.name));
        setIsAdmin(userData.permissions?.some((p: string) => 
          ['SUPERADMIN', 'GYM_ADMIN'].includes(p)
        ));

        // Update Subscriptions List
        setSubscriptions(Array.isArray(subsData) ? subsData : []);

        // Update Active Subscription Status
        if (activeRes.ok) {
          const subData = await activeRes.json();
          const activeSubscription = Array.isArray(subData) 
            ? subData.find((s: any) => s.status === 'ACTIVE') 
            : subData;
            
          if (activeSubscription?.status === 'ACTIVE') {
            setActiveSub(activeSubscription);
          } else {
            setActiveSub(null);
          }
        }
      } catch (err) {
        console.error("❌ Fetch Error:", err);
        toast.error("Failed to sync with gym database.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [telegramId, gymId]); 

  const handlePurchase = async (plan: any, currency: 'SHELLS' | 'STARS') => {
    const amount = currency === 'SHELLS' ? plan.priceShells : plan.priceStars;
    if (currency === 'SHELLS' && shells < amount) return toast.error("Insufficient Shells! 🐚");

    setPurchasing(plan.id);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          serviceId: plan.id,
          planTitle: plan.name,
          duration: plan.duration,
          currencyType: currency,
          amount: amount,
          intensity: false 
        })
      });

      const result = await response.json();
      if (currency === 'STARS' && result.invoiceLink) {
        webApp?.openInvoice(result.invoiceLink, (status) => {
          if (status === 'paid') {
            toast.success("Transaction Complete!");
            window.location.reload();
          }
        });
      } else if (result.success) {
        toast.success("🏋️ Access granted.");
        window.location.reload();
      }
    } catch (error) {
      toast.error("Connection failed.");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
      <span className="text-purple-500 font-black italic uppercase tracking-widest text-xs">Loading Gym.</span>
    </div>
  );

  if (!loading && (!gymId || gymId.length !== 24)) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
      {/* Visual: A "Locked" or "Off" icon feels more natural */}
      <div className="relative mb-8">
        <Dumbbell className="w-16 h-16 text-zinc-900" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 border border-red-500/20 rounded-full animate-ping" />
        </div>
      </div>

      <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
        Facility <span className="text-red-500">Offline</span>
      </h2>
      
      <p className="text-zinc-500 text-[10px] mt-4 uppercase font-bold tracking-[0.2em] max-w-[200px] leading-relaxed">
        This gym is inaccessible. 
      </p>

      <button 
        onClick={() => webApp?.close() || router.back()} 
        className="mt-10 w-full max-w-[240px] py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
      >
        Return to Bot
      </button>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30">
      <Toaster position="top-center" />
      
      {/* ACCESS LOCK */}
      {!isRegistered && !isAdmin && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-2xl">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-zinc-900 border border-purple-900/30 p-8 rounded-[3rem] text-center shadow-2xl">
            <UserPlus className="text-purple-500 w-16 h-16 mx-auto mb-6" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2 text-white">Identity Required</h2>
            <p className="text-zinc-500 text-xs mb-8 uppercase font-bold tracking-widest">Complete registration to enter</p>
            <button onClick={() => webApp?.close()} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(147,51,234,0.3)]">
              Initialize Profile
            </button>
          </motion.div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="relative h-[45vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${GYM_BACKGROUND})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
        <div className="absolute inset-0 bg-purple-900/10 mix-blend-overlay" />
        
        <div className="relative z-10 p-6 flex flex-col h-full">
          <div className="flex justify-between items-center">
            <button onClick={() => router.back()} className="p-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl">
              <ChevronLeft size={20} />
            </button>
            {isAdmin && (
              <Link href="/gym/manager" className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 backdrop-blur-md border border-purple-500/30 rounded-xl">
                <Clock size={16} className="text-purple-400" />
                <span className="text-[10px] font-black uppercase italic">Dashboard</span>
              </Link>
            )}
          </div>

          <div className="mt-auto mb-10">
            <span className="inline-block px-3 py-1 bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg mb-3 italic">
              Premium Facility
            </span>
            <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.8]">
              {gymName.split(' ')[0]}<br />
              <span className="text-purple-500">ACCESS</span>
            </h1>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 pb-24 -mt-12">
        {/* SHELLS WIDGET */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-[2.5rem] flex items-center justify-between shadow-2xl backdrop-blur-xl mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                <Zap size={20} className="text-purple-400" />
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 font-black uppercase tracking-widest">Available Credits</span>
                <span className="text-2xl font-black text-white italic">{shells.toLocaleString()} <span className="text-purple-500">🐚</span></span>
              </div>
            </div>
            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-purple-400">Top Up</button>
        </div>

        {/* ACTIVE STATUS */}
        {activeSub && (
          <div className="mb-12">
            <PartnerProgress sub={activeSub} />
            <div className="mt-4 p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
               <span className="text-[10px] text-purple-300 font-bold uppercase italic tracking-widest">Plan: {activeSub.planTitle}</span>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Valid Entry</span>
               </div>
            </div>
          </div>
        )}

        {/* PLANS SECTION (Simplified logic, kept design) */}
        {!activeSub && (
          <div className="flex overflow-x-auto no-scrollbar gap-5 -mx-6 px-6">
            {subscriptions.length > 0 ? subscriptions.map((plan: any) => (
              <div 
                key={plan.id}
                className="min-w-[300px] bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] flex flex-col justify-between relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-600/20 transition-all duration-700" />
                
                <div>
                  <div className="w-14 h-14 bg-purple-600/10 rounded-2xl flex items-center justify-center border border-purple-500/20 mb-6 group-hover:scale-110 transition-transform">
                    <Dumbbell size={28} className="text-purple-400" />
                  </div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2">{plan.name}</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">{plan.duration} All-Access</p>
                  
                  <div className="space-y-3 mb-8">
                    {['Full Equipment', 'Locker Access', 'Trainer Support'].map((feat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Sparkles size={10} className="text-purple-500" />
                        <span className="text-[9px] font-black uppercase text-zinc-400">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => handlePurchase(plan, 'SHELLS')}
                    disabled={!!purchasing}
                    className="w-full py-4 bg-white text-black rounded-2xl flex items-center justify-center gap-2 group-hover:bg-purple-600 group-hover:text-white transition-all"
                  >
                    {purchasing === plan.id ? <Loader2 className="animate-spin" size={16} /> : (
                      <>
                        <span className="text-[10px] font-black uppercase tracking-widest">Buy with Shells</span>
                        <span className="text-xs font-black italic border-l border-current pl-2">{Number(plan.priceShells).toLocaleString()}</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => handlePurchase(plan, 'STARS')}
                    disabled={!!purchasing}
                    className="w-full py-4 bg-zinc-800 text-purple-400 rounded-2xl flex items-center justify-center gap-2 border border-zinc-700"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Pay with Stars</span>
                    <span className="text-xs font-black italic border-l border-purple-500/30 pl-2">{plan.priceStars} ⭐</span>
                  </button>
                </div>
              </div>
            )) : (
              <div className="w-full py-12 text-center bg-zinc-900/30 rounded-[3rem] border border-dashed border-zinc-800">
                <p className="text-zinc-600 text-[10px] font-black uppercase italic tracking-widest">No plans currently active</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}