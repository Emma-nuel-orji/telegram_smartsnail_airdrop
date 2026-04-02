"use client";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Target, Star, Wallet, ChevronLeft, Clock, Loader2, Flame } from 'lucide-react';
import Link from "next/link";
import CombatProgress from "./CombatProgress";
import toast, { Toaster } from 'react-hot-toast';
type AgeGroup = 'Adult' | 'Youth' | 'Kids';
type TrainingType = 'Group' | 'Private';


const SageCombat = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [intensity, setIntensity] = useState<TrainingType>('Group');
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [shells, setShells] = useState<number>(0);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  // Helper for Haptic Feedback
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  useEffect(() => {
    const fetchSub = async () => {
      const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
      const userId = webApp?.initDataUnsafe?.user?.id;
      if (!userId) return setLoading(false);

      try {
        const res = await fetch(`/api/subscription/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setSubscription(data);
        }
      } catch (err) {
        console.error("Failed to fetch sub");
      } finally {
        setLoading(false);
      }
    };
    fetchSub();
  }, []);

  useEffect(() => {
  const webApp = (window as any).Telegram?.WebApp;
  const userId = webApp?.initDataUnsafe?.user?.id?.toString();
  if (userId) setTelegramId(userId);
}, []);

  const getPlans = () => {
    const isIntensive = intensity === 'Private';
    const multiplier = isIntensive ? 1.4 : 1;

    return [
      {
        id: 'walk-in',
        title: 'Walk-In Session',
        desc: isIntensive ? 'Explosive HIIT circuit + technical mitt work.' : 'Fundamental boxing technique and light conditioning.',
        shells: 25000 * multiplier,
        stars: 135 * multiplier,
        duration: '1 Session',
        tag: null
      },
      {
        id: '3-months',
        title: '3 Months Pro',
        desc: isIntensive ? 'Total body transformation camp with sparring access.' : 'Intermediate technical development and fitness.',
        shells: 250000 * multiplier,
        stars: 1350 * multiplier,
        duration: '90 Days',
        tag: null
      },
      {
        id: '6-months',
        title: '6 Months Elite',
        desc: isIntensive ? 'Full fighter prep. Advanced strength & conditioning.' : 'Complete mastery. Professional-grade coaching cycle.',
        shells: 450000 * multiplier,
        stars: 2400 * multiplier,
        duration: '180 Days',
        tag: 'Best Value'
      }
    ];
  };

 const handlePurchase = async (plan: any, currency: 'SHELLS' | 'STARS') => {
  const webApp = (window as any).Telegram?.WebApp;
  
  // 1. Haptic Feedback
  webApp?.HapticFeedback?.impactOccurred('heavy');

  if (currency === 'SHELLS' && shells < Number(plan.priceShells)) {
    return toast.error("Insufficient Shells! 🐚");
  }

  setPurchasing(plan.id);

  try {
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
              telegramId,
              serviceId: SAGE_COMBAT_SERVICE_ID, // real DB id
              planTitle: plan.title,
              duration: plan.duration,
              intensity,
              ageGroup,
              planType: "COMBAT",
              currencyType: currency,
              amount: currency === 'SHELLS' ? plan.shells : plan.stars,
            })
    });

    const result = await response.json();

    if (currency === 'STARS' && result.invoiceLink) {
      // ⭐ Open Telegram Stars Invoice
      webApp?.openInvoice(result.invoiceLink, (status: string) => {
        if (status === 'paid') {
          webApp?.HapticFeedback?.notificationOccurred('success');
          toast.success("Transaction Complete!");
          window.location.reload();
        }
      });
    } else if (result.success) {
      // 🐚 Shells Success
      webApp?.HapticFeedback?.notificationOccurred('success');
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
      {/* Background Ambient Glow */}
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

      {subscription && subscription.status === 'ACTIVE' ? (
        <div className="relative z-10 space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          <CombatProgress sub={subscription} needsSchedule={!subscription.trainingDays || subscription.trainingDays.length === 0} />
          <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
             <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Active Rank</p>
             <h4 className="text-2xl font-black italic uppercase text-orange-500">{subscription.planTitle}</h4>
          </div>
        </div>
      ) : (
        <div className="relative z-10 space-y-8 animate-in fade-in duration-700">
          
          {/* Tier Selector */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2">Age Group</h3>
            <div className="flex bg-zinc-950 p-1.5 rounded-[1.5rem] border border-zinc-800/50 shadow-inner">
              {['Adult', 'Youth', 'Kids'].map((group) => (
                <button
                  key={group}
                  onClick={() => { setAgeGroup(group as AgeGroup); triggerHaptic('light'); }}
                  className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all duration-300 ${
                    ageGroup === group 
                    ? 'bg-gradient-to-b from-zinc-700 to-zinc-900 text-white shadow-xl border border-zinc-700' 
                    : 'text-zinc-600'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => { setIntensity('Group'); triggerHaptic('medium'); }}
              className={`p-5 rounded-[2rem] border-2 transition-all duration-300 ${
                intensity === 'Regular' ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 opacity-40'
              }`}
            >
              <Target size={28} className={intensity === 'Regular' ? 'text-orange-500' : 'text-zinc-700'} />
              <div className="text-left mt-2">
                <span className="block font-black text-xs uppercase tracking-tighter">Group</span>
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Standard</span>
              </div>
            </button>

            <button 
              onClick={() => { setIntensity('Private'); triggerHaptic('medium'); }}
              className={`p-5 rounded-[2rem] border-2 transition-all duration-300 ${
                intensity === 'Intensive' ? 'border-red-600 bg-red-600/5 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'border-zinc-800 opacity-40'
              }`}
            >
              <Flame size={28} className={intensity === 'Intensive' ? 'text-red-500' : 'text-zinc-700'} />
              <div className="text-left mt-2">
                <span className="block font-black text-xs uppercase tracking-tighter">Private</span>
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Hardcore</span>
              </div>
            </button>
          </div>

          {/* Plan Cards */}
          <div className="space-y-6">
            {getPlans().map((plan) => (
              <div key={plan.id} className="relative group">
                {plan.tag && (
                  <div className="absolute -inset-1 bg-orange-500/10 blur-xl rounded-[2.5rem]" />
                )}
                <div className={`relative bg-[#0d0d0d] p-7 rounded-[2.5rem] border ${plan.tag ? 'border-orange-500/40 shadow-orange-900/10 shadow-2xl' : 'border-white/5'}`}>
                  
                  {plan.tag && (
                    <div className="absolute top-0 right-10 bg-orange-500 text-black text-[8px] font-black uppercase px-3 py-1 rounded-b-lg tracking-widest">
                      {plan.tag}
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[8px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-[0.1em]">
                        {plan.duration}
                      </span>
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter mt-1">{plan.title}</h2>
                    </div>
                    <ShieldCheck className={plan.tag ? 'text-orange-500' : 'text-zinc-700'} size={28} />
                  </div>

                  <p className="text-zinc-500 text-xs mb-8 leading-relaxed font-medium">
                    {plan.desc}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handlePurchase(plan, 'SHELLS')}
                      className="py-5 bg-zinc-900 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 border border-zinc-800"
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-60">
                        <Wallet size={12} className="text-zinc-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Shells</span>
                      </div>
                      <span className="text-base font-black tracking-tight">{plan.shells.toLocaleString()}</span>
                    </button>
                    
                    <button 
                      onClick={() => handlePurchase(plan, 'STARS')}
                      className={`py-5 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 border-t border-white/20 shadow-lg ${
                        plan.tag ? 'bg-gradient-to-b from-orange-400 to-orange-600' : 'bg-gradient-to-b from-blue-500 to-blue-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-80">
                        <Star size={12} className="text-white fill-white" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">Stars</span>
                      </div>
                      <span className="text-base font-black tracking-tight text-white">{plan.stars.toLocaleString()}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SageCombat;