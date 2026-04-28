import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BoostIndicatorProps {
  user: {
    tappingRate: number;
    boostExpiresAt?: Date | string | null;
    fxckedUpBagsQty: number; // Added
    humanRelationsQty: number; // Added
  };
}

const BoostIndicator = ({ user }: BoostIndicatorProps) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      if (!user.boostExpiresAt) {
        setTimeLeft(null);
        return;
      }
      const diff = new Date(user.boostExpiresAt).getTime() - new Date().getTime();
      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        setTimeLeft(`${h}h ${m}m`);
      } else {
        setTimeLeft("Expired");
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [user.boostExpiresAt]);

  const hasBoost = user.tappingRate > 1 && timeLeft && timeLeft !== "Expired";
  const totalBooks = (user.fxckedUpBagsQty || 0) + (user.humanRelationsQty || 0);

  return (
    // 'fixed' with high z-index and no border, semi-transparent background
    <div className="fixed top-20 left-4 right-4 z-40 bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden py-1 px-3 pointer-events-none">
      <motion.div 
        className="whitespace-nowrap"
        animate={{ x: ["100%", "-100%"] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
        <span className="text-zinc-300 text-[9px] font-bold uppercase tracking-tighter">
          {user.tappingRate > 1 && timeLeft && timeLeft !== "Expired"
            ? `⚡ BOOST x${user.tappingRate} | ${timeLeft} | BOOKS: ${user.fxckedUpBagsQty + user.humanRelationsQty}`
            : `🚀 BOOST INACTIVE | BOOKS: ${user.fxckedUpBagsQty + user.humanRelationsQty} | TAP TO EARN`}
        </span>
      </motion.div>
    </div>
  );
};

export default BoostIndicator;