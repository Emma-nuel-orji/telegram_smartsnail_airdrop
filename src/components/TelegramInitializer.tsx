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
      const startParam = tg.initDataUnsafe?.start_param; // The key to referral success

      // 1. Set the User ID for the global app state
      if (user?.id) {
        onSetTelegramId?.(user.id.toString());
      } else {
        onSetMessage?.("Please open this app inside Telegram.");
      }

      // 2. Sync Referral (Only if we have a startParam and haven't synced yet)
      if (user?.id && startParam && !hasSynced.current) {
        // Prevent self-referral check on frontend to save a request
        if (startParam === user.id.toString()) {
          console.log("Self-referral ignored.");
          return;
        }

        hasSynced.current = true; 
        
        const syncReferral = async () => {
          try {
            console.log(`📡 Syncing referral: ${startParam} -> ${user.id}`);
            const response = await fetch('/api/referrals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userTelegramId: user.id.toString(),
                referrerTelegramId: startParam.toString()
              })
            });
            
            const result = await response.json();
            console.log("✅ Referral Sync Result:", result);
          } catch (err) {
            console.error("❌ Referral sync error:", err);
            hasSynced.current = false; // Allow retry if network failed
          }
        };

        syncReferral();
      }
    } else {
      onSetMessage?.("Telegram WebApp not detected.");
    }
  }, [onSetTelegramId, onSetMessage]);

  return null;
}

export default TelegramInitializer;