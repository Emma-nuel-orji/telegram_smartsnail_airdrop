
import React, { useState } from 'react';
import { ShieldCheck, Zap, Target, Star, Wallet,ChevronLeft,Clock  } from 'lucide-react';
import Link from "next/link";
// Types for our plans
type AgeGroup = 'Adult' | 'Youth' | 'Kids';
type TrainingType = 'Regular' | 'Intensive';

const sagecombat = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [intensity, setIntensity] = useState<TrainingType>('Regular');

  // Pricing & Descriptions Logic
  const getPlans = () => {
    const isIntensive = intensity === 'Intensive';
    const multiplier = isIntensive ? 1.4 : 1; // Intensive is 40% more expensive

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
  const userId = window.Telegram?.WebApp.initDataUnsafe?.user?.id;
  if (!userId) return alert("Please open this in Telegram!");

  const confirmPurchase = confirm(`Enroll in ${plan.title} for ${method === 'SHELLS' ? plan.shells.toLocaleString() + ' Shells' : plan.stars + ' Stars'}?`);
  if (!confirmPurchase) return;

  try {
    let response;

    if (method === 'SHELLS') {
      // 🎯 Corrected: Shells use the subscribe API
      response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: userId, // Backend expects telegramId
          serviceId: plan.id, // Ensure plan.id matches your DB Service ID
          intensity: intensity,
          ageGroup: ageGroup
        })
      });
    } else {
      // ⭐ Stars use the invoice API
      response = await fetch("/api/create-stars-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planId: plan.id, 
          userId: userId,
          priceStars: plan.stars 
        })
      });
      
      const { invoiceLink } = await response.json();
      if (invoiceLink) {
        window?.Telegram?.WebApp.openInvoice(invoiceLink);
      }
      return; // Stop here for Stars as the popup takes over
    }

    const result = await response.json();
    if (result.success) {
      alert("🥊 Training Enrolled! See you at the gym.");
    } else {
      alert(result.error || "Transaction failed.");
    }
  } catch (error) {
    alert("Connection error. Try again later.");
  }
};

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      {/* Header */}
      <header className="mb-6 flex justify-between items-center">
        <Link href="/"><ChevronLeft size={28} /></Link>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">SageCombat</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Training Selection</p>
        </div>
        <div className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 text-[10px] text-yellow-400 font-bold">
          LIVE STATUS: ACTIVE
        </div>
        <Link href="/training/schedule" className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
    <Clock size={20} className="text-blue-400" />
  </Link>
      </header>

      {/* Age Group Selector */}
      <div className="flex bg-zinc-900 p-1 rounded-xl mb-6">
        {['Adult', 'Youth', 'Kids'].map((group) => (
          <button
            key={group}
            onClick={() => setAgeGroup(group as AgeGroup)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              ageGroup === group ? 'bg-white text-black' : 'text-zinc-500'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Intensity Toggle */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest">Training Intensity</h3>
          <span className="text-[10px] text-zinc-600 italic">Intensive includes HIIT & Roadwork</span>
        </div>
       <div className="grid grid-cols-2 gap-4">
  <button 
    onClick={() => setIntensity('Regular')}
    className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${
      intensity === 'Regular' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900/50'
    }`}
  >
    <Target size={20} className={intensity === 'Regular' ? 'text-blue-500' : 'text-zinc-600'} />
    <span className="font-bold">Regular</span>
  </button>

  {/* 🚨 FIX: Changed 'Regular' to 'Intensive' here */}
  <button 
  onClick={() => setIntensity('Intensive')} // Already correct
  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
    intensity === 'Intensive' ? 'border-orange-500 bg-orange-500/20 scale-[1.02]' : 'border-zinc-800 bg-zinc-900/50 opacity-50'
  }`}
>
  <Zap size={24} className={intensity === 'Intensive' ? 'text-orange-400' : 'text-zinc-600'} />
  <span className={`text-xs font-black uppercase ${intensity === 'Intensive' ? 'text-white' : 'text-zinc-500'}`}>
    Intensive
  </span>
</button>
</div>
      </div>

      {/* Plan Cards */}
      <div className="space-y-4">
        {getPlans().map((plan) => (
          <div key={plan.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-black uppercase italic leading-none">{plan.title}</h2>
                <p className="text-zinc-500 text-xs mt-2 pr-10">{plan.desc}</p>
              </div>
              <ShieldCheck className="text-zinc-700" />
            </div>

            <div className="flex gap-3 mt-6">
              <div className="flex-1 bg-black/40 p-3 rounded-2xl border border-zinc-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <Wallet size={12} className="text-yellow-500" />
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Shells</span>
                </div>
                <div className="text-lg font-black">{plan.shells.toLocaleString()}</div>
              </div>
              <div className="flex-1 bg-black/40 p-3 rounded-2xl border border-zinc-800/50">
                <div className="flex items-center gap-1 mb-1">
                  <Star size={12} className="text-blue-400" />
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Stars</span>
                </div>
                <div className="text-lg font-black">{plan.stars.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
            <button 
              onClick={() => handlePurchase(plan, 'SHELLS')}
              className="py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Pay with Shells
            </button>
            <button 
              onClick={() => handlePurchase(plan, 'STARS')}
              className="py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/40"
            >
              Pay with Stars
            </button>
          </div>
          </div>
        ))}

        {/* 1-on-1 Special Card */}
        <div className="mt-8 p-[2px] rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-600">
            <div className="bg-black rounded-[22px] p-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded">EXCLUSIVE</span>
                    <span className="text-zinc-400 text-xs">Custom Schedule</span>
                </div>
                <h2 className="text-2xl font-black italic uppercase">1-on-1 Coaching</h2>
                <p className="text-zinc-500 text-sm mt-2">Personal trainer, customized meal plan, and 24/7 support.</p>
                <button className="w-full mt-6 py-3 bg-white text-black font-black uppercase rounded-xl">Contact for Pricing</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default sagecombat;