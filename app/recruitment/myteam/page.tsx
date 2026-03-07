'use client';
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ShieldAlert, Activity, Target } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Fighter {
  id: string;
  name: string;
  imageUrl: string;
  status: string;
  weightClass: string;
  wins: number;
  losses: number;
  salePriceTon?: number;
  ownerId?: string;
  collection?: { name: string };
  isForSale: string;
}

export default function MyRoster() {
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [loading, setLoading] = useState(true);


  
  useEffect(() => {
    const userId = window.Telegram?.WebApp.initDataUnsafe?.user?.id;
    if (userId) {
      // The backend handles the filtering: 
      // Managers get their signed fighters; You get Free Agents/Collections.
      fetch(`/api/fighter/my-team?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          setFighters(data);
          setLoading(false);
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="p-6 border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <Link href="/staking" className="p-2 bg-zinc-900 rounded-full"><ChevronLeft /></Link>
          <div className="text-center">
             <h1 className="text-xl font-black italic uppercase tracking-tighter">Asset Registry</h1>
             <p className="text-[8px] text-blue-500 font-bold uppercase tracking-[0.3em]">PolyCombat Intelligence</p>
          </div>
          <div className="w-10" /> 
        </div>
      </header>

      {/* Roster Grid/List */}
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Syncing with TON Blockchain...</p>
          </div>
        ) : fighters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldAlert size={48} className="text-zinc-800 mb-4" />
            <h2 className="text-sm font-black uppercase text-zinc-400">No PolyCombat NFT Detected</h2>
            <p className="text-[10px] text-zinc-600 mt-1 max-w-[200px]">Unauthorized access to combat data. Secure an asset to proceed.</p>
            <Link href="/recruitment" className="mt-6 px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black uppercase hover:bg-zinc-800 transition-colors">
              Visit Recruitment Office
            </Link>
          </div>
        ) : (
          fighters.map((fighter) => (
            <PolyCombatNFTCard key={fighter.id} fighter={fighter} />
          ))
        )}
      </div>
    </div>
  );
}

function PolyCombatNFTCard({ fighter }: { fighter: Fighter }) {
    const [showIntel, setShowIntel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleListForSale = async () => {
    const price = prompt("Enter listing price (TON):", "5.0");
    if (!price || isNaN(parseFloat(price))) return;

    setIsUpdating(true);
    const res = await fetch('/api/fighter/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighterId: fighter.id, price: parseFloat(price) })
    });
    
    if (res.ok) window.location.reload();
    setIsUpdating(false);
  };

  const handleWithdraw = async () => {
  setIsUpdating(true);
  const res = await fetch('/api/fighters/list', {
    method: 'PATCH', // We'll use PATCH for updating status
    body: JSON.stringify({ fighterId: fighter.id, withdraw: true })
  });
  if (res.ok) window.location.reload();
  setIsUpdating(false);
};



  return (
    <>
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800 flex items-center gap-4 relative"
    >
      {/* NFT Visual */}
      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black border border-zinc-700 shadow-2xl">
        <img src={fighter.imageUrl} className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500" alt="" />
        <div className="absolute top-1 left-1 bg-black/80 px-1 rounded-[2px] border border-white/10">
          <p className="text-[6px] font-black text-blue-400">PC-NFT</p>
        </div>
      </div>
      
      {/* NFT Metadata */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-sm font-black uppercase italic text-white tracking-tight">{fighter.name}</h3>
          <div className="flex items-center gap-1 bg-zinc-800 px-1.5 py-0.5 rounded">
            <Activity size={8} className="text-green-500" />
            <span className="text-[7px] font-black text-zinc-300 uppercase">{fighter.status}</span>
          </div>
        </div>
        
        <p className="text-[9px] text-zinc-500 font-bold uppercase mb-3">
          {fighter.collection?.name || "Independent"} • {fighter.weightClass}
        </p>
        
        <div className="flex gap-2">
          {/* //Inside the return, change the button logic */}
            <button 
            onClick={fighter.isForSale ? handleWithdraw : handleListForSale}
            disabled={isUpdating}
            className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg active:scale-95 transition-all ${
                fighter.isForSale ? 'bg-red-600 text-white' : 'bg-white text-black'
            }`}
            >
            {isUpdating ? "..." : fighter.isForSale ? "Withdraw Asset" : "List for Sale"}
            </button>
        </div>
      </div>

      <button 
          onClick={() => setShowIntel(true)}
          className="px-3 py-2 bg-zinc-800 text-white text-[9px] font-black uppercase rounded-lg"
        >
          <Target size={12} />
        </button>
    </motion.div>
    {/* Intel Modal Overlay */}
      {showIntel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative"
          >
            <button 
              onClick={() => setShowIntel(false)}
              className="absolute top-4 right-4 text-zinc-500"
            >✕</button>

            <h2 className="text-lg font-black italic uppercase text-blue-500 mb-4">Asset Intel</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Combat Record</span>
                <span className="text-[10px] font-mono text-white">{fighter.wins}W - {fighter.losses}L</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Shells Earned</span>
                <span className="text-[10px] font-mono text-yellow-500">{(fighter.wins * 150).toLocaleString()} 🐚</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Ownership ID</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {fighter.ownerId?.slice(0, 6)}...{fighter.ownerId?.slice(-4)}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setShowIntel(false)}
              className="mt-6 w-full py-3 bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Close Intel
            </button>
          </motion.div>
        </div>

        
      )}
    </>
  );
}