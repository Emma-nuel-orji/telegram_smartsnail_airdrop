'use client';

import { THEME, TonConnectUI, Wallet } from '@tonconnect/ui';
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

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
  manifestUrl: string;
}

let tonConnectUIInstance: TonConnectUI | null = null;

export const WalletProvider: FC<WalletProviderProps> = ({ children, manifestUrl }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeWallet = async () => {
      try {
        // Remove any existing tc-root elements
        const existingElements = document.getElementsByTagName('tc-root');
        if (existingElements.length > 0) {
          Array.from(existingElements).forEach(element => element.remove());
        }

        // Clear custom elements registry if possible
        if (customElements.get('tc-root')) {
          try {
            // @ts-ignore
            customElements.clear();
          } catch (e) {
            console.warn('Could not clear custom elements registry');
          }
        }

        if (!tonConnectUIInstance) {
          tonConnectUIInstance = new TonConnectUI({
            manifestUrl,
            buttonRootId: 'ton-connect-button',
            uiPreferences: {
              theme: THEME.DARK
            }
          });

          setTonConnectUI(tonConnectUIInstance);
          
          const unsubscribe = tonConnectUIInstance.onStatusChange((wallet: Wallet | null) => {
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
            tonConnectUIInstance = null;
          };
        }
      } catch (error) {
        console.error('Failed to initialize TonConnectUI:', error);
      }
    };

    const timeoutId = setTimeout(initializeWallet, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [manifestUrl]);

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