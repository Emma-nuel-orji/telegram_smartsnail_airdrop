'use client';

import dynamic from 'next/dynamic';
import Loader from '@/loader';

const StakingPageContent = dynamic(() => import('./StakingPageContent'), {
  ssr: false,
  loading: () => <Loader />,
});

export default function StakingPage() {
  return <StakingPageContent />;
}
