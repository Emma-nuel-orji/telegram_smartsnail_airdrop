import React, { useState, useEffect } from 'react';

interface BoostUser {
  boostExpiresAt?: string | Date | null;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
}

const BoostIndicator = ({ user }: { user: BoostUser }) => {
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

      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        
        // Calculate power based on your weights (+1 and +3)
        const power = (user.fxckedUpBagsQty * 1) + (user.humanRelationsQty * 3);
        
        setDisplay({
          isActive: true,
          timeString: `${d}d ${h}h ${m}m`,
          totalPower: power > 0 ? power : 1
        });
      } else {
        // Boost is expired - reset to base power
        setDisplay({ isActive: false, timeString: "Expired", totalPower: 1 });
      }
    };

    updateTimer(); // Run once immediately
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [user.boostExpiresAt, user.fxckedUpBagsQty, user.humanRelationsQty]);

  // 3. The Visual UI
  if (!display.isActive) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-3xl opacity-60">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Boost Status</p>
        <p className="text-sm font-black italic text-zinc-400">INACTIVE — BUY BOOKS TO UPGRADE</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-fuchsia-700 p-5 rounded-[2.5rem] border-2 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] uppercase tracking-tighter text-purple-200 font-black mb-1">Current Tapping Power</p>
          <h2 className="text-4xl font-black italic text-white leading-none">+{display.totalPower} <span className="text-xs">/ TAP</span></h2>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] uppercase text-purple-200 font-black mb-1">Time Remaining</p>
          <div className="bg-black/20 px-3 py-1 rounded-full text-white font-black italic text-sm border border-white/10">
            {display.timeString}
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-purple-100 font-bold uppercase tracking-widest flex items-center gap-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Power Stacking Active
      </div>
    </div>
  );
};

export default BoostIndicator;