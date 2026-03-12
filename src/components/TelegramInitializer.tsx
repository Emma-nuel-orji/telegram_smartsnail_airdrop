"use client";
import { useEffect } from "react";

const TelegramInitializer = () => { 
  useEffect(() => {
    const webApp = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;

    if (webApp) {
      webApp.ready();
      webApp.expand(); // Make the app full screen for a better feel

      const user = webApp.initDataUnsafe?.user;
      const startParam = webApp.initDataUnsafe?.start_param; // This is the Referrer's ID

      if (user && startParam) {
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
            console.log("🔗 Referral sync attempted");
          } catch (err) {
            console.error("Referral sync error:", err);
          }
        };
        syncReferral();
      }
    }
  }, []);

  return null;
}

export default TelegramInitializer;