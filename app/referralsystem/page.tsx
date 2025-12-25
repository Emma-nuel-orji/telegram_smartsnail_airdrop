'use client';

import dynamic from 'next/dynamic';
import Loader from '@/loader';
import { useEffect, useState } from 'react';

const ReferralSystemComponent = dynamic(() => import('@/components/ReferralSystem'), {
  ssr: false,
  loading: () => <Loader />,
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

          console.log("Telegram WebApp initialized. User ID:", userIdFromTelegram);

          if (!userIdFromTelegram) {
            throw new Error('User ID not found in Telegram init data');
          }

          setUserId(userIdFromTelegram);

          // Extract referrer ID from URL
          const urlParams = new URLSearchParams(window.location.search);
          const referrerTelegramId = urlParams.get("start");

          console.log("URL params - start:", referrerTelegramId);

          if (referrerTelegramId && userIdFromTelegram !== referrerTelegramId) {
            console.log("Processing referral:", {
              userTelegramId: userIdFromTelegram,
              referrerTelegramId
            });

            // Save referral to backend
            const response = await fetch("/api/referrals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userTelegramId: userIdFromTelegram,
                referrerTelegramId,
              }),
            });

            const result = await response.json();
            console.log("Referral API response:", result);

            if (!response.ok) {
              console.error("Referral creation failed:", result);
              // Don't throw error here - user can still use the app
            }
          }

        } catch (err) {
          console.error('Failed to initialize Telegram WebApp:', err);
          setError('Failed to initialize Telegram WebApp. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    initWebApp();
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="text-center p-4 text-purple-600">
        <p>User ID not found. Please reload the app.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-purple-500 text-white rounded"
        >
          Reload
        </button>
      </div>
    );
  }

  return <ReferralSystemComponent userId={userId} />;
}