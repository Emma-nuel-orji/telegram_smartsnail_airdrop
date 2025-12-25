// app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { WalletProvider } from './context/walletContext';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import ErrorBoundary from './ErrorBoundary';

interface ProvidersProps {
  children: ReactNode;
}

// Use a named function instead of default export
export function Providers({ children }: ProvidersProps) {
  const manifestUrl = process.env.NEXT_PUBLIC_MANIFEST_URL || 'https://telegram-smartsnail-airdrop.vercel.app/tonconnect-manifest.json';
  
  return (
    <WalletProvider manifestUrl={manifestUrl}>
      {children}
    </WalletProvider>
  );
}