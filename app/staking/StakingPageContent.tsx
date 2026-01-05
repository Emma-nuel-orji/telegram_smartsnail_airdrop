import React, { useState, useEffect, useRef } from 'react';
import { Lock, Zap, Star, Wallet, ChevronLeft, Trophy, Info, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// --- Types & Interfaces ---
interface Fighter {
  id: string;
  name: string;
  telegramId?: string;
  imageUrl?: string;
  socialMedia?: string;
}

interface Fight {
  id: string;
  title: string;
  fightDate: string;
  status: "SCHEDULED" | "COMPLETED" | "DRAW" | "CANCELLED" | "EXPIRED";
  fighter1: Fighter;
  fighter2: Fighter;
  winnerId?: string;
  winner?: Fighter;
}

interface TotalSupport {
  stars: number;
  points: number;
}

// --- Helper Functions ---
function getTimeRemaining(fightDate: string) {
  const total = Date.parse(fightDate) - Date.now();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}

const MOTIVATIONAL_MESSAGES = ["Keep supporting!", "Amazing!", "On fire!", "Show your support!"];

// --- Main Component ---
export default function StakingPage() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [fights, setFights] = useState<Fight[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const webApp = (window as any).Telegram?.WebApp;
      if (webApp) {
        webApp.ready();
        webApp.expand();
        if (webApp.initDataUnsafe?.user?.id) {
          setTelegramId(webApp.initDataUnsafe.user.id.toString());
        }
      }
    }
    // Mock Data Fetch - Replace with your actual API calls
    setFights([
      {
        id: "1",
        title: "Main Event: Heavyweight Title",
        fightDate: new Date(Date.now() + 86400000).toISOString(),
        status: "SCHEDULED",
        fighter1: { id: "f1", name: "Iron Mike", imageUrl: "/mike.jpg" },
        fighter2: { id: "f2", name: "King Fury", imageUrl: "/fury.jpg" }
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic">LOADING ARENA...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-[-20%] w-[100%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-[-20%] w-[100%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-10 p-6 flex justify-between items-center">
        <Link href="/" className="p-2 bg-zinc-900/50 rounded-full border border-zinc-800">
          <ChevronLeft size={20} />
        </Link>
        <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Global Balance</p>
            <p className="text-sm font-mono font-bold text-yellow-400">{userPoints.toLocaleString()} Shells</p>
        </div>
        <div className="p-2 bg-zinc-900/50 rounded-full border border-zinc-800">
          <Share2 size={20} />
        </div>
      </nav>

      <div className="relative z-10 px-4">
        {fights.map(fight => (
          <FightCard key={fight.id} fight={fight} userPoints={userPoints} telegramId={telegramId || ""} />
        ))}
      </div>
    </div>
  );
}

// --- Fight Card Component ---
function FightCard({ fight, userPoints, telegramId }: { fight: Fight, userPoints: number, telegramId: string }) {
  const [timer, setTimer] = useState("");
  const isActive = fight.status === "SCHEDULED" && new Date(fight.fightDate).getTime() > Date.now();
  const isConcluded = ["COMPLETED", "DRAW", "CANCELLED"].includes(fight.status);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(fight.fightDate);
      if (remaining.total <= 0) {
        setTimer(fight.status);
        clearInterval(interval);
      } else {
        setTimer(`${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fight]);

  return (
    <div className="mb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">{fight.title}</h2>
        <div className="inline-block px-4 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-mono text-yellow-500">
          {timer}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 h-[450px] relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black border-4 border-zinc-900 w-12 h-12 rounded-full flex items-center justify-center font-black italic text-zinc-600">
          VS
        </div>

        <FighterStaking 
          fighter={fight.fighter1} 
          fight={fight} 
          userPoints={userPoints} 
          isActive={isActive} 
          telegramId={telegramId} 
          position="left" 
          color="red"
        />
        <FighterStaking 
          fighter={fight.fighter2} 
          fight={fight} 
          userPoints={userPoints} 
          isActive={isActive} 
          telegramId={telegramId} 
          position="right" 
          color="blue"
        />
      </div>
    </div>
  );
}

// --- Fighter Staking Component ---
function FighterStaking({ fighter, fight, userPoints, isActive, telegramId, position, color }: any) {
  const [stakeType, setStakeType] = useState<'STARS' | 'POINTS'>('POINTS');
  const [barHeight, setBarHeight] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [barLocked, setBarLocked] = useState(false);
  const [tapping, setTapping] = useState(false);
  
  const fighterRef = useRef<HTMLDivElement>(null);
  const barLockedRef = useRef(false);
  const isBarFillingModeRef = useRef(false);

  const MAX_STARS = 100000;
  const MAX_AMOUNT = stakeType === 'STARS' ? MAX_STARS : userPoints;

  // --- Keep your original Logic Handlers here ---
  // (Note: I've kept the logic skeleton so you can drop your handlers in)
  const handleBarClick = (e: any) => {
    e.preventDefault();
    const newLocked = !barLocked;
    setBarLocked(newLocked);
    barLockedRef.current = newLocked;
    
    const webApp = (window as any).Telegram?.WebApp;
    if (webApp?.HapticFeedback) webApp.HapticFeedback.impactOccurred("medium");
  };

  // --- Render UI ---
  return (
    <div ref={fighterRef} className="flex flex-col items-center select-none touch-none">
      {/* Fighter Avatar Area */}
      <div className={`relative mb-4 p-1 rounded-full ${color === 'red' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 relative">
          <img src={fighter?.imageUrl || "/placeholder.jpg"} className="w-full h-full object-cover" />
          {barLocked && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 bg-yellow-500/20 backdrop-blur-[2px] flex items-center justify-center">
              <Lock size={24} className="text-yellow-400 drop-shadow-lg" />
            </motion.div>
          )}
        </div>
      </div>

      <h3 className="text-xs font-black uppercase text-center mb-4 tracking-tighter h-8 line-clamp-2">{fighter?.name}</h3>

      {/* Tapping UI Controls */}
      <div className="flex flex-col items-center gap-2 mb-4">
         <button 
           onClick={() => setStakeType(stakeType === 'POINTS' ? 'STARS' : 'POINTS')}
           className="flex items-center gap-1 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 text-[9px] font-bold"
         >
           {stakeType === 'POINTS' ? <Wallet size={10} className="text-yellow-500" /> : <Star size={10} className="text-blue-400" />}
           {stakeType}
         </button>
      </div>

      {/* The Gauge */}
      <div className="flex-1 w-16 relative bg-zinc-900/80 rounded-3xl border border-zinc-800 overflow-hidden shadow-inner tapping-bar-track" onClick={handleBarClick}>
        <motion.div 
          className={`absolute bottom-0 w-full rounded-t-xl transition-all duration-75 ${color === 'red' ? 'bg-gradient-to-t from-red-800 to-red-500' : 'bg-gradient-to-t from-blue-800 to-blue-500'}`}
          style={{ height: `${barHeight}%` }}
        >
          <div className="w-full h-full opacity-30 animate-pulse bg-white/20" />
        </motion.div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
           <Zap size={20} />
           <span className="text-[8px] font-black rotate-[-90deg] mt-4">DRAG UP</span>
        </div>
      </div>

      {/* Stake Value */}
      <div className="mt-4 text-center">
        <p className="text-lg font-mono font-black tabular-nums">{Math.floor((barHeight/100) * MAX_AMOUNT).toLocaleString()}</p>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stakeType}</p>
      </div>

      {/* Place Stake Button */}
      {isActive && (
        <button 
          className={`mt-4 w-full py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${
            barLocked && barHeight > 0 
            ? 'bg-white text-black scale-100 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
            : 'bg-zinc-800 text-zinc-500 scale-95'
          }`}
          disabled={!barLocked || barHeight === 0}
        >
          {barLocked ? 'Confirm Stake' : 'Lock to Place'}
        </button>
      )}
    </div>
  );
}