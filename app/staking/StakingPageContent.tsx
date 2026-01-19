import React, { useState, useEffect, useRef } from 'react';
import { Lock, Zap, Star, Wallet, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Loader from '@/loader';
// --- INTERFACES ---
interface Fighter { id: string; name: string; imageUrl?: string; }
interface Fight { 
    id: string; title: string; fightDate: string; 
    status: "SCHEDULED" | "COMPLETED" | "DRAW" | "CANCELLED" | "EXPIRED";
    fighter1: Fighter; fighter2: Fighter; 
}

const MOTIVATIONAL_MESSAGES = [
  "Wow!", "Awesome!", "Make them proud!", "Amazing!", "On fire!", 
  "Spirit!", "Support!", "Champion!", "Great choice!", "Let's go!"
];

export default function StakingPageContent() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [fights, setFights] = useState<Fight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Telegram Initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      const webApp = (window as any).Telegram?.WebApp;
      if (webApp) {
        webApp.ready();
        webApp.expand();
        const anyWebApp = webApp as any;
        if (anyWebApp.disableVerticalSwipes) anyWebApp.disableVerticalSwipes();
        if (webApp.initDataUnsafe?.user?.id) setTelegramId(webApp.initDataUnsafe.user.id.toString());
      }
    }
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (!telegramId) return;
      try {
        const [uRes, fRes] = await Promise.all([
          fetch(`/api/user/${telegramId}`),
          fetch('/api/fights/upcoming')
        ]);
        if (uRes.ok) setUserPoints((await uRes.json()).points);
        if (fRes.ok) setFights(await fRes.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, [telegramId]);

  // SCREEN SLIDING LOGIC
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 80) {
      if (diff > 0 && currentIndex < fights.length - 1) setCurrentIndex(c => c + 1);
      else if (diff < 0 && currentIndex > 0) setCurrentIndex(c => c - 1);
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic"> <Loader /> </div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <nav className="relative z-50 p-6 flex justify-between items-center">
        <Link href="/"><ChevronLeft size={28} /></Link>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Balance</p>
          <p className="text-sm font-mono font-bold text-yellow-500">{userPoints.toLocaleString()} Shells</p>
        </div>
      </nav>

      <div className="flex-1 flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {fights.map((fight) => (
          <div key={fight.id} className="w-full flex-shrink-0 px-4">
            <FightCard fight={fight} userPoints={userPoints} telegramId={telegramId} />
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 p-6">
        {fights.map((_, i) => (
          <div key={i} className={`h-1 transition-all ${i === currentIndex ? 'w-8 bg-yellow-500' : 'w-2 bg-zinc-800'}`} />
        ))}
      </div>
    </div>
  );
}

function FightCard({ fight, userPoints, telegramId }: any) {
  const isActive = fight.status === "SCHEDULED" && new Date(fight.fightDate).getTime() > Date.now();
  return (
    <div className="h-full flex flex-col pt-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{fight.title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 flex-1 relative items-end pb-10">
        <FighterStaking fighter={fight.fighter1} fight={fight} userPoints={userPoints} isActive={isActive} telegramId={telegramId} color="red" />
        <FighterStaking fighter={fight.fighter2} fight={fight} userPoints={userPoints} isActive={isActive} telegramId={telegramId} color="blue" />
      </div>
    </div>
  );
}

function FighterStaking({ fighter, fight, userPoints, isActive, telegramId, color }: any) {
  const [stakeType, setStakeType] = useState<'STARS' | 'POINTS'>('POINTS');
  const [barHeight, setBarHeight] = useState(0);
  const [barLocked, setBarLocked] = useState(false);
  const [popups, setPopups] = useState<any[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const webApp = (window as any).Telegram?.WebApp;

  // --- REFINED DRAGGING LOGIC ---
  const handleTouchMove = (e: React.TouchEvent) => {
    if (barLocked || !isActive || !barRef.current) return;
    
    const rect = barRef.current.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    
    // Calculate percentage from BOTTOM of the bar
    let pct = ((rect.bottom - touchY) / rect.height) * 100;
    pct = Math.max(0, Math.min(100, pct)); // Clamp 0-100
    
    setBarHeight(pct);

    // Haptics and Popups
    if (Math.random() > 0.94) {
      const id = Math.random();
      const text = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      setPopups(prev => [...prev, { id, text }]);
      setTimeout(() => setPopups(p => p.filter(x => x.id !== id)), 1000);
      webApp?.HapticFeedback?.impactOccurred("light");
    }
  };

  // --- DECAY LOGIC ---
  useEffect(() => {
    if (!barLocked && barHeight > 0) {
      const id = setInterval(() => setBarHeight(h => Math.max(0, h - 1)), 50);
      return () => clearInterval(id);
    }
  }, [barLocked, barHeight]);

  const toggleLock = () => {
    setBarLocked(!barLocked);
    webApp?.HapticFeedback?.notificationOccurred(barLocked ? "warning" : "success");
  };

  const MAX_VAL = stakeType === 'STARS' ? 100000 : userPoints;
  const currentStake = Math.floor((barHeight / 100) * MAX_VAL);

  return (
    <div className="flex flex-col items-center relative h-full justify-end">
      {/* Cool Popups */}
      <div className="absolute top-0 w-full pointer-events-none">
        <AnimatePresence>
          {popups.map(p => (
            <motion.div key={p.id} initial={{ y: 0, opacity: 0, scale: 0.5 }} animate={{ y: -100, opacity: 1, scale: 1.2 }} exit={{ opacity: 0 }}
              className="absolute w-full text-center font-black italic text-yellow-400 text-[10px] uppercase">
              {p.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative mb-4 group" onClick={toggleLock}>
        <div className={`w-20 h-20 rounded-full border-2 overflow-hidden transition-all ${barLocked ? 'border-yellow-400 scale-110 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-zinc-800'}`}>
          <img src={fighter?.imageUrl} className="w-full h-full object-cover" />
        </div>
        {barLocked && <div className="absolute inset-0 bg-yellow-500/20 rounded-full flex items-center justify-center"><Lock size={24} className="text-yellow-400" /></div>}
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setStakeType('POINTS')} className={`p-2 rounded-lg border transition-all ${stakeType === 'POINTS' ? 'bg-zinc-800 border-yellow-500' : 'opacity-30 border-zinc-800'}`}><Wallet size={14} /></button>
        <button onClick={() => setStakeType('STARS')} className={`p-2 rounded-lg border transition-all ${stakeType === 'STARS' ? 'bg-zinc-800 border-blue-500' : 'opacity-30 border-zinc-800'}`}><Star size={14} /></button>
      </div>

      {/* THE GAUGE - Fixed Dragging */}
      <div 
        ref={barRef}
        className={`w-14 h-48 bg-black/60 rounded-2xl border relative overflow-hidden transition-all touch-none ${barLocked ? 'border-yellow-500/50' : 'border-zinc-800'}`}
        onTouchMove={handleTouchMove}
      >
        <motion.div 
          className={`absolute bottom-0 w-full ${color === 'red' ? 'bg-red-600 shadow-[0_0_15px_red]' : 'bg-blue-600 shadow-[0_0_15px_blue]'}`}
          style={{ height: `${barHeight}%` }}
        />
        {!barLocked && (
          <div className="absolute inset-0 flex items-center justify-center rotate-[-90deg] pointer-events-none">
            <span className="text-[10px] font-black text-white/90 tracking-[0.3em] whitespace-nowrap">DRAG UP</span>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xl font-mono font-bold leading-none">{currentStake.toLocaleString()}</p>
        <p className="text-[9px] text-zinc-500 font-black uppercase mt-1 tracking-tighter">{stakeType}</p>
      </div>

      {isActive && (
        <button 
           className={`mt-4 w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all ${barLocked && currentStake > 0 ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-600 opacity-50'}`}
           disabled={!barLocked}
        >
          Confirm
        </button>
      )}
    </div>
  );
}