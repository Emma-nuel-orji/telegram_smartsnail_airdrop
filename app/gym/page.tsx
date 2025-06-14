"use client"
import React, { useEffect, useState } from "react";
import Image from "next/image";

const GYM_BACKGROUND = "/images/gymfit.jpg";

function parseDuration(duration: string): number {
  const mapping: Record<string, number> = {
    "1 Week": 7,
    "2 Weeks": 14,
    "1 Month": 30,
    "3 Months": 90,
    "6 Months": 180,
    "1 Year": 365,
  };
  return mapping[duration] || 0;
}

export default function GymSubscriptions({ telegramId }: { telegramId:  BigInt }) {
  const [shells, setShells] = useState<number>(0);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch(`/api/user/${telegramId}`);
      const data = await res.json();
      setShells(Number(data.points));
    }

    async function fetchGymSubscriptions() {
      const res = await fetch("/api/services?partnerType=GYM&type=SUBSCRIPTION");
      const data = await res.json();
      setSubscriptions(data);
    }

    async function fetchActiveSubscription() {
      const res = await fetch(`/api/subscription/${telegramId}`);
      const data = await res.json();
      if (data && data.approvedAt) {
        setActiveSub(data);
      }
    }

    fetchUser();
    fetchGymSubscriptions();
    fetchActiveSubscription();
  }, [telegramId]);

  useEffect(() => {
    if (!activeSub) return;

    const durationDays = parseDuration(activeSub.duration);
    const approvedAt = new Date(activeSub.approvedAt);
    const expiry = new Date(approvedAt.getTime() + durationDays * 86400000);

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = expiry.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((remaining / (1000 * 60)) % 60);
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [activeSub]);

  return (
    <div className="relative min-h-screen text-white">
      <Image src={GYM_BACKGROUND} alt="Gym Background" layout="fill" objectFit="cover" className="-z-10" />
      <div className="bg-black bg-opacity-60 min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-4">Your Shells: {shells}</h1>

        {activeSub ? (
          <div className="mb-6 p-4 bg-green-800 rounded-xl shadow-xl">
            <h2 className="text-xl font-semibold">Active Subscription: {activeSub.name}</h2>
            <p>Time Left: {timeLeft}</p>
          </div>
        ) : (
          <p className="mb-4">No active subscription</p>
        )}

        <h2 className="text-2xl font-semibold mb-2">Available Gym Subscriptions</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-gray-900 p-4 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold">{sub.name}</h3>
              <p>Duration: {sub.duration}</p>
              <p>Shells: {sub.priceShells}</p>
              <button
                className="mt-2 bg-blue-600 hover:bg-blue-800 px-4 py-2 rounded-lg"
                onClick={() => alert(`Purchase flow for ${sub.name}`)}
              >
                Subscribe
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
