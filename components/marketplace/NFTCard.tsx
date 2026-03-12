"use client";

import { Check, Sparkles, Diamond, Zap } from 'lucide-react';
import { Nft, Rarity } from "@/lib/types";

type NFTCardProps = {
  nft: Nft;
  onClick?: () => void;
};

const RARITY_COLORS: Record<Rarity, string> = {
  Common: 'from-gray-400 to-gray-600',
  Uncommon: 'from-green-400 to-emerald-600',
  Rare: 'from-blue-400 to-cyan-600',
  Epic: 'from-purple-500 to-pink-600',
  Legendary: 'from-orange-400 to-yellow-600'
};

export function NFTCard({ nft, onClick }: NFTCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col bg-white/5 rounded-3xl overflow-hidden border border-white/10 active:scale-95 transition-all duration-300 cursor-pointer shadow-xl"
    >
      {/* Top Section / Image */}
      <div className="relative aspect-square overflow-hidden m-2 rounded-2xl">
        <img
          src={nft.imageUrl}
          alt={nft.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
        
        {/* Rarity Tag */}
        {nft.rarity && (
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-white shadow-lg border border-white/20 bg-gradient-to-br ${RARITY_COLORS[nft.rarity]}`}>
            {nft.rarity}
          </div>
        )}

        {/* Overlay Shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Info Section */}
      <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
        <div>
          <h3 className="text-white font-black italic tracking-tighter truncate text-sm">
            {nft.name}
          </h3>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest truncate">
            {nft.collection}
          </p>
        </div>

        {/* Price Row */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
           <div className="flex flex-col">
             <span className="text-[8px] text-zinc-500 font-black uppercase">Market Price</span>
             <div className="flex gap-2">
                {nft.priceStars && <span className="text-yellow-400 font-black text-xs">{nft.priceStars}⭐</span>}
                {nft.priceTon && <span className="text-blue-400 font-black text-xs">{nft.priceTon}💎</span>}
             </div>
           </div>
           
           <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Zap className="w-4 h-4" />
           </div>
        </div>
      </div>

      {/* Rarity Border Glow */}
      {nft.rarity === 'Legendary' && (
        <div className="absolute inset-0 border-2 border-orange-500/50 rounded-3xl animate-pulse pointer-events-none" />
      )}
    </div>
  );
}