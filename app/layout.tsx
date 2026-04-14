import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./providers";
import { BoostProvider } from "./api/context/BoostContext";
import ErrorBoundary from "./ErrorBoundary";
import TelegramInitializer from "../src/components/TelegramInitializer"; 

export const metadata: Metadata = {
  title: "Telegram Mini App",
  description: "A simple Telegram mini app using Next.js and Prisma",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            <BoostProvider>
              <TelegramInitializer /> {/* ✅ Ensure Telegram SDK loads */}
              <div id="app-root">{children}</div>
               <div
                id="popup-layer"
                className="fixed inset-0 pointer-events-none z-[9999]"
              />
            </BoostProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
