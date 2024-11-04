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
      if (typeof window !== 'undefined') {
        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();
        setInitData(WebApp.initData);
        setUserId(WebApp.initDataUnsafe.user?.id.toString() || '');
        setStartParam(WebApp.initDataUnsafe.start_param || '');
      }
    };

    initWebApp();
  }, [])

  return (
    <main className="refer">
      <div className="task-container" style={{ width: '100%' }}>
      <Link href="/"><img src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back" /></Link>
      <h1 className="h text-4xl font-bold mb-4">Invite friends!</h1>
      <p className="p">You and your friend will recieve bonuses</p>
      <ReferralSystem initData={initData} userId={userId} startParam={startParam} />
      </div>
    </main>
  )
}