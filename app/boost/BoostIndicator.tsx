import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BoostUser {
  boostExpiresAt?: string | Date | null;
  fxckedUpBagsQty?: number;
  humanRelationsQty?: number;
}

interface BoostIndicatorProps {
  user: BoostUser;
  variant?: 'block' | 'teleprompter'; // Add this
}

const BoostIndicator = ({ user, variant = 'block' }: BoostIndicatorProps) => {
  // 1. Create a state to hold the "Live" values
  const [display, setDisplay] = useState({
    isActive: false,
    timeString: "0d 0h 0m",
    totalPower: 1
  });

  // 2. The Timer Logic - Updates the UI every minute
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = user.boostExpiresAt ? new Date(user.boostExpiresAt).getTime() : 0;
      const diff = expiry - now;

      // 1. Calculate the "Selected" boost from the books in the cart
      // Inside BoostIndicator useEffect
        const cartPower = ((user.fxckedUpBagsQty || 0) * 2) + ((user.humanRelationsQty || 0) * 4);
        const cartDays = (user.fxckedUpBagsQty || 0) + (user.humanRelationsQty || 0);

      // 2. Logic: Is there a current boost OR a selected boost?
      const hasActiveBoost = diff > 0;
      const hasCartBoost = cartPower > 0;

      if (hasActiveBoost || hasCartBoost) {
        let timeString = "0d 0h 0m";
        
        if (hasActiveBoost) {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const m = Math.floor((diff / (1000 * 60)) % 60);
          timeString = `${d}d ${h}h ${m}m`;
        } else {
          // If no active boost, show the duration of what they are about to buy
          timeString = `+${cartDays} Days`;
        }

        setDisplay({
          isActive: true, // It is now "active" if books are selected!
          timeString: timeString,
          totalPower: cartPower > 0 ? cartPower : 1
        });
      } else {
        setDisplay({ isActive: false, timeString: "Expired", totalPower: 1 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 10000); // Check more often (10s)
    return () => clearInterval(interval);
  }, [user.boostExpiresAt, user.fxckedUpBagsQty, user.humanRelationsQty]);

  // 3. The Visual UI - Only show "Inactive" if cart is empty AND boost is expired
  if (!display.isActive && user.fxckedUpBagsQty === 0 && user.humanRelationsQty === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-3xl opacity-60">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Boost Status</p>
        <p className="text-sm font-black italic text-zinc-400">INACTIVE — SELECT BOOKS ABOVE</p>
      </div>
    );
  }

 if (variant === 'teleprompter') {
  return (
    <AnimatePresence>
      {/* The component only renders if display.isActive is true */}
      {display.isActive && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }} // Smooth slide-up exit
          className="fixed top-20 w-full px-6 z-50"
        >
          <div className="bg-black/60 backdrop-blur-md border border-purple-500/30 rounded-xl p-2 flex justify-between items-center text-[10px]">
             <span className="text-purple-300 font-black">RATE: +{display.totalPower}</span>
             <span className="text-white font-mono">{display.timeString}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-fuchsia-700 p-5 rounded-[2.5rem] border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] w-full">
      <div className="flex justify-between items-end gap-2">
        {/* Left Side: Tapping Power - Added flex-shrink-0 to prevent compression */}
        <div className="flex-shrink-0">
          <p className="text-[10px] uppercase tracking-tighter text-purple-200 font-black mb-1">
            Current Tapping Rate
          </p>
          <h2 className="text-3xl font-black italic text-white leading-none whitespace-nowrap">
            +{display.totalPower} <span className="text-[10px] uppercase font-bold opacity-70">/ TAP</span>
          </h2>
        </div>
        
        {/* Right Side: Time Remaining - Added flex-shrink-0 and whitespace-nowrap */}
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] uppercase text-purple-200 font-black mb-1">
            Time Remaining
          </p>
          <div className="bg-black/20 px-3 py-1 rounded-full text-white font-black italic text-xs border border-white/10 whitespace-nowrap">
            {display.timeString}
          </div>
        </div>
      </div>
      
      {/* Footer Indicator */}
      <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-purple-100 font-bold uppercase tracking-widest flex items-center gap-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Power Stacking Active
      </div>
    </div>
  );
};

export default BoostIndicator;