import type { Metadata } from "next";
import './globals.css';
import Script from 'next/script';
import { BoostProvider } from './api/context/BoostContext'; // Adjust the path if needed

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
        {/* Google Fonts link for Inter Variable font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Variable:wght@100..900&display=swap"
          rel="stylesheet"
        />
        {/* Include Animate.css library */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
        <link
          href="/fonts/GeistMonoVF.woff"
          rel="stylesheet"
          type="font/woff"
        />
      </head>
      <body className="Inter Variable GeistMonoVF">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <BoostProvider>{children}</BoostProvider> {/* Wrap children */}
      </body>
    </html>
  );
}
