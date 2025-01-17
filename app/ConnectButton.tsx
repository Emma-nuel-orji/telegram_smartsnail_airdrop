'use client';

import { useWallet } from './context/walletContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export function ConnectButton() {
  const { isConnected, tonConnectUI } = useWallet();
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (tonConnectUI) {
      setIsReady(true);
      
      // Hide the default TON Connect button
      const defaultButton = document.querySelector('.ton-connect-button');
      if (defaultButton) {
        (defaultButton as HTMLElement).style.display = 'none';
      }
    }
  }, [tonConnectUI]);

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

  if (!isReady) return null;

  return (
    <button 
      id="wallet-connect-button"
      className="relative cursor-pointer inline-flex items-center justify-center"
      onClick={handleClick}
      disabled={loading}
    >
      <div className="w-6 h-6 relative">
        <Image 
          src="/images/info/output-onlinepngtools (2).png"
          alt={isConnected ? "Disconnect Wallet" : "Connect Wallet"}
          width={24}
          height={24}
          className="object-contain"
          priority
        />
      </div>
    </button>
  );
}