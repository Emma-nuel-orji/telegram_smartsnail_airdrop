"use client";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Target, Star, Wallet, ChevronLeft, Clock, Loader2, Dumbbell } from 'lucide-react';
import Link from "next/link";
import CombatProgress from "./CombatProgress";

type AgeGroup = 'Adult' | 'Youth' | 'Kids';
type TrainingType = 'Regular' | 'Intensive';

const SageCombat = () => {
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('Adult');
  const [intensity, setIntensity] = useState<TrainingType>('Regular');
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSub = async () => {
      const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      const userId = webApp?.initDataUnsafe?.user?.id;
      if (!userId) return setLoading(false);

      try {
        const res = await fetch(`/api/subscription/${userId}`);
        if (res.ok) {
          const data = await res.json();
          // We check the 'status' field from our database
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
        desc: isIntensive ? 'High-intensity HIIT + Boxing circuit.' : 'Standard boxing fundamentals.',
        shells: 25000 * multiplier,
        stars: 135 * multiplier,
        duration: 'Single Class'
      },
      {
        id: '3-months',
        title: '3 Months Pro',
        desc: isIntensive ? 'Full body transformation.' : 'Technical mastery & sparring.',
        shells: 250000 * multiplier,
        stars: 1350 * multiplier,
        duration: '3 Months'
      }
    ];
  };

  const handlePurchase = async (plan: any) => {
    const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const userId = webApp?.initDataUnsafe?.user?.id;
    if (!userId) return alert("Open in Telegram");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: userId,
          serviceId: plan.id, // Ensure this matches an ID in your Service table
          planTitle: plan.title,
          intensity: intensity,
          ageGroup: ageGroup,
          duration: plan.duration
        })
      });

      const result = await response.json();
      if (result.success) {
        alert("🥊 Enrollment Successful!");
        window.location.reload();
      }
    } catch (error) {
      alert("Error processing purchase.");
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans pb-10">
      <header className="mb-6 flex justify-between items-center">
        <Link href="/"><ChevronLeft size={28} /></Link>
        <div className="text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">SageCombat</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Boxing Dashboard</p>
        </div>
        <Link href="/gym/manager" className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
          <Clock size={22} className="text-orange-500" />
        </Link>
      </header>

      {/* Check status 'ACTIVE' (Matches your DB/API) */}
      {subscription && subscription.status === 'ACTIVE' ? (
        <div className="space-y-6">
          <CombatProgress 
            sub={subscription} 
            needsSchedule={!subscription.trainingDays || subscription.trainingDays.length === 0} 
          />
          <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800/50">
            <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2 text-center">Active Membership</h4>
            <p className="text-xl font-black italic uppercase text-center">{subscription.planTitle}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Intensity Toggle */}
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
            {(['Regular', 'Intensive'] as TrainingType[]).map((t) => (
              <button
                key={t}
                onClick={() => setIntensity(t)}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${intensity === t ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Plan Cards */}
          <div className="grid gap-4">
            {getPlans().map((plan) => (
              <div key={plan.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-black italic uppercase">{plan.title}</h3>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase">{plan.duration}</p>
                  </div>
                  <Zap className={intensity === 'Intensive' ? 'text-orange-500' : 'text-zinc-700'} size={20} />
                </div>
                <p className="text-zinc-400 text-xs mb-6 leading-relaxed">{plan.desc}</p>
                
                <button 
                  onClick={() => handlePurchase(plan)}
                  className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                >
                  Join Camp • {plan.shells.toLocaleString()} Shells
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SageCombat;