import React, { useState, useEffect, useRef } from 'react';
import { Lock, Zap, Star, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Loader from "@/loader";
import "./staking.css";


const MOTIVATIONAL_MESSAGES = [
  "Wow! Keep supporting!", "Awesome support!", "Make them proud!",
  "Amazing! Keep it up!", "You're on fire!", "That's the spirit!",
  "Show your support!", "Back your champion!", "Great choice!", "Let's go!"
];

export default function StakingArena({ fights, userPoints, telegramId }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  // Swipe logic for the screen
  const handleTouchStart = (e: any) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: any) => {
    const touchEnd = e.targetTouches[0].clientX;
    if (touchStart - touchEnd > 70) { // Swipe Left
      if (currentIndex < fights.length - 1) setCurrentIndex(currentIndex + 1);
      setTouchStart(touchEnd);
    }
    if (touchStart - touchEnd < -70) { // Swipe Right
      if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
      setTouchStart(touchEnd);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden select-none touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-[-10%] w-full h-[50%] blur-[120px] rounded-full transition-colors duration-1000 ${currentIndex % 2 === 0 ? 'bg-red-900/20' : 'bg-blue-900/20'}`} />
      </div>

      {/* Header */}
      <nav className="relative z-50 p-6 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <Link href="/" className="opacity-50 hover:opacity-100 transition-opacity">
          <ChevronLeft size={28} />
        </Link>
        <div className="text-right">
          <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">Balance</p>
          <p className="text-lg font-mono font-bold text-yellow-500">{userPoints.toLocaleString()} <span className="text-[10px]">SHELLS</span></p>
        </div>
      </nav>

      {/* Slider Container */}
      <div className="relative h-[85vh] flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {fights.map((fight: any) => (
          <div key={fight.id} className="w-full h-full flex-shrink-0 px-4 pt-4">
            <FightView fight={fight} userPoints={userPoints} telegramId={telegramId} />
          </div>
        ))}
      </div>

      {/* Slide Indicators */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center gap-2 z-50">
        {fights.map((_: any, i: number) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-yellow-500' : 'w-2 bg-zinc-800'}`} />
        ))}
      </div>
    </div>
  );
}

function FightView({ fight, userPoints, telegramId }: any) {
  const [timer, setTimer] = useState("");
  const isActive = fight.status === "SCHEDULED" && new Date(fight.fightDate).getTime() > Date.now();

  useEffect(() => {
    const int = setInterval(() => {
      const remaining = getTimeRemaining(fight.fightDate);
      setTimer(remaining.total <= 0 ? "FIGHT LIVE" : `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`);
    }, 1000);
    return () => clearInterval(int);
  }, [fight]);

  return (
    <div className="h-full flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">{fight.title}</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{timer}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 relative pt-10">
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-20 opacity-20 text-4xl font-black italic">VS</div>
        <FighterStaking fighter={fight.fighter1} color="red" userPoints={userPoints} isActive={isActive} telegramId={telegramId} />
        <FighterStaking fighter={fight.fighter2} color="blue" userPoints={userPoints} isActive={isActive} telegramId={telegramId} />
      </div>
    </div>
  );
}

function FighterStaking({ fighter, color, userPoints, isActive, telegramId }: any) {
  const [stakeType, setStakeType] = useState<'STARS' | 'POINTS'>('POINTS');
  const [barHeight, setBarHeight] = useState(0);
  const [barLocked, setBarLocked] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  
  const barLockedRef = useRef(false);
  const decayInterval = useRef<any>(null);
  const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

  const MAX_STARS = 100000;
  const MAX_VAL = stakeType === 'STARS' ? MAX_STARS : userPoints;

  // --- POPUP MESSAGE LOGIC ---
  const triggerMessage = () => {
    const msg = {
      id: Math.random(),
      text: MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)],
      x: (Math.random() - 0.5) * 100
    };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => setMessages(prev => prev.filter(m => m.id !== msg.id)), 2000);
  };

  // --- DECAY LOGIC ---
  useEffect(() => {
    if (!barLocked && barHeight > 0) {
      decayInterval.current = setInterval(() => {
        setBarHeight(prev => Math.max(0, prev - 1.5));
      }, 50);
    } else {
      clearInterval(decayInterval.current);
    }
    return () => clearInterval(decayInterval.current);
  }, [barLocked, barHeight]);

  const handleDrag = (e: any) => {
    if (barLocked || !isActive) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const windowH = window.innerHeight;
    const sensitivity = 1.2;
    const newHeight = Math.max(0, Math.min(100, ((windowH - clientY) / windowH) * 100 * sensitivity));
    
    if (Math.abs(newHeight - barHeight) > 1) {
      setBarHeight(newHeight);
      if (Math.random() > 0.95) triggerMessage();
      webApp?.HapticFeedback?.impactOccurred("light");
    }
  };

  const toggleLock = () => {
    setBarLocked(!barLocked);
    barLockedRef.current = !barLocked;
    webApp?.HapticFeedback?.notificationOccurred(barLocked ? "warning" : "success");
  };

  return (
    <div className="flex flex-col items-center relative h-full">
      {/* Floating Messages Area */}
      <div className="absolute top-[-40px] w-full pointer-events-none">
        <AnimatePresence>
          {messages.map(m => (
            <motion.div key={m.id} initial={{ y: 20, opacity: 0 }} animate={{ y: -60, opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute left-0 right-0 text-center text-[10px] font-black uppercase text-yellow-400 italic">
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative mb-4">
        <div className={`w-24 h-24 rounded-full border-2 overflow-hidden ${color === 'red' ? 'border-red-600/50' : 'border-blue-600/50'}`}>
          <img src={fighter?.imageUrl} className="w-full h-full object-cover" />
        </div>
        {barLocked && <div className="absolute inset-0 bg-yellow-500/20 backdrop-blur-[2px] rounded-full flex items-center justify-center border-2 border-yellow-500"><Lock size={30} className="text-yellow-400 shadow-xl" /></div>}
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setStakeType('POINTS')} className={`p-2 rounded-xl border transition-all ${stakeType === 'POINTS' ? 'bg-zinc-800 border-yellow-500 scale-110' : 'bg-black border-zinc-800 opacity-40'}`}><Wallet size={14} className="text-yellow-500" /></button>
        <button onClick={() => setStakeType('STARS')} className={`p-2 rounded-xl border transition-all ${stakeType === 'STARS' ? 'bg-zinc-800 border-blue-500 scale-110' : 'bg-black border-zinc-800 opacity-40'}`}><Star size={14} className="text-blue-400" /></button>
      </div>

      {/* The Gauge */}
      <div className={`w-16 flex-1 rounded-3xl border border-zinc-800 bg-black/80 relative overflow-hidden transition-all ${barLocked ? 'scale-95 border-yellow-500/50 shadow-2xl shadow-yellow-500/10' : 'scale-100'}`} 
           onMouseMove={handleDrag} onTouchMove={handleDrag} onClick={toggleLock}>
        
        <motion.div className={`absolute bottom-0 w-full ${color === 'red' ? 'bg-gradient-to-t from-red-900 via-red-600 to-red-400' : 'bg-gradient-to-t from-blue-900 via-blue-600 to-blue-400'}`}
                    style={{ height: `${barHeight}%` }}>
          <div className="absolute top-0 w-full h-2 bg-white/40 blur-sm" />
        </motion.div>

        {!barLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] rotate-[-90deg] whitespace-nowrap tracking-[0.4em]">DRAG TO STAKE</span>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xl font-mono font-black tabular-nums tracking-tighter">{Math.floor((barHeight/100) * MAX_VAL).toLocaleString()}</p>
        <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em]">{stakeType}</p>
      </div>
    </div>
  );
}

function getTimeRemaining(fightDate: string) {
  const total = Date.parse(fightDate) - Date.now();
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / 1000 / 60) % 60),
    seconds: Math.floor((total / 1000) % 60)
  };
}