'use client';

import { useEffect, useState } from 'react';
import { WebApp } from '@twa-dev/types';
// import '../index.css';
// import Arrow from '../icons/Arrow';
import { Link } from 'react-router-dom';


declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState('');
  const [energy, setEnergy] = useState(1500);
  const [clicks, setClicks] = useState<{ id: number, x: number, y: number }[]>([]);
  const maxEnergy = 1500;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      const initDataUnsafe = tg.initDataUnsafe || {};

      if (initDataUnsafe.user) {
        // Fetch the user data and points when the component loads
        fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initDataUnsafe.user),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              setError(data.error);
            } else {
              setUser(data);
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

  const handleClick = async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!user || energy <= 0) {
      return; // Prevent clicking if no user or energy is 0
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEnergy((prevEnergy) => Math.max(prevEnergy - 1, 0));
    setClicks([...clicks, { id: Date.now(), x, y }]);

    try {
      // Post to the server to increase the user's points
      const res = await fetch('/api/increase-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegramId }),
      });
      const data = await res.json();

      if (data.success) {
        setUser({ ...user, points: data.points });
        setNotification('Points increased successfully!');
        setTimeout(() => setNotification(''), 3000);
      } else {
        setError('Failed to increase points');
      }
    } catch (err) {
      setError('An error occurred while increasing points');
    }
  };

  // Energy restoration with a delay
  useEffect(() => {
    const rechargeEnergy = setInterval(() => {
      setEnergy((prevEnergy) => (prevEnergy < maxEnergy ? prevEnergy + 1 : maxEnergy));
    }, 3000);

    return () => clearInterval(rechargeEnergy);
  }, []);

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  if (!user)
    return (
      <div className="loading-container">
        <video autoPlay muted loop>
          <source src="/videos/unload.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    );

  return (
    <div className="bg-gradient-main min-h-screen px-4 flex flex-col items-center text-white font-medium">
      <div className="absolute inset-0 h-1/2 bg-gradient-overlay z-0"></div>
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="radial-gradient-overlay"></div>
      </div>

      <div className="w-full z-10 min-h-screen flex flex-col items-center text-white">
        <div className="fixed top-0 left-0 w-full px-4 pt-8 z-10 flex flex-col items-center text-white">
          <div className="mt-12 text-5xl font-bold flex items-center">
            <img src="/images/coin.png" width={44} height={44} />
            <span className="ml-2">{user.points.toLocaleString()}</span>
          </div>

          <div className="text-base mt-2 flex items-center">
            <img src="/images/trophy.png" width={24} height={24} />
            {/* <span className="ml-1">{user.level} <Arrow size={18} className="ml-0 mb-1 inline-block" /></span> */}
          </div>
        </div>

        {/* Progress bar */}
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
                <img src="/images/high-voltage.png" width={44} height={44} alt="High Voltage" />
                <div className="ml-2 text-left">
                  <span className="text-white text-2xl font-bold block">{energy}</span>
                  <span className="text-white text-large opacity-75">/ {maxEnergy}</span>
                </div>
              </div>
            </div>

            <div className="flex-grow flex items-center max-w-60 text-sm">
              <div className="w-full bg-[#fad258] py-4 rounded-2xl flex justify-around">
                <button className="flex flex-col items-center gap-1">
                  <img src="/images/bear.png" width={24} height={24} alt="Frens" />
                  <Link to="/referral"><span>Frens</span></Link>
                </button>
                <div className="h-[48px] w-[2px] bg-[#fddb6d]"></div>
                <button className="flex flex-col items-center gap-1">
                  <img src="/images/coin.png" width={24} height={24} alt="Earn" />
                  <Link to="/task"><span>Earn</span></Link>
                </button>
                <div className="h-[48px] w-[2px] bg-[#fddb6d]"></div>
                <button className="flex flex-col items-center gap-1">
                  <img src="/images/rocket.png" width={24} height={24} alt="Boosts" />
                  <Link to="/boost"><span>Game</span></Link>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Snails video and click handling */}
        <div className="flex-grow flex items-center justify-center">
          <div className="relative mt-4" onClick={handleClick}>
          <video autoPlay muted loop>
          <source src="public/images/snails.mp4" type="video/mp4" />
        </video>
            {/* <video src={snails} autoPlay muted loop /> */}
            {clicks.map((click) => (
              <div
                key={click.id}
                className="absolute text-5xl font-bold opacity-0"
                style={{
                  top: `${click.y - 42}px`,
                  left: `${click.x - 28}px`,
                  animation: `float 1s ease-out`
                }}
                onAnimationEnd={() => setClicks((prevClicks) => prevClicks.filter(c => c.id !== click.id))}
              >
                +1
              </div>
            ))}
          </div>
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
export default App;



// 'use client'



// import { useEffect, useState } from 'react'
// import { WebApp } from '@twa-dev/types'

// // import loadingVideo from '../images/trophy.png';
// // import { coin } from '../images';

// declare global {
//   interface Window {
//     Telegram?: {
//       WebApp: WebApp
//     }
//   }
// }

// export default function Home() {
//   const [user, setUser] = useState<any>(null)
//   const [error, setError] = useState<string | null>(null)
//   const [notification, setNotification] = useState('')

//   useEffect(() => {
//     if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
//       const tg = window.Telegram.WebApp
//       tg.ready()

//       const initData = tg.initData || ''
//       const initDataUnsafe = tg.initDataUnsafe || {}

//       if (initDataUnsafe.user) {
//         fetch('/api/user', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(initDataUnsafe.user),
//         })
//           .then((res) => res.json())
//           .then((data) => {
//             if (data.error) {
//               setError(data.error)
//             } else {
//               setUser(data)
//             }
//           })
//           .catch((err) => {
//             setError('Failed to fetch user data')
//           })
//       } else {
//         setError('No user data available')
//       }
//     } else {
//       setError('This app should be opened in Telegram')
//     }
//   }, [])

//   const handleIncreasePoints = async () => {
//     if (!user) return

//     try {
//       const res = await fetch('/api/increase-points', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ telegramId: user.telegramId }),
//       })
//       const data = await res.json()
//       if (data.success) {
//         setUser({ ...user, points: data.points })
//         setNotification('Points increased successfully!')
//         setTimeout(() => setNotification(''), 3000)
//       } else {
//         setError('Failed to increase points')
//       }
//     } catch (err) {
//       setError('An error occurred while increasing points')
//     }
//   }

//   if (error) {
//     return <div className="container mx-auto p-4 text-red-500">{error}</div>
//   }

//   if (!user) return <div className="loading-container">
//   <video autoPlay muted loop>
//     <source src="/videos/unload.mp4" type="video/mp4" />
//     Your browser does not support the video tag.
//   </video>
// </div>



//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Welcome, {user.firstName}!</h1>
//       <p>Your current points: {user.points}</p>
//       <button
//         onClick={handleIncreasePoints}
//         className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
//       >
//         Increase Points
//       </button>
//       {notification && (
//         <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
//           {notification}
//         </div>
//       )}
//     </div>
//   )
// }