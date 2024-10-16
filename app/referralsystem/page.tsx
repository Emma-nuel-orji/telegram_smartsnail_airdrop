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
      <h1 className="h text-4xl font-bold mb-8">Invite friends!</h1>
      <Link href="/">
        <a className="back-arrow bg-light">&#8592;</a>
      </Link>
      <p className="p">You and your friend will recieve bonuses</p>
      <ReferralSystem initData={initData} userId={userId} startParam={startParam} />
    </main>
  )
}