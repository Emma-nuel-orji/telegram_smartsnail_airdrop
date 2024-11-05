'use client';

import { useEffect, useState } from 'react';
import { WebApp } from '@twa-dev/types';
import Link from 'next/link';

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

export default function Home() {

  const [clicks, setClicks] = useState<any[]>([]);
  const [user, setUser] = useState<any>({ points: 0 });

// Adjusted function for animation and incrementing points
const handleAnimatedPointsIncrease = async (e: React.MouseEvent) => {
  const { clientX, clientY } = e;
  const id = Date.now();

  // Add click to the array with animation position
  setClicks((prevClicks) => [
    ...prevClicks,
    { id, x: clientX, y: clientY }
  ]);

  // Increment points in the frontend
  setUser((prevUser: typeof user) => ({ ...prevUser, points: prevUser.points + 12 }));

  // Send request to update points in the database
  try {
    const res = await fetch('/api/increase-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ telegramId: user.telegramId }),
    });
    
    const data = await res.json();
    if (data.success) {
      setUser({ ...user, points: data.points }); // Update user points with response
    } else {
      setError('Failed to update points in database');
    }
  } catch (err) {
    setError('An error occurred while updating points in database');
  }
};



  const handleAnimationEnd = (id: number) => {
    // Remove the animation div after it finishes
    setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
  };
  // Animation ends here


  // const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState('');
  const [energy, setEnergy] = useState(1500);
  const maxEnergy = 1500;
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      const initDataUnsafe = tg.initDataUnsafe || {};

      if (initDataUnsafe.user) {
        fetch('/api/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(initDataUnsafe.user),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              setError(data.error);
            } else {
              setUser(data);
              // Show welcome popup if the user is logging in for the first time
              setShowWelcomePopup(data.isFirstTime);
            }
          })
          .catch(() => {
            setError('Failed to fetch user data');
          });
      } else {
        setError('No user data available');
      }
    } else {
      setError('This app should be opened in Telegram');
    }
  }, []);

  const handleClaim = async () => {
    try {
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
      } else {
        setError('Failed to claim bonus');
      }
    } catch (err) {
      setError('An error occurred while claiming bonus');
    }
  };

  // const handleIncreasePoints = async () => {
  //   if (!user || energy <= 0) return;

  //   try {
  //     const res = await fetch('/api/increase-points', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ telegramId: user.telegramId }),
  //     });
  //     const data = await res.json();
  //     if (data.success) {
  //       setUser({ ...user, points: data.points });
  //       setNotification('Points increased successfully!');
  //       setTimeout(() => setNotification(''), 3000);
  //     } else {
  //       setError('Failed to increase points');
  //     }
  //   } catch (err) {
  //     setError('An error occurred while increasing points');
  //   }
  // };

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  if (!user) {
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
      <div className="absolute inset-0 h-1/2 bg-gradient-overlay z-0"></div>
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="radial-gradient-overlay"></div>
      </div>

      {/* Welcome Popup */}
      {showWelcomePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white text-black p-6 rounded-md text-center">
            <h2 className="text-2xl font-bold">Welcome onboard {user.firstName}!</h2>
            <p className="mt-4">Now you're a Smart Snail!</p>
            <p>Some are farmers here, while some are Snailonauts, and over here we earn something more valuable than coins: Shells!</p>
            <p className="mt-4 text-lg font-semibold">Welcome token: 5,000 🐚</p>
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
          <span className="text-2xl font-semibold">Smartsnail</span>

          <div className="flex space-x-4">
            <Link href="/Leaderboard"><img src="/images/info/output-onlinepngtools (4).png" width={24} height={24} alt="Leaderboard" /></Link>
            <Link href="/wallet"><img src="/images/info/output-onlinepngtools (2).png" width={24} height={24} alt="Wallet" /></Link>
            <Link href="/Profile"><img src="/images/info/output-onlinepngtools (1).png" width={24} height={24} alt="Profile" /></Link>
          </div>
        </div>

        {/* Original section */}
        <div className="mt-[-1rem] text-5xl font-bold flex items-center">
          <img src="/images/shell.png" width={48} height={48} alt="Coin" />
          <span className="ml-2">{user.points.toLocaleString()}</span>
        </div>
        
        <div className="text-base mt-2 flex items-center justify-between">
        <button
className="glowing hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded-md shadow-md mr-4
           transition-all duration-300 transform hover:shadow-lg hover:scale-105 animate-glow flex items-center"
>
<div className="flex items-center">
  <img src="/images/trophy.png" width={24} height={24} alt="Trophy" className="mr-1" />
  <Link href="/level">Level:</Link>
</div>
</button>



<span className="ml-0">Camouflage</span>
</div>

      </div>

      {/* Progress bar for energy */}
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
              <button className="flex flex-col items-center gap-1">
                <Link href="/referralsystem">
                <img src="/images/SNAIL 2.png" width={30} height={30} alt="Frens" />
                
                <span>Frens</span>
                </Link>
              </button>
              <div className="h-[48px] w-[2px] bg-[#fddb6d]"></div>
              <button className="flex flex-col items-center gap-1">
                <Link href="/task">
                <img src="/images/shell.png" width={30} height={30} alt="Earn" />
                <span>Earn</span></Link>
              </button>
              <div className="h-[48px] w-[2px] bg-[#fddb6d]"></div>
              <button className="flex flex-col items-center gap-1">
                <Link href="/boost">
                <img src="/images/startup.png" width={30} height={30} alt="Boosts" />
                <span>Boost</span></Link>
              </button>
            </div>
          </div>


        </div>
      </div>

      {/* <div className="flex-grow flex items-center justify-center">
        <div className="relative mt-4" onClick={handleIncreasePoints}>
          <video src="/images/snails.mp4" autoPlay muted loop />
        </div>
      </div> */}

    
      <div className="flex-grow flex items-center justify-center" >
        {/* Video with Click Handler */}
        <div className="relative mt-4" onClick={handleAnimatedPointsIncrease}>
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
              +12
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


