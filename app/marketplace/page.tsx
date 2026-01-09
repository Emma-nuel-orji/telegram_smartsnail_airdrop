"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchNFTs } from "@/lib/fetchNfts";
import { NFTCard } from "@/components/marketplace/NFTCard";
import { Button } from "@/components/ui/button";
import { Search, Loader, SlidersHorizontal, LayoutGrid, Package } from "lucide-react";
import { Nft } from "@/lib/types";
import Link from 'next/link';

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export default function Marketplace() {
  const router = useRouter();
  const [items, setItems] = useState<Nft[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [activeRarity, setActiveRarity] = useState<string>("All");

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const data = await fetchNFTs({
        page,
        collection: selectedCollection ?? undefined
      });

      const normalized = data.items.map((nft: any) => ({
        ...nft,
        rarity: nft.rarity
          ? (capitalize(nft.rarity) as Rarity)
          : undefined,
      }));

      setItems(prev => [...prev, ...normalized]);
      setPage(prev => prev + 1);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Failed to load NFTs:", error);
    } finally {
      setLoading(false);
    }
  }

  function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  useEffect(() => {
    loadMore();
  }, [selectedCollection]); // Reload when collection changes

  const filteredItems = items.filter(nft => {
    const matchesSearch = nft.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRarity = activeRarity === "All" || nft.rarity === activeRarity;
    return matchesSearch && matchesRarity;
  });

  const resetMarketplace = (collection: string | null) => {
    setSelectedCollection(collection);
    setItems([]);
    setPage(1);
    setHasMore(true);
  };

  return (
    <div className="min-h-screen bg-[#0f021a] text-white">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[40%] bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[40%] bg-blue-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* HEADER AREA */}
        <div className="sticky top-0 z-50 bg-[#0f021a]/80 backdrop-blur-xl border-b border-white/5">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/" className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
                   <img src="/images/info/left-arrow.png" className="w-5 h-5" alt="back" />
                </Link>
                <div>
                  <h1 className="text-xl font-black italic tracking-tighter">MARKETPLACE</h1>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Snails & Items</p>
                </div>
              </div>
              
              <button
                onClick={() => router.push('/inventory')}
                className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Package className="w-3 h-3 text-purple-400" />
                My Assets
              </button>
            </div>

            {/* Modern Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
              <input
                type="text"
                placeholder="Search unique snails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          {/* DUAL FILTER TABS */}
          <div className="px-4 pb-4 space-y-3">
            {/* Collection Row */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: null, label: 'All Snails', icon: <LayoutGrid className="w-3 h-3"/> },
                { id: 'smartsnail', label: 'SmartSnail', icon: null },
                { id: 'manchies', label: 'Manchies', icon: null }
              ].map((col) => (
                <button
                  key={col.id}
                  onClick={() => resetMarketplace(col.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all border ${
                    selectedCollection === col.id
                      ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20'
                  }`}
                >
                  {col.icon} {col.label}
                </button>
              ))}
            </div>

            {/* Rarity Row (The better UI you asked for) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
              {["All", "Common", "Uncommon", "Rare", "Epic", "Legendary"].map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => setActiveRarity(rarity)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-[9px] font-black uppercase tracking-tighter transition-all ${
                    activeRarity === rarity
                      ? 'text-purple-400 bg-purple-500/10 border border-purple-500/30'
                      : 'text-zinc-600 border border-transparent hover:text-zinc-400'
                  }`}
                >
                  {rarity}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NFT GRID */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map(nft => (
              <NFTCard
                key={nft.id}
                nft={nft}
                onClick={() => router.push(`/nft/${nft.id}`)}
              />
            ))}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse bg-white/5 rounded-3xl aspect-[3/4] border border-white/5" />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && filteredItems.length > 0 && (
            <button
              onClick={loadMore}
              className="w-full mt-10 mb-10 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 py-4 font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl transition-all"
            >
              Discover More
            </button>
          )}

          {/* Empty State */}
          {!loading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                <Search className="w-8 h-8 text-zinc-700" />
              </div>
              <h3 className="text-lg font-black italic text-zinc-400">NO SNAILS FOUND</h3>
              <p className="text-xs text-zinc-600 mt-2 max-w-[200px]">We couldn't find any assets matching your filters.</p>
              <button 
                onClick={() => {setActiveRarity("All"); resetMarketplace(null)}}
                className="mt-6 text-purple-500 text-[10px] font-black uppercase tracking-widest"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}