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
    <div className="fixed top-[80px] left-0 w-full z-50 overflow-hidden bg-black/80 border-y border-purple-500/50 py-1.5 pointer-events-none">
      <motion.div 
        className="whitespace-nowrap inline-block"
        animate={{ x: ["100%", "-100%"] }}
        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
      >
        <span className="text-white text-[10px] font-black uppercase tracking-widest px-4">
          {hasBoost 
            ? `⚡ BOOST ACTIVE: +${user.tappingRate}/TAP | TIME LEFT: ${timeLeft} | BOOKS HELD: ${totalBooks}`
            : `🚀 BOOST STATUS: INACTIVE | BOOKS HELD: ${totalBooks} | CLICK TO BOOST YOUR TAPPING RATE`
          }
        </span>
      </motion.div>
    </div>
  );
};

export default BoostIndicator;