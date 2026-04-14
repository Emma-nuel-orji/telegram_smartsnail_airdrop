"use client";
import { useEffect, useRef } from "react";

const TelegramInitializer = () => { 
  const hasSynced = useRef(false);

  useEffect(() => {
    // 1. Get the WebApp object
    const tg = (window as any).Telegram?.WebApp;

    if (tg) {
      // 2. These should be called as early as possible (already in your layout.tsx too)
      tg.ready();
      tg.expand();

      const user = tg.initDataUnsafe?.user;
      const startParam = tg.initDataUnsafe?.start_param;

      // 3. Only sync referral once per session to save network bandwidth
      if (user && startParam && !hasSynced.current) {
        hasSynced.current = true; // Prevents double-syncing in StrictMode
        
        const syncReferral = async () => {
          try {
            await fetch('/api/referrals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userTelegramId: user.id.toString(),
                referrerTelegramId: startParam.toString()
              })
            });
          } catch (err) {
            console.error("Referral sync error:", err);
            hasSynced.current = false; // Retry on next render if it failed
          }
        };
        syncReferral();
      }
    }
  }, []);

  return null;
}

export default TelegramInitializer;