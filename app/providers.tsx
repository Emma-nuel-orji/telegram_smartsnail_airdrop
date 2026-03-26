// app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { WalletProvider } from './context/walletContext';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const manifestUrl = process.env.NEXT_PUBLIC_MANIFEST_URL || 'https://telegram-smartsnail-airdrop.vercel.app/tonconnect-manifest.json';
  
  return (
    // 1. Wrap EVERYTHING in the official TON Provider
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {/* 2. Then keep your custom WalletProvider inside it */}
      <WalletProvider manifestUrl={manifestUrl}>
        {children}
      </WalletProvider>
    </TonConnectUIProvider>
  );
}