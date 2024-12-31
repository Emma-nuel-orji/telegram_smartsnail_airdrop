// Welcome.tsx
'use client';

import { useEffect, useState } from 'react';
import Home from './page';

export default function Welcome() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTelegram = async () => {
      try {
        if (!window.Telegram?.WebApp) throw new Error('Telegram WebApp not available');

        const tg = window.Telegram.WebApp;
        tg.ready();

        const initData = tg.initDataUnsafe;
        if (!initData?.user) throw new Error('No user data');

        const response = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initData.user)
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        setUser(data);
        if (data.hasClaimedWelcome) {
          setShowWelcome(false);
        }
      } catch (error) {
        console.error('Init error:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
      }
    };

    initializeTelegram();
  }, []);

  const handleClaim = async () => {
    if (!user) return;
    
    try {
      const res = await fetch('/api/claim-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegramId }),
      });

      const data = await res.json();
      if (data.success) {
        setShowWelcome(false);
      } else {
        throw new Error('Failed to claim bonus');
      }
    } catch (error) {
      setError('Failed to claim welcome bonus');
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className={`absolute inset-0 ${showWelcome ? 'blur-md' : ''}`}>
        <Home user={user} />
      </div>
      
      {showWelcome && !error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white text-black p-6 rounded-md text-center max-w-lg w-full">
            <div className="relative w-full aspect-video mb-4 rounded-lg overflow-hidden">
              <video autoPlay muted loop playsInline>
                <source src="/videos/welcome.mp4" type="video/mp4" />
              </video>
            </div>
            <h2 className="text-2xl font-bold">Welcome {user?.firstName}!</h2>
            <p className="mt-4">Now you're a Smart Snail!</p>
            <p className="mt-2">Some are farmers here, while some are Snailonauts...</p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-lg font-semibold text-blue-600">Welcome Bonus:</p>
              <p className="text-3xl font-bold text-blue-700">5,000 Shells</p>
            </div>
            <button
              onClick={handleClaim}
              className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Claim Your Shells
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full">
          {error}
        </div>
      )}
    </div>
  );
}