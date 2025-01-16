// app/components/ConnectButton.tsx
'use client';

import { useWallet } from './context/walletContext';
import Image from 'next/image';

export function ConnectButton() {
  const { isConnected, tonConnectUI } = useWallet();

  const handleClick = async () => {
    try {
      if (isConnected) {
        await tonConnectUI?.disconnect();
      } else {
        await tonConnectUI?.connectWallet();
      }
    } catch (error) {
      console.error('Wallet interaction error:', error);
    }
  };

  return (
    <div 
      id="wallet-connect-button"
      className="relative cursor-pointer"
      onClick={handleClick}
    >
      <div className="w-6 h-6">
        <Image 
          src="/images/info/output-onlinepngtools (2).png"
          alt="Connect Wallet"
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