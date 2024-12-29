'use client';

import dynamic from 'next/dynamic';
import Loader from '@/loader';

const BoostPageContent = dynamic(() => import('./BoostPageContent'), {
  ssr: false,
  loading: () => <Loader />, // Use your custom loader
});

export default function BoostPage() {
  return <BoostPageContent />;
}
