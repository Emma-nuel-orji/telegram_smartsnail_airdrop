"use client";
import { useEffect, useState } from "react";
import {NFTCard} from "@/components/marketplace/NFTCard"; // Reuse your existing card!

export default function InventoryPage() {
  const [ownedNfts, setOwnedNfts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyAssets() {
      const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "123456";
      const res = await fetch(`/api/user/assets?telegramId=${tgId}`);
      const data = await res.json();
      setOwnedNfts(data.nfts);
      setLoading(false);
    }
    fetchMyAssets();
  }, []);

  return (
    <div className="p-6 min-h-screen bg-black text-white">
      <h1 className="text-2xl font-black uppercase tracking-tighter mb-6">My Assets</h1>
      
      {loading ? (
        <p>Scanning blockchain...</p>
      ) : ownedNfts.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {ownedNfts.map((nft: any) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
          <p className="text-zinc-500 text-sm">No NFTs found in your wallet.</p>
        </div>
      )}
    </div>
  );
}