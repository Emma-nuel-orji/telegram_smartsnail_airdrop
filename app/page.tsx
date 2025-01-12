'use client';

import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import type { WebApp as WebAppType } from '@twa-dev/types';
import Link from 'next/link';
import Loader from "@/loader";

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
    tappingRate: number;
    firstName?: string | null;
    lastName?: string | null;
  }>(null);

  const [firstName, setFirstName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [energy, setEnergy] = useState(1500);
  
  const [isLoading, setLoading] = useState(true);
  const [isClicking, setIsClicking] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const maxEnergy = 1500;

  const handleIncreasePoints = async (e: React.MouseEvent) => {
    if (!user || energy <= 0) return;

    const { clientX, clientY } = e;
    const id = Date.now();

    // Add a click effect
    setClicks((prevClicks) => [
      ...prevClicks,
      { id, x: clientX, y: clientY, tappingRate: user!.tappingRate },
    ]);

    const prevPoints = user.points;

    // Optimistic update
    setUser((prevUser) => ({
      ...prevUser!,
      points: prevUser!.points + prevUser!.tappingRate,
    }));

    setEnergy((prev) => Math.max(0, prev - 50));

    try {
      const res = await fetch('/api/increase-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user!.telegramId,
          tappingRate: user!.tappingRate,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setUser((prevUser) => ({
          ...prevUser!,
          points: data.points,
        }));
        setNotification(`Points increased by ${user!.tappingRate} per click!`);
        setTimeout(() => setNotification(null), 3000);
      } else {
        setUser((prevUser) => ({
          ...prevUser!,
          points: prevPoints,
        }));
        setError('Failed to increase points');
        setTimeout(() => setError(null), 2000);
      }
    } catch {
      setUser((prevUser) => ({
        ...prevUser!,
        points: prevPoints,
      }));
      setError('An error occurred while increasing points');
      setTimeout(() => setError(null), 3000);
    }

    // Remove the click effect after a short delay
    setTimeout(() => {
      setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
    }, 1000);
  };

  const handleSpeedAndAnimation = (e: React.MouseEvent) => {
    setIsClicking(true);

    setSpeed((prev) => Math.min(prev + 0.1, 5));
    const newClick = { 
        id: Date.now(), 
        x: e.clientX, 
        y: e.clientY,
        tappingRate: user?.tappingRate || 1 // Add the tappingRate from user
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
      const reduceInterval = setInterval(() => {
        setSpeed((prev) => {
          if (prev > 1) {
            return prev - 0.2;
          } else {
            clearInterval(reduceInterval);
            return 1;
          }
        });
      }, 100);
    };
  
  };

  const handleAnimationEnd = (id: number) => {
    setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
  };

  
  useEffect(() => {
    if (!isClicking && energy < maxEnergy) {
      const refillInterval = setInterval(() => {
        setEnergy((prev) => Math.min(maxEnergy, prev + 10));
      }, 500);

      return () => clearInterval(refillInterval);
    }
  }, [isClicking, energy]);

  // Modify your useEffect in Home component

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
          throw new Error('Unable to get user information');
        }
  
        const requestData = {
          telegramId: userData.id.toString(),
          username: userData.username || null,
          firstName: userData.first_name || null,
          lastName: userData.last_name || null,
          points: 0,
          tappingRate: 1,
          hasClaimedWelcome: false,
          nft: false,
        };
  
        // Increase timeout to 30 seconds and use Promise.race for better timeout handling
        const fetchWithTimeout = async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 300000);
  
          try {
            const response = await fetch('/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestData),
              signal: controller.signal,
            });
  
            clearTimeout(timeoutId);
  
            if (!response.ok) {
              const errorText = await response.text();
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: errorText };
              }
              throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
            }
  
            return response.json();
          } finally {
            clearTimeout(timeoutId);
          }
        };
  
        const data = await fetchWithTimeout();
        
        if (data.error) {
          throw new Error(data.error);
        }
  
        // Set user data
          setUser({
          telegramId: data.telegramId.toString(),
          points: data.points,
          tappingRate: data.tappingRate,
          firstName: data.firstName,
          lastName: data.lastName,
        });
  
        if (data.points === 0) {
          setShowWelcomePopup(true);
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        setError(err.message || 'Failed to initialize app');
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(4000 - elapsedTime, 0);
        setTimeout(() => setLoading(false), remainingTime);
      }
    };
  
    initializeTelegram();
  }, []);

  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }
  
  
  
  
const handleClaim = async () => {
  try {
    // Ensure user is defined before proceeding
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
    console.log(data); // Debug API response

    if (data.success) {
      setUser({ ...user, points: data.points });
      setShowWelcomePopup(false);
      setNotification('Welcome bonus claimed!');
      setTimeout(() => setNotification(null), 3000);

      // Trigger falling shells animation
      triggerFallingShellsAnimation();
    } else {
      setError('Failed to claim bonus');
      setTimeout(() => setError(null), 3000);
    }
  } catch (err) {
    console.error(err);
    setError('An error occurred while claiming bonus');
    setTimeout(() => setError(null), 3000);
  }
};

  
  // Function to trigger falling shells animation
  const triggerFallingShellsAnimation = () => {
    // Example implementation of triggering the falling shells animation
    const animationElement = document.querySelector('.falling-shells-container');
    if (animationElement) {
      animationElement.classList.add('animate-falling-shells'); // CSS class to handle animation
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

    {/* Solid Background Overlay for Popup */}
    <div className="absolute inset-0 bg-black bg-opacity-60 z-10"></div> {/* Solid dark overlay */}

    {/* Popup Content */}
    <div className="relative z-20 bg-gradient-to-r from-purple-700 via-purple-500 to-purple-600 text-white p-6 rounded-md text-center w-full max-w-md mx-4">
      
      {/* Welcome Heading */}
      <h2 className="text-2xl font-bold mb-4">Welcome onboard {firstName}!</h2>

      {/* Video Section */}
      <div className="mb-4 w-full">
        <video className="rounded-md mx-auto" width="320" height="240" autoPlay loop muted>
          <source src="/videos/speedsnail.mp4" type="video/mp4" />
          
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Content Below the Video */}
      <p className="mt-4">Now you're a Smart Snail!</p>
      <p>Some are farmers here, while some are Snailonauts. Over here we earn something more valuable than coins: Shells!</p>
      <p className="mt-4 text-lg font-semibold">Earn your first 5,000 Shells</p>

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
    
    {/* New section for smartsnail with icons */}
    <div className="flex items-center justify-between w-full px-4 mb-4">
      <span className="text-2xl font-semibold">SmartSnail</span>

      <div className="flex space-x-4">
        <Link href="/Leaderboard"><img src="/images/info/output-onlinepngtools (4).png" width={24} height={24} alt="Leaderboard" /></Link>
        <Link href="/wallet"><img src="/images/info/output-onlinepngtools (2).png" width={24} height={24} alt="Wallet" /></Link>
        <Link href="/info"><img src="/images/info/output-onlinepngtools (1).png" width={24} height={24} alt="Profile" /></Link>
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


    {/* ... */}
  </div>
  {notification && (
    <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
      {notification}
    </div>
  )}
</div>
);
}
