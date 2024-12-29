'use client';

import dynamic from 'next/dynamic';
import Loader from '@/loader';
import { useEffect, useState } from 'react';

// Dynamically import the ReferralSystem component
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

          if (!userIdFromTelegram) {
            throw new Error('User ID not found in Telegram init data');
          }

          setUserId(userIdFromTelegram);
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
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="text-center p-4 text-purple-600">
        <p>User ID not found. Please reload the app.</p>
      </div>
    );
  }

  return <ReferralSystemComponent userId={userId} />;
}
