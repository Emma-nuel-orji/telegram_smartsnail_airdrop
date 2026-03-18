"use client";
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Users, Search, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

// Simple Component for Access Denied (Fixes your "Cannot find name" error)
const AccessDeniedUI = () => (
  <div className="min-h-screen bg-black flex items-center justify-center p-10 text-center">
    <div className="bg-zinc-900 border border-red-900/50 p-8 rounded-[3rem] shadow-2xl">
      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="text-red-500" size={32} />
      </div>
      <h2 className="text-red-500 font-black uppercase italic text-xl tracking-tighter">Access Denied</h2>
      <p className="text-zinc-500 text-xs mt-2 font-bold uppercase tracking-widest">Trainers & Admins Only 🥊</p>
      <Link href="/" className="mt-6 inline-block text-[10px] font-black uppercase bg-white text-black px-6 py-3 rounded-xl">Return Home</Link>
    </div>
  </div>
);

export default function ManagerDashboard() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const userId = webApp?.initDataUnsafe?.user?.id?.toString();

  useEffect(() => {
    if (userId) {
      setLoading(true);
      fetch(`/api/all-subscriptions?adminId=${userId}`)
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            setIsAuthorized(false);
            throw new Error("Unauthorized");
          }
          return res.json();
        })
        .then((data) => {
          setSubscriptions(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [userId]);

  // Search filter logic
  const filteredSubs = subscriptions.filter(sub => 
    sub.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.planTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthorized) return <AccessDeniedUI />;
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-20">
      <header className="mb-8 flex justify-between items-center">
        <Link href="/gym/sagecombat"><ChevronLeft size={28} /></Link>
        <div className="text-right">
            <h1 className="text-2xl font-black italic uppercase leading-none">Trainer Portal</h1>
            <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Global Roster</span>
        </div>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text" 
          placeholder="Search students..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 py-4 pl-12 pr-4 rounded-2xl text-sm focus:outline-none focus:border-blue-500 transition-all"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">
            Active Members ({filteredSubs.length})
        </h3>
        
        {filteredSubs.length === 0 ? (
            <p className="text-zinc-600 text-xs italic p-4 text-center bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">No students found.</p>
        ) : (
          filteredSubs.map((sub) => (
            <div key={sub.id} className="bg-zinc-900 p-5 rounded-[2rem] border border-zinc-800 flex justify-between items-center">
              <div>
                <p className="font-black uppercase text-sm italic">{sub.user?.firstName || 'Trainee'}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">
                  {sub.planTitle} • <span className="text-emerald-500">{sub.gymName || 'Partner Gym'}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-black text-xs uppercase tracking-tighter">Verified</p>
                <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">Status: {sub.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}