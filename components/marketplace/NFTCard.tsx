// components/marketplace/NFTCard.tsx
"use client";

import { Check, Sparkles } from 'lucide-react';
import { Nft, Rarity } from "@/lib/types";

type NFTCardProps = {
  nft: Nft;
  onClick?: () => void;
};

const RARITY_COLORS: Record<Rarity, string> = {
  Common: 'bg-gradient-to-br from-gray-500 to-gray-600',
  Uncommon: 'bg-gradient-to-br from-green-500 to-emerald-600',
  Rare: 'bg-gradient-to-br from-blue-500 to-cyan-600',
  Epic: 'bg-gradient-to-br from-purple-500 to-pink-600',
  Legendary: 'bg-gradient-to-br from-yellow-500 to-orange-600'
};

const RARITY_GLOW: Record<Rarity, string> = {
  Common: 'shadow-gray-500/50',
  Uncommon: 'shadow-green-500/50',
  Rare: 'shadow-blue-500/50',
  Epic: 'shadow-purple-500/50',
  Legendary: 'shadow-yellow-500/50'
};

export function NFTCard({ nft, onClick }: NFTCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        group relative
        bg-gradient-to-br from-white/10 to-white/5
        backdrop-blur-lg rounded-2xl overflow-hidden
        border-2 border-white/20
        hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/50
        transition-all duration-300 cursor-pointer
        hover:scale-[1.05] hover:-translate-y-1
        ${nft.rarity === 'Legendary' ? 'animate-pulse-slow' : ''}
      `}
    >
      {/* Legendary Sparkle Effect */}
      {nft.rarity === 'Legendary' && (
        <div className="absolute top-2 left-2 z-10">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-spin-slow" />
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={nft.imageUrl}
          alt={nft.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Rarity Badge */}
        {nft.rarity && (
          <div className={`
            absolute top-2 right-2 
            ${RARITY_COLORS[nft.rarity]} 
            px-3 py-1 rounded-lg 
            text-white text-xs font-bold
            shadow-lg ${RARITY_GLOW[nft.rarity]}
            border border-white/30
          `}>
            {nft.rarity}
          </div>
        )}
        
        {/* Mint Status */}
        {nft.minted && (
          <div className="absolute bottom-2 left-2 bg-green-500/90 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1 border border-green-300/50 shadow-lg">
            <Check className="w-3 h-3" /> On-Chain
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-gradient-to-b from-transparent to-black/30">
        <p className="text-white font-bold mb-2 truncate text-sm group-hover:text-purple-300 transition-colors">
          {nft.name}
        </p>

        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60 font-medium">Price</span>

          <div className="flex flex-col gap-1 items-end">
            {nft.priceStars && (
              <span className="text-yellow-400 font-bold flex items-center gap-1">
                {nft.priceStars} ⭐
              </span>
            )}

            {nft.priceTon && (
              <span className="text-blue-400 font-bold">
                {nft.priceTon} TON
              </span>
            )}

            {nft.priceShells && (
              <span className="text-purple-400 font-bold">
                {nft.priceShells} 🐚
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </div>
    </div>
  );
}