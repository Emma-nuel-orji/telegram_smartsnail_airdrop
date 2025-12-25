'use client';

import dynamic from 'next/dynamic';
import Loader from '@/loader';

const TaskPageContent = dynamic(() => import('./taskPageContent'), {
  ssr: false,
  loading: () => <Loader />, // Use your custom loader
});

export default function TaskPage() {
  return <TaskPageContent />;
}
