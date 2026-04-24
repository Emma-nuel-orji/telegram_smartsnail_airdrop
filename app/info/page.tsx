'use client';
import React from 'react';
import Link from "next/link";
import { 
  ChevronLeft, 
  LayoutGrid, 
  ShoppingBag, 
  Sword, 
  Zap, 
  ArrowUpRight, 
  ShieldCheck,
  Info,
  Timer,
  Layers,
  CircleDollarSign
} from 'lucide-react';

const InfoPage = () => {
  return (
    <div className="min-h-screen pb-20 bg-[#050505] text-white font-sans">
      {/* 1. STICKY NAVIGATION */}
      <header className="flex items-center gap-4 p-6 border-b border-white/5 bg-black/40 sticky top-0 z-50 backdrop-blur-xl">
        <Link href="/">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 active:scale-95 transition-all cursor-pointer">
            <ChevronLeft size={24} className="text-emerald-400" />
          </div>
        </Link>
        <h2 className="text-sm font-black tracking-[0.3em] uppercase text-emerald-400">System Intelligence</h2>
      </header>

      {/* 2. THE ECOSYSTEM ARCHITECTURE */}
      <section className="p-8 text-center border-b border-white/5 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
          <LayoutGrid size={14} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Central Ecosystem Hub</span>
        </div>
        <h1 className="text-5xl font-black italic tracking-tighter mb-4">
          SMARTSNAIL <span className="text-emerald-400 not-italic">APP</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
          The SmartSnail App is the master hosting platform for a new era of Web3 utility. It currently serves as the bridge for two revolutionary MVPs.
        </p>
      </section>

      {/* 3. THE TWO MVPs: INDEBT BREAKDOWN */}
      <div className="px-4 py-8 space-y-8">
        
        {/* MVP 1: MARKETPLACE */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative p-8 rounded-[2.5rem] bg-black border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <ShoppingBag size={28} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10 uppercase tracking-tighter">MVP: RWA Marketplace</span>
            </div>
            <h3 className="text-2xl font-black mb-3 text-white uppercase tracking-tight italic">SmartSnail Marketplace</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Redefining **Real World Assets (RWA)**. We tokenize physical items into high-utility NFTs. Our first mission: The Book Industry.
            </p>
            <ul className="space-y-3 mb-6">
              {[
                "Authors earn perpetual royalties on all secondary sales.",
                "Readers own tradeable digital assets, not just access.",
                "Interactive AI/VR integration for next-gen reading."
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[11px] text-gray-500">
                  <ArrowUpRight size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* MVP 2: POLYCOMBAT */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative p-8 rounded-[2.5rem] bg-black border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Sword size={28} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10 uppercase tracking-tighter">MVP: Athlete Syndicate</span>
            </div>
            <h3 className="text-2xl font-black mb-3 text-white uppercase tracking-tight italic">PolyCombat Sports</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              A sports ecosystem where NFT teams fund and manage athletes like professional football clubs. 
            </p>
            
            {/* MVP vs FULL LAUNCH CALLOUT */}
            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20 space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-blue-400">
                  <Timer size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active MVP Feature</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-normal">
                  Users currently stake **accumulated Shells/Points** on real-world fights to multiply their holdings before the real token launch.
                </p>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/40">
                  <ShieldCheck size={14} />
                  <span className="text-[9px] uppercase font-bold tracking-tight">Full Launch Economy</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  At full launch, our **Buy-Back Mechanism** goes live: losing team stakes are used to buy back the winning team's tokens, driving instant market value.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. THE ASSET-TO-TOKEN PIPELINE (CLEAR CLARITY) */}
      <div className="px-6 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} className="text-yellow-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Asset & Tokenization Logic</h3>
        </div>
        
        <div className="p-6 rounded-[2.5rem] bg-white/5 border border-white/5 space-y-6">
          <p className="text-xs text-gray-400 leading-relaxed">
            In this ecosystem, <span className="text-white font-bold underline underline-offset-4 decoration-emerald-500">Assets = NFTs</span>. Your Points/Shells convert into Tokens based on the specific NFT assets you hold in your portfolio.
          </p>

          <div className="space-y-3">
            {/* SNAIL TO SHELLS */}
            <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">The Asset (NFT)</span>
                <span className="text-xs text-white font-bold">SmartSnail NFT</span>
              </div>
              <ArrowUpRight size={16} className="text-emerald-500 mx-2" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">The Token (Coin)</span>
                <span className="text-xs text-emerald-400 font-black">$SHELLS</span>
              </div>
            </div>

            {/* MANCHIES TO MEN */}
            <div className="flex items-center justify-between p-4 bg-pink-500/5 rounded-2xl border border-pink-500/10">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">The Asset (NFT)</span>
                <span className="text-xs text-white font-bold">Manchies NFT</span>
              </div>
              <ArrowUpRight size={16} className="text-pink-500 mx-2" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">The Token (Coin)</span>
                <span className="text-xs text-pink-400 font-black">$MEN</span>
              </div>
            </div>

            {/* COMBAT TOKEN */}
            <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">The Activity</span>
                <span className="text-xs text-white font-bold">Fight Staking</span>
              </div>
              <ArrowUpRight size={16} className="text-blue-500 mx-2" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">The Token (Coin)</span>
                <span className="text-xs text-blue-400 font-black">$COMBAT</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign size={14} className="text-yellow-500" />
                <h4 className="text-[10px] font-black text-yellow-500 uppercase">Conversion Rule:</h4>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed italic">
              "Your NFT portfolio acts as the distribution key. If you hold only SmartSnail NFTs, your points convert to $SHELLS. If you hold a 50/50 mix of Snails and Manchies, your conversion is split 50/50. No NFT = No Token Conversion."
            </p>
          </div>
        </div>
      </div>

      {/* 5. FOOTER */}
      <footer className="p-12 text-center border-t border-white/5">
        <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] font-black mb-2">
          Web3ChinonSolutions
        </p>
        <p className="text-[8px] text-gray-700 uppercase">
          Ecosystem Protocol v1.0.4 - All Rights Reserved
        </p>
      </footer>
    </div>
  );
};

export default InfoPage;