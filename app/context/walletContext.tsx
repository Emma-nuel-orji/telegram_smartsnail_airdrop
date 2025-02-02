'use client';

import { THEME, TonConnectUI, ConnectedWallet } from '@tonconnect/ui';
import { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  tonConnectUI: TonConnectUI | null;
  blockchain?: string; 
}

const WalletContext = createContext<WalletContextType>({
  walletAddress: null,
  isConnected: false,
  connect: async () => {},
  disconnect: async () => {},
  tonConnectUI: null
});

interface WalletProviderProps {
  children: ReactNode;
  manifestUrl?: string;
}

export function WalletProvider({ children, manifestUrl }: WalletProviderProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null);
  const tonConnectUIRef = useRef<TonConnectUI | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initWallet = async () => {
      try {
        if (!tonConnectUIRef.current) {
          tonConnectUIRef.current = new TonConnectUI({
            manifestUrl: manifestUrl || process.env.NEXT_PUBLIC_TON_MANIFEST_URL || 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json',
            uiPreferences: {
              theme: THEME.LIGHT
            }
          });

          setTonConnectUI(tonConnectUIRef.current);
        }

        const instance = tonConnectUIRef.current;

        instance.onStatusChange((wallet: ConnectedWallet | null) => {
          if (wallet) {
            setWalletAddress(wallet.account.address);
            setIsConnected(true);
            console.log('Wallet connected:', wallet.account.address);
          } else {
            setWalletAddress(null);
            setIsConnected(false);
            console.log('Wallet disconnected');
          }
        });

        // Check initial connection
        const initialWallet = instance.wallet;
        if (initialWallet) {
          setWalletAddress(initialWallet.account.address);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Wallet initialization error:', error);
      }
    };

    initWallet();

    return () => {
      if (tonConnectUIRef.current) {
        tonConnectUIRef.current.disconnect();
      }
    };
  }, [manifestUrl]);

  const connect = async () => {
    try {
      if (tonConnectUI) {
        console.log('Connecting wallet...');
        await tonConnectUI.connectWallet();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnect = async () => {
    try {
      if (tonConnectUI) {
        console.log('Disconnecting wallet...');
        await tonConnectUI.disconnect();
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isConnected,
        connect,
        disconnect,
        tonConnectUI
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};