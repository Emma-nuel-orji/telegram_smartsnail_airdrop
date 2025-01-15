'use client';

import { TonConnectUI, Wallet } from '@tonconnect/ui';
import { FC, ReactNode, useContext, useEffect, useState } from 'react';
import React from 'react';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  tonConnectUI: TonConnectUI | null;
}

// Create context using React.createContext
const WalletContext = React.createContext<WalletContextType | undefined>(undefined);
const TonConnectButton = () => {
  return <div id="ton-connect-button"></div>;
};

// Custom hook for using the wallet context
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

// Separate hook for TonConnectUI initialization
const useTonConnectUI = () => {
  const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null);

  useEffect(() => {
    // Ensure we're in the browser environment
    if (typeof window === 'undefined') return;

    try {
      const ui = new TonConnectUI({
        manifestUrl: '/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-button',
      });
      setTonConnectUI(ui);

      return () => {
        ui.disconnect();
      };
    } catch (error) {
      console.error('Failed to initialize TonConnectUI:', error);
    }
  }, []);
  

  return tonConnectUI;
};

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const tonConnectUI = useTonConnectUI();

  useEffect(() => {
    if (!tonConnectUI) return;

    const handleWalletUpdate = (wallet: Wallet | null) => {
      if (wallet) {
        setWalletAddress(wallet.account.address);
        setIsConnected(true);
      } else {
        setWalletAddress(null);
        setIsConnected(false);
      }
    };

    const unsubscribe = tonConnectUI.onStatusChange(handleWalletUpdate);

    // Check initial connection
    const checkInitialConnection = async () => {
      try {
        const wallet = await tonConnectUI.wallet;
        handleWalletUpdate(wallet);
      } catch (error) {
        console.error('Failed to check initial connection:', error);
      }
    };
    
    checkInitialConnection();

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI]);

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

// Optional: Export the context if you need direct access
export { WalletContext };