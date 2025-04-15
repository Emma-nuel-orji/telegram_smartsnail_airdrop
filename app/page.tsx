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
import { PointsQueue } from '@/src/utils/userSync';




// declare global {
//   interface Window {
//     Telegram?: {
//       WebApp: WebAppType;
//     };
//     pointsQueue?: PointsQueue;
//   }
// }

type Click = {
  id: number;
  x: number;
  y: number;
  tappingRate: number;
};

export default function Home() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [user, setUser] = useState<null | {
    telegramId: string;
    points: number;
    tappingRate: number | undefined;
    first_name?: string | null;
    last_name?: string | null;
    hasClaimedWelcome?: boolean;
  }>(null);
  
  useEffect(() => {
    console.log("🔍 Checking telegramId before API call:", telegramId);
  
    const fetchUserData = async () => {
      if (!telegramId) return;
      try {
        const response = await axios.get(`/api/user/${telegramId}`);
        console.log("✅ Fetched user data:", response.data);
        
        setUser(response.data);
      } catch (error) {
        console.error("🔥 Error fetching user data:", error);
      }
    };
  
    fetchUserData();
  }, [telegramId]);
  

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
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  const [isClicked, setIsClicked] = useState(false);
  const syncManager = useRef<UserSyncManager>();
  const { isConnected, walletAddress } = useWallet(); // Destructure walletAddress from useWallet
  

  const handleFightClubClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  const formatWalletAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 3)}...${address.slice(-3)}`;
  };


  const sanitizedNotification = notification?.replace(/https?:\/\/[^\s]+/g, '');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const syncWithLocalStorage = (userData: any) => {
    const storageKey = `user_${userData.telegramId}`;
    localStorage.setItem(storageKey, JSON.stringify(userData));
    localStorage.setItem(`lastSync_${userData.telegramId}`, Date.now().toString());
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
  const tg = (typeof window !== "undefined" && window.Telegram?.WebApp) || null;
  const maxEnergy = 1500;
  
  const getLocalStorageData = (telegramId: string) => {
    const storageKey = `user_${telegramId}`;
    const userData = localStorage.getItem(storageKey);
    return userData ? JSON.parse(userData) : null;
};

  

  
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
    });
  };


  
  const lastEnergyReduction = useRef<number>(0); // Track last reduction time
  const ENERGY_REDUCTION_DELAY = 300; // Minimum time between energy reductions (ms)
  
  const lastClickTime = useRef(0);

  const handleClick = async (e: React.MouseEvent) => {
    if (!user?.telegramId || energy <= 0) return;
    const syncManager = new UserSyncManager(user.telegramId);
  
    setIsClicking(true);
    setSpeed((prev) => Math.min(prev + 0.1, 5));
  
     // Get the dimensions of the clickable area
  const rect = e.currentTarget.getBoundingClientRect();
  
  // Calculate the animation text size (approximately)
  const textWidth = 56;  // ~28px * 2 based on your left offset
  const textHeight = 84; // ~42px * 2 based on your top offset
    
    // Constrain x and y to keep the animation fully within the viewport
    const x = Math.min(Math.max(e.clientX, rect.left + textWidth/2), rect.right - textWidth/2);
     const y = Math.min(Math.max(e.clientY, rect.top + textHeight/2), rect.bottom - textHeight/2);

    const newClick = {
      id: Date.now(),
      x, // Use the constrained coordinates
      y,
      tappingRate: user.tappingRate || 1,
    };
  
    setClicks((prev) => [...prev, newClick]);
  
    const tappingRate = Number(user.tappingRate) || 1;
  
    // ✅ Optimistically update points
    setUser((prevUser) => ({
      ...prevUser!,
      points: (prevUser?.points || 0) + tappingRate,
    }));
  
    // ✅ Ensure energy reduces only once per click
    const now = Date.now();
    if (now - lastClickTime.current > 50) { // Prevent multiple reductions per click
      setEnergy((prev) => Math.max(0, prev - ENERGY_REDUCTION_RATE));
      lastClickTime.current = now;
    }
  
    // ✅ Sync points but prevent energy from reducing multiple times
    await syncManager.addPoints(tappingRate);
    await syncManager.syncWithServer();
  
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
  
    inactivityTimeout.current = setTimeout(() => {
      setIsClicking(false);
      setSpeed((prev) => Math.max(1, prev - 0.2));
    }, 1000);
  
    setTimeout(() => {
      setClicks((prevClicks) => prevClicks.filter((click) => click.id !== newClick.id));
    }, 1000);
  };


  useEffect(() => {
    let syncManager: UserSyncManager | null = null;
    
    if (user?.telegramId) {
      syncManager = new UserSyncManager(user.telegramId);
      
      const handleUpdate = (event: CustomEvent<any>) => {
        setUser(event.detail);
      };
      
      window.addEventListener('userDataUpdate', handleUpdate as EventListener);
      
      return () => {
        syncManager?.cleanup();
        window.removeEventListener('userDataUpdate', handleUpdate as EventListener);
      };
    }
  }, [user?.telegramId]);
  
  
  

  const handleAnimationEnd = (id: number) => {
    setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
  };

  // Frontend claim handler
const handleClaim = async () => {
  try {
    if (!user?.telegramId) {
      setError('Please connect your Telegram account first.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Show loading state
    setLoading(true);

    // First, verify if user hasn't already claimed
    if (user.hasClaimedWelcome) {
      setError('Welcome bonus has already been claimed.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const res = await fetch('/api/claim-welcome', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        telegramId: user.telegramId,
        // Add a timestamp to help with debugging
        timestamp: new Date().toISOString()
      }),
    });

    // Get the response data
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw new Error('Invalid server response');
    }

    if (!res.ok) {
      throw new Error(data.message || `Server error: ${res.status}`);
    }

    if (!data.success) {
      throw new Error(data.message || 'Failed to claim bonus');
    }

    // Success path
    const updatedUser = {
      ...user,
      points: data.points,
      hasClaimedWelcome: true,
    };

    localStorage.setItem(`tg_user_${user.telegramId}`, JSON.stringify(updatedUser));
    setUser(updatedUser);
    setShowWelcomePopup(false);
    triggerConfetti();

  } catch (err) {
    console.error('Error in handleClaim:', err);
    setError(err instanceof Error ? err.message : 'An error occurred while claiming the bonus.');
    setTimeout(() => setError(null), 3000);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (user && user.hasClaimedWelcome) {
    setShowWelcomePopup(false); // Hide popup if already claimed
  } else if (user && !user.hasClaimedWelcome) {
    setShowWelcomePopup(true); // Show popup if not claimed
  }
}, [user]); // 👈 this is important!



useEffect(() => {
  if (!isClicking && energy >= maxEnergy) return; 

  let energyInterval: NodeJS.Timeout | null = null;
  let refillInterval: NodeJS.Timeout | null = null;
  let animationInterval: NodeJS.Timeout | null = null;

  if (isClicking) {
    if (energy > 0) {
      // Energy Reduction when Clicking
      energyInterval = setInterval(() => {
        setEnergy((prev) => Math.max(0, prev - ENERGY_REDUCTION_RATE));
      }, 500);

      // Click Animation Effect (move clicks upwards)
      animationInterval = setInterval(() => {
        setClicks((prevClicks) =>
          prevClicks.map((click) => ({
            ...click,
            y: click.y - 5, // Move clicks upwards for animation
          }))
        );
      }, 100);
    }
  } else {
    if (energy < maxEnergy) {
      // Energy Refill when Not Clicking
      refillInterval = setInterval(() => {
        setEnergy((prev) => Math.min(maxEnergy, prev + 10));
      }, 300);
    }
  }

  return () => {
    if (energyInterval) clearInterval(energyInterval);
    if (refillInterval) clearInterval(refillInterval);
    if (animationInterval) clearInterval(animationInterval);
  };
}, [isClicking, energy, maxEnergy]);

  // Initialize Telegram
  // useEffect(() => {
  //   const initializeTelegram = async () => {
  //     setLoading(true);
  //     const startTime = Date.now();
  
  //     try {
  //       console.log("🚀 Initializing Telegram Mini App...");
  
  //       if (!window.Telegram?.WebApp) {
  //         throw new Error("Telegram WebApp not available");
  //       }
  
  //       const tg = window.Telegram.WebApp;
  //       tg.ready();
  
  //       const userData = tg?.initDataUnsafe?.user;
  //       if (!userData?.id) {
  //         throw new Error("Unable to get user information from Telegram");
  //       }
  
  //       console.log(`📲 Telegram User Detected: ${JSON.stringify(userData)}`);
  
  //       // Create a unique key for each Telegram account
  //       const storageKey = `user_${userData.id}`;
  
  //       // Check cached data
  //       const cachedUser = localStorage.getItem(storageKey)
  //         ? JSON.parse(localStorage.getItem(storageKey) || "{}")
  //         : null;
  
  //       const lastSyncKey = `lastSync_${userData.id}`;
  //       const lastSync = localStorage.getItem(lastSyncKey);
  //       const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  //       if (cachedUser && lastSync && Date.now() - parseInt(lastSync, 10) < SYNC_INTERVAL) {
  //         console.log("✅ Using cached user data:", cachedUser);
  //         setUser(cachedUser);
  //         setLoading(false);
  //       } else {
  //         console.warn("⚠️ Cached data is missing or outdated. Fetching new data...");
  //       }
  
  //       // Fetch user from server
  //       console.log(`🔍 Fetching user from server: /api/user/${userData.id}`);
  //       const response = await fetch(`/api/user/${userData.id}`);
  
  //       if (response.ok) {
  //         const serverUser = await response.json();
  //         console.log("✅ User fetched from server:", serverUser);
  
  //         localStorage.setItem(storageKey, JSON.stringify(serverUser));
  //         localStorage.setItem(lastSyncKey, Date.now().toString());
  //         setUser(serverUser);
  //         if (!serverUser.hasClaimedWelcome) setShowWelcomePopup(true);
  //       } else {
  //         console.warn(`⚠️ User not found on server. Response: ${await response.text()}`);
  
  //         if (!cachedUser) {
  //           console.log(`📢 Creating new user with Telegram ID: ${userData.id}`);
  
  //           const requestData = {
  //             telegramId: userData.id.toString(),
  //             username: userData.username || "",
  //             first_name: userData.first_name || "",
  //             last_name: userData.last_name || "",
  //             points: 0,
  //             tappingRate: 1,
  //             hasClaimedWelcome: false,
  //             nft: false,
  //           };
  
  //           const createResponse = await fetch("/api/user", {
  //             method: "POST",
  //             headers: { "Content-Type": "application/json" },
  //             body: JSON.stringify(requestData),
  //           });
  
  //           if (!createResponse.ok) {
  //             const errorMessage = await createResponse.text();
  //             console.error(`❌ Failed to create user:`, errorMessage);
  //             throw new Error(`HTTP error! status: ${createResponse.status}`);
  //           }
  
  //           const newUser = await createResponse.json();
  //           console.log("✅ User successfully created:", newUser);
  
  //           localStorage.setItem(storageKey, JSON.stringify(newUser));
  //           localStorage.setItem(lastSyncKey, Date.now().toString());
  //           setUser(newUser);
  //           if (!newUser.hasClaimedWelcome) setShowWelcomePopup(true);
  //         }
  //       }
  //     } catch (err) {
  //       const error = err as Error;
  //       console.error("❌ Initialization error:", error);
  //       setError(error.message || "Failed to initialize app");
  
  //       const storageKey = `user_${tg?.initDataUnsafe?.user?.id || "unknown"}`;
  //       const cachedUser = localStorage.getItem(storageKey)
  //         ? JSON.parse(localStorage.getItem(storageKey) || "{}")
  //         : null;
  
  //       if (cachedUser) {
  //         console.log("✅ Using fallback cached user data:", cachedUser);
  //         setUser(cachedUser);
  //         setError(null);
  //       }
  //     } finally {
  //       const elapsedTime = Date.now() - startTime;
  //       const remainingTime = Math.max(6000 - elapsedTime, 0);
  //       setTimeout(() => setLoading(false), remainingTime);
  //     }
  //   };
  
  //   initializeTelegram();
  // }, []);
  
  useEffect(() => {
    const initializeTelegram = async () => {
      setLoading(true);
  
      try {
        const tg = window.Telegram?.WebApp;
        tg?.ready();
  
        const userData = tg?.initDataUnsafe?.user;
  
        if (!userData?.id) throw new Error("Telegram user data not found");
  
        const telegramId = userData.id.toString();
        setTelegramId(telegramId);
  
        const storageKey = `user_${telegramId}`;
        const lastSyncKey = `lastSync_${telegramId}`;
  
        const cachedUser = localStorage.getItem(storageKey) ? JSON.parse(localStorage.getItem(storageKey)!) : null;
        const lastSync = localStorage.getItem(lastSyncKey);
        const SYNC_INTERVAL = 5 * 60 * 1000;
  
        if (cachedUser && lastSync && Date.now() - parseInt(lastSync, 10) < SYNC_INTERVAL) {
          setUser(cachedUser);
          setLoading(false);
        } else {
          const res = await fetch(`/api/user/${telegramId}`);
          if (res.ok) {
            const freshUser = await res.json();
            localStorage.setItem(storageKey, JSON.stringify(freshUser));
            localStorage.setItem(lastSyncKey, Date.now().toString());
            setUser(freshUser);
          } else if (!cachedUser) {
            // If not found, create user
            const newUserPayload = {
              telegramId,
              username: userData.username || "",
              first_name: userData.first_name || "",
              last_name: userData.last_name || "",
              points: 0,
              tappingRate: 1,
              hasClaimedWelcome: false,
              nft: false,
            };
  
            const createRes = await fetch("/api/user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newUserPayload),
            });
  
            if (!createRes.ok) throw new Error("Failed to create user");
  
            const newUser = await createRes.json();
            localStorage.setItem(storageKey, JSON.stringify(newUser));
            localStorage.setItem(lastSyncKey, Date.now().toString());
            setUser(newUser);
          }
        }
      } catch (err: any) {
        console.error("Initialization error:", err.message);
        setError(err.message);
  
        // fallback only if telegramId is known
        const fallbackId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        if (fallbackId) {
          const fallbackUser = localStorage.getItem(`user_${fallbackId}`);
          if (fallbackUser) {
            setUser(JSON.parse(fallbackUser));
          }
        }
      } finally {
        setLoading(false);
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
  <div className="relative mt-4" onClick={handleClick}>
  {/* Fight Club Button - Prevent Click Effect */}
  <div className="absolute top-4 right-4 z-20">
              <Link href="/staking" passHref>
                <button
                  onClick={handleFightClubClick}
                  className="glass-shimmer-button text-white font-semibold px-4 py-2 rounded-md shadow-md flex items-center space-x-2"
                >
        <img
          src="/images/boxing-gloves.png"
          alt="Fight Club"
          className="w-6 h-6" // Adjust size as needed
        />
      </button>
    </Link>
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
