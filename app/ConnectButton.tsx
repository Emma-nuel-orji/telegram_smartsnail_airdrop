'use client';

import { useWallet } from './context/walletContext';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function ConnectButton() {
  const { isConnected, tonConnectUI } = useWallet();
  const [isReady, setIsReady] = useState(false);

  // Wait for tonConnectUI to be initialized
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
      if (!tonConnectUI) return;
      
      if (isConnected) {
        await tonConnectUI.disconnect();
      } else {
        await tonConnectUI.connectWallet();
      }
    } catch (error) {
      console.error('Wallet interaction error:', error);
    }
  };

  if (!isReady) return null;

  return (
    <div 
      id="wallet-connect-button"
      className="relative cursor-pointer"
      onClick={handleClick}
    >
      <div className="w-6 h-6">
        <Image 
          src="/images/info/output-onlinepngtools (2).png"
          alt={isConnected ? "Disconnect Wallet" : "Connect Wallet"}
          width={24}
          height={24}
          style={{
            objectFit: 'contain'
          }}
          priority
        />
      </div>
    </div>
  );
}