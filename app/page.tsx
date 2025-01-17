'use client';
import React from 'react';
import { useEffect, useState, useRef } from 'react';
import type { WebApp as WebAppType } from '@twa-dev/types';
import Link from 'next/link';
import Loader from "@/loader";
import confetti from 'canvas-confetti';
import ScrollingText from '@/components/ScrollingText';
import { WalletProvider } from './context/walletContext';
import { WalletSection } from '../components/WalletSection';
import { ConnectButton } from './ConnectButton';

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
  tappingRate: number;
};

export default function Home() {
  const [user, setUser] = useState<null | {
    telegramId: string;
    points: number;
    tappingRate: number | undefined;
    first_name?: string | null;
    last_name?: string | null;
    hasClaimedWelcome?: boolean;
  }>(null);

  const [firstName, setFirstName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [energy, setEnergy] = useState(1500);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isClicking, setIsClicking] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const sanitizedNotification = notification?.replace(/https?:\/\/[^\s]+/g, '');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const syncWithLocalStorage = (userData: any) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('points', userData.points.toString());
    localStorage.setItem('tappingRate', userData.tappingRate.toString());
    localStorage.setItem('hasClaimedWelcome', userData.hasClaimedWelcome.toString());
    localStorage.setItem('telegramId', userData.telegramId);
    localStorage.setItem('lastSync', Date.now().toString());
  };
  
    // const clearLocalStorage = () => {
    //   localStorage.clear(); // Clears all data in localStorage
    //   alert('LocalStorage has been cleared!');
    // };
  // const [pendingRequests, setPendingRequests] = useState<number[]>([]);
  // const [lastRequestTime, setLastRequestTime] = useState<number | null>(null);
  // const isPendingRequest = (requestId: number): boolean => {
  //   return pendingRequests.includes(requestId);
  // };

  const REDUCTION_RATE = 20; // Amount of speed to reduce per interval
  const REFILL_RATE = 40;    // Amount of speed to refill per interval
  const ENERGY_REDUCTION_RATE =  20; // Amount of energy to reduce per interval
  
  const getLocalStorageData = () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  };
  const maxEnergy = 1500;

  
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
    });
  };




  

  const handleClick = async (e: React.MouseEvent) => {
    setIsClicking(true);
    setSpeed((prev) => Math.min(prev + 0.1, 5));
  
    const newClick = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
      tappingRate: user?.tappingRate || 1,
    };
  
    setClicks((prev) => [...prev, newClick]);
  
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
  
    inactivityTimeout.current = setTimeout(() => {
      setIsClicking(false);
      setSpeed((prev) => Math.max(1, prev - 0.2));
    }, 1000);
  
    if (!user || energy <= 0) return;
  
    const tappingRate = Number(user.tappingRate) || 1;
    const prevPoints = Number(user.points) || 0;
    const newPoints = prevPoints + tappingRate;
  
    // Optimistically update points
    setUser((prevUser) => ({
      ...prevUser!,
      points: newPoints,
    }));
    syncWithLocalStorage({
      ...user,
      points: newPoints,
    });
  
    // Reduce energy
    const ENERGY_REDUCTION_RATE = tappingRate;
    setEnergy((prev) => Math.max(0, prev - ENERGY_REDUCTION_RATE));
  
    try {
      const res = await fetch('/api/increase-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegramId,
          tappingRate,
        }),
      });
  
      const data = await res.json();
      console.log("API Response:", data);
  
      if (data.success) {
        const updatedUser = {
          ...user,
          points: data.points,
        };
        setUser(updatedUser);
        syncWithLocalStorage(updatedUser);
      }
    } catch (error) {
      console.error("Error updating points:", error);
      // Revert optimistic update on error
      const revertUser = {
        ...user,
        points: prevPoints,
      };
      setUser(revertUser);
      syncWithLocalStorage(revertUser);
    } finally {
      setTimeout(() => {
        setClicks((prevClicks) => prevClicks.filter((click) => click.id !== newClick.id));
      }, 1000);
    }
  };
  
  
  

  const handleAnimationEnd = (id: number) => {
    setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
  };

  const handleClaim = async () => {
    try {
      if (!user || !user.telegramId) {
        setError('User is not defined.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      const res = await fetch('/api/claim-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegramId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const updatedUser = {
          ...user,
          points: data.points,
          hasClaimedWelcome: true,
        };

        setUser(updatedUser);
        setShowWelcomePopup(false);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        triggerConfetti();
      } else {
        setError(data.message || 'Failed to claim bonus.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error in handleClaim:', err);
      setError('An error occurred while claiming the bonus.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Speed Reduction Effect
useEffect(() => {
  if (!isClicking) {
    const interval = setInterval(() => {
      setSpeed((prev) => Math.max(1, prev - REDUCTION_RATE)); // Reduce speed gradually
    }, 300); // Slow down the rate of reduction (every 300ms)

    return () => clearInterval(interval);
  }
}, [isClicking]);

// Speed Refill Effect when energy is greater than 0
useEffect(() => {
  if (energy < maxEnergy && !isClicking) {
    const refillInterval = setInterval(() => {
      setEnergy((prev) => Math.min(maxEnergy, prev + 10));
    }, 300);

    return () => clearInterval(refillInterval);
  }
}, [energy, maxEnergy, isClicking]); // Dependency on isClicking


// Energy Reduction when Clicking
useEffect(() => {
  if (isClicking && energy > 0) {
    const energyInterval = setInterval(() => {
      setEnergy((prev) => Math.max(0, prev - ENERGY_REDUCTION_RATE)); // Reduce energy
    }, 500); // Slow energy reduction (every 500ms)

    return () => clearInterval(energyInterval);
  }
}, [isClicking]);

// Energy Refill Effect (when energy reaches 0, stop clicking)
useEffect(() => {
  if (energy <= 0) {
    setIsClicking(false);
  }
}, [energy]);

// Click Animation Effect
useEffect(() => {
  if (isClicking && energy > 0) {
    const animationInterval = setInterval(() => {
      setClicks((prevClicks) =>
        prevClicks.map((click) => ({
          ...click,
          y: click.y - 5, // Move clicks upwards slowly for animation
        }))
      );
    }, 100);

    return () => clearInterval(animationInterval);
  }
}, [isClicking, energy]);

  // Initialize Telegram
  useEffect(() => {
    const initializeTelegram = async () => {
      setLoading(true);
      const startTime = Date.now();
    
      try {
        // First, check localStorage for cached data
        const cachedUser = getLocalStorageData();
        const lastSync = localStorage.getItem('lastSync');
        const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
        // If we have cached data and it's recent, use it
        if (cachedUser && lastSync && Date.now() - parseInt(lastSync) < SYNC_INTERVAL) {
          setUser(cachedUser);
          setLoading(false);
          return;
        }
    
        if (!window.Telegram?.WebApp) {
          throw new Error('Telegram WebApp not available');
        }
    
        const tg = window.Telegram.WebApp;
        tg.ready();
    
        const userData = tg?.initDataUnsafe?.user;
        if (!userData?.id) {
          throw new Error('Unable to get user information from Telegram');
        }
    
        // If we have cached data but it's old, use it temporarily while fetching fresh data
        if (cachedUser) {
          setUser(cachedUser);
        }
    
        const response = await fetch(`/api/user/${userData.id}`);
    
        if (response.ok) {
          const serverUser = await response.json();
          syncWithLocalStorage(serverUser);
          setUser(serverUser);
          if (!serverUser.hasClaimedWelcome) setShowWelcomePopup(true);
        } else {
          // Only create new user if we don't have cached data
          if (!cachedUser) {
            const requestData = {
              telegramId: userData.id.toString(),
              username: userData.username || '',
              first_name: userData.first_name || '',
              last_name: userData.last_name || '',
              points: 0,
              tappingRate: 1,
              hasClaimedWelcome: false,
              nft: false,
            };
    
            const createResponse = await fetch('/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData),
            });
    
            if (!createResponse.ok) {
              throw new Error(`HTTP error! status: ${createResponse.status}`);
            }
    
            const newUser = await createResponse.json();
            syncWithLocalStorage(newUser);
            setUser(newUser);
            if (!newUser.hasClaimedWelcome) setShowWelcomePopup(true);
          }
        }
      } catch (err) {
        const error = err as Error;
        console.error('Initialization error:', error);
        setError(error.message || 'Failed to initialize app');
        
        // If we have cached data, keep using it despite the error
        const cachedUser = getLocalStorageData();
        if (cachedUser) {
          setUser(cachedUser);
          setError(null);
        }
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(6000 - elapsedTime, 0);
        setTimeout(() => setLoading(false), remainingTime);
      }
    };

    initializeTelegram();
  }, []);

  // Load stored data effect
  useEffect(() => {
    const storedPoints = localStorage.getItem('points');
    const storedHasClaimedWelcome = localStorage.getItem('hasClaimedWelcome');
    const storedTelegramId = localStorage.getItem('telegramId') || '';
    const storedTappingRate = localStorage.getItem('tappingRate');

    if (storedPoints !== null && storedHasClaimedWelcome !== null) {
      setUser((prevUser) => ({
        ...prevUser!,
        telegramId: prevUser?.telegramId || storedTelegramId,
        points: parseInt(storedPoints, 10),
        tappingRate: storedTappingRate ? parseInt(storedTappingRate, 10) : 1,
        hasClaimedWelcome: storedHasClaimedWelcome === 'true',
      }));

      if (storedHasClaimedWelcome === 'true') {
        setShowWelcomePopup(false);
      }
    }
  }, []);

  // Set first name effect
  useEffect(() => {
    if (user?.first_name) {
      setFirstName(user.first_name);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="bg-gradient-main min-h-screen px-4 flex flex-col items-center text-white font-medium">
      <div className="absolute inset-0 h-1/2 bg-gradient-overlay z-0"></div>
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="radial-gradient-overlay"></div>
      </div>

      {/* Welcome Popup */}
        {showWelcomePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-all duration-500 ease-in-out">
          {/* Background Blur Effect */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-lg transition-all duration-500 ease-in-out scale-110"
            style={{ backgroundImage: 'url("/path/to/your/background-image.jpg")' }}
          ></div>

          {/* Solid Background Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-60 z-10"></div>

          {/* Popup Content */}
          <div className="relative z-20 bg-gradient-to-r from-purple-700 via-purple-500 to-purple-600 text-white p-6 rounded-md text-center w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-4">Welcome onboard {firstName || 'User'}!</h2>

            {/* Video Section */}
            <div className="mb-4 w-full relative">
              <div className={`transition-opacity duration-300 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}>
                <video 
                  className="rounded-md mx-auto"
                  width="320"
                  height="240"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onLoadedData={() => setTimeout(() => setIsVideoLoading(false), 100)}
                  onError={() => {
                    setIsVideoLoading(false);
                    setVideoError(true);
                  }}
                >
                  <source src="/videos/speedsnail.webm" type="video/webm" />
                  <source src="/videos/speedsnail-optimized.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-purple-800/20 rounded-md">
                  <div className="text-center p-4">
                    <p className="text-white/80 text-sm">
                      Unable to load welcome video. Please refresh.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Scrolling Text */}
              <ScrollingText />

            {/* Claim Button */}
            <button
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleClaim}
            >
              Claim
            </button>
            
          </div>
        </div>
      )}
    
     
    


<div className="w-full z-10 min-h-screen flex flex-col items-center text-white">
  {/* Existing home page content */}
  <div className="fixed top-[-2rem] left-0 w-full px-4 pt-8 z-10 flex flex-col items-center text-white">
    
    {/* New section for SmartSnail with icons */}
    <div className="flex items-center justify-between w-full px-4 mb-4">
      <div className="flex flex-col items-center">
        <span className="text-2xl font-semibold">SmartSnail</span>
        {/* Marketplace text under SmartSnail */}
        <span className="text-sm text-gray-400">Marketplace</span>
      </div>

      <div className="flex space-x-4">
        <Link href="/Leaderboard">
          <img src="/images/info/output-onlinepngtools (4).png" width={24} height={24} alt="Leaderboard" />
        </Link>
        <ConnectButton />
        <Link href="/info">
          <img src="/images/info/output-onlinepngtools (1).png" width={24} height={24} alt="info" />
        </Link>
      </div>
    </div>
  



    {/* User Stats Section */}
    {/* <p>Points: {user?.points}</p>
    <p>Energy: {energy}</p> */}

    {/* Original section */}
    <div className="mt-[-1rem] text-5xl font-bold flex items-center">
      <img src="/images/shell.png"  width={50} height={50} alt="Coin" /> 
      <span className="ml-2">{user?.points.toLocaleString()}</span>
    </div>

    {/* Level and Camouflage Logic */}
    <div className="text-base mt-2 flex items-center justify-between">
    <button
  className="glass-shimmer-button text-white font-semibold px-3 py-1 rounded-md shadow-md mr-4 transform flex items-center"
>
  <div className="flex items-center">
    <img src="/images/trophy.png" width={24} height={24} alt="Trophy" className="mr-1" />
    <Link href="/level">Level  :</Link>
  </div>
</button>


      {/* Display Camouflage Level */}
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




  {notification && <div className="notification">{sanitizedNotification}</div>}
      {error && <div className="error">{error}</div>}
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


      <div className="flex-grow flex items-center justify-center" >
      {/* Video with Click Handler */}
      <div className="relative mt-4" onClick={handleClick}>
        <video src="/images/snails.mp4" autoPlay muted loop />
        
        {/* Floating Clicks Animation */}
        {clicks.map((click) => (
    <div
        key={click.id}
        className="absolute text-5xl font-bold text-white opacity-0"
        style={{
            top: `${click.y - 42}px`,
            left: `${click.x - 28}px`,
            animation: 'float 1s ease-out'
        }}
        onAnimationEnd={() => handleAnimationEnd(click.id)}
    >
        +{click.tappingRate}
    </div>
      ))}
    </div>

</div>



  
  </div>
  {notification && (
    <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
      {sanitizedNotification}
    </div>
  )}
</div>
);
};
