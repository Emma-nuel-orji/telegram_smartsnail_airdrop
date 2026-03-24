"use client";
import { useEffect, useState } from "react";
import { NFTCard } from "@/components/marketplace/NFTCard";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react"; // Import a back icon

export default function InventoryPage() {
  const [ownedNfts, setOwnedNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. Initialize Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;

    if (tg) {
      // Show the Native Telegram Back Button
      tg.BackButton.show();
      tg.onEvent("backButtonClicked", () => {
        router.push("/marketplace"); // Or wherever you want them to go back to
      });
    }

    async function fetchMyAssets() {
      const tgId = tg?.initDataUnsafe?.user?.id || "123456";
      try {
        const res = await fetch(`/api/user/assets?telegramId=${tgId}`);
        const data = await res.json();
        setOwnedNfts(data.nfts || []);
      } catch (e) {
        console.error("Failed to load assets", e);
      } finally {
        setLoading(false);
      }
    }

    fetchMyAssets();

    // 2. Cleanup: Hide the back button when leaving this page
    return () => {
      if (tg) {
        tg.BackButton.hide();
        tg.offEvent("backButtonClicked");
      }
    };
  }, [router]);

  return (
    <div className="p-6 min-h-screen bg-black text-white pb-24">
      {/* Manual Back Button Header (for desktop/browser testing) */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => router.back()} 
          className="p-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <h1 className="text-2xl font-black uppercase tracking-tighter">My Assets</h1>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Scanning blockchain...</p>
        </div>
      ) : ownedNfts.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {ownedNfts.map((nft: any) => (
            <NFTCard key={nft.id} nft={nft} hidePrice={true} onClick={() => router.push(`/nft/${nft.id}`)}/>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center">
          <p className="text-zinc-500 text-sm mb-4">No NFTs found in your wallet.</p>
          <button 
            onClick={() => router.push('/marketplace')}
            className="text-xs font-black uppercase text-purple-400 border-b border-purple-400/30 pb-1"
          >
            Visit Marketplace
          </button>
        </div>
      )}
    </div>
  );
}