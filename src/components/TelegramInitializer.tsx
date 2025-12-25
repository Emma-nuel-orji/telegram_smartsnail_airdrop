"use client";
import { useEffect } from "react";

const TelegramInitializer = () => { 
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      console.log("✅ Telegram WebApp SDK Loaded", window.Telegram.WebApp);
      window.Telegram.WebApp.ready();
    } else {
      console.error("❌ Telegram WebApp SDK NOT Loaded");
    }
  }, []);

  return null; // No UI needed
}
export default TelegramInitializer; 
export {};