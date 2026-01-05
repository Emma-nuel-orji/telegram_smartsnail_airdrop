import React, { useState, useEffect, useRef } from 'react';
import { Lock, Zap, Star, Wallet, ChevronLeft, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// --- INTERFACES ---
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

interface FighterStakingProps {
  fighter: Fighter | undefined;
  opponent: Fighter | undefined;
  fight: Fight;
  userPoints: number;
  isActive: boolean;
  isConcluded?: boolean;
  telegramId: string | null;
  position: "left" | "right";
  color: "red" | "blue";
}

const MOTIVATIONAL_MESSAGES = [
  "Wow! Keep supporting!", "Awesome support!", "Make them proud!",
  "Amazing! Keep it up!", "You're on fire!", "That's the spirit!",
  "Show your support!", "Back your champion!", "Great choice!", "Let's go!"
];

// --- UTILS ---
function getTimeRemaining(fightDate: string) {
  const total = Date.parse(fightDate) - Date.now();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}

// --- MAIN CONTENT COMPONENT ---
export default function StakingPageContent() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [fights, setFights] = useState<Fight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== "undefined") {
      const webApp = (window as any).Telegram?.WebApp;
      if (webApp) {
        webApp.ready();
        webApp.expand();
        try {
          const anyWebApp = webApp as any;
          if (typeof anyWebApp.disableVerticalSwipes === "function") anyWebApp.disableVerticalSwipes();
          if (typeof anyWebApp.postEvent === "function") {
            anyWebApp.postEvent("web_app_setup_swipe_behavior", { allow_vertical_swipe: false });
          }
        } catch (err) { console.log("Swipe config error", err); }

        if (webApp.initDataUnsafe?.user?.id) {
          setTelegramId(webApp.initDataUnsafe.user.id.toString());
        }
      }
    }
  }, []);

  // Fetch Data using your API routes
  useEffect(() => {
    const fetchData = async () => {
      if (!telegramId) return;
      try {
        setLoading(true);
        const userRes = await fetch(`/api/user/${telegramId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserPoints(userData.points);
        }
        const fightsRes = await fetch('/api/fights/upcoming');
        if (fightsRes.ok) {
          const fightsData = await fightsRes.json();
          setFights(fightsData);
        }
      } catch (err) { setError("Failed to load arena"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [telegramId]);

  // Touch handlers for screen sliding (Fights Slider)
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < fights.length - 1) setCurrentIndex(prev => prev + 1);
      if (diff < 0 && currentIndex > 0) setCurrentIndex(prev => prev - 1);
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic">LOADING ARENA...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-[-10%] w-full h-[40%] bg-red-900/40 blur-[100px]" />
        <div className="absolute bottom-0 right-[-10%] w-full h-[40%] bg-blue-900/40 blur-[100px]" />
      </div>

      <nav className="relative z-50 p-6 flex justify-between items-center">
        <Link href="/"><ChevronLeft size={28} /></Link>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Balance</p>
          <p className="text-sm font-mono font-bold text-yellow-500">{userPoints.toLocaleString()} Shells</p>
        </div>
      </nav>

      {/* Slider */}
      <div 
        className="flex-1 flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {fights.map((fight) => (
          <div key={fight.id} className="w-full flex-shrink-0 px-4 flex flex-col">
             <FightCard fight={fight} userPoints={userPoints} telegramId={telegramId} />
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 p-8 relative z-50">
        {fights.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-yellow-500' : 'w-2 bg-zinc-800'}`} />
        ))}
      </div>
    </div>
  );
}

function FightCard({ fight, userPoints, telegramId }: { fight: Fight, userPoints: number, telegramId: string | null }) {
  const [timer, setTimer] = useState("");
  const isActive = fight.status === "SCHEDULED" && new Date(fight.fightDate).getTime() > Date.now();

  useEffect(() => {
    const int = setInterval(() => {
      const remaining = getTimeRemaining(fight.fightDate);
      setTimer(remaining.total <= 0 ? "ARENA OPEN" : `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`);
    }, 1000);
    return () => clearInterval(int);
  }, [fight]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="text-center mb-8 relative z-10">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">{fight.title}</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-widest">{timer}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 relative h-[50vh]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-4xl font-black italic text-zinc-800/50 pointer-events-none">VS</div>
        <FighterStaking fighter={fight.fighter1} opponent={fight.fighter2} fight={fight} userPoints={userPoints} isActive={isActive} telegramId={telegramId} position="left" color="red" />
        <FighterStaking fighter={fight.fighter2} opponent={fight.fighter1} fight={fight} userPoints={userPoints} isActive={isActive} telegramId={telegramId} position="right" color="blue" />
      </div>
    </div>
  );
}

function FighterStaking({ fighter, fight, userPoints, isActive, telegramId, color }: FighterStakingProps) {
  const [stakeType, setStakeType] = useState<'STARS' | 'POINTS'>('POINTS');
  const [barHeight, setBarHeight] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [barLocked, setBarLocked] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const decayRef = useRef<NodeJS.Timeout | null>(null);
  const barLockedRef = useRef(false);
  const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

  const MAX_STARS = 100000;
  const MAX_AMOUNT = stakeType === 'STARS' ? MAX_STARS : userPoints;

  useEffect(() => { barLockedRef.current = barLocked; }, [barLocked]);

  // DECAY LOGIC
  useEffect(() => {
    if (!barLocked && barHeight > 0 && !tapping) {
      decayRef.current = setInterval(() => {
        setBarHeight(prev => {
          const next = Math.max(0, prev - 1.2);
          setStakeAmount(Math.floor((next / 100) * MAX_AMOUNT));
          return next;
        });
      }, 40);
    } else {
      if (decayRef.current) clearInterval(decayRef.current);
    }
    return () => { if (decayRef.current) clearInterval(decayRef.current); };
  }, [barLocked, barHeight, tapping, MAX_AMOUNT]);

  const triggerMessage = () => {
    const msg = { id: Math.random(), text: MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)] };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => setMessages(prev => prev.filter(m => m.id !== msg.id)), 2000);
  };

  const handleDrag = (e: React.TouchEvent) => {
    if (barLocked || !isActive) return;
    setTapping(true);
    const clientY = e.touches[0].clientY;
    const windowH = window.innerHeight;
    const next = Math.max(0, Math.min(100, ((windowH - clientY) / (windowH * 0.6)) * 100));
    
    setBarHeight(next);
    setStakeAmount(Math.floor((next / 100) * MAX_AMOUNT));
    
    if (Math.random() > 0.96) triggerMessage();
    if (Math.floor(next) % 5 === 0) webApp?.HapticFeedback?.impactOccurred("light");
  };

  const handleDragEnd = () => setTapping(false);

  const toggleLock = () => {
    const newLocked = !barLocked;
    setBarLocked(newLocked);
    webApp?.HapticFeedback?.notificationOccurred(newLocked ? "success" : "warning");
  };

  const submitStake = async () => {
    if (!isActive || stakeAmount <= 0 || !barLocked) return;
    try {
      const endpoint = stakeType === 'STARS' ? '/api/stakes/stars' : '/api/stakes/place';
      const body = { fightId: fight.id, fighterId: fighter?.id, stakeAmount, telegramId, stakeType };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        if (data.invoiceLink) window.location.href = data.invoiceLink;
        else { setBarHeight(0); setBarLocked(false); }
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col items-center h-full relative">
      {/* Popups */}
      <div className="absolute top-[-50px] w-full pointer-events-none h-20 overflow-hidden">
        <AnimatePresence>
          {messages.map(m => (
            <motion.div key={m.id} initial={{ y: 20, opacity: 0 }} animate={{ y: -40, opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute w-full text-center text-[10px] font-black text-yellow-500 italic uppercase">
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative mb-4">
        <div className={`w-20 h-20 rounded-full border-2 overflow-hidden ${color === 'red' ? 'border-red-600' : 'border-blue-600'}`}>
          <img src={fighter?.imageUrl} className="w-full h-full object-cover grayscale-[0.5]" />
        </div>
        {barLocked && <div className="absolute inset-0 bg-yellow-500/30 backdrop-blur-[1px] rounded-full flex items-center justify-center"><Lock size={24} className="text-yellow-400" /></div>}
      </div>

      <div className="flex gap-1 mb-4 bg-zinc-900/50 p-1 rounded-full border border-zinc-800">
        <button onClick={() => setStakeType('POINTS')} className={`p-2 rounded-full transition-all ${stakeType === 'POINTS' ? 'bg-zinc-700' : 'opacity-30'}`}><Wallet size={12} className="text-yellow-500" /></button>
        <button onClick={() => setStakeType('STARS')} className={`p-2 rounded-full transition-all ${stakeType === 'STARS' ? 'bg-zinc-700' : 'opacity-30'}`}><Star size={12} className="text-blue-400" /></button>
      </div>

      {/* GAUGE */}
      <div 
        className={`w-14 flex-1 rounded-2xl border bg-black/60 relative overflow-hidden transition-all ${barLocked ? 'border-yellow-500/50 scale-95' : 'border-zinc-800 scale-100'}`}
        onTouchMove={handleDrag}
        onTouchEnd={handleDragEnd}
        onClick={toggleLock}
      >
        <motion.div 
          className={`absolute bottom-0 w-full ${color === 'red' ? 'bg-red-600' : 'bg-blue-600 shadow-[0_0_20px_blue]'}`}
          style={{ height: `${barHeight}%` }}
        />
        {!barLocked && (
          <div className="absolute inset-0 flex items-center justify-center rotate-[-90deg] pointer-events-none">
            <span className="text-[10px] font-black text-white tracking-[0.3em] whitespace-nowrap drop-shadow-md">DRAG TO STAKE</span>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-lg font-mono font-bold leading-none">{stakeAmount.toLocaleString()}</p>
        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">{stakeType}</p>
      </div>

      <button 
        onClick={submitStake}
        disabled={!barLocked || stakeAmount <= 0}
        className={`mt-4 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${barLocked && stakeAmount > 0 ? 'bg-white text-black translate-y-0 shadow-lg shadow-white/10' : 'bg-zinc-900 text-zinc-600 translate-y-2 opacity-50'}`}
      >
        {barLocked ? 'Confirm' : 'Lock Bar'}
      </button>
    </div>
  );
}