// app/gym/subscriptions/page.tsx
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Loader from '@/loader';

// Dynamically import to ensure client-side only
const GymSubscriptions = dynamic(() => import("../GymSubscriptions"), {
  ssr: false, // Disable server-side rendering for this component
});

export default function GymSubscriptionsPage() {
  return (
    <div>
      <Suspense fallback={<Loader />}>
        <GymSubscriptions />
      </Suspense>
    </div>
  );
}