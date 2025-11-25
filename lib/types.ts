// lib/types.ts
export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type Trait = {
  type: string;
  value: string;
};

export type Nft = {
  id: string;
  name: string;
  imageUrl: string;
  rarity?: Rarity;
  priceTon: number;
  priceStars: number;
  priceShells?: number;
  indexNumber: number;
  isSold: boolean;
  collection: string;
  ownerTelegramId?: string; // use undefined instead of null
  minted?: boolean;
  traits?: Trait[];
};


export type Collection = {
  id: string;
  name: string;
  supply: number;
  floorPrice: number;
  banner?: string;
  description?: string;
  volume?: number;
};