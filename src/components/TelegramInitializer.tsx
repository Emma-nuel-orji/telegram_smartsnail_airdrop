"use client";
import { useEffect, useRef } from "react";

interface TelegramInitializerProps {
  onSetTelegramId?: (id: string | null) => void;
  onSetMessage?: (message: string) => void;
}

const TelegramInitializer: React.FC<TelegramInitializerProps> = ({ onSetTelegramId, onSetMessage }) => { 
  const hasSynced = useRef(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();

      const user = tg.initDataUnsafe?.user;
      const startParam = tg.initDataUnsafe?.start_param;

      // 🔍 DEBUG LOG 1: What is Telegram sending us?
      console.log("🛠️ Initializer Check:", {
        userId: user?.id,
        foundStartParam: !!startParam,
        startParamValue: startParam,
        fullInitData: tg.initDataUnsafe // See everything Telegram sent
      });

      if (user?.id) {
        onSetTelegramId?.(user.id.toString());
      }

      if (user?.id && startParam && !hasSynced.current) {
        if (startParam === user.id.toString()) {
          console.log("⚠️ Self-referral detected and blocked locally.");
          return;
        }

        hasSynced.current = true; 
        
        const syncReferral = async () => {
          console.log(`📡 Sending POST to /api/referrals: Referrer=${startParam}, User=${user.id}`);
          try {
            const response = await fetch('/api/referrals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userTelegramId: user.id.toString(),
                referrerTelegramId: startParam.toString()
              })
            });
            
            const result = await response.json();
            // 🔍 DEBUG LOG 2: What did the API say?
            console.log("📥 API Sync Result:", result);
          } catch (err) {
            console.error("❌ Network error during sync:", err);
            hasSynced.current = false; 
          }
        };

        syncReferral();
      }
    }
  }, [onSetTelegramId, onSetMessage]);

  return null;
}

export default TelegramInitializer;