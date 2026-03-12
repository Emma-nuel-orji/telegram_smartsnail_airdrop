"use client";
import React, { useState } from 'react';
import { ShieldCheck, Zap, Target, Star, Wallet, ChevronLeft, Clock } from 'lucide-react';
import Link from "next/link";

type AgeGroup = 'Adult' | 'Youth' | 'Kids';
type TrainingType = 'Regular' | 'Intensive';

const SageCombat = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [intensity, setIntensity] = useState<TrainingType>('Regular');

  const getPlans = () => {
    const isIntensive = intensity === 'Intensive';
    const multiplier = isIntensive ? 1.4 : 1;

    return [
      {
        id: 'walk-in',
        title: 'Walk-In Session',
        desc: isIntensive ? 'High-intensity HIIT + Boxing circuit.' : 'Standard boxing fundamentals & bag work.',
        shells: 25000 * multiplier,
        stars: 135 * multiplier,
        duration: 'Single Class'
      },
      {
        id: '3-months',
        title: '3 Months Pro',
        desc: isIntensive ? 'Full body transformation & roadwork.' : 'Technical mastery & sparring prep.',
        shells: 250000 * multiplier,
        stars: 1350 * multiplier,
        duration: '3 Months'
      },
      {
        id: '6-months',
        title: '6 Months Elite',
        desc: isIntensive ? 'The ultimate weight loss & cardio engine.' : 'Advanced fight camp & conditioning.',
        shells: 500000 * multiplier,
        stars: 13500 * multiplier,
        duration: '6 Months'
      }
    ];
  };

  const handlePurchase = async (plan: any, method: 'SHELLS' | 'STARS') => {
    const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const userId = webApp?.initDataUnsafe?.user?.id;
    
    if (!userId) return alert("Please open this in Telegram!");

    const confirmPurchase = confirm(`Enroll in ${plan.title} for ${method === 'SHELLS' ? plan.shells.toLocaleString() + ' Shells' : plan.stars + ' Stars'}?`);
    if (!confirmPurchase) return;

    try {
      if (method === 'STARS') {
        // 1. Create the Invoice for Telegram Stars
        const response = await fetch("/api/create-stars-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id, userId, priceStars: plan.stars })
        });
        const { invoiceLink } = await response.json();
        if (invoiceLink) {
          webApp.openInvoice(invoiceLink); // Opens the Stars payment popup
        }
      } else {
        // 2. Handle Shells via Subscription API
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramId: userId,
            serviceId: plan.id,
            planTitle: plan.title,
            intensity: intensity,
            ageGroup: ageGroup
          })
        });

        const result = await response.json();
        if (result.success) {
          alert("🥊 Training Enrolled! See you at the gym.");
        } else {
          alert(result.error || "Transaction failed.");
        }
      }
    } catch (error) {
      alert("Connection error. Try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans pb-10">
      {/* Header */}
      <header className="mb-6 flex justify-between items-center">
        <Link href="/"><ChevronLeft size={28} /></Link>
        <div className="text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">SageCombat</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Boxing</p>
        </div>
        <Link href="/schedule" className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <Clock size={22} className="text-blue-400" />
        </Link>
      </header>

      {/* Age Group Selector */}
      <div className="flex bg-zinc-900/50 p-1 rounded-2xl mb-8 border border-zinc-800/50">
        {['Adult', 'Youth', 'Kids'].map((group) => (
          <button
            key={group}
            onClick={() => setAgeGroup(group as AgeGroup)}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              ageGroup === group ? 'bg-white text-black shadow-lg' : 'text-zinc-500'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Intensity Toggle - FIXED THE DOUBLE REGULAR BUG */}
      <div className="mb-8">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4 ml-1">Intensity Level</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setIntensity('Regular')}
            className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${
              intensity === 'Regular' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900/40 opacity-60'
            }`}
          >
            <Target size={24} className={intensity === 'Regular' ? 'text-blue-500' : 'text-zinc-600'} />
            <span className="font-black text-xs uppercase tracking-tighter">Regular</span>
          </button>

          <button 
            onClick={() => setIntensity('Intensive')}
            className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${
              intensity === 'Intensive' ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900/40 opacity-60'
            }`}
          >
            <Zap size={24} className={intensity === 'Intensive' ? 'text-orange-500' : 'text-zinc-600'} />
            <span className="font-black text-xs uppercase tracking-tighter">Intensive</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="space-y-4">
        {getPlans().map((plan) => (
          <div key={plan.id} className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-[2.5rem] relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black uppercase italic leading-none">{plan.title}</h2>
                <div className="flex gap-2 mt-2">
                  <span className="text-[9px] font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 uppercase tracking-widest">{plan.duration}</span>
                </div>
              </div>
              <ShieldCheck className="text-zinc-700" size={28} />
            </div>

            <p className="text-zinc-400 text-xs mb-8 leading-relaxed font-medium">{plan.desc}</p>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handlePurchase(plan, 'SHELLS')}
                className="py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 border border-zinc-700/50"
              >
                <div className="flex items-center gap-1 mb-1">
                  <Wallet size={12} className="text-yellow-500" />
                  <span className="text-[10px] font-black uppercase text-zinc-400">Shells</span>
                </div>
                <span className="text-sm font-black tracking-tight">{plan.shells.toLocaleString()}</span>
              </button>
              
              <button 
                onClick={() => handlePurchase(plan, 'STARS')}
                className="py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg shadow-blue-900/40"
              >
                <div className="flex items-center gap-1 mb-1">
                  <Star size={12} className="text-white" />
                  <span className="text-[10px] font-black uppercase text-blue-100">Stars</span>
                </div>
                <span className="text-sm font-black tracking-tight">{plan.stars.toLocaleString()}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SageCombat;