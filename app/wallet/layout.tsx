'use client'

import "./globals.css";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import Link from 'next/link';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>TON Connect </title>
    <div className="back-button">
      <Link href="/">
        <img src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back" />
      </Link>
    </div>
       </head>
       <body>
         <TonConnectUIProvider manifestUrl="https://violet-traditional-rabbit-103.mypinata.cloud/ipfs/QmQJJAdZ2qSwdepvb5evJq7soEBueFenHLX3PoM6tiBffm">
           {children}
         </TonConnectUIProvider>
       </body>
     </html>
  );
}