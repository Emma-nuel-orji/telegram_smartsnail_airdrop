'use client'

import { useEffect, useState } from 'react';
import { WebApp } from '@twa-dev/types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
    };
  }
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState('');
  const [energy, setEnergy] = useState(1500); // Energy system similar to App
  const maxEnergy = 1500;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      const initDataUnsafe = tg.initDataUnsafe || {};

      if (initDataUnsafe.user) {
        // Fetch user data
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

  const handleIncreasePoints = async () => {
    if (!user || energy <= 0) return;

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
                <img src="/images/high-voltage.png" width={44} height={44} alt="High Voltage" />
                <div className="ml-2 text-left">
                  <span className="text-white text-2xl font-bold block">{energy}</span>
                  <span className="text-white text-large opacity-75">/ {maxEnergy}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center">
          <button
            onClick={handleIncreasePoints}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
          >
            Increase Points
          </button>
        </div>
      </div>
      {notification && (
        <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">
          {notification}
        </div>
      )}
    </div>
  );
}




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