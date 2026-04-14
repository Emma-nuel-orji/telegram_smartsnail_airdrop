import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./providers";
import { BoostProvider } from "./api/context/BoostContext";
import ErrorBoundary from "./ErrorBoundary";
import TelegramInitializer from "../src/components/TelegramInitializer"; 

export const metadata: Metadata = {
  title: "The SmartSnail App",
  description: "Join the farm and earn $Shells",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
        {/* Load SDK immediately */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {/* Tell Telegram we are alive BEFORE React even starts */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.ready();
              window.Telegram.WebApp.expand();
            }
          `
        }} />
      </head>
      <body suppressHydrationWarning className="bg-[#0f051d]">
        <ErrorBoundary>
          <Providers>
            <BoostProvider>
              <TelegramInitializer />
              
              {/* This 'children' is wrapped in a suspense-like feel */}
              <div id="app-root">
                {children}
              </div>

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