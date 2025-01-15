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

const WalletContext = React.createContext<WalletContextType | undefined>(undefined);

// Separate TonConnectButton into its own component with actual button functionality
export const TonConnectButton: FC = () => {
  const { connect, disconnect, isConnected } = useWallet();

  return (
    <div id="ton-connect-button">
      <button 
        onClick={isConnected ? disconnect : connect}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
      </button>
    </div>
  );
};

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

const useTonConnectUI = () => {
  const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const ui = new TonConnectUI({
        manifestUrl: '/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-button',
        uiPreferences: {
          theme: 'SYSTEM',
          // Remove the colorsSet configuration as it's causing the type error
        }
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

export { WalletContext };