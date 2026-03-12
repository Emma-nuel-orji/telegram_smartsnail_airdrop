"use client";
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Users, CheckCircle, Search } from 'lucide-react';
import Link from 'next/link';

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;

export default function ManagerDashboard() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const userId = webApp?.initDataUnsafe?.user?.id?.toString();

useEffect(() => {
  // 1. Only run this if the user is actually logged in and is the admin
  if (userId && userId === ADMIN_ID) {
    
    // 2. We add the ID to the end of the URL (this is a 'Query Parameter')
    // It looks like: /api/gym/all-subscriptions?adminId=795571382
    fetch(`/api/all-subscriptions?adminId=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setSubscriptions(data);
        setLoading(false);
      })
      .catch((err) => console.error("Access denied by API"));
  }
}, [userId]);

  if (!userId || userId !== ADMIN_ID){
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-10 text-center">
        <div className="bg-zinc-900 border border-red-900/50 p-6 rounded-3xl">
          <h2 className="text-red-500 font-black uppercase italic text-xl">Access Denied</h2>
          <p className="text-zinc-500 text-sm mt-2">Trainers Only 🥊</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="mb-8 flex justify-between items-center">
        <Link href="/gym/sagecombat"><ChevronLeft size={28} /></Link>
        <h1 className="text-2xl font-black italic uppercase">Trainer Portal</h1>
        <Users className="text-blue-500" />
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text" 
          placeholder="Search students..." 
          className="w-full bg-zinc-900 border border-zinc-800 py-4 pl-12 pr-4 rounded-2xl text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">Active Trainees</h3>
        
        {loading ? (
          <p className="text-zinc-600 text-xs italic">Loading roster...</p>
        ) : (
          subscriptions.map((sub) => (
            <div key={sub.id} className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="font-black uppercase text-sm italic">{sub.user.firstName || 'Trainee'}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">
                  {sub.planTitle} • {sub.status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-black text-xs uppercase">Progress</p>
                <p className="text-[10px] text-zinc-600 font-bold uppercase">Auto-checked: 5</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}