'use client';
import dynamic from 'next/dynamic';

const Home = dynamic(() => import('./referralsystemcontent'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function referralsystem() {
  return <Home />;
}