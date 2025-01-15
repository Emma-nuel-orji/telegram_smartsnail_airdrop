'use client';

import { FC, useState } from 'react';
import { useWallet } from '../app/context/walletContext';

export const WalletSection: FC = () => {
  const { isConnected, walletAddress, connect, disconnect } = useWallet();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex flex-col items-center relative">
      <div id="ton-connect-button" className="hidden" />
      
      <button 
        onClick={() => {
          if (!isConnected) {
            connect();
          } else {
            setShowDisconnectConfirm(true);
          }
        }}
        className="flex flex-col items-center"
      >
        <img
          src="/images/info/output-onlinepngtools (2).png"
          width={24}
          height={24}
          alt="Wallet"
        />
        {isConnected && (
          <p className="text-sm text-gray-400 mt-1">
            {formatAddress(walletAddress ?? '')}
          </p>
        )}
      </button>

      {showDisconnectConfirm && (
        <div className="absolute top-10 bg-gray-800 text-white p-3 rounded shadow-md z-50">
          <p className="text-sm mb-2">Disconnect wallet?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowDisconnectConfirm(false)}
              className="text-gray-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                disconnect();
                setShowDisconnectConfirm(false);
              }}
              className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};