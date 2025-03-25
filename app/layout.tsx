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
        {/* Preconnect to Google Fonts for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Rajdhani:wght@600&display=swap"
          rel="stylesheet"
        />
        
        {/* Animate.css */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
        
        {/* Telegram WebApp Script */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        
        {/* Preload stone texture */}
        <link
          rel="preload"
          href="/images/textures/stone-wall.jpg"
          as="image"
        />
      </head>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            <BoostProvider>
              <TelegramInitializer />
              <div id="app-root">{children}</div>
              
              {/* Fallback styles if texture fails to load */}
              <style jsx global>{`
                :root {
                  --purple-dark: #3a0ca3;
                  --purple-light: #7209b7;
                  --green-glowing: #4ade80;
                  --stone-color: #33302e;
                }
                
                body {
                  background-color: var(--stone-color);
                  background-image: 
                    linear-gradient(135deg, var(--purple-dark) 0%, var(--purple-light) 100%),
                    /* Stone pattern fallback */
                    linear-gradient(
                      45deg,
                      #33302e 25%,
                      #2a2725 25%,
                      #2a2725 50%,
                      #33302e 50%,
                      #33302e 75%,
                      #2a2725 75%,
                      #2a2725 100%
                    );
                  background-size: 100% 100%, 30px 30px;
                }
              `}</style>
            </BoostProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}