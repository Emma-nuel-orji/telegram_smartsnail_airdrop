'use client';
import dynamic from 'next/dynamic';

const BoostPageContent = dynamic(() => import('./BoostPageContent'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function BoostPage() {
  return <BoostPageContent />;
}