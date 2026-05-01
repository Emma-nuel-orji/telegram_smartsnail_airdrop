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
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      } else {
        setTimeLeft("Expired");
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [user.boostExpiresAt]);

  // Logic: Show the Active message if there is time left, otherwise show the Inactive message.
  const isActive = user.tappingRate > 1 && timeLeft && timeLeft !== "Expired";
  const totalBooks = (user.fxckedUpBagsQty || 0) + (user.humanRelationsQty || 0);

  return (
    <div className="fixed top-20 left-4 right-4 z-[50] bg-black/20 backdrop-blur-md rounded-full overflow-hidden py-1.4 border border-white/5 pointer-events-none">
      <motion.div 
        className="whitespace-nowrap flex items-center"
        animate={{ x: ["100%", "-150%"] }} // Increased end range to ensure long text clears screen
        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
      >
        <span className="text-zinc-100 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-4">
          {isActive ? (
            <>
              <span className="text-purple-400">⚡ ACTIVE BOOST x{user.tappingRate}</span>
              <span className="text-white">|</span>
              <span className="text-green-400">TIME REMAINING: {timeLeft}</span>
              <span className="text-white">|</span>
              <span className="text-purple-400">INVENTORY: {totalBooks} BOOKS</span>
            </>
          ) : (
            <>
              <span className="text-zinc-500">🚀 BOOST INACTIVE</span>
              <span className="text-zinc-600">|</span>
              <span>UPGRADE YOUR TAPPING RATE IN THE BOOST CENTER</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">CURRENT BOOKS: {totalBooks}</span>
            </>
          )}
        </span>
      </motion.div>
    </div>
  );
};

export default BoostIndicator;