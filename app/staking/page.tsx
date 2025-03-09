'use client';

import dynamic from 'next/dynamic';
import Loader from '@/loader';

const FightCard = dynamic(() => import('./FightCard'), {
  ssr: false,
  loading: () => <Loader />, // Use your custom loader
});

export default function StakingPage() {
  return <FightCard />;
}


