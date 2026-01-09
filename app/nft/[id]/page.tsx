"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Loader, ChevronLeft, ShieldCheck, Zap } from "lucide-react";
import "@/public/styles/marketplace.css";

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
      if (response.ok) router.push('/inventory');
    } catch (error) {
      console.error("Purchase failed:", error);
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0f021a] flex items-center justify-center">
      <Loader className="w-10 h-10 text-purple-500 animate-spin" />
    </div>
  );

  if (!nft) return <div className="text-white text-center mt-20">NFT not found</div>;

  return (
    <div className="min-h-screen bg-[#0f021a] pb-32">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[40%] bg-purple-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white active:scale-90 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-white/60 font-black tracking-widest text-[10px] uppercase">Details</span>
        <div className="w-10" /> 
      </div>

      <div className="p-5 max-w-md mx-auto">
        {/* Main Image Container */}
        <div className="relative group rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 p-2 mb-8">
          <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl">
            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
            
            {/* Rarity & Status Overlays */}
            <div className="absolute top-4 left-4 flex gap-2">
              {nft.minted && (
                <div className="bg-emerald-500/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-black flex items-center gap-1.5 shadow-lg border border-emerald-400/50 uppercase tracking-tighter">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info & Title */}
        <div className="mb-8">
          <h2 className="text-purple-400 text-xs font-black uppercase tracking-[0.2em] mb-2">{nft.collection}</h2>
          <h1 className="text-4xl font-black text-white italic tracking-tighter leading-none mb-4">{nft.name}</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">Exclusive digital asset from the {nft.collection} series. Limited edition with unique traits.</p>
        </div>

        {/* Traits Grid */}
        {nft.traits && nft.traits.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            {nft.traits.map((trait, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-colors hover:bg-white/10">
                <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{trait.type}</span>
                <span className="block text-white font-bold">{trait.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Sticky Purchase Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f021a] via-[#0f021a] to-transparent z-[100]">
        <div className="max-w-md mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 shadow-2xl flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              onClick={() => handlePurchase('stars')}
              disabled={purchasing}
              className="flex-1 h-14 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl flex flex-col leading-tight items-center justify-center gap-0"
            >
              <span className="text-xs font-black uppercase opacity-60">Buy for</span>
              <span className="font-black text-lg">{nft.priceStars} Stars ⭐</span>
            </Button>

            <Button
              onClick={() => handlePurchase('ton')}
              disabled={purchasing}
              className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex flex-col leading-tight items-center justify-center gap-0 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              <span className="text-xs font-black uppercase opacity-60 text-white/80">Buy for</span>
              <span className="font-black text-lg">{nft.priceTon} TON 💎</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}