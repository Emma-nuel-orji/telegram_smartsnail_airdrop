'use client';

import { ReactNode } from 'react';
import { WalletProvider } from './context/walletContext';
import TonConnectButton from './TonConnectButton'; // Ensure the correct import path for TonConnectButton

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WalletProvider>
      {/* TonConnectButton renders the TonConnectUI button */}
      <TonConnectButton />
      {children}
    </WalletProvider>
  );
}
