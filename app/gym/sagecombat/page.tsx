// app/gym/subscriptions/page.tsx
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Loader from "@/loader";


const SageCombat = dynamic(
  () => import("../sagecombat"),
  { ssr: false }
);

export default function GymSubscriptionsPage() {
  return (
    <div className="space-y-8">
      
      <Suspense fallback={<Loader />}>
        <SageCombat />
      </Suspense>
    </div>
  );
}
