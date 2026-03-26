"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { useWallet } from '../../context/walletContext';
import { Button } from "@/components/ui/button";
import { Loader, ChevronLeft, Zap, Info, Loader2, PartyPopper, CheckCircle2 } from "lucide-react";
import { getNftData } from "@/lib/nftHelpers";
import toast, { Toaster } from "react-hot-toast";
import "@/public/styles/marketplace.css";

type Nft = {
  id: string;
  name: string;
  nickname?: string;
  description?: string;
  imageUrl: string;
  rarity?: string;
  priceTon: number;
  priceStars: number;
  priceShells?: number;
  collection: string;
  indexNumber: number;
  minted?: boolean;
  isSold?: boolean;        // ← added so we can show "already sold" state
  traits?: Array<{ type: string; value: string }>;
};

interface CollectionStats {
  manchies: { remaining: number; percent: number; };
  smartsnail: { legendaryRemaining: number; percent: number; };
}

export default function NFTDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [nft, setNft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const { isConnected, tonConnectUI, walletAddress } = useWallet();
  useEffect(() => {
    fetchNFT();
  }, [params.id]);

  async function fetchNFT() {
    try {
      let data;
      let collectionName = "smartsnail"; 
      let index = 0;

      if (params.id.startsWith("virtual-")) {
        const parts = params.id.split("-");
        collectionName = parts[1]; 
        index = parseInt(parts[2]);
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
          isSold: false,
        });
      } else {
        const response = await fetch(`/api/nfts/${params.id}`);
        data = await response.json();
        setNft(data);
      }

      const statsRes = await fetch('/api/nfts/stats');
      if (statsRes.ok) {
        const statsData: CollectionStats = await statsRes.json(); 
        setStats(statsData); 
      }

    } catch (error) {
      console.error("Failed to fetch NFT data:", error);
    } finally {
      setLoading(false);
    }
  }

  const handlePurchase = async (method: 'stars' | 'ton' | 'shells') => {
    if (!nft) return;
    
    setPurchasing(true);
    const toastId = toast.loading(`Preparing your ${method.toUpperCase()} payment...`);

    try {
      const telegram = typeof window !== 'undefined' ? (window as any).Telegram : null;
      const tgUserId = telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || "123456";

      // Request initial purchase data (Invoice link or Admin Wallet Address)
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
      if (!data.success) throw new Error(data.error || "Initial request failed");

      // --- METHOD 1: STARS ---
      if (method === 'stars' && data.invoiceLink) {
        toast.dismiss(toastId);
        if (!telegram?.WebApp) {
          setPurchasing(false);
          toast.error("Telegram WebApp not available.");
          return;
        }
        telegram.WebApp.openInvoice(data.invoiceLink, (status: string) => {
          if (status === 'paid') {
            triggerSuccessEffect();
          } else {
            setPurchasing(false);
            toast.error("Payment cancelled.");
          }
        });
      } 
      
      // --- METHOD 2: TON ---
      else if (method === 'ton' && data.address) {
        toast.dismiss(toastId);

      if (!isConnected || !tonConnectUI) {
        setPurchasing(false);
        toast.error("Please connect your TON wallet first.");
        // If your context exposes a connect function, call it here:
        // tonConnectUI.openModal(); 
        return; 
      }

        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 360,
          messages: [{
            address: data.address,
            amount: data.amount.toString(),
          }],
        };

        try {
         console.log("Starting TON transaction with:", transaction);
const tonResult = await tonConnectUI.sendTransaction(transaction);
console.log("TON Result received:", tonResult);
          if (tonResult?.boc) {
            toast.loading("Verifying transaction on-chain...", { id: toastId });
            
            const verifyRes = await fetch(`/api/nfts/${params.id}/verify-ton`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ boc: tonResult.boc, tgUserId }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) triggerSuccessEffect();
            else throw new Error(verifyData.error || "Verification failed");
          }
        } catch (err) {
          setPurchasing(false);
          toast.error("Wallet transaction failed.");
        }
      } 

      // --- METHOD 3: SHELLS ---
      else if (method === 'shells') {
        toast.success("Shells accepted!", { id: toastId });
        triggerSuccessEffect();
      }

    } catch (error: any) {
      setPurchasing(false);
      toast.error(error.message || "Connection lost.", { id: toastId });
    }
  };
  const triggerSuccessEffect = () => {
    setPurchasing(false);
    setShowSuccess(true);
    setTimeout(() => {
      router.push('/marketplace/inventory');
    }, 3000);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f021a] flex items-center justify-center">
      <Loader className="w-10 h-10 text-purple-500 animate-spin" />
    </div>
  );

  if (!nft) return <div className="text-white text-center mt-20">NFT not found</div>;

  // FIX: Show a "sold" state instead of purchase buttons if this NFT is already taken
  const isSold = nft.isSold === true;

  return (
    <div className="min-h-screen bg-[#0f021a] pb-40 relative">
      <Toaster position="top-center" reverseOrder={false} />

      {/* PURCHASING OVERLAY */}
      {purchasing && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <Zap className="w-6 h-6 text-blue-300 absolute top-5 left-5 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Securing Asset</h2>
          <p className="text-zinc-500 text-sm mt-2">Communicating with the {nft.collection} vault...</p>
        </div>
      )}

      {/* SUCCESS CELEBRATION MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 z-[300] bg-blue-600 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-full p-6 mb-6 shadow-[0_0_50px_rgba(255,255,255,0.4)]">
            <CheckCircle2 className="w-20 h-20 text-blue-600 animate-bounce" />
          </div>
          <h2 className="text-5xl font-black italic uppercase text-white tracking-tighter mb-2">Claimed!</h2>
          <p className="text-blue-100 font-bold uppercase tracking-widest text-xs">Redirecting to Inventory</p>
          <div className="mt-8 flex gap-2">
            <PartyPopper className="text-yellow-400 w-8 h-8 animate-tada" />
            <PartyPopper className="text-yellow-400 w-8 h-8 animate-tada delay-100" />
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-white/60 font-black tracking-widest text-[10px] uppercase">Secure Terminal</span>
        <div className="w-10" /> 
      </div>

      <div className="p-5 max-w-md mx-auto">
        {/* Main Image Container */}
        <div className="relative group rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 p-2 mb-8">
          <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl">
            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
            
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-black border border-white/20 uppercase">
                {nft.rarity}
              </div>
              {/* FIX: Show SOLD badge if already purchased */}
              {isSold && (
                <div className="bg-red-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-black border border-red-400/30 uppercase">
                  Sold
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Supply bar */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Collection Supply
            </span>
            <span className="text-xs font-bold text-purple-400">
              {nft?.collection === 'manchies' 
                ? `${stats?.manchies?.remaining ?? '...'} / 6000 Left` 
                : `${stats?.smartsnail?.legendaryRemaining ?? '...'} / 600 Left`}
            </span>
          </div>
          
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${
                ((nft?.collection === 'manchies' ? stats?.manchies?.percent : stats?.smartsnail?.percent) || 0) > 90 
                  ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]'
              }`}
              style={{ 
                width: `${nft?.collection === 'manchies' ? stats?.manchies?.percent : stats?.smartsnail?.percent || 0}%` 
              }} 
            />
          </div>

          <p className="text-[9px] text-zinc-600 mt-2 italic">
            * Only unique {nft.collection} IDs are generated. Once sold, they never return to the market.
          </p>
        </div>

        {/* Pre-chain info box */}
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-4 mb-8 flex gap-4 items-start">
          <div className="bg-blue-500/20 p-2 rounded-xl">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1">Pre-Chain Airdrop Spot</h4>
            <p className="text-zinc-400 text-[11px] leading-snug">
              Secure this NFT now with Shells or Stars. Owners will receive an <span className="text-blue-400">Official Mint</span> airdrop once the collection goes on-chain.
            </p>
          </div>
        </div>

        {/* Info & Title */}
        <div className="mb-8 px-2">
          <h2 className="text-purple-400 text-xs font-black uppercase tracking-[0.2em] mb-2">
            {nft.collection} — #{nft.indexNumber}
          </h2>
          <h1 className="text-4xl font-black text-white italic tracking-tighter mb-4">
            {nft.nickname || nft.name}
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            {nft.description || `Exclusive digital asset from the ${nft.collection} series. Limited edition with unique traits.`}
          </p>
        </div>

        {/* Traits */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status</span>
            <span className="block text-amber-500 font-bold text-sm">{isSold ? "Sold" : "Pre-Mint"}</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Utility</span>
            <span className="block text-purple-400 font-bold text-sm">+25% Tap Power</span>
          </div>
        </div>
      </div>

      {/* FLOATING PURCHASE BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f021a] via-[#0f021a] to-transparent z-[100]">
        <div className="max-w-md mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 shadow-2xl flex flex-col gap-2">
          
          {stats && (
            <div className="mt-2 mb-2">
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

          {/* FIX: Show "Already Claimed" UI instead of buy buttons when sold */}
          {isSold ? (
            <div className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
              <span className="text-zinc-500 font-black uppercase text-xs tracking-widest">Already Claimed</span>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handlePurchase('stars')}  
                  disabled={purchasing} 
                  className="flex-1 h-14 bg-white/5 border border-white/10 text-white rounded-2xl flex flex-col items-center justify-center"
                >
                  <span className="text-[9px] font-black uppercase opacity-40">Stars</span>
                  <span className="font-black text-md">{nft.priceStars} ⭐</span>
                </Button>

                <Button 
                  onClick={() => handlePurchase('ton')}  
                  disabled={purchasing} 
                  className="flex-1 h-14 bg-blue-600 text-white rounded-2xl flex flex-col items-center justify-center"
                >
                  <span className="text-[9px] font-black uppercase text-white/60">TON</span>
                  <span className="font-black text-md">{nft.priceTon} 💎</span>
                </Button>
              </div>

              <Button 
                onClick={() => handlePurchase('shells')} 
                disabled={purchasing}
                className="w-full h-12 bg-purple-600/20 text-purple-400 rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                <Zap className="w-4 h-4 mr-2" /> Buy with {nft.priceShells?.toLocaleString()} Shells
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}