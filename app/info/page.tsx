'use client';
import React from 'react';
import Link from "next/link";
import { 
  ChevronLeft, 
  TrendingUp, 
  Users, 
  Target, 
  Layers, 
  Calculator,
  Trophy
} from 'lucide-react';

const InfoPage = () => {
  return (
    <div className="task-container pb-20">
      <header className="task-header">
        <Link href="/">
          <div className="p-2 bg-white/5 rounded-xl border border-white/10">
            <ChevronLeft size={24} color="#00ffa3" />
          </div>
        </Link>
        <h2>MVP Protocol & Airdrop</h2>
      </header>

      {/* THE MVP MISSION */}
      <section className="mb-8 px-4">
        <div className="p-5 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20">
          <h1 className="text-2xl font-black text-white mb-2">EARN YOUR ALLOCATION</h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            We are currently in the **Testing & Accumulation Phase**. The "Shells" you earn today are points that track your ecosystem contribution. Upon TGE (Token Generation Event), these points convert into real **$SHELLS**, **$MEN**, and **$COMBAT** tokens.
          </p>
        </div>
      </section>

      {/* THE POLYCOMBAT REVOLUTION */}
      <div className="px-2 mb-8">
        <h3 className="text-[10px] uppercase tracking-widest text-emerald-400 font-black mb-3 ml-2">PolyCombat Economy</h3>
        <div className="task-row-web3 block border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <Trophy size={20} className="text-yellow-500" />
            <h4 className="text-white font-bold">The Fight-to-Earn Model</h4>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal mb-4">
            NFT Teams (SmartSnail & Manchies) act as "Managers" for fighters. Teams stake tokens on their athletes. 
            <span className="block mt-2 text-emerald-400 font-bold">The Winner's Edge:</span> 
            A portion of the losing team's stake is used to buy back the winning team's tokens from the market, increasing value for all holders.
          </p>
          <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-mono">Current MVP Teams:</span>
            <div className="flex gap-2">
              <span className="text-[9px] text-white bg-purple-600 px-2 py-0.5 rounded">SmartSnail</span>
              <span className="text-[9px] text-white bg-pink-600 px-2 py-0.5 rounded">Manchies</span>
            </div>
          </div>
        </div>
      </div>

      {/* AIRDROP CALCULATOR LOGIC */}
      <div className="px-2 mb-8">
        <h3 className="text-[10px] uppercase tracking-widest text-gray-500 font-black mb-3 ml-2">Distribution Logic</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={18} className="text-blue-400" />
              <h4 className="text-white font-bold text-sm">Portfolio-Based Conversion</h4>
            </div>
            <p className="text-[11px] text-gray-400 mb-4">
              Your "Shells" points will be converted into tokens based on the NFT assets you hold at the time of the snapshot:
            </p>
            <ul className="space-y-3">
              <li className="flex justify-between items-center text-[11px]">
                <span className="text-gray-300 italic">Holding 100% SmartSnail</span>
                <span className="text-emerald-400 font-bold">→ 100% $SHELLS</span>
              </li>
              <li className="flex justify-between items-center text-[11px]">
                <span className="text-gray-300 italic">Holding Mixed Assets</span>
                <span className="text-blue-400 font-bold">→ Split $SHELLS / $MEN</span>
              </li>
              <li className="flex justify-between items-center text-[11px]">
                <span className="text-gray-300 italic">Active Fight Participation</span>
                <span className="text-yellow-500 font-bold">→ Bonus $COMBAT</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="text-center px-6 opacity-40">
        <p className="text-[10px] text-gray-400 italic">Experimental MVP Economy — Subject to Protocol Adjustments</p>
      </footer>
    </div>
  );
};

export default InfoPage;