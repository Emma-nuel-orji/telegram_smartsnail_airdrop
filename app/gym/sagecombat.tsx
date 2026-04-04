"use client";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Target, Star, Wallet, ChevronLeft, Clock, Loader2, Flame } from 'lucide-react';
import Link from "next/link";
import CombatProgress from "./CombatProgress";
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

type AgeGroup = 'Adult' | 'Youth' | 'Kids';
type TrainingType = 'Regular' | 'Private';

const PARTNER_ID = "69cd1be69d551cabe5d1e3f2";

// This object maps DB data to your specific UI styles and text
const PLAN_FLAIR: Record<string, any> = {
  'Walk-In': {
    tag: null,
    icon: <Target size={28} />,
    desc: {
      Regular: "Fundamental boxing technique and light conditioning.",
      Private: "Explosive HIIT circuit + technical mitt work."
    }
  },
  '3 Month': {
    tag: 'Popular',
    icon: <Zap size={28} />,
    desc: {
      Regular: "Intermediate technical development and fitness.",
      Private: "Total body transformation camp with sparring access."
    }
  },
  '6 Month': {
    tag: 'Best Value',
    icon: <Flame size={28} />,
    desc: {
      Regular: "Complete mastery. Professional-grade coaching cycle.",
      Private: "Full fighter prep. Advanced strength & conditioning."
    }
  },
  '1 Year': {
    tag: 'Elite Member',
    icon: <ShieldCheck size={28} />,
    desc: {
      Regular: "Year-long mastery program for dedicated athletes.",
      Private: "Unlimited private sessions and tailored fighter prep."
    }
  }
};

const SageCombat = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [intensity, setIntensity] = useState<TrainingType>('Regular');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  // 1. Setup Telegram User, Points, and Active Subscriptions
  useEffect(() => {
    const initApp = async () => {
      const webApp = (window as any).Telegram?.WebApp;
      const userId = webApp?.initDataUnsafe?.user?.id?.toString();
      
      if (userId) {
        setTelegramId(userId);
        try {
          // Fetch user points and subscriptions in parallel for speed
          const [userRes, subRes] = await Promise.all([
            fetch(`/api/user/${userId}`),
            fetch(`/api/subscription/${userId}`)
          ]);

          if (userRes.ok) {
            const userData = await userRes.json();
            setUserPoints(Number(userData.points || 0));
          }

          if (subRes.ok) {
            const data = await subRes.json();
            // Convert to array if single object, then filter for ACTIVE
            const subsArray = Array.isArray(data) ? data : [data];
            setSubscriptions(subsArray.filter((s: any) => s.status === 'ACTIVE'));
          }
        } catch (err) {
          console.error("Initialization error", err);
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);

  // 2. Fetch Available Plans whenever Toggles change
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(
          `/api/services?partnerId=${PARTNER_ID}&ageGroup=${ageGroup}&intensity=${intensity}`
        );
        const data = await res.json();
        setAvailableServices(data);
      } catch (err) {
        console.error("Failed to fetch plans");
      }
    };
    fetchServices();
  }, [ageGroup, intensity]);

  const handlePurchase = async (plan: any, currency: 'SHELLS' | 'STARS') => {
    const webApp = (window as any).Telegram?.WebApp;
    triggerHaptic('heavy');

    if (currency === 'SHELLS' && userPoints < Number(plan.priceShells)) {
      return toast.error("Insufficient Shells! 🐚");
    }

    setPurchasing(plan.id);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          serviceId: plan.id, // Real DB ID
          planTitle: plan.name,
          duration: plan.duration,
          intensity,
          ageGroup,
          planType: "COMBAT",
          currencyType: currency,
          amount: currency === 'SHELLS' ? Number(plan.priceShells) : plan.priceStars,
        })
      });

      const result = await response.json();

      if (currency === 'STARS' && result.invoiceLink) {
        webApp?.openInvoice(result.invoiceLink, (status: string) => {
          if (status === 'paid') {
            triggerHaptic('rigid');
            toast.success("Transaction Complete!");
            window.location.reload();
          }
        });
      } else if (result.success) {
        triggerHaptic('soft');
        toast.success("🏋️ Access granted.");
        window.location.reload();
      }
    } catch (error) {
      toast.error("Vault connection failed.");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
  <div className="min-h-screen bg-[#050505] text-white p-5 font-sans pb-24 relative overflow-x-hidden">
    <Toaster position="top-center" />
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-80 bg-orange-600/10 blur-[120px] pointer-events-none z-0" />

    {/* Header */}
    <header className="relative z-10 mb-8 flex justify-between items-center">
      <Link href="/" onClick={() => triggerHaptic('light')} className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-full border border-zinc-800 active:scale-90 transition-transform">
        <ChevronLeft size={24} />
      </Link>
      <div className="text-center">
        <h1 className="text-2xl font-black italic uppercase tracking-[0.15em] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
          SageCombat
        </h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="h-[1px] w-4 bg-orange-500" />
          <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em]">Gym Division</p>
          <span className="h-[1px] w-4 bg-orange-500" />
        </div>
      </div>
      <Link href="/gym/manager" onClick={() => triggerHaptic('light')} className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-full border border-zinc-800 active:scale-90 transition-transform">
        <Clock size={20} className="text-orange-500" />
      </Link>
    </header>

    {/* Wallet Balance */}
    <div className="relative z-10 flex flex-col items-center mb-8">
      <div className="bg-zinc-900/50 border border-zinc-800 px-4 py-1.5 rounded-full backdrop-blur-sm">
        <span className="text-[10px] font-black text-yellow-500/90 uppercase tracking-[0.2em] flex items-center gap-2">
           <Wallet size={12} className="animate-pulse" /> {userPoints.toLocaleString()} Shells
        </span>
      </div>
    </div>

    {/* --- UPDATED: SUBSCRIPTION CAROUSEL SECTION --- */}
    {subscriptions && subscriptions.length > 0 ? (
      <div className="relative z-10 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        
        {/* Slider Header */}
        <div className="flex justify-between items-end px-2">
          <div>
            <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Active Passes</h3>
            <p className="text-xs font-bold text-zinc-400">{subscriptions.length} Plans Active</p>
          </div>
          {subscriptions.length > 1 && (
            <span className="text-[8px] font-black uppercase bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md animate-pulse">
              Swipe to View ↔
            </span>
          )}
        </div>

        {/* The Carousel */}
        <div className="overflow-x-auto no-scrollbar pb-4 -mx-5 px-5">
          <motion.div 
            drag="x"
            dragConstraints={{ right: 0, left: -((subscriptions.length - 1) * 340) }}
            className="flex gap-5 w-max"
          >
            {subscriptions.map((sub) => (
              <div key={sub.id || sub._id} className="w-[85vw] max-w-[350px] space-y-4">
                <CombatProgress 
                  sub={{
                    ...sub,
                    trainingDays: sub.trainingDays || []
                  }} 
                  needsSchedule={!sub.trainingDays || sub.trainingDays.length === 0} 
                />
                
                {/* Active Rank Info Card */}
                <div className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl flex justify-between items-center">
                  <div>
                    <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mb-1">
                      {sub.planTitle.includes('Kids') ? 'Youth Member' : 'Elite Fighter'}
                    </p>
                    <h4 className="text-xl font-black italic uppercase text-orange-500">{sub.planTitle}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-zinc-600 uppercase">Ends</p>
                    <p className="text-[10px] font-black text-zinc-400">
                      {new Date(sub.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Add Member / New Plan Button */}
        <button 
           onClick={() => setSubscriptions([])} // This clears state locally to show shop
           className="w-full py-4 rounded-2xl border border-dashed border-zinc-800 text-zinc-600 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all mt-4"
        >
          + Purchase New Membership
        </button>
      </div>
    ) : (
        <div className="relative z-10 space-y-8 animate-in fade-in duration-700">
          
          {/* Age Group Selector */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2">Age Group</h3>
            <div className="flex bg-zinc-950 p-1.5 rounded-[1.5rem] border border-zinc-800/50 shadow-inner">
              {['Adult', 'Youth', 'Kids'].map((group) => (
                <button
                  key={group}
                  onClick={() => { setAgeGroup(group as AgeGroup); triggerHaptic('light'); }}
                  className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all duration-300 ${
                    ageGroup === group ? 'bg-gradient-to-b from-zinc-700 to-zinc-900 text-white shadow-xl border border-zinc-700' : 'text-zinc-600'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity Selector */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => { setIntensity('Regular'); triggerHaptic('medium'); }}
              className={`p-5 rounded-[2rem] border-2 transition-all duration-300 ${
                intensity === 'Regular' ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 opacity-40'
              }`}
            >
              <Target size={28} className={intensity === 'Regular' ? 'text-orange-500' : 'text-zinc-700'} />
              <div className="text-left mt-2">
                <span className="block font-black text-xs uppercase tracking-tighter">Regular</span>
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Standard</span>
              </div>
            </button>
            <button 
              onClick={() => { setIntensity('Private'); triggerHaptic('medium'); }}
              className={`p-5 rounded-[2rem] border-2 transition-all duration-300 ${
                intensity === 'Private' ? 'border-red-600 bg-red-600/5 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'border-zinc-800 opacity-40'
              }`}
            >
              <Flame size={28} className={intensity === 'Private' ? 'text-red-500' : 'text-zinc-700'} />
              <div className="text-left mt-2">
                <span className="block font-black text-xs uppercase tracking-tighter">Private</span>
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Hardcore</span>
              </div>
            </button>
          </div>

          {/* Dynamic Plan Cards */}
          <div className="space-y-6">
            {availableServices.map((plan) => {
              const flairKey = Object.keys(PLAN_FLAIR).find(key => plan.name.includes(key)) || 'Walk-In';
              const flair = PLAN_FLAIR[flairKey];

              return (
                <div key={plan.id} className="relative group">
                  {flair.tag && <div className="absolute -inset-1 bg-orange-500/10 blur-xl rounded-[2.5rem]" />}
                  <div className={`relative bg-[#0d0d0d] p-7 rounded-[2.5rem] border ${flair.tag ? 'border-orange-500/40 shadow-2xl' : 'border-white/5'}`}>
                    
                    {flair.tag && (
                      <div className="absolute top-0 right-10 bg-orange-500 text-black text-[8px] font-black uppercase px-3 py-1 rounded-b-lg tracking-widest">
                        {flair.tag}
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[8px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-[0.1em]">
                          {plan.duration}
                        </span>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mt-1">
                          {plan.name.split('-').pop()?.trim()}
                        </h2>
                      </div>
                      <div className={flair.tag ? 'text-orange-500' : 'text-zinc-700'}>
                        {flair.icon}
                      </div>
                    </div>

                    <p className="text-zinc-500 text-xs mb-8 leading-relaxed font-medium">
                      {flair.desc[intensity]}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handlePurchase(plan, 'SHELLS')}
                        disabled={!!purchasing}
                        className="py-5 bg-zinc-900 rounded-3xl flex flex-col items-center justify-center border border-zinc-800 active:scale-95 transition-all"
                      >
                        {purchasing === plan.id ? <Loader2 size={16} className="animate-spin text-zinc-500" /> : (
                          <>
                            <div className="flex items-center gap-1.5 mb-1 opacity-60">
                              <Wallet size={12} />
                              <span className="text-[9px] font-black uppercase">Shells</span>
                            </div>
                            <span className="text-base font-black tracking-tight">
                              {Number(plan.priceShells).toLocaleString()}
                            </span>
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={() => handlePurchase(plan, 'STARS')}
                        disabled={!!purchasing}
                        className={`py-5 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 border-t border-white/20 shadow-lg ${
                          flair.tag ? 'bg-gradient-to-b from-orange-400 to-orange-600' : 'bg-gradient-to-b from-blue-500 to-blue-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 opacity-80">
                          <Star size={12} className="text-white fill-white" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white">Stars</span>
                        </div>
                        <span className="text-base font-black tracking-tight text-white">{plan.priceStars}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SageCombat;