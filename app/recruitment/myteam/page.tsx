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
             <h1 className="text-xl font-black italic uppercase tracking-tighter">POLYCOMBAT NFTs</h1>
             <p className="text-[8px] text-blue-500 font-bold uppercase tracking-[0.3em]">YOUR COLLECTIONS</p>
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
  const userId = window.Telegram?.WebApp.initDataUnsafe?.user?.id;
  
  // Define your Admin/Primary Seller ID
  const PRIMARY_SELLER_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID; 
  const isPrimaryAsset = !fighter.ownerId || fighter.ownerId === PRIMARY_SELLER_ID;

  // Calculate equivalent (e.g., 1 TON = 1000 Shells)
  const tonPrice = fighter.salePriceTon || 5.0;
  const shellEquivalent = Math.floor(tonPrice * 1000);
  const [showIntel, setShowIntel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const nftSerialNumber = fighter.id.slice(-4).toUpperCase();
 const handleListForSale = async () => {
  const price = prompt("Enter listing price (TON):", "5.0");
  if (!price || isNaN(parseFloat(price))) return;

  setIsUpdating(true); // Start loading spinner
  
  try {
    const res = await fetch('/api/fighter/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighterId: fighter.id, price: parseFloat(price) })
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ SUCCESS: Now it's safe to reload or update state
      window.location.reload(); 
    } else {
      // ❌ API FAILED: Revert UI and explain why
      alert(`Listing Failed: ${data.error || "Server Error"}`);
    }
  } catch (err) {
    // ❌ NETWORK FAILED
    alert("Check your connection. The blockchain sync failed.");
  } finally {
    setIsUpdating(false); // Stop loading spinner
  }
};

  const handleWithdraw = async () => {
  setIsUpdating(true);
  const res = await fetch('/api/fighter/list', {
    method: 'PATCH', // We'll use PATCH for updating status
    body: JSON.stringify({ fighterId: fighter.id, withdraw: true })
  });
  if (res.ok) window.location.reload();
  setIsUpdating(false);
};



 return (
  <>
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group bg-gradient-to-b from-zinc-800/40 to-black p-[1px] rounded-3xl border border-white/5 hover:border-blue-500/50 transition-all duration-500 overflow-hidden"
    >
      {/* Holographic Scanline Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_5s_infinite] pointer-events-none" />

      <div className="bg-[#0a0a0a] rounded-[23px] p-4 flex flex-col gap-4 relative z-10">
        
        <div className="flex items-center gap-4">
          {/* NFT Visual Container */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 relative z-10">
              <img 
                src={fighter.imageUrl} 
                className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" 
                alt={fighter.name} 
              />
              <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 py-0.5">
                 <p className="text-[6px] text-center font-black text-white uppercase tracking-widest">AUTHENTIC</p>
              </div>
            </div>
            <div className="absolute -inset-1 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* Metadata */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold text-blue-500 tracking-[0.2em]">#{fighter.id.slice(-4).toUpperCase()}</span>
                  <div className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">{fighter.weightClass}</span>
                </div>
                <h3 className="text-sm font-black uppercase italic text-white tracking-tight mt-0.5 group-hover:text-blue-400 transition-colors">
                  {fighter.name}
                </h3>
              </div>
              
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                fighter.isForSale ? 'border-orange-500/30 bg-orange-500/10' : 'border-green-500/30 bg-green-500/10'
              }`}>
                <div className={`w-1 h-1 rounded-full animate-pulse ${fighter.isForSale ? 'bg-orange-500' : 'bg-green-500'}`} />
                <span className={`text-[7px] font-black uppercase ${fighter.isForSale ? 'text-orange-400' : 'text-green-400'}`}>
                  {fighter.isForSale ? 'MARKET_LISTED' : '1 of 1'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- DUAL CURRENCY DISPLAY BLOCK --- */}
        <div className="bg-zinc-900/50 rounded-2xl p-3 border border-white/5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Market Valuation</span>
            <span className="text-[7px] font-black text-blue-500 uppercase">
              {isPrimaryAsset ? "Direct TON Payout" : "Internal Points Credit"}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            {isPrimaryAsset ? (
              <span className="text-lg font-black italic text-white">{tonPrice} TON</span>
            ) : (
              <>
                <span className="text-lg font-black italic text-yellow-500">{shellEquivalent.toLocaleString()} SHELLS</span>
                <span className="text-[8px] text-zinc-600 font-bold uppercase">(≈ {tonPrice} TON)</span>
              </>
            )}
          </div>

          {!isPrimaryAsset && fighter.isForSale && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-[7px] text-zinc-500 uppercase font-bold leading-tight">
                Manager Notice: Secondary sales are credited as 
                <span className="text-yellow-500"> Shells</span> to your Asset Registry balance.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
            <button 
              onClick={fighter.isForSale ? handleWithdraw : handleListForSale}
              disabled={isUpdating}
              className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl border transition-all ${
                  fighter.isForSale 
                  ? 'border-red-900/50 bg-red-950/20 text-red-500 hover:bg-red-900/40' 
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {isUpdating ? "SYNCING..." : fighter.isForSale ? "Withdraw Asset" : "List for Sale"}
            </button>

            <button 
              onClick={() => setShowIntel(true)}
              className="px-3 bg-blue-600/10 border border-blue-500/30 text-blue-500 rounded-xl hover:bg-blue-600/20 transition-all"
            >
              <Target size={14} />
            </button>
        </div>
      </div>
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