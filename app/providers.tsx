import { ReactNode } from 'react';
import { WalletProvider } from './context/walletContext';
import TonConnectButton from './TonConnectButton';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// Define the manifest URL for your dApp
const manifestUrl = 'https://telegram-smartsnail-airdrop.vercel.app/tonconnect-manifest.json';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WalletProvider manifestUrl={manifestUrl}>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <div id="ton-connect-button">
          <TonConnectButton />
        </div>
        {children}
      </TonConnectUIProvider>
    </WalletProvider>
  );
}