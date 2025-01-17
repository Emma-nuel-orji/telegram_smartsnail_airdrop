'use client';

import { useWallet } from './context/walletContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export function ConnectButton() {
  const { isConnected, tonConnectUI } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      if (!tonConnectUI) return;
      
      if (isConnected) {
        await tonConnectUI.disconnect();
      } else {
        await tonConnectUI.connectWallet();
      }
    } catch (error) {
      console.error('Wallet interaction error:', error);
    } finally {
      setLoading(false);
    }
  };

  // No need for isReady state since we'll show the button always
  return (
    <button 
      id="wallet-connect-button"
      className="relative cursor-pointer p-1 rounded-lg hover:bg-gray-100"
      onClick={handleClick}
      disabled={loading}
    >
      <div className="w-6 h-6 relative">
        <Image 
          src="/images/info/output-onlinepngtools (2).png"
          alt={isConnected ? "Disconnect Wallet" : "Connect Wallet"}
          layout="fill"
          objectFit="contain"
          priority
        />
      </div>
    </button>
  );
}