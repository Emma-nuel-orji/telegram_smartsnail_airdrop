'use client';
import axios from "axios";
import React from 'react';
import { useEffect, useState, useRef } from 'react';
import type { WebApp as WebAppType } from '@twa-dev/types';
import Link from 'next/link';
import Loader from "@/loader";
import confetti from 'canvas-confetti';
import ScrollingText from '@/components/ScrollingText';
import { useWallet } from './context/walletContext';
import { WalletProvider } from './context/walletContext';
import { WalletSection } from '../components/WalletSection';
import { ConnectButton } from './ConnectButton';
import { UserSyncManager } from '@/src/utils/userSync';
// import { PointsQueue } from '@/src/utils/userSync';
import { ToastContainer } from 'react-toastify'

type Click = {
  opacity: number;
  velocityY: number;
  id: number;
  x: number;
  y: number;
  tappingRate: number;
  // velocity: number;
};


type User = {
  telegramId: string;
  points: number;
  tappingRate: number;
  first_name?: string;
  last_name?: string;
  hasClaimedWelcome?: boolean;
};

export default function Home() {
   const [firstName, setFirstName] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [energy, setEnergy] = useState(1500);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [isClicking, setIsClicking] = useState(false);
  const [speed, setSpeed] = useState(1);
  // const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  
  // const syncManager = useRef<UserSyncManager>();
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const ENERGY_REDUCTION_RATE = 20;
  const maxEnergy = 1500;
  //  const [speed, setSpeed] = useState(1);
  // const [clicks, setClicks] = useState<Click[]>([]);
  // const [energy, setEnergy] = useState(1500);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setLoading] = useState(true);
  // const [isClicking, setIsClicking] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  const [isClicked, setIsClicked] = useState(false);
  const syncManager = useRef<UserSyncManager>();
  const { isConnected, walletAddress } = useWallet();
   const formatWalletAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 3)}...${address.slice(-3)}`;
  };


  const sanitizedNotification = notification?.replace(/https?:\/\/[^\s]+/g, '');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ✅ SINGLE initialization - runs ONCE on mount
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);

      try {
        const tg = window.Telegram?.WebApp;
        if (!tg?.initDataUnsafe?.user?.id) {
          throw new Error("Telegram not initialized");
        }

        tg.ready();
        const telegramId = tg.initDataUnsafe.user.id.toString();
        const storageKey = `user_${telegramId}`;

        // 1. Load from localStorage FIRST (instant UI)
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          try {
            const parsedUser = JSON.parse(cached);
            console.log('📦 Loaded from cache:', parsedUser.points);
            setUser(parsedUser);
          } catch (e) {
            console.error('Failed to parse cache:', e);
            localStorage.removeItem(storageKey);
          }
        }

        // 2. Fetch from server in background
        try {
          const res = await axios.get(`/api/user/${telegramId}`);
          const serverUser = res.data;

          // 3. Merge: Keep HIGHER points
          const finalUser = cached ? (() => {
            const localUser = JSON.parse(cached);
            return {
              ...serverUser,
              points: Math.max(serverUser.points || 0, localUser.points || 0)
            };
          })() : serverUser;

          console.log('🔄 Merged - Server:', serverUser.points, 'Local:', cached ? JSON.parse(cached).points : 0, 'Final:', finalUser.points);

          // 4. Save merged result
          localStorage.setItem(storageKey, JSON.stringify(finalUser));
          setUser(finalUser);

        } catch (fetchError: any) {
          console.error('⚠️ Server fetch failed:', fetchError);
          
          // If fetch fails and no cache, create new user
          if (!cached) {
            const newUser = {
              telegramId,
              username: tg.initDataUnsafe.user.username || "",
              first_name: tg.initDataUnsafe.user.first_name || "",
              last_name: tg.initDataUnsafe.user.last_name || "",
              points: 0,
              tappingRate: 1,
              hasClaimedWelcome: false,
            };

            const createRes = await axios.post('/api/user', newUser);
            const createdUser = createRes.data;
            
            localStorage.setItem(storageKey, JSON.stringify(createdUser));
            setUser(createdUser);
          }
          // If fetch fails but we have cache, keep using cache (already set above)
        }

      } catch (err: any) {
        console.error('❌ Init failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []); // ✅ Empty deps - runs ONCE

  // ✅ Initialize sync manager
  useEffect(() => {
    if (user?.telegramId && !syncManager.current) {
      syncManager.current = new UserSyncManager(user.telegramId);
    }

    return () => {
      syncManager.current?.cleanup();
      syncManager.current = undefined;
    };
  }, [user?.telegramId]);

  // ✅ Listen for sync updates
  useEffect(() => {
    const handleUpdate = (event: CustomEvent<any>) => {
      setUser(prev => {
        if (!prev) return event.detail;
        
        // Keep higher points
        const merged = {
          ...event.detail,
          points: Math.max(event.detail.points || 0, prev.points || 0)
        };

        // Update localStorage
        localStorage.setItem(`user_${prev.telegramId}`, JSON.stringify(merged));
        
        return merged;
      });
    };
    
    window.addEventListener('userDataUpdate', handleUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userDataUpdate', handleUpdate as EventListener);
    };
  }, []);

  // ✅ Show welcome popup check
  useEffect(() => {
    if (user) {
      setShowWelcomePopup(!user.hasClaimedWelcome);
    }
  }, [user]);

  // ✅ Click handler - SIMPLIFIED
  const handleClick = async (e: React.MouseEvent) => {
    if (!user?.telegramId || energy <= 0 || !syncManager.current) return;

    const tappingRate = Number(user.tappingRate) || 1;

    // Update UI + localStorage atomically
    setUser(prev => {
      const updated = {
        ...prev!,
        points: (prev?.points || 0) + tappingRate,
      };
      
      // Save immediately
      localStorage.setItem(`user_${prev!.telegramId}`, JSON.stringify(updated));
      
      return updated;
    });

    setEnergy(prev => Math.max(0, prev - ENERGY_REDUCTION_RATE));

    // Queue for server sync
    syncManager.current.addPoints(tappingRate);

    // Visual effects
    setIsClicking(true);
    setSpeed(prev => Math.min(prev + 0.1, 5));

    const newClick = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
      tappingRate,
      velocityY: -2,
      opacity: 1,
    };

    setClicks(prev => [...prev, newClick]);

    const animationInterval = setInterval(() => {
      setClicks(prev =>
        prev.map(c => 
          c.id === newClick.id
            ? {
                ...c,
                y: c.y + c.velocityY,
                velocityY: c.velocityY - 0.05,
                opacity: Math.max(0, c.opacity - 0.02),
              }
            : c
        ).filter(c => c.opacity > 0)
      );
    }, 16);

    setTimeout(() => {
      clearInterval(animationInterval);
      setClicks(prev => prev.filter(c => c.id !== newClick.id));
    }, 2000);

    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }

    inactivityTimeout.current = setTimeout(() => {
      setIsClicking(false);
      setSpeed(prev => Math.max(1, prev - 0.2));
    }, 1000);
  };

const handleAnimationEnd = (id: number) => {
    setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
  };  // ✅ Claim handler - updated to save properly
  const handleClaim = async () => {
    try {
      if (!user?.telegramId || user.hasClaimedWelcome) return;

      setLoading(true);

      const res = await fetch("/api/claim-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: user.telegramId,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to claim bonus");
      }

      // Update user with new points
      const updatedUser = {
        ...user,
        points: data.points,
        hasClaimedWelcome: true,
      };

      localStorage.setItem(`user_${user.telegramId}`, JSON.stringify(updatedUser));
      setUser(updatedUser);
      setShowWelcomePopup(false);

      // Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.5 },
      });

    } catch (err: any) {
      console.error("Claim error:", err);
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Energy refill logic
  useEffect(() => {
    if (!isClicking && energy >= maxEnergy) return;

    let refillInterval: NodeJS.Timeout | null = null;

    if (!isClicking && energy < maxEnergy) {
      refillInterval = setInterval(() => {
        setEnergy(prev => Math.min(maxEnergy, prev + 10));
      }, 300);
    }

    return () => {
      if (refillInterval) clearInterval(refillInterval);
    };
  }, [isClicking, energy, maxEnergy]);

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

  // const resetAppSession = () => {
  //   localStorage.clear();
  //   window.Telegram?.WebApp?.close(); // Optional: closes the Mini App
  //   // OR: window.location.reload(); // if you prefer reloading the app
  // };
  

  // Set first name effect
  // useEffect(() => {
  //   if (user?.first_name) {
  //     setFirstName(user.first_name);
  //   }
  // }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="bg-gradient-main min-h-screen px-4 flex flex-col items-center text-white font-medium"> 
      <ToastContainer position="top-right" autoClose={4000} />
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
            <h2 className="text-2xl font-bold mb-4">Welcome onboard {firstName}!</h2>

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
      className={`relative overflow-hidden mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600`}
      onClick={handleClaim}
    >
      {isClicked && (
        <span
          className="absolute rounded-full bg-white opacity-50 animate-ping"
          style={{
            width: "200px",
            height: "200px",
           
          }}
        ></span>
      )}
      Claim
    </button>

            
          </div>
        </div>
      )}
     

    <div className="w-full z-10 min-h-screen flex flex-col items-center text-white">
  <div className="fixed top-[-2rem] left-0 w-full px-4 pt-8 z-10 flex flex-col items-center text-white">
    {/* Top section with brand and icons */}
    <div className="w-full flex items-center justify-between px-4 mb-2">
      {/* Brand */}
      <div className="flex flex-col items-start">

        <span className="text-2xl font-semibold">SmartSnail</span>
        <span className="text-sm text-gray-400">Marketplace</span>
      </div>

      {/* Icons and wallet section */}
      <div className="flex flex-col w-full">
  {/* Icons row with everything aligned right */}
  <div className="flex items-center justify-end w-full space-x-4">
    <div className="flex items-center space-x-4">
      <div className="relative hover:bg-gray-100 p-1 rounded-lg">
        <Link href="/Leaderboard">
          <img
            src="/images/info/output-onlinepngtools (4).png"
            width={24}
            height={24}
            alt="Leaderboard"
          />
        </Link>
      </div>

      <div>
        <ConnectButton />
      </div>

      <div className="relative hover:bg-gray-100 p-1 rounded-lg">
        <Link href="/info">
          <img
            src="/images/info/output-onlinepngtools (1).png"
            width={24}
            height={24}
            alt="info"
          />
        </Link>
      </div>
    </div>
  </div>

  {/* Wallet address */}
  {isConnected && walletAddress && (
    <div className="flex justify-end w-full text-sm font-medium text-gray-600 mt-2 whitespace-nowrap">
      <span>Connected: </span>
      <span>{formatWalletAddress(walletAddress)}</span>
    </div>
  )}
</div>
    </div>

     


    {/* User Stats Section */}
    {/* <p>Points: {user?.points}</p>
    <p>Energy: {energy}</p> */}

    {/* Original section */}
    <div className="mt-8 text-5xl font-bold flex items-center">
  <img src="/images/shell.png" width={50} height={50} alt="Coin" /> 
  <span className="ml-2">{user?.points.toLocaleString()}</span>
</div>

{/* Level and Camouflage Logic */}
<div className="text-base mt-2 flex items-center justify-between">
  <button className="glass-shimmer-button text-white font-semibold px-3 py-1 rounded-md shadow-md mr-4 transform flex items-center">
    <div className="flex items-center">
      <img src="/images/trophy.png" width={24} height={24} alt="Trophy" className="mr-1" />
      <Link href="/level">Level  :</Link>
    </div>
  </button>


  {/* <button onClick={resetAppSession} className="mt-4 text-red-600">
  Reset & Switch Account
</button> */}


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


      <div className="relative flex-grow flex items-center justify-center">
  
 

  {/* Video with Click Handler */}
  <div className="relative mt-4 flex flex-row space-x-2" onClick={handleClick}>
  {/* Fight Club Button - Prevent Click Effect */}
  {/* <div className="absolute top-4 right-4 z-20"> */}
  <div className="absolute top-4 right-4 z-20 pr-4 flex flex-row space-x-2" >
              <Link href="/staking" passHref>
                <button
                  // onClick={handleFightClubClick}
                  className="glass-shimmer-button text-white font-semibold px-4 py-2 rounded-md shadow-md flex items-center space-x-2"
                >
        <img
          src="/images/boxing-gloves.png"
          alt="Fight Club"
          className="w-6 h-6" // Adjust size as needed
          onClick={(e) => e.stopPropagation()}
        />
      </button>
    </Link>
  {/* </div> */}

  {/* <div className="absolute top-4 right-4 z-20"> */}
              <Link href="/gym" passHref>
                <button
                  // onClick={handleFightClubClick}
                  className="glass-shimmer-button text-white font-semibold px-4 py-2 rounded-md shadow-md flex items-center space-x-2"
                >
        <img
          src="/images/gym.png"
          alt="Fight Club"
          className="w-6 h-6" // Adjust size as needed
          onClick={(e) => e.stopPropagation()}
        />
      </button>
    </Link>
  {/* </div> */}


          
  {/* <div className="absolute top-4 right-4 z-20"> */}
              <Link href="/register" passHref>
                <button
                  // onClick={handleFightClubClick}
                  className="glass-shimmer-button text-white font-semibold px-4 py-2 rounded-md shadow-md flex items-center space-x-2"
                >
        <img
          src="/images/register.png"
          alt="Fight Club"
          className="w-6 h-6" // Adjust size as needed
          onClick={(e) => e.stopPropagation()}
        />
      </button>
    </Link>

     {/* <div className="absolute top-4 right-4 z-20"> */}
              <Link href="/marketplace" passHref>
                <button
                  // onClick={handleFightClubClick}
                  className="glass-shimmer-button text-white font-semibold px-4 py-2 rounded-md shadow-md flex items-center space-x-2"
                >
        <img
          src="/images/shop.png"
          alt="Fight Club"
          className="w-6 h-6" // Adjust size as needed
          onClick={(e) => e.stopPropagation()}
        />
      </button>
    </Link>
  {/* </div> */}

  </div>


  {/* Video */}
  <video
    src="/images/snails.mp4"
    autoPlay
    muted
    loop
    className="w-full h-auto"
  />


    
    {/* Floating Clicks Animation */}
    {clicks.map((click) => (
      <div
        key={click.id}
        className="absolute text-5xl font-bold text-white opacity-0 pointer-events-none z-50"
        style={{
          top: `${click.y - 42}px`,
          left: `${click.x - 28}px`,
          animation: 'float 1s ease-out',
          willChange: 'transform, opacity',
          // zIndex: 10,
        }}
        onAnimationEnd={() => handleAnimationEnd(click.id)}
      >
        +{click.tappingRate}
      </div>
    ))}
  </div>
</div>

  
  </div>
  
  </div>

);
};
