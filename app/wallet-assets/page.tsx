'use client';

import { useWallet } from '../context/walletContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface WalletAsset {
  type: 'token' | 'nft';
  name: string;
  balance?: string; // For tokens
  id?: string; // For NFTs
  image?: string; // For NFTs
}

export default function WalletAssetsPage() {
  const { isConnected, walletAddress, blockchain } = useWallet();
  const router = useRouter();
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Wallet Address:", walletAddress); // Debug log
    console.log("Blockchain:", blockchain); // Debug log

    const fetchAssets = async () => {
      if (!walletAddress || !blockchain) return;

      try {
        const response = await fetch(`/api/wallet/assets?address=${walletAddress}&blockchain=${blockchain}`);
        console.log("API Response:", response); // Debug log
        const data = await response.json();
        console.log("Assets Data:", data); // Debug log
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
    return (
      <div className="p-6">
        <Link href="/">
          <img
            src="/images/info/left-arrow.png"
            width={40}
            height={40}
            alt="back"
            className="mb-4 cursor-pointer"
          />
        </Link>
        <p className="text-center text-gray-600">Loading wallet assets...</p>
      </div>
    );
  }

  if (!loading && assets.length === 0) {
    return (
      <div className="p-6">
        <Link href="/">
          <img
            src="/images/info/left-arrow.png"
            width={40}
            height={40}
            alt="back"
            className="mb-4 cursor-pointer"
          />
        </Link>
        <p className="text-center text-gray-600">No assets found.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link href="/">
        <img
          src="/images/info/left-arrow.png"
          width={40}
          height={40}
          alt="back"
          className="mb-4 cursor-pointer"
        />
      </Link>
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