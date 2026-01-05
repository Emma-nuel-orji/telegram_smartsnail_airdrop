import React, { useState, useEffect, useRef } from 'react';
import { Lock, Zap, Star, Wallet, ChevronLeft, Trophy, Info, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Loader from "@/loader";
import "./staking.css";

// --- STYLES: Add this to your CSS for the "Glow" effect ---
// .staking-active { overflow: hidden; touch-action: none; }
// .bar-glow-red { box-shadow: 0 0 15px rgba(220, 38, 38, 0.5); }
// .bar-glow-blue { box-shadow: 0 0 15px rgba(37, 99, 235, 0.5); }

export default function StakingPageContent() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [fights, setFights] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const webApp = (window as any).Telegram?.WebApp;
      if (webApp) {
        webApp.ready();
        webApp.expand();
        try {
          const anyWebApp = webApp as any;
          if (typeof anyWebApp.disableVerticalSwipes === "function") anyWebApp.disableVerticalSwipes();
        } catch (err) { console.log("Swipe config error", err); }
        
        if (webApp.initDataUnsafe?.user?.id) {
          setTelegramId(webApp.initDataUnsafe.user.id.toString());
        } else { setError("Could not retrieve Telegram ID"); }
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!telegramId) return;
      try {
        setLoading(true);
        const userRes = await fetch(`/api/user/${telegramId}`);
        const userData = await userRes.json();
        setUserPoints(userData.points);
        
        const fightsRes = await fetch('/api/fights/upcoming');
        const fightsData = await fightsRes.json();
        setFights(fightsData);
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };
    fetchData();
  }, [telegramId]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic">PREPARING ARENA...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden pb-10">
      <nav className="p-6 flex justify-between items-center sticky top-0 z-50 bg-black/50 backdrop-blur-lg">
        <Link href="/">
           <img src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back" className="opacity-70" />
        </Link>
        <div className="text-right">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Your Balance</span>
            <span className="text-sm font-mono font-bold text-yellow-500">{userPoints.toLocaleString()} Shells</span>
        </div>
      </nav>

      <div className="px-4">
        {fights.length > 0 ? (
          <FightSlider fights={fights} userPoints={userPoints} telegramId={telegramId} />
        ) : (
          <div className="text-center py-20 text-zinc-600 font-bold italic">No upcoming fights found</div>
        )}
      </div>
    </div>
  );
}

function FightCard({ fight, userPoints, telegramId }: any) {
  const [timer, setTimer] = useState<string>("");
  const isActive = !!fight && fight.status === "SCHEDULED" && new Date(fight.fightDate).getTime() > Date.now();
  const isConcluded = !!fight && ["COMPLETED", "DRAW", "CANCELLED"].includes(fight.status);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(fight.fightDate);
      if (remaining.total <= 0) {
        setTimer("Fight Concluded");
        clearInterval(interval);
      } else {
        setTimer(`${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fight]);

  return (
    <div className={`relative rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800 p-6 mb-10 overflow-hidden ${isConcluded ? 'opacity-60' : ''}`}>
      <div className="text-center mb-8 relative z-10">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2 leading-none">{fight.title}</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black rounded-full border border-zinc-700">
           <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
           <span className="text-[11px] font-mono font-bold text-zinc-300">{timer}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 relative z-10">
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-20 text-zinc-700 font-black italic text-xl">VS</div>
        <FighterStaking fighter={fight.fighter1} opponent={fight.fighter2} fight={fight} userPoints={userPoints} isActive={isActive} telegramId={telegramId} position="left" color="red" />
        <FighterStaking fighter={fight.fighter2} opponent={fight.fighter1} fight={fight} userPoints={userPoints} isActive={isActive} telegramId={telegramId} position="right" color="blue" />
      </div>
    </div>
  );
}

function FighterStaking({ fighter, fight, userPoints, isActive, telegramId, position, color }: any) {
  const [stakeType, setStakeType] = useState<'STARS' | 'POINTS'>('POINTS');
  const [barHeight, setBarHeight] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [barLocked, setBarLocked] = useState(false);
  const [tapping, setTapping] = useState(false);
  
  const fighterRef = useRef<HTMLDivElement>(null);
  const barLockedRef = useRef(false);
  const isBarFillingModeRef = useRef(false);
  const decayRef = useRef<number | null>(null);

  const MAX_STARS = 100000;
  const MIN_POINTS = 200000;
  const MAX_AMOUNT = stakeType === 'STARS' ? MAX_STARS : userPoints;
  const canParticipate = userPoints >= MIN_POINTS && isActive;

  useEffect(() => { barLockedRef.current = barLocked; }, [barLocked]);

  // --- RE-IMPLEMENTED DRAG LOGIC ---
  useEffect(() => {
    const el = fighterRef.current;
    if (!el) return;

    let lastTouchY = 0;
    const handleStart = (e: any) => {
      if (!canParticipate || barLockedRef.current) return;
      isBarFillingModeRef.current = true;
      setTapping(true);
      lastTouchY = e.touches ? e.touches[0].clientY : e.clientY;
      document.body.classList.add('staking-active');
    };

    const handleMove = (e: any) => {
      if (!isBarFillingModeRef.current) return;
      const currentY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = lastTouchY - currentY;
      lastTouchY = currentY;

      setBarHeight(prev => {
        const move = deltaY / 2; // Sensitivity
        const next = Math.max(0, Math.min(100, prev + move));
        setStakeAmount(Math.floor((next / 100) * MAX_AMOUNT));
        return next;
      });
      
      // Haptic on movement
      if (Math.abs(deltaY) > 5) {
        const webApp = (window as any).Telegram?.WebApp;
        webApp?.HapticFeedback?.impactOccurred("light");
      }
    };

    const handleEnd = () => {
      isBarFillingModeRef.current = false;
      setTapping(false);
      document.body.classList.remove('staking-active');
    };

    el.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      el.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [canParticipate, MAX_AMOUNT]);

  const handleBarClick = () => {
    const newLocked = !barLocked;
    setBarLocked(newLocked);
    barLockedRef.current = newLocked;
    const webApp = (window as any).Telegram?.WebApp;
    webApp?.HapticFeedback?.impactOccurred("medium");
  };

  return (
    <div ref={fighterRef} className="flex flex-col items-center">
      {/* Avatar with Status Glow */}
      <div className="relative mb-3">
        <div className={`w-20 h-20 rounded-full overflow-hidden border-2 p-0.5 ${color === 'red' ? 'border-red-600/50' : 'border-blue-600/50'}`}>
          <img src={fighter?.imageUrl} className="w-full h-full object-cover rounded-full" />
        </div>
        {barLocked && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 bg-yellow-500 p-1.5 rounded-full text-black shadow-lg">
            <Lock size={12} fill="currentColor" />
          </motion.div>
        )}
      </div>

      <h3 className="text-[11px] font-black uppercase text-center mb-4 tracking-tighter line-clamp-1 text-zinc-300">{fighter?.name}</h3>

      {/* Currency Switcher */}
      <div className="flex bg-black/60 p-1 rounded-full border border-zinc-800 mb-4">
        <button onClick={() => setStakeType('POINTS')} className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all ${stakeType === 'POINTS' ? 'bg-zinc-700 scale-105' : 'opacity-40'}`}>
          <Wallet size={10} className="text-yellow-500" />
          <span className="text-[8px] font-bold">POINTS</span>
        </button>
        <button onClick={() => setStakeType('STARS')} className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all ${stakeType === 'STARS' ? 'bg-zinc-700 scale-105' : 'opacity-40'}`}>
          <Star size={10} className="text-blue-400" />
          <span className="text-[8px] font-bold">STARS</span>
        </button>
      </div>

      {/* The Interactive Bar */}
      <div 
        className={`w-14 h-48 bg-black/80 rounded-2xl border border-zinc-800 relative overflow-hidden transition-all ${barLocked ? 'opacity-80 scale-[0.98]' : 'scale-100'}`}
        onClick={handleBarClick}
      >
        <motion.div 
          className={`absolute bottom-0 w-full rounded-t-xl ${color === 'red' ? 'bg-red-600 bar-glow-red' : 'bg-blue-600 bar-glow-blue'}`}
          animate={{ height: `${barHeight}%` }}
        >
          {tapping && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
        </motion.div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none">
           <span className="text-[8px] font-black rotate-[-90deg] whitespace-nowrap">DRAG TO STAKE</span>
        </div>
      </div>

      {/* Display Value */}
      <div className="mt-4 text-center">
        <p className="text-sm font-mono font-bold">{stakeAmount.toLocaleString()}</p>
        <p className="text-[9px] text-zinc-500 font-black tracking-widest">{stakeType}</p>
      </div>

      {isActive && (
        <button 
          className={`mt-4 w-full py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${barLocked && stakeAmount > 0 ? 'bg-white text-black translate-y-0' : 'bg-zinc-800 text-zinc-500 translate-y-2 opacity-50'}`}
          disabled={!barLocked || stakeAmount === 0}
        >
          Confirm Stake
        </button>
      )}
    </div>
  );
}

// --- Slider Component (Matches your current logic) ---
function FightSlider({ fights, userPoints, telegramId }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleNext = () => currentIndex < fights.length - 1 && setCurrentIndex(prev => prev + 1);
  const handlePrev = () => currentIndex > 0 && setCurrentIndex(prev => prev - 1);

  return (
    <div className="relative overflow-hidden">
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {fights.map((fight: any) => (
          <div key={fight.id} className="w-full flex-shrink-0">
            <FightCard fight={fight} userPoints={userPoints} telegramId={telegramId} />
          </div>
        ))}
      </div>
      
      {fights.length > 1 && (
        <div className="flex justify-center gap-6 mt-4">
          <button onClick={handlePrev} disabled={currentIndex === 0} className="p-3 bg-zinc-900 rounded-full disabled:opacity-20"><ChevronLeft /></button>
          <button onClick={handleNext} disabled={currentIndex === fights.length - 1} className="p-3 bg-zinc-900 rounded-full disabled:opacity-20"><ChevronLeft className="rotate-180" /></button>
        </div>
      )}
    </div>
  );
}

function getTimeRemaining(fightDate: string) {
  const total = Date.parse(fightDate) - Date.now();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}