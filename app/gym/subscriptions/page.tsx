// app/gym/subscriptions/page.tsx
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Loader from "@/loader";

// Client-only components
const GymSubscriptions = dynamic(
  () => import("../GymSubscriptions"),
  { ssr: false }
);

const SageCombat = dynamic(
  () => import("../sagecombat"),
  { ssr: false }
);

export default function GymSubscriptionsPage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<Loader />}>
        <GymSubscriptions />
      </Suspense>

      <Suspense fallback={<Loader />}>
        <SageCombat />
      </Suspense>
    </div>
  );
}
