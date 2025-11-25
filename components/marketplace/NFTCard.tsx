"use client";

import { Check } from 'lucide-react';
type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

const RARITY_COLORS = {
  Common: 'bg-gray-500',
  Uncommon: 'bg-green-500',
  Rare: 'bg-blue-500',
  Epic: 'bg-purple-500',
  Legendary: 'bg-yellow-500'
};

type NFTCardProps = {
  nft: {
    id: string;
    name: string;
    imageUrl: string;
    rarity?: Rarity;
    priceTon?: number;
    priceStars?: number;
    priceShells?: number;
    minted?: boolean;
  };
  onClick?: () => void;
};

export function NFTCard({ nft, onClick }: NFTCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/20 hover:border-purple-500 transition-all cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-square">
        <img
          src={nft.imageUrl}
          alt={nft.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Rarity Badge */}
        {nft.rarity && (
          <div className={`absolute top-2 right-2 ${RARITY_COLORS[nft.rarity] || 'bg-gray-500'} px-2 py-1 rounded-lg text-white text-xs font-bold`}>
            {nft.rarity}
          </div>
        )}
        
        {/* Mint Status */}
        {nft.minted && (
          <div className="absolute top-2 left-2 bg-green-500 px-2 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1">
            <Check className="w-3 h-3" /> Minted
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-white font-bold mb-1 truncate">{nft.name}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Price</span>
          <div className="flex gap-2">
            {nft.priceShells && (
              <span className="text-white font-bold">{nft.priceShells} 🐚</span>
            )}
            {nft.priceStars && (
              <span className="text-white/60">{nft.priceStars} ⭐</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}