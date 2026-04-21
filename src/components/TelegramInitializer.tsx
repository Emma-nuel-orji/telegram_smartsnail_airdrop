"use client";
import { useEffect, useRef } from "react";

interface TelegramInitializerProps {
  onSetTelegramId?: (id: string | null) => void;
  onSetMessage?: (message: string) => void;
}

const TelegramInitializer: React.FC<TelegramInitializerProps> = ({ 
  onSetTelegramId, 
  onSetMessage 
}) => { 
  const hasSynced = useRef(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();

      const user = tg.initDataUnsafe?.user;

      console.log("🛠️ Initializer Check:", {
        userId: user?.id,
        fullInitData: tg.initDataUnsafe
      });

      // ✅ Only set the telegram ID — bot already handled the referral
      if (user?.id) {
        onSetTelegramId?.(user.id.toString());
      }

      // ❌ REMOVED: referral POST from here
      // The bot's /start handler already creates the referral correctly.
      // Firing it here races against user creation and causes FK errors.
    }
  }, [onSetTelegramId, onSetMessage]);

  return null;
}

export default TelegramInitializer;