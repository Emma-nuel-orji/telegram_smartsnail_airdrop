// app/marketplace/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchNFTs } from "@/lib/fetchNfts";
import { NFTCard } from "@/components/marketplace/NFTCard";
import { Button } from "@/components/ui/button";
import { Search, Filter, Grid3x3, Loader } from "lucide-react";
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
  }, []);

  const filteredItems = items.filter(nft =>
    nft.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    // <div 
    //   className="min-h-screen relative"
    //   style={{
    //     backgroundImage: 'url(/images/bk.jpg)',
    //     backgroundSize: 'cover',
    //     backgroundPosition: 'center',
    //     backgroundAttachment: 'fixed'
    //   }}
    // >
    //   {/* Dark overlay for readability */}
    //   <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-sm" />
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-gradient-to-r from-[#0f0c29]/70 via-[#302b63]/70 to-[#24243e]/70 backdrop-blur-xl border-b border-white/10">
  <div className="p-4">





            <div className="flex items-center justify-between mb-4">
              <Link href="/">
                        <img
                          src="/images/info/left-arrow.png" 
                          width={40}
                          height={40}
                          alt="back"
                        />
                      </Link>
              <h1 className="text-2xl font-bold text-white">NFT Marketplace</h1>
              <button
                onClick={() => router.push('/inventory')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 rounded-xl text-white font-semibold hover:shadow-lg transition-all"
              >
                My NFTs
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="text"
                placeholder="Search NFTs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Collection Filter Tabs */}
        <div className="sticky top-[140px] z-40 bg-black/40 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => {
                setSelectedCollection(null);
                setItems([]);
                setPage(1);
                setHasMore(true);
              }}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold transition-all ${
                !selectedCollection
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All Collections
            </button>
            <button
              onClick={() => {
                setSelectedCollection('smartsnail');
                setItems([]);
                setPage(1);
                setHasMore(true);
              }}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold transition-all ${
                selectedCollection === 'smartsnail'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              SmartSnail
            </button>
            <button
              onClick={() => {
                setSelectedCollection('manchies');
                setItems([]);
                setPage(1);
                setHasMore(true);
              }}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold transition-all ${
                selectedCollection === 'manchies'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Manchies
            </button>
          </div>
        </div>

        {/* NFT Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-white/10 rounded-2xl mb-2 backdrop-blur-lg" />
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-1 backdrop-blur-lg" />
                  <div className="h-3 bg-white/10 rounded w-1/2 backdrop-blur-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !loading && filteredItems.length > 0 && (
            <Button
              onClick={loadMore}
              className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg text-white py-4 font-bold text-lg rounded-xl transition-all"
            >
              Load More NFTs
            </Button>
          )}

          {/* Empty State */}
          {!loading && filteredItems.length === 0 && (
            <div className="text-center py-20">
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 max-w-md mx-auto border border-white/20">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-white/80 text-xl font-semibold mb-2">No NFTs found</p>
                <p className="text-white/60">Try adjusting your search or filters</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}