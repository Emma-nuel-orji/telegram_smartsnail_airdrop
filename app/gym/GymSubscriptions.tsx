"use client";

// import WebApp from "@twa-dev/sdk";
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

  const LILBURN_ID = "684d8d8c86d4f1a3ebf72669";
  const [notRegistered, setNotRegistered] = useState(false);
 
  const gymId = searchParams?.get('gymId') || LILBURN_ID;
  
  const gymName = searchParams?.get('gymName') || (gymId === LILBURN_ID ? 'Lilburn Gym' : 'Partner Gym');
  
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0); 
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  
  // This ensures TypeScript knows about HapticFeedback and showConfirm
const getWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp as TelegramWebApp : null;
  const BOT_USERNAME = "SmartSnails_Bot";
  const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;
  console.log("🔍 URL CHECK:", { gymId, gymName, rawParams: searchParams?.toString() });

  useEffect(() => {
    const userId = getWebApp?.initDataUnsafe?.user?.id?.toString();
    if (userId) setTelegramId(userId);
  }, [getWebApp]);

  useEffect(() => {
    // Safety Firewall: If loading hangs for > 7s, stop the spinner
    const timeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 7000);

    if (!telegramId || !gymId) {
      console.log("⏳ Waiting for Telegram ID and Gym ID...");
      return; 
    }

    if (gymId.length !== 24) {
      console.warn("⛔ INVALID ID FORMAT:", gymId);
      setLoading(false);
      return;
    }

  async function fetchData() {
  console.log("📡 API CALL STARTING for Partner:", gymId);
  setLoading(true); 
  
  try {
    const [userRes, subsRes, activeRes] = await Promise.all([
      fetch(`/api/user/${telegramId}`),
      fetch(`/api/services?type=SUBSCRIPTION&partnerId=${gymId}`),
      fetch(`/api/subscription/${telegramId}?partnerId=${gymId}`)
    ]);

    if (!userRes.ok || !subsRes.ok) throw new Error("API Route Failure");

    const userData = await userRes.json();

   const SUPER_ADMIN_IDS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS || '').split(',').map(id => id.trim());
    const isSuperAdmin = telegramId !== null && SUPER_ADMIN_IDS.includes(telegramId);

    if (telegramId === ADMIN_ID) {
      setIsAdmin(true);
    }

    // Only block if no nickname AND not an admin
    if (!userData.nickname && !isSuperAdmin && telegramId !== ADMIN_ID) {
      setNotRegistered(true);
      setLoading(false);
      return;
    }

    const subsData = await subsRes.json();

    // --- SUCCESS: LOAD DATA ---
    setUserPoints(Number(userData.points || 0));
    setSubscriptions(Array.isArray(subsData) ? subsData : []);

    if (activeRes.ok) {
      const subData = await activeRes.json();
      const activeSubscription = Array.isArray(subData) 
        ? subData.find((s: any) => s.status === 'ACTIVE') 
        : subData;
        
      setActiveSub(activeSubscription?.status === 'ACTIVE' ? activeSubscription : null);
    }
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    toast.error("Failed to sync with gym database.");
  } finally {
    setLoading(false);
    clearTimeout(timeout);
  }
}

fetchData();
return () => clearTimeout(timeout);
}, [telegramId, gymId, router]);

  // --- 3. THE "INSTANT-UPDATE" PURCHASE LOGIC ---
  const handlePurchase = async (plan: any, currency: 'SHELLS' | 'STARS') => {
    const amount = currency === 'SHELLS' ? plan.priceShells : plan.priceStars;
    
    if (currency === 'SHELLS' && userPoints < amount) {
      return toast.error("Insufficient Shells! 🐚");
    }

    if (currency === 'SHELLS') {
      const confirmed = await new Promise((resolve) => {
  getWebApp?.showConfirm(`Spend ${amount.toLocaleString()} Shells for ${plan.name}?`, (ok: boolean) => resolve(ok));
});
      if (!confirmed) return;
    }

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
        getWebApp?.openInvoice(result.invoiceLink, (status: string) => {
  if (status === 'paid') {
    toast.success("Transaction Complete!");
    window.location.reload(); 
  }
});
      } else if (result.success) {
        // Instant UI feedback
        if (currency === 'SHELLS') setUserPoints(prev => prev - amount);
        setActiveSub({ ...plan, status: 'ACTIVE', planTitle: plan.name });
        
        getWebApp?.HapticFeedback.notificationOccurred('success');
        toast.success("🏋️ Access granted.");
      }
    } catch (error) {
      toast.error("Connection failed.");
    } finally {
      setPurchasing(null);
    }
  };

  // --- RENDERING ---

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
      <span className="text-purple-500 font-black italic uppercase tracking-widest text-xs">Loading Gym.</span>
    </div>
  );

  console.log("🚨 OFFLINE CHECK:", { gymId, length: gymId?.length, loading });
if (notRegistered) {
  return (
    <motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  
     className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-purple-600/10 border border-purple-500/20 rounded-3xl flex items-center justify-center mb-6">
        <UserPlus size={36} className="text-purple-400" />
      </div>
      <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-tight">
        SmartSnail<br /><span className="text-purple-500">Pass Required</span>
      </h2>
      <p className="text-zinc-500 text-xs mt-4 max-w-[260px] leading-relaxed">
        You need to register for the SmartSnail Pass to access <span className="text-white font-bold">{gymName}</span>.
      </p>
      <button
        onClick={() => {
          localStorage.setItem('pendingGymReturn', JSON.stringify({
            gymId,
            gymName,
            route: window.location.pathname
          }));
          window.Telegram?.WebApp?.openTelegramLink(
            `https://t.me/SmartSnailBot?start=signup_smartsnail_pass`
          );
        }}
        className="mt-8 w-full max-w-[300px] py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
      >
        Get My SmartSnail Pass 🐚
      </button>
      <button
        onClick={() => window.Telegram?.WebApp?.close()}
        className="mt-3 w-full max-w-[300px] py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest"
      >
        Maybe Later
      </button>
    
   </motion.div>
  );
}
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30">
      <Toaster position="top-center" />
      
      {/* HEADER SECTION */}
      <div className="relative h-[45vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${GYM_BACKGROUND})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
        
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
                <span className="text-2xl font-black text-white italic">{userPoints.toLocaleString()} <span className="text-purple-500">🐚</span></span>
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

        {/* PLANS SECTION */}
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