import type { Metadata } from "next";
import './globals.css';
import { Inter } from 'next/font/google';
import { Orbitron } from 'next/font/google';
import Script from 'next/script';
import { BoostProvider } from './api/context/BoostContext'; // Adjust the path if needed

const inter = Inter({ subsets: ['latin'] });
const orbitron = Orbitron({ weight: ['400', '500', '700'], subsets: ['latin'] });

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
        {/* Google Fonts link for Orbitron font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* Include Animate.css library */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
      </head>
      <body className={`${inter.className} ${orbitron.className}`}>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <BoostProvider>{children}</BoostProvider> {/* Wrap children */}
      </body>
    </html>
  );
}
