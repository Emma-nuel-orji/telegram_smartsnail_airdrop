import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./providers";
import { BoostProvider } from "./api/context/BoostContext";
import ErrorBoundary from "./ErrorBoundary";
import { useEffect } from "react";

export const metadata: Metadata = {
  title: "Telegram Mini App",
  description: "A simple Telegram mini app using Next.js and Prisma",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkTelegramSDK = () => {
        if (window.Telegram?.WebApp) {
          console.log("✅ Telegram WebApp SDK Loaded", window.Telegram.WebApp);
          window.Telegram.WebApp.ready();
        } else {
          console.error("❌ Telegram WebApp SDK NOT Loaded");
        }
      };

      checkTelegramSDK();
    }
  }, []);

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
              <div id="app-root">{children}</div>
            </BoostProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
