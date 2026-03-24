"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader, ChevronLeft, ShieldCheck, Zap, Info, Wallet } from "lucide-react";
import { getNftData } from "@/lib/nftHelpers"; // Make sure this path is correct
import "@/public/styles/marketplace.css";

type Nft = {
  id: string;
  name: string;
  nickname?: string; // Added nickname
  description?: string; // Added description
  imageUrl: string;
  rarity?: string;
  priceTon: number;
  priceStars: number;
  priceShells?: number;
  collection: string;
  indexNumber: number; // Added indexNumber
  minted?: boolean;
  traits?: Array<{ type: string; value: string }>;
};

export default function NFTDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [nft, setNft] = useState<Nft | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchNFT();
  }, [params.id]);

 async function fetchNFT() {
  try {
    let data;
    let collectionName = "smartsnail"; // default
    let index = 0;

    if (params.id.startsWith("virtual-")) {
      // 1. Split the ID: ["virtual", "collectionName", "index"]
      const parts = params.id.split("-");
      collectionName = parts[1]; 
      index = parseInt(parts[2]);

      // 2. Pass the correct collection to the helper
      data = getNftData(index, collectionName);

      setNft({
        id: params.id,
        name: `${collectionName === 'manchies' ? 'Manchie' : 'SmartSnail'} #${index}`,
        nickname: data.nickname,
        description: data.desc,
        imageUrl: data.image,
        rarity: data.rarity,
        priceShells: data.price,
        priceTon: data.price / 1000000,
        priceStars: Math.floor(data.price / 1000),
        collection: collectionName,
        indexNumber: index,
        minted: false,
      });
    } else {
      // --- DATABASE LOGIC ---
      const response = await fetch(`/api/nfts/${params.id}`);
      data = await response.json();
      setNft(data);
      collectionName = data.collection;
    }

    // 3. FETCH GLOBAL SCARCITY STATS
    // We fetch this regardless of virtual/database status so the bar is always accurate
    const statsRes = await fetch('/api/nfts/stats');
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      setStats(statsData); // Make sure you have: const [stats, setStats] = useState<any>(null);
    }

  } catch (error) {
    console.error("Failed to fetch NFT:", error);
  } finally {
    setLoading(false);
  }
}

const handlePurchase = async (method: 'stars' | 'ton' | 'shells') => {
  // 1. Fix the 'nft is possibly null' error
  if (!nft) {
    alert("NFT data is still loading. Please wait.");
    return;
  }

  try {
    // 2. Safely get the Telegram ID
    const telegram = typeof window !== 'undefined' ? (window as any).Telegram : null;
    const tgUserId = telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || "123456";

    const response = await fetch(`/api/nfts/${params.id}/purchase`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-telegram-user-id": tgUserId
      },
      body: JSON.stringify({ 
        paymentMethod: method,
        indexNumber: nft.indexNumber,
        collection: nft.collection
      }),
    });

    const data = await response.json();

    if (data.success) {
      if (method === 'stars' && data.invoiceLink) {
        // 3. Fix the 'window.Telegram is possibly undefined' error
        if (telegram?.WebApp) {
          telegram.WebApp.openInvoice(data.invoiceLink, (status: string) => {
            if (status === 'paid') {
              alert("Payment Successful! Redirecting to Inventory...");
              router.push('/inventory');
            }
          });
        } else {
          alert("Please open this in Telegram to complete the Stars purchase.");
        }
      } else if (method === 'shells') {
        alert("Success! NFT added to your collection.");
        router.push('/inventory');
      }
    } else {
      alert(data.error || "Purchase failed");
    }
  } catch (error) {
    console.error("Purchase error:", error);
  }
};

  if (loading) return (
    <div className="min-h-screen bg-[#0f021a] flex items-center justify-center">
      <Loader className="w-10 h-10 text-purple-500 animate-spin" />
    </div>
  );

  if (!nft) return <div className="text-white text-center mt-20">NFT not found</div>;

  return (
    <div className="min-h-screen bg-[#0f021a] pb-40">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[40%] bg-purple-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white active:scale-90 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-white/60 font-black tracking-widest text-[10px] uppercase">Asset Details</span>
        <div className="w-10" /> 
      </div>

      <div className="p-5 max-w-md mx-auto">
        {/* Main Image Container */}
        <div className="relative group rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 p-2 mb-8">
          <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl">
            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
            
            {/* Rarity Tag */}
            <div className="absolute top-4 left-4 flex gap-2">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-black border border-white/20 uppercase">
                  {nft.rarity}
                </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
  <div className="flex justify-between items-end mb-2">
    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
      Collection Supply
    </span>
    <span className="text-xs font-bold text-purple-400">
      {/* We can hardcode 6000 for now or fetch from the stats API */}
      Limited to 6,000 Assets
    </span>
  </div>
  
  {/* Progress Bar */}
  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
    <div 
      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]" 
      style={{ width: '85%' }} // You can make this dynamic later
    />
  </div>
  <p className="text-[9px] text-zinc-600 mt-2 italic">
    * Only unique {nft.collection} IDs are generated. Once sold, they never return to the market.
  </p>
</div>




        {/* PRE-CHAIN CONVINCING BOX */}
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-4 mb-8 flex gap-4 items-start">
            <div className="bg-blue-500/20 p-2 rounded-xl">
                <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1">Pre-Chain Airdrop Spot</h4>
                <p className="text-zinc-400 text-[11px] leading-snug">
                    Secure this NFT now with Shells or Stars. Owners will receive an <span className="text-blue-400">Official TON Mint</span> airdrop once the collection goes on-chain.
                </p>
            </div>
        </div>

        {/* Info & Title */}
        <div className="mb-8 px-2">
          <h2 className="text-purple-400 text-xs font-black uppercase tracking-[0.2em] mb-2">
            {nft.collection} — #{nft.indexNumber}
          </h2>
          <h1 className="text-4xl font-black text-white italic tracking-tighter leading-none mb-4">
            {nft.nickname || nft.name}
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            {nft.description || `Exclusive digital asset from the ${nft.collection} series. Limited edition with unique traits.`}
          </p>
        </div>

        {/* Traits Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status</span>
              <span className="block text-amber-500 font-bold text-sm">Pre-Mint</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Utility</span>
              <span className="block text-purple-400 font-bold text-sm">+25% Tap Power</span>
            </div>
        </div>
      </div>

      {/* Floating Sticky Purchase Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f021a] via-[#0f021a] to-transparent z-[100]">
        <div className="max-w-md mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 shadow-2xl flex flex-col gap-2">
          
{stats && (
  <div className="mt-6 mb-2">
    <div className="flex justify-between items-center mb-1">
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
        {nft?.collection === 'manchies' ? 'Manchie Supply' : 'Legendary Supply'}
      </span>
      <span className="text-[10px] font-bold text-white">
        {nft?.collection === 'manchies' 
          ? `${stats.manchies.remaining} / 6000 Left` 
          : `${stats.smartsnail.legendaryRemaining} / 600 Left`}
      </span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
      <div 
        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000"
        style={{ 
          width: `${nft?.collection === 'manchies' ? stats.manchies.percent : stats.smartsnail.percent}%` 
        }}
      />
    </div>
  </div>
)}

          {/* Main Payment Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => handlePurchase('stars')}
              disabled={purchasing}
              className="flex-1 h-14 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl flex flex-col items-center justify-center gap-0"
            >
              <span className="text-[9px] font-black uppercase opacity-40">Stars</span>
              <span className="font-black text-md">{nft.priceStars} ⭐</span>
            </Button>

            <Button
              onClick={() => handlePurchase('ton')}
              disabled={purchasing}
              className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex flex-col items-center justify-center gap-0 shadow-lg shadow-blue-600/20"
            >
              <span className="text-[9px] font-black uppercase text-white/60">TON</span>
              <span className="font-black text-md">{nft.priceTon} 💎</span>
            </Button>
          </div>

          {/* Shells Option (The Incentive) */}
          <Button
            onClick={() => handlePurchase('shells')}
            disabled={purchasing}
            className="w-full h-12 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest"
          >
            <Zap className="w-4 h-4 fill-purple-400" />
            Buy with {nft.priceShells?.toLocaleString()} Shells
          </Button>

        </div>
      </div>
    </div>
  );
}