"use client";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Target, Star, Wallet, ChevronLeft, Clock, Loader2 } from 'lucide-react';
import Link from "next/link";
import CombatProgress from "./CombatProgress";
type AgeGroup = 'Adult' | 'Youth' | 'Kids';
type TrainingType = 'Regular' | 'Intensive';

const SageCombat = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [intensity, setIntensity] = useState<TrainingType>('Regular');
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH SUBSCRIPTION ON LOAD ---
  useEffect(() => {
    const fetchSub = async () => {
      const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      const userId = webApp?.initDataUnsafe?.user?.id;
      if (!userId) return setLoading(false);

      const res = await fetch(`/api/subscription/${userId}`);
      const data = await res.json();
      setSubscription(data);
      setLoading(false);
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

if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans pb-10">
      {/* Header */}
      <header className="mb-6 flex justify-between items-center">
        <Link href="/"><ChevronLeft size={28} /></Link>
        <div className="text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">SageCombat</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Boxing Dashboard</p>
        </div>
        {/* Link to Trainer Portal */}
        <Link href="/gym/manager" className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <Clock size={22} className="text-orange-500" />
        </Link>
      </header>

      {/* --- DYNAMIC VIEW TRANSFORMATION --- */}
      {subscription?.isActive ? (
        // STATE A: User has an active subscription
        <div className="space-y-6">
          <CombatProgress 
            sub={subscription} 
            needsSchedule={!subscription.trainingDays || subscription.trainingDays.length === 0} 
          />
          
          <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800/50">
            <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2 text-center">Current Plan</h4>
            <p className="text-xl font-black italic uppercase text-center">{subscription.planTitle}</p>
          </div>
        </div>
      ) : (
        // STATE B: No active subscription (Show the Shop)
        <>
          {/* Age Group Selector Code... */}
          {/* Intensity Toggle Code... */}
          {/* Plan Cards Code... */}
        </>
      )}
    </div>
  );
};

export default SageCombat;