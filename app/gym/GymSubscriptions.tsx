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
  const [initData, setInitData] = useState<string | null>(null);
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
  // const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;
  // console.log("🔍 URL CHECK:", { gymId, gymName, rawParams: searchParams?.toString() });

 useEffect(() => {
  const tg = window.Telegram?.WebApp;

  if (!tg) return;

  const initData = tg.initData; // 🔐 secure payload
  const userId = tg.initDataUnsafe?.user?.id?.toString(); // 👀 just for UI

  if (userId) setTelegramId(userId);

  // 👉 store initData for API calls
  setInitData(initData);
}, []);

  useEffect(() => {
    // Safety Firewall: If loading hangs for > 7s, stop the spinner
    const timeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 7000);

    if (!telegramId || !gymId || !initData) {
  // console.log("⏳ Waiting for Telegram ID, Gym ID, and initData...");
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
  fetch(`/api/user/${telegramId}`, {
    headers: {
      Authorization: `tma ${initData}` // 🔐 ADD THIS
    }
  }),
  fetch(`/api/services?type=SUBSCRIPTION&partnerId=${gymId}`, {
    headers: {
      Authorization: `tma ${initData}`
    }
  }),
  fetch(`/api/subscription/${telegramId}?partnerId=${gymId}`, {
    headers: {
      Authorization: `tma ${initData}`
    }
  })
]);

    if (!userRes.ok || !subsRes.ok) throw new Error("API Route Failure");

   const userData = await userRes.json();
   console.log("DEBUG userData:", JSON.stringify(userData));

      // Single clean admin check — trust backend completely
      const isStaff = 
        userData.isAdmin === true || 
        userData.isSuperAdmin === true || 
        (Array.isArray(userData.permissions) && userData.permissions.includes('ADMIN'));

      setIsAdmin(isStaff);
      setUserPoints(Number(userData.points || 0));

    const subsData = await subsRes.json();

    // --- SUCCESS: LOAD DATA ---
    // setUserPoints(Number(userData.points || 0));
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
}, [telegramId, gymId, initData, router]);

  // --- 3. THE "INSTANT-UPDATE" PURCHASE LOGIC ---
const handlePurchase = async (plan: any, currency: 'SHELLS' | 'STARS') => {
  const amount = currency === 'SHELLS' ? plan.priceShells : plan.priceStars;

  // 🔍 DEBUG — paste this, check console, then we remove it
  console.log("🔍 telegramId state:", telegramId);
  console.log("🔍 isAdmin state:", isAdmin);
  console.log("🔍 initData present:", !!initData);

  try {
    const checkRes = await fetch(`/api/user/${telegramId}`, {
      headers: { ...(initData ? { "Authorization": `tma ${initData}` } : {}) }
    });
    
    // 🔍 DEBUG
    console.log("🔍 user fetch status:", checkRes.status);
    const userData = await checkRes.json();
    console.log("🔍 FULL USER DATA:", JSON.stringify(userData, null, 2));

    // If fetch failed entirely, don't block admins
    if (!checkRes.ok) {
      console.warn("⚠️ User fetch failed with status:", checkRes.status);
      // Don't return — fall through to the purchase attempt
      // The backend will enforce the real admin check
    } else {
      // Re-derive admin from fresh data
      const freshIsAdmin =
        userData.isAdmin === true ||
        userData.isSuperAdmin === true ||
        (Array.isArray(userData.permissions) && userData.permissions.includes('ADMIN'));

      console.log("🔍 freshIsAdmin:", freshIsAdmin);

      if (!freshIsAdmin) {
        // Not admin — enforce nickname and balance checks
        if (!userData.nickname) {
          setNotRegistered(true);
          return;
        }

        if (currency === 'SHELLS' && userPoints < amount) {
          toast.error("Insufficient Shells! 🐚");
          return;
        }

        const confirmed = await new Promise((resolve) => {
          getWebApp?.showConfirm(
            `Spend ${amount.toLocaleString()} Shells for ${plan.name}?`,
            (ok: boolean) => resolve(ok)
          );
        });
        if (!confirmed) return;
      } else {
        // Fresh data confirmed admin — sync state
        setIsAdmin(true);
      }
    }
  } catch {
    console.error("❌ User check fetch threw an error");
    // Don't block — let backend enforce
  }

  // ── PURCHASE ──
  setPurchasing(plan.id);
  try {
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(initData ? { "Authorization": `tma ${initData}` } : {})
      },
      body: JSON.stringify({
        serviceId: plan.id,
        planTitle: plan.name,
        duration: plan.duration,
        currencyType: currency,
        intensity: false
      })
    });

    // 🔍 DEBUG
    console.log("🔍 subscribe status:", response.status);
    const result = await response.json();
    console.log("🔍 subscribe result:", JSON.stringify(result, null, 2));

    if (currency === 'STARS' && result.invoiceLink) {
      getWebApp?.openInvoice(result.invoiceLink, (status: string) => {
        if (status === 'paid') {
          toast.success("Transaction Complete!");
          window.location.reload();
        }
      });
    } else if (result.success) {
      if (currency === 'SHELLS' && !isAdmin) setUserPoints(prev => prev - amount);
      setActiveSub({ ...plan, status: 'ACTIVE', planTitle: plan.name });
      getWebApp?.HapticFeedback.notificationOccurred('success');
      toast.success(isAdmin ? "✅ Admin access granted." : "🏋️ Access granted.");
    } else {
      toast.error(result.error || "Purchase failed.");
    }
  } catch (error) {
    console.error("❌ Subscribe fetch error:", error);
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
            `https://t.me/SmartSnails_Bot?start=signup_smartsnail_pass`
          );
        }}
        className="mt-8 w-full max-w-[300px] py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
      >
        Get My SmartSnail Pass 🐚
      </button>
      <button onClick={() => router.back()}
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
                    className="w-full py-4 bg-white text-black rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-all"
                  >
                    {purchasing === plan.id ? <Loader2 className="animate-spin" size={16} /> : (
                      <>
                        <span className="text-[10px] font-black uppercase tracking-widest">Pay with Shells</span>
                        <span className="text-xs font-black italic border-l border-current pl-2">{Number(plan.priceShells).toLocaleString()}</span>
                      </>
                    )}
                  </button>
                  
                  {/* <button 
                    onClick={() => handlePurchase(plan, 'STARS')}
                    disabled={!!purchasing}
                    className="w-full py-4 bg-zinc-800 text-purple-400 rounded-2xl flex items-center justify-center gap-2 border border-zinc-700"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Pay with Stars</span>
                    <span className="text-xs font-black italic border-l border-purple-500/30 pl-2">{plan.priceStars} ⭐</span>
                  </button> */}
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