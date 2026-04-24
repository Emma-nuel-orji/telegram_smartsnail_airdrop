'use client';
import React from 'react';
import Link from "next/link";
import { 
  ChevronLeft, 
  Trophy, 
  Flame, 
  Target, 
  Coins, 
  Zap, 
  BookOpen,
  LineChart,
  ShieldAlert
} from 'lucide-react';

const InfoPage = () => {
  return (
    <div className="task-container pb-20 bg-slate-950 text-white">
      {/* 1. NAVIGATION & BRANDING */}
      <header className="flex items-center gap-4 p-6 border-b border-white/5 bg-black/20 sticky top-0 z-10 backdrop-blur-md">
        <Link href="/">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 active:scale-90 transition-all">
            <ChevronLeft size={24} className="text-emerald-400" />
          </div>
        </Link>
        <h2 className="text-lg font-black tracking-widest uppercase">Protocol Intel</h2>
      </header>

      {/* 2. THE BIG VISION */}
      <section className="p-6 text-center">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
          <img src="/images/info/logo-snail.png" alt="SmartSnail" className="relative z-10 w-full h-full object-contain" />
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter mb-4 leading-tight">
          SMARTSNAIL <br /><span className="text-emerald-400 font-normal not-italic uppercase text-2xl">Syndicate</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
          We are bridging the gap between digital ownership and real-world dominance. From RWA marketplaces to high-stakes combat, SmartSnail is the mother-app for the next generation of Web3 fans.
        </p>
      </section>

      {/* 3. MVP STATUS: THE GRIND BEFORE THE GLORY */}
      <div className="px-4 mb-10">
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-blue-600/10 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={24} className="text-yellow-400 animate-bounce" />
            <h3 className="text-xl font-bold uppercase tracking-tight">Phase 1: The Accumulation</h3>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            The tokens don't exist yet—and that is your advantage. You are earning **Shells (Points)**. Upon TGE (Token Generation Event), these points transform into real liquidity based on your NFT holdings.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Status</p>
              <p className="text-xs text-emerald-400 font-mono">Live Testing</p>
            </div>
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Goal</p>
              <p className="text-xs text-blue-400 font-mono">Token Airdrop</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. THE MVP CORE: POLYCOMBAT & RWA */}
      <div className="px-4 space-y-6 mb-12">
        <h3 className="text-xs uppercase tracking-[0.3em] text-gray-600 font-black ml-2">Core Ecosystem MVPs</h3>

        {/* POLYCOMBAT CARD */}
        <div className="relative p-6 rounded-3xl bg-white/5 border border-white/10 group overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Trophy size={150} />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <Flame size={24} className="text-orange-500" />
            <h4 className="text-lg font-bold">PolyCombat: Fight-to-Earn</h4>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            Think of **NFT Teams** (SmartSnail vs. Manchies) as Football Clubs. You back your fighters, fund their training, and stake your reputation on their victory.
          </p>
          
          <div className="space-y-4 p-4 bg-black/40 rounded-2xl border border-white/5">
            <h5 className="text-[10px] text-emerald-400 uppercase font-black tracking-widest">The "Buyback" Mechanic</h5>
            <p className="text-[11px] text-gray-500 leading-normal">
              When a fight ends, the losing team's staked pool is used to buy back and burn the winning team's tokens. **Win the fight = Pump your token.**
            </p>
          </div>
        </div>

        {/* MARKETPLACE CARD */}
        <div className="relative p-6 rounded-3xl bg-white/5 border border-white/10 group overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <BookOpen size={150} />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <LineChart size={24} className="text-blue-400" />
            <h4 className="text-lg font-bold">RWA Marketplace</h4>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            Real-world assets (like books and collectibles) tokenized as NFTs. Authors earn perpetual royalties, and readers become part-owners of the knowledge they trade.
          </p>
          <div className="flex gap-2">
            <span className="text-[10px] py-1 px-3 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 italic">#IP-Rights</span>
            <span className="text-[10px] py-1 px-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 italic">#Royalties</span>
          </div>
        </div>
      </div>

      {/* 5. TOKEN CONVERSION LOGIC */}
      <div className="px-4 mb-12">
        <div className="p-6 rounded-[2rem] bg-black/60 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
             <Target size={18} className="text-emerald-500" /> Airdrop Multipliers
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-white uppercase">$SHELLS</p>
                <p className="text-[10px] text-gray-500">SmartSnail NFT Holders</p>
              </div>
              <p className="text-xs font-mono text-emerald-400 font-bold">Priority Distro</p>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-white uppercase">$MEN</p>
                <p className="text-[10px] text-gray-500">Manchies NFT Holders</p>
              </div>
              <p className="text-xs font-mono text-pink-400 font-bold">Secondary Distro</p>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-white uppercase">$COMBAT</p>
                <p className="text-[10px] text-gray-500">Active Fight Stakers</p>
              </div>
              <p className="text-xs font-mono text-blue-400 font-bold">Performance Bonus</p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 flex gap-3">
            <ShieldAlert size={16} className="text-emerald-500 shrink-0" />
            <p className="text-[10px] text-gray-400">
              Your final distribution ratio depends on your asset portfolio. Hold SmartSnails to maximize $SHELLS; hold Manchies to maximize $MEN. Participation in fights earns $COMBAT.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="text-center p-8 opacity-20">
        <p className="text-[9px] uppercase tracking-widest font-black">SmartSnail Ecosystem v1.0.4 - Web3ChinonSolutions</p>
      </footer>
    </div>
  );
};

export default InfoPage;