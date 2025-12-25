// app/gym/page.tsx
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Loader from '@/loader';

// Dynamically import to ensure client-side only
const GymListing = dynamic(() => import("./GymListing"), {
  ssr: false, // Disable server-side rendering for this component
});

export default function GymPage() {
  return (
    <div>
      <Suspense fallback={<Loader />}>
        <GymListing />
      </Suspense>
    </div>
  );
}