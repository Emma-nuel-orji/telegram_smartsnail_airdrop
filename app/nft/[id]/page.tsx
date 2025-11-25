"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Loader } from "lucide-react";

type Nft = {
  id: string;
  name: string;
  imageUrl: string;
  rarity?: string;
  priceTon: number;
  priceStars: number;
  priceShells?: number;
  collection: string;
  minted?: boolean;
  traits?: Array<{ type: string; value: string }>;
};

export default function NFTDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [nft, setNft] = useState<Nft | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchNFT();
  }, [params.id]);

  async function fetchNFT() {
    try {
      const response = await fetch(`/api/nfts/${params.id}`);
      const data = await response.json();
      setNft(data);
    } catch (error) {
      console.error("Failed to fetch NFT:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(method: "stars" | "ton") {
    setPurchasing(true);
    try {
      const response = await fetch(`/api/nfts/${params.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: method })
      });

      if (response.ok) {
        router.push('/inventory');
      }
    } catch (error) {
      console.error("Purchase failed:", error);
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Loader className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!nft) {
    return <div className="text-white">NFT not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/30 backdrop-blur-lg border-b border-white/10 p-4">
        <button onClick={() => router.back()} className="text-white">
          ← Back
        </button>
      </div>

      <div className="p-4">
        {/* Image */}
        <div className="relative aspect-square rounded-3xl overflow-hidden mb-4">
          <img
            src={nft.imageUrl}
            alt={nft.name}
            className="w-full h-full object-cover"
          />
          {nft.minted && (
            <div className="absolute top-4 left-4 bg-green-500 px-3 py-2 rounded-xl text-white font-bold flex items-center gap-2">
              <Check className="w-4 h-4" /> On-Chain
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 mb-4">
          <h1 className="text-3xl font-bold text-white mb-2">{nft.name}</h1>
          <p className="text-white/60 mb-4">{nft.collection} Collection</p>

          {/* Prices */}
          <div className="space-y-3">
            {/* {nft.priceShells && (
              <Button
                onClick={() => handlePurchase('shells')}
                disabled={purchasing}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 text-lg"
              >
                Buy for {nft.priceShells} Shells 🐚
              </Button>
            )} */}
            
            <Button
              onClick={() => handlePurchase('stars')}
              disabled={purchasing}
              className="w-full bg-white/10 hover:bg-white/20 py-4"
            >
              Buy for {nft.priceStars} Stars ⭐
            </Button>

            <Button
              onClick={() => handlePurchase('ton')}
              disabled={purchasing}
              className="w-full bg-white/10 hover:bg-white/20 py-4"
            >
              Buy for {nft.priceTon} TON 💎
            </Button>
          </div>

          {/* Traits */}
          {nft.traits && nft.traits.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white font-bold mb-3">Traits</h3>
              <div className="space-y-2">
                {nft.traits.map((trait, i) => (
                  <div key={i} className="bg-black/30 rounded-xl p-3 flex justify-between">
                    <span className="text-white/60">{trait.type}</span>
                    <span className="text-white font-semibold">{trait.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}