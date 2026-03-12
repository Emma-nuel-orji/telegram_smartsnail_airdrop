"use client";

import dynamic from 'next/dynamic';
import { Loader2, RefreshCcw, UserX } from "lucide-react";
import { useEffect, useState } from 'react';
import Loader from '@/loader';
const ReferralSystemComponent = dynamic(() => import('@/components/ReferralSystem'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0f021a] flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
       <Loader />
    </div>
  ),
});

export default function ReferralSystemPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initWebApp = async () => {
      if (typeof window !== 'undefined') {
        try {
          const WebApp = (await import('@twa-dev/sdk')).default;
          WebApp.ready();
          const userIdFromTelegram = WebApp.initDataUnsafe?.user?.id?.toString() || null;

          if (!userIdFromTelegram) throw new Error('User ID not found');

          setUserId(userIdFromTelegram);

          const urlParams = new URLSearchParams(window.location.search);
          const referrerTelegramId = urlParams.get("start");

          if (referrerTelegramId && userIdFromTelegram !== referrerTelegramId) {
            await fetch("/api/referrals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userTelegramId: userIdFromTelegram,
                referrerTelegramId,
              }),
            });
          }
        } catch (err) {
          setError('Telegram initialization failed');
        } finally {
          setIsLoading(false);
        }
      }
    };
    initWebApp();
  }, []);

  if (isLoading) return null; // Handled by dynamic loading

  if (error || !userId) return (
    <div className="min-h-screen bg-[#0f021a] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
        <UserX className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-white font-black italic text-2xl mb-2 uppercase tracking-tighter">Connection Error</h2>
      <p className="text-zinc-500 text-sm mb-8">We couldn't verify your Telegram session. Please relaunch the app.</p>
      <button 
        onClick={() => window.location.reload()} 
        className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest"
      >
        <RefreshCcw className="w-4 h-4" /> Retry Connection
      </button>
    </div>
  );

  return <ReferralSystemComponent userId={userId} />;
}