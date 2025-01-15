'use client';

import { THEME, TonConnectUI, Wallet } from '@tonconnect/ui';
import { FC, ReactNode, useContext, useEffect, useState } from 'react';
import React from 'react';
import { Theme } from '@tonconnect/ui'; 
interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  tonConnectUI: TonConnectUI | null;
}

const WalletContext = React.createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeWallet = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Create button container
        let buttonRoot = document.getElementById('ton-connect-button');
        if (!buttonRoot) {
          buttonRoot = document.createElement('div');
          buttonRoot.id = 'ton-connect-button';
          buttonRoot.style.display = 'none';
          document.body.appendChild(buttonRoot);
        }

        // Initialize TonConnect with relative path
        const ui = new TonConnectUI({
          manifestUrl: '/tonconnect-manifest.json',
          buttonRootId: 'ton-connect-button',
          uiPreferences: {
            theme: THEME.DARK // or 'LIGHT'
          }
        });

        if (isMounted) {
          setTonConnectUI(ui);
        }

        // Set up wallet change listener
        const unsubscribe = ui.onStatusChange((wallet: Wallet | null) => {
          if (!isMounted) return;
          
          if (wallet) {
            setWalletAddress(wallet.account.address);
            setIsConnected(true);
          } else {
            setWalletAddress(null);
            setIsConnected(false);
          }
        });

        return () => {
          unsubscribe();
          if (ui) {
            ui.disconnect();
          }
          buttonRoot?.remove();
        };
      } catch (error) {
        console.error('Failed to initialize TonConnectUI:', error);
      }
    };

    initializeWallet();

    return () => {
      isMounted = false;
    };
  }, []);

  const connect = async () => {
    try {
      if (!tonConnectUI) {
        console.error('TonConnectUI not initialized');
        return;
      }
      await tonConnectUI.connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnect = async () => {
    try {
      if (!tonConnectUI) {
        console.error('TonConnectUI not initialized');
        return;
      }
      await tonConnectUI.disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const contextValue: WalletContextType = {
    walletAddress,
    isConnected,
    connect,
    disconnect,
    tonConnectUI,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const WalletSection: FC = () => {
  const { isConnected, walletAddress, connect, disconnect } = useWallet();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  return (
    <div className="flex flex-col items-center relative">
      <button 
        onClick={isConnected ? handleDisconnect : connect}
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

export { WalletContext };