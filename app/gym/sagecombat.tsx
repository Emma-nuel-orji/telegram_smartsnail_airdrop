"use client";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Target, Star, Wallet, ChevronLeft, Clock, Loader2, Dumbbell, Flame } from 'lucide-react';
import Link from "next/link";
import CombatProgress from "./CombatProgress";

type AgeGroup = 'Adult' | 'Youth' | 'Kids';
type TrainingType = 'Regular' | 'Intensive';

const SageCombat = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [intensity, setIntensity] = useState<TrainingType>('Regular');
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ... (Keep your existing useEffect logic for fetching sub)
  useEffect(() => {
    const fetchSub = async () => {
      const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
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

  const getPlans = () => {
    const isIntensive = intensity === 'Intensive';
    const multiplier = isIntensive ? 1.4 : 1;
    return [
      {
        id: 'walk-in',
        title: 'Walk-In Session',
        desc: isIntensive ? 'Explosive HIIT circuit + technical mitt work.' : 'Fundamental boxing technique and light conditioning.',
        shells: 25000 * multiplier,
        stars: 135 * multiplier,
        duration: '1 Session'
      },
      {
        id: '3-months',
        title: '3 Months Pro',
        desc: isIntensive ? 'Total body transformation camp with sparring access.' : 'Intermediate technical development and fitness.',
        shells: 250000 * multiplier,
        stars: 1350 * multiplier,
        duration: '90 Days'
      }
    ];
  };

  const handlePurchase = async (plan: any, currency: 'SHELLS' | 'STARS') => {
    // ... (Keep your existing purchase logic)
    console.log(`Buying ${plan.title} with ${currency}`);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-5 font-sans pb-24 selection:bg-orange-500">
      {/* Background Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-orange-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 mb-8 flex justify-between items-center">
        <Link href="/" className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-full border border-zinc-800 active:scale-90 transition-transform">
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

        <Link href="/gym/manager" className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-full border border-zinc-800 active:scale-90 transition-transform">
          <Clock size={20} className="text-orange-500" />
        </Link>
      </header>

      {subscription && subscription.status === 'ACTIVE' ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
          <CombatProgress sub={subscription} needsSchedule={!subscription.trainingDays?.length} />
          <div className="bg-gradient-to-br from-zinc-900 to-black p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Dumbbell size={80} />
             </div>
             <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Current Membership</p>
             <h4 className="text-2xl font-black italic uppercase">{subscription.planTitle}</h4>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-700">
          
          {/* Section: Tier Selector */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-2">Select Tier</h3>
            <div className="flex bg-zinc-950 p-1.5 rounded-[1.5rem] border border-zinc-800/50 shadow-inner">
              {['Adult', 'Youth', 'Kids'].map((group) => (
                <button
                  key={group}
                  onClick={() => setAgeGroup(group as AgeGroup)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all duration-300 ${
                    ageGroup === group 
                    ? 'bg-gradient-to-b from-zinc-700 to-zinc-900 text-white shadow-xl border border-zinc-700' 
                    : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Intensity Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setIntensity('Regular')}
              className={`relative overflow-hidden group p-5 rounded-[2rem] border-2 transition-all duration-500 ${
                intensity === 'Regular' ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'border-zinc-800 bg-zinc-900/20 grayscale opacity-60'
              }`}
            >
              <Target size={28} className={`mb-3 transition-colors ${intensity === 'Regular' ? 'text-orange-500' : 'text-zinc-700'}`} />
              <div className="text-left">
                <span className="block font-black text-xs uppercase tracking-tighter">Regular</span>
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Foundation</span>
              </div>
            </button>

            <button 
              onClick={() => setIntensity('Intensive')}
              className={`relative overflow-hidden group p-5 rounded-[2rem] border-2 transition-all duration-500 ${
                intensity === 'Intensive' ? 'border-red-600 bg-red-600/5 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'border-zinc-800 bg-zinc-900/20 grayscale opacity-60'
              }`}
            >
              <Flame size={28} className={`mb-3 transition-colors ${intensity === 'Intensive' ? 'text-red-500' : 'text-zinc-700'}`} />
              <div className="text-left">
                <span className="block font-black text-xs uppercase tracking-tighter text-red-500/90">Intensive</span>
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Warrior Mode</span>
              </div>
            </button>
          </div>

          {/* Section: Plan Cards */}
          <div className="space-y-6">
            {getPlans().map((plan) => (
              <div key={plan.id} className="relative group">
                <div className="absolute -inset-[1px] bg-gradient-to-b from-zinc-700 to-transparent rounded-[2.5rem] opacity-50" />
                <div className="relative bg-[#0d0d0d] p-7 rounded-[2.5rem] overflow-hidden border border-white/5">
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black bg-orange-600 text-white px-2 py-0.5 rounded-full uppercase tracking-[0.1em]">
                          {plan.duration}
                        </span>
                        {intensity === 'Intensive' && (
                           <Zap size={10} className="text-red-500 fill-red-500" />
                        )}
                      </div>
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter">{plan.title}</h2>
                    </div>
                    <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-inner">
                        <ShieldCheck className="text-zinc-600 group-hover:text-orange-500 transition-colors" size={24} />
                    </div>
                  </div>

                  <p className="text-zinc-500 text-xs mb-8 leading-relaxed font-medium max-w-[90%]">
                    {plan.desc}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handlePurchase(plan, 'SHELLS')}
                      className="group/btn relative py-5 bg-zinc-900 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 border border-zinc-800 overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-60 group-hover/btn:opacity-100 transition-opacity">
                        <Wallet size={12} className="text-zinc-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Shells</span>
                      </div>
                      <span className="text-base font-black tracking-tight">{plan.shells.toLocaleString()}</span>
                    </button>
                    
                    <button 
                      onClick={() => handlePurchase(plan, 'STARS')}
                      className="group/btn relative py-5 bg-gradient-to-b from-blue-500 to-blue-700 rounded-3xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-[0_10px_20px_rgba(59,130,246,0.2)] border-t border-white/20"
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-80">
                        <Star size={12} className="text-white fill-white" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-100">Stars</span>
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