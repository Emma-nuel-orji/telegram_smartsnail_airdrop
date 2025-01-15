import type { Metadata } from "next";
import './globals.css';
import Script from "next/script";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { BoostProvider } from './api/context/BoostContext';
import { WalletProvider } from './context/walletContext';

export const metadata: Metadata = {
  title: 'Telegram Mini App',
  description: 'A simple Telegram mini app using Next.js and Prisma',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // For development, use localhost. For production, use your deployed manifest URL
  const manifestUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/tonconnect-manifest.json'
    : 'https://telegram-smartsnail-airdrop.vercel.app/tonconnect-manifest.json';

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        {/* <TonConnectUIProvider manifestUrl={manifestUrl}> */}
          <WalletProvider >  {/* Pass the manifestUrl here */}
            <BoostProvider>
              {children}
            </BoostProvider>
          </WalletProvider>
        {/* </TonConnectUIProvider> */}
      </body>
    </html>
  );
}
