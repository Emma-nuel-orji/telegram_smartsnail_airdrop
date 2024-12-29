'use client'

import "./globals.css";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import Link from 'next/link';
import Loader from "@/loader";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>TON Connect </title>
    
       </head>
       <body>
         <TonConnectUIProvider manifestUrl="https://violet-traditional-rabbit-103.mypinata.cloud/ipfs/QmQJJAdZ2qSwdepvb5evJq7soEBueFenHLX3PoM6tiBffm">
           {children}
         </TonConnectUIProvider>
       </body>
     </html>
  );
}