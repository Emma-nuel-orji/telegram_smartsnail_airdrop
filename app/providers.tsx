import { ReactNode } from 'react';
import { WalletProvider } from './context/walletContext'; // Ensure the correct import path for your WalletProvider
import TonConnectButton from './TonConnectButton'; // Ensure the correct import path for TonConnectButton
import { TonConnectUIProvider } from '@tonconnect/ui-react'; // Import the TonConnect context provider

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WalletProvider>
      {/* TonConnectContextProvider wraps the TonConnectButton to manage the connection */}
      <TonConnectUIProvider>
        <TonConnectButton />
      </TonConnectUIProvider>
      {children}
    </WalletProvider>
  );
}
