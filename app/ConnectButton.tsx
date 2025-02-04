'use client';

import { useWallet } from './context/walletContext';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';

export function ConnectButton() {
  const { isConnected } = useWallet(); // Destructure walletAddress from useWallet
  const [showMessage, setShowMessage] = useState(false); // State to control message visibility

  const handleClicks = () => {
    if (!isConnected) {
      setShowMessage((prev) => !prev); // Toggle message visibility
    }
  };

  // Format the wallet address to show the first 5 and last 4 characters
  const formatWalletAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Wallet icon button */}
      <button
        className="cursor-pointer p-1 rounded-lg hover:bg-gray-100"
        onClick={handleClicks} // Add onClick handler
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

      {/* Conditionally render the formatted wallet address below the wallet icon
      {isConnected && walletAddress && (
        <div className="mt-2 p-2 text-sm font-medium text-gray-600">
          Connected: {formatWalletAddress(walletAddress)}
        </div>
      )} */}

      {/* Conditionally render the "Go to Task 18" message when not connected */}
      {!isConnected && showMessage && (
        <div className="absolute right-0 mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[200px]">
          <p className="text-sm font-medium text-gray-600">
            Wallet not connected. Go to{' '}
            <a className="text-blue-500 hover:underline">
              Task 18
            </a>{' '}
            to connect your wallet.
          </p>
        </div>
      )}
    </div>
  );
}

