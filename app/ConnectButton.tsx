'use client';

import { useWallet } from './context/walletContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export function ConnectButton() {
  const { isConnected, walletAddress, tonConnectUI } = useWallet();
  const [showInfo, setShowInfo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleClick = () => {
    if (isConnected) {
      setShowInfo(!showInfo);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative">
      <button
           className=" cursor-pointer p-1 rounded-lg hover:bg-gray-100 "
        onClick={handleClick}
        disabled={!isConnected}
      >
        <div className="w-6 h-6 relative">
          <Image
            src="/images/info/output-onlinepngtools (2).png"
            alt="Wallet Info"
            width={24}
            height={24}
            priority
          />
        </div>
      </button>

      {isConnected && showInfo && (
        <div className="absolute right-0 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Wallet Address:</p>
            <p className="text-sm font-mono break-all">{formatAddress(walletAddress)}</p>
            
            {tonConnectUI?.wallet && (
              <>
                <p className="text-sm font-medium text-gray-600 mt-2">Wallet Type:</p>
                <p className="text-sm">{tonConnectUI.wallet.device.platform}</p>

              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}