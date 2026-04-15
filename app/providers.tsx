// app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { WalletProvider } from './context/walletContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const manifestUrl = process.env.NEXT_PUBLIC_MANIFEST_URL || 'https://telegram-smartsnail-airdrop.vercel.app/tonconnect-manifest.json';
  
  return (
    <WalletProvider manifestUrl={manifestUrl}>
      {children}
    </WalletProvider>
  );
}