"use client";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Target, Star, Wallet, ChevronLeft, Clock, Loader2, Flame, Trophy } from 'lucide-react';
import Link from "next/link";
import CombatProgress from "./CombatProgress";

type AgeGroup = 'Adult' | 'Youth' | 'Kids';
type TrainingType = 'Regular' | 'Intensive';

const SageCombat = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [intensity, setIntensity] = useState<TrainingType>('Regular');
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ... (Keep your existing useEffect logic)
  useEffect(() => {
    const fetchSub = async () => {
      const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      const userId = webApp?.initDataUnsafe?.user?.id;
      if (!userId) return setLoading(false);
      try {
        const res = await fetch(`/api/subscription/${userId}`);
        if (res.ok) setSubscription(await res.json());
      } catch (err) { console.error("Fetch failed"); } 
      finally { setLoading(false); }
    };
    fetchSub();
  }, []);

  const getPlans = () => {
    const multiplier = intensity === 'Intensive' ? 1.4 : 1;
    return [
      {
        id: 'walk-in',
        title: 'Walk-In',
        duration: '1 Session',
        shells: 25000 * multiplier,
        stars: 135 * multiplier,
        color: 'zinc'
      },
      {
        id: '3-months',
        title: '3 Months Pro',
        duration: '90 Days',
        shells: 250000 * multiplier,
        stars: 1350 * multiplier,
        color: 'orange'
      },
      {
        id: '6-months',
        title: '6 Months Elite',
        duration: '180 Days',
        shells: 450000 * multiplier,
        stars: 2400 * multiplier,
        color: 'purple'
      }
    ];
  };

  const handlePurchase = async (plan: any, currency: 'SHELLS' | 'STARS') => {
     console.log(`Buying ${plan.id} with ${currency}`);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="min-h-screen bg-[#080808] text-white p-4 font-sans pb-20 overflow-x-hidden">
      {/* Compact Header */}
      <header className="relative z-10 mb-6 flex justify-between items-center">
        <Link href="/" className="p-2 bg-zinc-900/50 rounded-xl border border-white/5 active:scale-90 transition-transform">
          <ChevronLeft size={20} />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-black italic uppercase tracking-wider leading-none">SageCombat</h1>
          <p className="text-orange-500 text-[8px] font-black uppercase tracking-[0.2em] mt-1">Boxing Camp</p>
        </div>
        <Link href="/gym/manager" className="p-2 bg-zinc-900/50 rounded-xl border border-white/5 active:scale-90 transition-transform">
          <Clock size={18} className="text-orange-500" />
        </Link>
      </header>

      {subscription && subscription.status === 'ACTIVE' ? (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <CombatProgress sub={subscription} needsSchedule={!subscription.trainingDays?.length} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tighter Selectors */}
          <div className="flex bg-zinc-900/40 p-1 rounded-2xl border border-white/5 shadow-inner">
            {['Adult', 'Youth', 'Kids'].map((group) => (
              <button
                key={group}
                onClick={() => setAgeGroup(group as AgeGroup)}
                className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${
                  ageGroup === group ? 'bg-white text-black shadow-md' : 'text-zinc-600'
                }`}
              >
                {group}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'Regular', icon: Target, label: 'Regular', color: 'text-blue-500' },
              { id: 'Intensive', icon: Flame, label: 'Intensive', color: 'text-red-500' }
            ].map((t) => (
              <button 
                key={t.id}
                onClick={() => setIntensity(t.id as TrainingType)}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all ${
                  intensity === t.id ? 'border-orange-500/50 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900/20 opacity-50'
                }`}
              >
                <t.icon size={16} className={intensity === t.id ? t.color : 'text-zinc-600'} />
                <span className="font-black text-[10px] uppercase tracking-tighter">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Smaller, Grid-Ready Cards */}
          <div className="space-y-3">
            <h3 className="text-[9px] font-black uppercase text-zinc-600 tracking-widest px-1">Available Plans</h3>
            {getPlans().map((plan) => (
              <div key={plan.id} className="relative bg-zinc-900/40 border border-white/5 rounded-[1.8rem] p-4 flex flex-col gap-3 overflow-hidden">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-black uppercase italic leading-none">{plan.title}</h2>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase mt-1 block">{plan.duration}</span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    {plan.id === '6-months' ? <Trophy size={16} className="text-yellow-500" /> : <ShieldCheck size={16} className="text-zinc-600" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handlePurchase(plan, 'SHELLS')}
                    className="py-3 bg-zinc-800/80 hover:bg-zinc-700 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/5"
                  >
                    <Wallet size={12} className="text-zinc-500" />
                    <span className="text-[11px] font-black">{plan.shells.toLocaleString()}</span>
                  </button>
                  
                  <button 
                    onClick={() => handlePurchase(plan, 'STARS')}
                    className="py-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                  >
                    <Star size={12} className="text-white fill-white" />
                    <span className="text-[11px] font-black text-white">{plan.stars.toLocaleString()}</span>
                  </button>
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