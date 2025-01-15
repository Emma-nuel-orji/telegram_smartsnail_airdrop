'use client';
import React from 'react';
import { useEffect, useState, useRef, SetStateAction } from 'react';
import WebApp from '@twa-dev/sdk';
import type { WebApp as WebAppType } from '@twa-dev/types';
import Link from 'next/link';
import Loader from "@/loader";
import confetti from 'canvas-confetti';
import ScrollingText from '@/components/ScrollingText';
import TonConnectButton from './TonConnectButton';
import { WalletProvider } from './context/walletContext';
import { WalletSection } from '../components/WalletSection';

// import { useWallet } from './context/walletContext';
// import { formatAddress } from '@/src/utils/formatAddress';

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
  }>(null);

  const [firstName, setFirstName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [energy, setEnergy] = useState(1500);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);  
  const [isLoading, setLoading,] = useState(true);
  
  const [isClicking, setIsClicking] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  // const { walletAddress, isConnected, connect, disconnect } = useWallet();

  // const [tonConnectUI, setTonConnectUI] = useState<any>(null);
  
  // const formatAddress = (address: string | any[]) => {
  //   if (!address) return '';
  //   return `${address.slice(0, 4)}...${address.slice(-4)}`;
  // };
  
  // const tonConnectUI = tonConnectUI();
  const NotificationButton = () => {
    // State to track if there's a new message
    const [hasNewMessage, setHasNewMessage] = useState(true); // Default set to true for testing
  
    // const handleConnect = async () => {
    //   if (!isConnected) {
    //     await connect();
    //   } else {
    //     setShowDisconnectConfirm(true);
    //   }
    // };
  
    // const handleDisconnect = async () => {
    //   await disconnect();
    //   setShowDisconnectConfirm(false);
    // };
  
  
  const maxEnergy = 1500;

  const reduceSpeed = () => {
    setSpeed((prev) => Math.max(1, prev - 0.2));
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
    });
  };

  const handleIncreasePoints = async (e: React.MouseEvent) => {
    if (!user || energy <= 0) return;
  
    const { clientX, clientY } = e;
    const id = Date.now();
  
    // Add visual feedback for the click
    setClicks((prevClicks) => [
      ...prevClicks,
      {
        id,
        x: clientX,
        y: clientY,
        tappingRate: user.tappingRate ?? 1,
      },
    ]);
  
    // Cache previous points for rollback
    // const prevPoints = user.points ?? 0;

    const prevPoints = Number(user.points)?? 0; // Ensure points is a number
  const tappingRate = Number(user.tappingRate) || 1; // Ensure tappingRate is a number

  // Optimistic update
  setUser((prevUser) => ({
    ...prevUser!,
    points: prevPoints + tappingRate, // Perform proper arithmetic
  }));

  localStorage.setItem('points', (prevPoints + tappingRate).toString());
  
    // Update energy
    const ENERGY_COST = 50; // Use constants for configurability
    setEnergy((prev) => Math.max(0, prev - ENERGY_COST));
  
    try {
      const res = await fetch('/api/increase-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegramId,
          tappingRate: user.tappingRate,
        }),
      });
  
      const data = await res.json();
  
      // If successful, update points from the server response
      if (data.success) {
        setUser((prevUser) => ({
          ...prevUser!,
          points: data.points,
        }));
        localStorage.setItem('points', data.points.toString());
      }
      // If not successful, silently rollback
      else {
        setUser((prevUser) => ({
          ...prevUser!,
          points: prevPoints,
        }));
      }
    } catch {
      // Silently rollback on fetch error
      setUser((prevUser) => ({
        ...prevUser!,
        points: prevPoints,
      }));
    } finally {
      // Remove click feedback after 1 second
      setTimeout(() => {
        setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
      }, 1000);
    }
  };
  

  const handleSpeedAndAnimation = (e: React.MouseEvent) => {
    setIsClicking(true);

    setSpeed((prev) => Math.min(prev + 0.1, 5));
    const newClick = { 
      id: Date.now(), 
      x: e.clientX, 
      y: e.clientY,
      tappingRate: user?.tappingRate || 1
    };
    setClicks((prev) => [...prev, newClick]);

    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }

    inactivityTimeout.current = setTimeout(() => {
      setIsClicking(false);
      reduceSpeed();
    }, 1000);
    const reduceSpeed = () => {
      setSpeed((prev) => Math.max(1, prev - 0.2));
    };
    
    useEffect(() => {
      if (!isClicking) {
        const interval = setInterval(reduceSpeed, 100);
        return () => clearInterval(interval);
      }
    }, [isClicking]);
  
  };

  const handleAnimationEnd = (id: number) => {
    setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
  };

  useEffect(() => {
    if (!isClicking && energy < maxEnergy) {
      const refillSpeed = Math.max(100, (maxEnergy - energy) / 10); // Adjust speed
      const refillInterval = setInterval(() => {
        setEnergy((prev) => Math.min(maxEnergy, prev + 10));
      }, refillSpeed);
  
      return () => clearInterval(refillInterval);
    }
  }, [isClicking, energy]);
  

  useEffect(() => {
    const initializeTelegram = async () => {
      setLoading(true);
      const startTime = Date.now();
  
      try {
        if (!window.Telegram?.WebApp) {
          throw new Error('Telegram WebApp not available');
        }
  
        const tg = window.Telegram.WebApp;
        tg.ready();
  
        const userData = tg?.initDataUnsafe?.user;
        if (!userData?.id) {
          throw new Error('Unable to get user information from Telegram');
        }
  
        // First check localStorage for cached data
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser); // Set immediately for fast UI update
        }
  
        // Always fetch fresh data from API
        const response = await fetch(`/api/user/${userData.id}`);
  
        if (response.ok) {
          const serverUser = await response.json();
          localStorage.setItem('user', JSON.stringify(serverUser)); // Update cache
          setUser(serverUser); // Update with server data
          if (!serverUser.hasClaimedWelcome) setShowWelcomePopup(true);
        } else {
          // If user doesn't exist, create new user
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
  
          try {
            const newUser = await createResponse.json();
            localStorage.setItem('user', JSON.stringify(newUser));
            setUser(newUser);
            if (!newUser.hasClaimedWelcome) setShowWelcomePopup(true);
          } catch (err) {
            // Handle the error
            const error = err as Error; // Typecast err to Error type
            console.error('Initialization error:', error);
            setError(error.message || 'Failed to initialize app');
          }
        }
      } catch (err) {
        // Handle the outer try block errors
        const error = err as Error; // Typecast err to Error type
        console.error('Outer initialization error:', error);
        setError(error.message || 'Failed to initialize app');
      } finally {
        // Final cleanup code, e.g., stop loading spinner
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(6000 - elapsedTime, 0);
        setTimeout(() => setLoading(false), remainingTime);
      }
    };
  
    initializeTelegram();
  }, []);
  
  
  // Function to update points
  const updatePoints = async (newPoints: number) => {
    if (!user?.telegramId) return;
  
    try {
      // Update localStorage immediately for fast UI
      const updatedUser = { ...user, points: newPoints };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
  
      // Then update server
      const response = await fetch(`/api/user/${user.telegramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: newPoints }),
      });
  
      if (!response.ok) throw new Error('Failed to update points');
      
      const serverUser = await response.json();
      // Update localStorage and state with server response
      localStorage.setItem('user', JSON.stringify(serverUser));
      setUser(serverUser);
    } catch (error) {
      console.error('Error updating points:', error);
      // On error, revert to previous state
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }
    }
  };

  useEffect(() => {
    setIsVideoLoading(true);
  }, []);

  // Slow refill and stop animation when energy hits 0
useEffect(() => {
  if (!isClicking && energy < maxEnergy) {
    // Slow down refill by increasing the interval and reducing refill rate
    const refillSpeed = Math.max(500, (maxEnergy - energy) * 20); // Slower refill speed

    const refillInterval = setInterval(() => {
      setEnergy((prev) => Math.min(maxEnergy, prev + 2)); // Slower refill step
    }, refillSpeed);

    return () => clearInterval(refillInterval);
  }
}, [isClicking, energy]);

// Conditionally stop animation when energy reaches 0
useEffect(() => {
  if (energy <= 0) {
    setIsClicking(false); // Stop animation when energy hits 0
  }
}, [energy]);

// Floating animation logic for click feedback
useEffect(() => {
  if (isClicking && energy > 0) {
    // Floating up animation
    const animationInterval = setInterval(() => {
      setClicks((prevClicks) =>
        prevClicks.map((click) => ({
          ...click,
          y: click.y - 5, // Move click feedback up (adjust value for speed)
        }))
      );
    }, 100);

    return () => clearInterval(animationInterval);
  }
}, [isClicking, energy]);


  useEffect(() => {
    const storedPoints = localStorage.getItem('points');
    const storedHasClaimedWelcome = localStorage.getItem('hasClaimedWelcome');
    const storedTelegramId = localStorage.getItem('telegramId') || '';
    const storedTappingRate = localStorage.getItem('tappingRate');
  
    if (storedPoints !== null && storedHasClaimedWelcome !== null) {
      setUser((prevUser) => ({
        ...prevUser,
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
  
  
  
 

  const handleClaim = async () => {
    try {
      // Validate user
      if (!user || !user.telegramId) {
        setError('User is not defined.');
        setTimeout(() => setError(null), 3000);
        return;
      }
  
      // Send request to claim the welcome bonus
      const res = await fetch('/api/claim-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegramId }),
      });
  
      const data = await res.json();
  
      if (res.ok && data.success) {
        // Update user state
        const updatedUser = {
          ...user,
          points: data.points, // New points from the server
          hasClaimedWelcome: true,
        };
  
        setUser(updatedUser);
        setShowWelcomePopup(false);
  
        // Store updated user in localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
  
        // Trigger confetti animation
        triggerConfetti();
      } else {
        // Handle server-side errors gracefully
        setError(data.message || 'Failed to claim bonus.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error in handleClaim:', err);
  
      // Handle network or unexpected errors
      setError('An error occurred while claiming the bonus.');
      setTimeout(() => setError(null), 3000);
    }
  };
  
  

  
 
  
  // Handle rendering based on state
  {/* Notification */}
  {notification && <div className="notification">{notification}</div>}
  
  {/* Error */}
  {error && (
    <div className="error-message">
      <span className="error-icon">🐌</span>
      <span className="error-text">{error}</span>
    </div>
  )}
  
  {!user ? (
    <div className="loading-container">
      <video autoPlay muted loop>
        <source src="/videos/unload.mp4" type="video/mp4" />
      </video>
    </div>
  ) : (
    <div className="welcome-container">
      <button onClick={handleClaim}>Claim Welcome Bonus</button>
  
      {/* Falling shells animation container */}
      <div className="falling-shells-container">
        {/* Falling shells animation content here */}
      </div>
    </div>
  )}
  

  // const connectWallet = () => {
  //   const ui = new tonConnectUI({
  //     manifestUrl: '/tonconnect-manifest.json',
  //     buttonRootId: 'ton-connect-button'
  //   });
  //   setTonConnectUI(ui);
  //   ui.openModal(); // Open the connection modal
  // };

  // // Function to handle wallet connection/disconnection based on the current state
  // const handleWalletAction = () => {
  //   if (tonConnectUI?.connected) {
  //     tonConnectUI.disconnect();
  //   } else {
  //     connectWallet(); // Initialize connection when user clicks the button
  //   }
  // };

  // // Effect hook to listen to wallet connection status change
  // React.useEffect(() => {
  //   if (tonConnectUI) {
  //     const checkWalletConnection = () => {
  //       if (tonConnectUI.account?.address) {
  //         setTonWalletAddress(tonConnectUI.account.address);
  //         setLoading(false);
  //       } else {
  //         setTonWalletAddress(null);
  //         setLoading(false);
  //       }
  //     };

  //     // Call the check immediately after connection setup
  //     checkWalletConnection();

  //     // Listen for any changes to wallet connection status
  //     const unsubscribe = tonConnectUI.onStatusChange((wallet: { account: { address: string | null }; }) => {
  //       if (wallet) {
  //         setTonWalletAddress(wallet.account.address);
  //       } else {
  //         setTonWalletAddress(null);
  //       }
  //     });

  //     return () => unsubscribe();
  //   }
  // }, [tonConnectUI]);

  return (
    
    <div className="bg-gradient-main min-h-screen px-4 flex flex-col items-center text-white font-medium">
      <div className="absolute inset-0 h-1/2 bg-gradient-overlay z-0"></div>
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="radial-gradient-overlay"></div>
      </div>

      <TonConnectButton />

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
            <h2 className="text-2xl font-bold mb-4">Welcome onboard {user?.first_name ? user.first_name : 'User'}!</h2>

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


      <WalletProvider>

      <div className="flex space-x-4">
        <Link href="/Leaderboard">
          <img src="/images/info/output-onlinepngtools (4).png" width={24} height={24} alt="Leaderboard" />
        </Link>
        

       {/* Wallet Icon and Connection Status */}
      
      <WalletSection /> 


        

        <Link href="/info">
          <img src="/images/info/output-onlinepngtools (1).png" width={24} height={24} alt="info" />
        </Link>
      </div>
      </WalletProvider>
    </div>

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

  



      {notification && <div className="notification">{notification}</div>}
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
      <div className="relative mt-4" onClick={handleIncreasePoints}>
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
  {notification && (
    <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
      {notification}
    </div>
  )}
</div>
);
}; 
}