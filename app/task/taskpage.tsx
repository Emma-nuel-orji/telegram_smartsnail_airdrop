'use client';
import dynamic from 'next/dynamic';

const Tasks = dynamic(() => import('./Taskscontent'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

export default function taskpage() {
  return <Tasks />;
}
