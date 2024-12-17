'use client'

import ReferralSystem from '@/components/ReferralSystem'
import { useEffect, useState } from 'react'
import Link from 'next/link';

export default function Home() {
  const [initData, setInitData] = useState('')
  const [userId, setUserId] = useState('')
  const [startParam, setStartParam] = useState('')

  useEffect(() => {
    const initWebApp = async () => {
      // Ensure this runs only in the browser
      if (typeof window !== 'undefined') {
        try {
          // Dynamically import the SDK to avoid issues during SSR
          const WebApp = (await import('@twa-dev/sdk')).default;
  
          // Signal that the WebApp is ready
          WebApp.ready();
  
          // Set initialization data safely
          setInitData(WebApp.initData || '');
          setUserId(WebApp.initDataUnsafe?.user?.id?.toString() || '');
          setStartParam(WebApp.initDataUnsafe?.start_param || '');
        } catch (error) {
          console.error('Failed to initialize Telegram WebApp:', error);
        }
      }
    };
  
    initWebApp();
  }, []);
  
  return (
    <main className="refer" >
    
      <Link href="/"><img  src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back" /></Link>
      <h1 className="hhh text-4xl font-bold mb-4">Invite friends!</h1>
      <p className="ppp">Earn shells for every friend you invite and even more shells when they boost!</p>
      <ReferralSystem initData={initData} userId={userId} startParam={startParam} />
     
    </main>
  )
}