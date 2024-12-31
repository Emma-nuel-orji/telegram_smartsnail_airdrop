'use client';

import { useEffect, useState, useRef } from 'react';
import type { WebApp as WebAppType } from '@twa-dev/types';
import Link from 'next/link';
import '../welcome.css';
import Loader from '@/loader';

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebAppType;
    };
  }
}

type Click = {
  id: number;
  x: number;
  y: number;
};

type UserType = {
  telegramId: string;
  points: number;
  tappingRate: number;
  firstName: string;
};

export default function Home() {
  const [user, setUser] = useState<UserType | null>(null);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [energy, setEnergy] = useState(1500);
  const [isClicking, setIsClicking] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const maxEnergy = 1500;
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeTelegram = async () => {
      try {
        if (!window.Telegram?.WebApp) {
          throw new Error('Telegram WebApp is not available');
        }

        const tg = window.Telegram.WebApp;
        tg.ready();

        const initData = tg.initDataUnsafe;
        if (!initData?.user) {
          throw new Error('No user data available');
        }

        const response = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initData.user)
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setUser(data);
        setShowWelcomePopup(!data.hasClaimedWelcome);
      } catch (error) {
        console.error('Initialization error:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTelegram();
  }, []);

  const handleIncreasePoints = async (e: React.MouseEvent) => {
    if (!user || energy <= 0) {
      setError('Not enough energy to click!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    handleSpeedAndAnimation(e);

    const prevPoints = user.points;
    const prevEnergy = energy;

    setUser(prev => prev ? {
      ...prev,
      points: prev.points + prev.tappingRate
    } : null);
    setEnergy(prev => Math.max(0, prev - 50));

    try {
      const res = await fetch('/api/increase-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegramId,
          tappingRate: user.tappingRate,
        }),
      });

      if (!res.ok) throw new Error('Failed to increase points');

      const data = await res.json();
      if (data.success) {
        setNotification(`+${user.tappingRate} shells!`);
        setTimeout(() => setNotification(''), 1000);
      } else {
        throw new Error('Failed to update points');
      }
    } catch (error) {
      setUser(prev => prev ? { ...prev, points: prevPoints } : null);
      setEnergy(prevEnergy);
      setError('Failed to increase points');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSpeedAndAnimation = (e: React.MouseEvent) => {
    setIsClicking(true);
    setSpeed(prev => Math.min(prev + 0.1, 5));
    
    const newClick = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY
    };
    setClicks(prev => [...prev, newClick]);

    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }

    inactivityTimeout.current = setTimeout(() => {
      setIsClicking(false);
      setSpeed(1);
    }, 1000);
  };

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
        setUser(prev => prev ? { ...prev, points: data.points } : null);
        setShowWelcomePopup(false);
        setNotification('Welcome bonus claimed! +5,000 shells');
        setTimeout(() => setNotification(''), 3000);
      } else {
        throw new Error('Failed to claim bonus');
      }
    } catch (error) {
      setError('Failed to claim welcome bonus');
      setTimeout(() => setError(null), 3000);
    }
  };

  useEffect(() => {
    if (!isClicking && energy < maxEnergy) {
      const refillInterval = setInterval(() => {
        setEnergy(prev => Math.min(maxEnergy, prev + 10));
      }, 500);

      return () => clearInterval(refillInterval);
    }
  }, [isClicking, energy]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <video autoPlay muted loop>
          <source src="/videos/unload.mp4" type="video/mp4" />
        </video>
      </div>
    );
  }

  return (
    <div className="bg-gradient-main min-h-screen px-4 flex flex-col items-center text-white font-medium">
      {showWelcomePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white text-black p-6 rounded-md text-center max-w-lg w-full">
            <div className="relative w-full aspect-video mb-4 rounded-lg overflow-hidden">
              <video 
                autoPlay 
                muted 
                loop 
                className="w-full h-full object-cover"
                playsInline
              >
                <source src="/videos/welcome.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            <h2 className="text-2xl font-bold">Welcome {user?.firstName}!</h2>
            <p className="mt-4">Now you're a Smart Snail!</p>
            <p className="mt-2">Some are farmers here, while some are Snailonauts, and over here we earn something more valuable than coins: Shells!</p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-lg font-semibold text-blue-600">Welcome Bonus:</p>
              <p className="text-3xl font-bold text-blue-700">5,000 Shells</p>
            </div>
            <button
              className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-semibold w-full sm:w-auto"
              onClick={handleClaim}
            >
              Claim Your Shells
            </button>
          </div>
        </div>
      )}

      <div className="w-full z-10 min-h-screen flex flex-col items-center">
        <div className="fixed top-[-2rem] left-0 w-full px-4 pt-8 z-10 flex flex-col items-center text-white">
          <div className="flex items-center justify-between w-full px-4 mb-4">
            <span className="text-2xl font-semibold">SmartSnail</span>

            <div className="flex space-x-4">
              <Link href="/Leaderboard"><img src="/images/info/output-onlinepngtools (4).png" width={24} height={24} alt="Leaderboard" /></Link>
              <Link href="/wallet"><img src="/images/info/output-onlinepngtools (2).png" width={24} height={24} alt="Wallet" /></Link>
              <Link href="/info"><img src="/images/info/output-onlinepngtools (1).png" width={24} height={24} alt="Profile" /></Link>
            </div>
          </div>

          <div className="mt-[-1rem] text-5xl font-bold flex items-center">
            <img src="/images/shell.png" width={50} height={50} alt="Coin" /> 
            <span className="ml-2">{user?.points.toLocaleString()}</span>
          </div>

          <div className="text-base mt-2 flex items-center justify-between">
            <button className="glass-shimmer-button text-white font-semibold px-3 py-1 rounded-md shadow-md mr-4 transform flex items-center">
              <div className="flex items-center">
                <img src="/images/trophy.png" width={24} height={24} alt="Trophy" className="mr-1" />
                <Link href="/level">Level :</Link>
              </div>
            </button>

            <span className="ml-0">
              {(user?.points ?? 0) < 1000000
                ? 'Camouflage'
                : (user?.points ?? 0) <= 3000000
                ? 'Speedy'
                : (user?.points ?? 0) <= 6000000
                ? 'Strong'
                : (user?.points ?? 0) <= 10000000
                ? 'Sensory'
                : 'African Giant Snail/god NFT'}
            </span>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center" onClick={handleIncreasePoints}>
          <div className="relative mt-4">
            <video src="/images/snails.mp4" autoPlay muted loop className="rounded-lg shadow-lg" />
            {clicks.map((click) => (
              <div
                key={click.id}
                className="absolute text-5xl font-bold text-white opacity-0"
                style={{
                  top: `${click.y - 42}px`,
                  left: `${click.x - 28}px`,
                  animation: 'float 1s ease-out'
                }}
                onAnimationEnd={() => setClicks(prev => prev.filter(c => c.id !== click.id))}
              >
                +{user?.tappingRate || 1}
              </div>
            ))}
          </div>
        </div>

        {notification && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full z-50">
            {notification}
          </div>
        )}
        
        {error && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full z-50">
            {error}
          </div>
        )}

        <div className="fixed bottom-0 left-0 w-full px-4 pb-4 z-10">
          <div className="w-full bg-[#f9c035] rounded-full mt-4">
            <div
              className="bg-gradient-to-r from-[#f3c45a] to-[#fffad0] h-4 rounded-full"
              style={{ width: `${(energy / maxEnergy) * 100}%` }}
            ></div>
          </div>
          
          <div className="w-full flex justify-between gap-2 mt-4">
            <div className="w-1/3 flex items-center justify-start max-w-32">
              <div className="flex items-center justify-center">
                <img src="/images/turbosnail-1.png" width={44} height={44} alt="High Voltage" />
                <div className="ml-2 text-left">
                  <span className="text-white text-2xl font-bold block">{energy}</span>
                  <span className="text-white text-large opacity-75">/ {maxEnergy}</span>
                </div>
              </div>
            </div>

            <div className="flex-grow flex items-center max-w-60 text-sm">
              <div className="w-full bg-[#fad258] py-4 rounded-2xl flex justify-around">
                <Link href="/referralsystem" className="flex flex-col items-center gap-1">
                  <img src="/images/SNAILNEW.png" width={50} height={50} alt="Frens" />
                  <span>Frens</span>
                </Link>
                <div className="h-[48px] w-[2px] bg-[#fddb6d]"></div>
                <Link href="/task" className="flex flex-col items-center gap-1">
                  <img src="/images/shell.png" width={30} height={30} alt="Earn" />
                  <span>Earn</span>
                </Link>
                <div className="h-[48px] w-[2px] bg-[#fddb6d]"></div>
                <Link href="/boost" className="flex flex-col items-center gap-1">
                  <img src="/images/startup.png" width={30} height={30} alt="Boosts" />
                  <span>Boost</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-50px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}