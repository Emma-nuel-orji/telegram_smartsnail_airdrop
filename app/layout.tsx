import type { Metadata } from "next";
import './globals.css';
import Script from 'next/script';
import { BoostProvider } from './api/context/BoostContext'; 

// Import Geist font
import './fonts/GeistMonoVF.woff'; 

export const metadata: Metadata = {
  title: 'Telegram Mini App',
  description: 'A simple Telegram mini app using Next.js and Prisma',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts link for GeistMonoVF font */}
        <link
          href="/fonts/GeistMonoVF.woff"
          rel="stylesheet"
          type="font/woff"
        />
        {/* Include Animate.css library */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="font-GeistMonoVF">
        <BoostProvider>{children}</BoostProvider> {/* Wrap children */}
      </body>
    </html>
  );
}
