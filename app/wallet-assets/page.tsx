'use client';

import { useWallet } from '../context/walletContext';
import { useEffect, useState } from 'react';

interface WalletAsset {
  type: 'token' | 'nft';
  name: string;
  balance?: string; // For tokens
  id?: string; // For NFTs
  image?: string; // For NFTs
}

export default function WalletAssetsPage() {
  const { walletAddress, blockchain } = useWallet();
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!walletAddress || !blockchain) return;

      try {
        const response = await fetch(`/api/wallet/assets?address=${walletAddress}&blockchain=${blockchain}`);
        const data = await response.json();
        setAssets(data.assets);
      } catch (error) {
        console.error('Failed to fetch wallet assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [walletAddress, blockchain]);

  if (loading) {
    return <p className="text-center text-gray-600">Loading wallet assets...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Wallet Assets</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-md">
            {asset.type === 'token' ? (
              <>
                <p className="text-lg font-semibold">{asset.name}</p>
                <p className="text-gray-600">Balance: {asset.balance}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">{asset.name}</p>
                <p className="text-gray-600">ID: #{asset.id}</p>
                {asset.image && (
                  <img src={asset.image} alt={asset.name} className="mt-2 rounded-lg" />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}