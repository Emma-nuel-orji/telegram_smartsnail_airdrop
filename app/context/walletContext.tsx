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
  const isInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized.current) return;
    isInitialized.current = true;

    const initWallet = async () => {
      try {
        // Clear any existing connection state from localStorage
        localStorage.removeItem('ton-connect-ui_connected-wallet');
        
        if (!tonConnectUIRef.current) {
          tonConnectUIRef.current = new TonConnectUI({
            manifestUrl: manifestUrl || process.env.NEXT_PUBLIC_TON_MANIFEST_URL || 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json',
            uiPreferences: {
              theme: THEME.LIGHT
            },
            walletsListConfiguration: {
              includeWallets: [], // Configure which wallets to show
            }
          });

          setTonConnectUI(tonConnectUIRef.current);
        }

        const instance = tonConnectUIRef.current;

        // Handle wallet status changes
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

        // Don't automatically restore previous connection
        // Only check if there's an active connection
        const currentWallet = instance.wallet;
        if (currentWallet) {
          setWalletAddress(currentWallet.account.address);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Wallet initialization error:', error);
      }
    };

    initWallet();

    return () => {
      if (tonConnectUIRef.current) {
        // Clean up connection on unmount
        tonConnectUIRef.current?.disconnect();
        localStorage.removeItem('ton-connect-ui_connected-wallet');
      }
    };
  }, [manifestUrl]);

  const connect = async () => {
    try {
      if (tonConnectUI && !isConnected) {
        console.log('Connecting wallet...');
        await tonConnectUI.connectWallet(); 
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnect = async () => {
    try {
      if (tonConnectUI && isConnected) {
        console.log('Disconnecting wallet...');
        tonConnectUIRef.current?.disconnect();
        localStorage.removeItem('ton-connect-ui_connected-wallet');
        setWalletAddress(null);
        setIsConnected(false);
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