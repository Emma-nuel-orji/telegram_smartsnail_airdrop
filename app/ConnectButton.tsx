// components/ConnectButton.tsx
'use client';

import { useWallet } from './context/walletContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export function ConnectButton() {
  const { isConnected, connect, disconnect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = async () => {
    try {
      setLoading(true);
      if (isConnected) {
        await disconnect();
      } else {
        await connect();
      }
    } catch (error) {
      console.error('Wallet interaction error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <button 
      className=" cursor-pointer p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleClick}
      disabled={loading}
    >
      <div className="w-6 h-6 relative">
        <Image 
          src="/images/info/output-onlinepngtools (2).png"
          alt={isConnected ? "Disconnect Wallet" : "Connect Wallet"}
          width={24}
          height={24}
          priority
        />
      </div>
    </button>
  );
}