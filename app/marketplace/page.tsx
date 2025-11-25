"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchNFTs } from "@/lib/fetchNfts";
import { NFTCard } from "@/components/marketplace/NFTCard";
import { Button } from "@/components/ui/button";
import { Search, Filter, Grid3x3, Loader } from "lucide-react";

type Nft = {
  id: string;
  name: string;
  imageUrl: string;
  rarity?: string;
  priceTon: number;
  priceStars: number;
  priceShells?: number;
  indexNumber: number;
  isSold: boolean;
  collection: string;
  ownerTelegramId?: string | null;
  minted?: boolean;
};

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
        collection: selectedCollection 
      });

      setItems(prev => [...prev, ...data.items]);
      setPage(prev => prev + 1);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Failed to load NFTs:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMore();
  }, []);

  // Filter items by search
  const filteredItems = items.filter(nft =>
    nft.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">NFT Marketplace</h1>
            <button
              onClick={() => router.push('/inventory')}
              className="bg-white/10 px-4 py-2 rounded-xl text-white"
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
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Collection Filter Tabs */}
      <div className="sticky top-[140px] z-40 bg-black/30 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCollection(null)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap ${
              !selectedCollection
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white'
            }`}
          >
            All Collections
          </button>
          <button
            onClick={() => setSelectedCollection('smartsnail')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap ${
              selectedCollection === 'smartsnail'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white'
            }`}
          >
            SmartSnail
          </button>
          <button
            onClick={() => setSelectedCollection('manchies')}
            className={`px-4 py-2 rounded-xl whitespace-nowrap ${
              selectedCollection === 'manchies'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white'
            }`}
          >
            Manchies
          </button>
        </div>
      </div>

      {/* NFT Grid */}
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
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-white/10 rounded-2xl mb-2" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-1" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !loading && filteredItems.length > 0 && (
          <Button
            onClick={loadMore}
            className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white py-3"
          >
            Load More NFTs
          </Button>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/60 text-lg">No NFTs found</p>
          </div>
        )}
      </div>
    </div>
  );
}