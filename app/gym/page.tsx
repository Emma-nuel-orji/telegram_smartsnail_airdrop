// app/gym/page.tsx
import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import to ensure client-side only
const GymSubscriptions = dynamic(() => import("./GymSubscriptions"), {
  ssr: false, // Disable server-side rendering for this component
});

export default function GymPage() {
  return (
    <div>
      
      <Suspense fallback={<div className="text-white p-6">Loading...</div>}>
        <GymSubscriptions />
      </Suspense>
    </div>
  );
}
