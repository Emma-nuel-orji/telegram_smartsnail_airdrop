'use client';

import { useEffect, useState, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import type { WebApp as WebAppType } from '@twa-dev/types';
import Link from 'next/link';
import './welcome.css';

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
export default function Home() {
  const [user, setUser] = useState<null | {
    telegramId: string;
    points: number;
    tappingRate: number;
    firstName: string;
  }>(null);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [energy, setEnergy] = useState(1500);
  const [isClicking, setIsClicking] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const maxEnergy = 1500;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleIncreasePoints = async () => {
    if (energy <= 0) {
      setError('Not enough energy to click!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const prevPoints = user!.points;
    const prevEnergy = energy;

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
        setTimeout(() => setNotification(''), 3000);
      } else {
        setUser((prevUser) => ({
          ...prevUser!,
          points: prevPoints,
        }));
        // setEnergy(prevEnergy);
        setError('Failed to increase points');
        setTimeout(() => setError(null), 2000);
      }
    } catch {
      setUser((prevUser) => ({
        ...prevUser!,
        points: prevPoints,
      }));
      // setEnergy(prevEnergy);
      setError('An error occurred while increasing points');
      setTimeout(() => setError(null), 3000);
    }
    // Reduce energy by 50 per click
    setEnergy((prev) => Math.max(0, prev - 50));
  };

  const handleSpeedAndAnimation = (e: React.MouseEvent) => {
    setIsClicking(true);

    setSpeed((prev) => Math.min(prev + 0.1, 5));
    const newClick = { id: Date.now(), x: e.clientX, y: e.clientY };
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
    try {
      // Wait for Telegram WebApp to be available
      if (!window.Telegram?.WebApp) {
        console.error('Telegram WebApp not available');
        setError('Please open this app in Telegram');
        return;
      }

      const tg = window.Telegram.WebApp;
      tg.ready();

      const { user } = tg.initDataUnsafe;
      
      if (!user?.id) {
        console.error('No user ID available');
        setError('Unable to get user information');
        return;
      }

      console.log('Attempting to fetch user data for ID:', user.id);
      
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          first_name: user.first_name,
          // Add any other relevant user data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received user data:', data);

      if (data.error) {
        setError(data.error);
        return;
      }

      setUser({
        ...data,
        telegramId: data.telegramId.toString(),
      });
  
      
      // Show welcome popup for new users
      if (data.points === 0) {
        setShowWelcomePopup(true);
      }

    } catch (error) {
      console.error('Error during initialization:', error);
      setError('Failed to initialize app');
    }
  };

  initializeTelegram();
}, []);
  
  // Handle claiming welcome bonus
  const handleClaim = async () => {
    try {
      if (!user) {
        // Early return if user is not defined
        setError('User is not defined.');
        return;
      }
  
      const res = await fetch('/api/claim-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId: user.telegramId }),
      });
  
      const data = await res.json();
  
      if (data.success) {
        setUser({ ...user, points: data.points });
        setShowWelcomePopup(false);
        setNotification('Welcome bonus claimed!');
  
        // Trigger falling shells animation after successful claim
        triggerFallingShellsAnimation();
      } else {
        setError('Failed to claim bonus');
      }
    } catch (err) {
      setError('An error occurred while claiming bonus');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white text-black p-6 rounded-md text-center">
            <h2 className="text-2xl font-bold">Welcome onboard {user?.firstName}!</h2>
            <p className="mt-4">Now you're a Smart Snail!</p>
            <p>Some are farmers here, while some are Snailonauts, and over here we earn something more valuable than coins: Shells!</p>
            <p className="mt-4 text-lg font-semibold">Welcome token: 5,000 Shells</p>
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
            +1
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
