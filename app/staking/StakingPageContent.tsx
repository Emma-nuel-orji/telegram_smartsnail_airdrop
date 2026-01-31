import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from "react-dom";
import { Lock, Zap, Star, Wallet, ChevronLeft, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import "./staking.css";
import Loader from '@/loader';
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

  // Fetch Data - MODIFIED TO GET ALL FIGHTS (not just upcoming)
 useEffect(() => {
  const fetchData = async () => {
    if (!telegramId) return;
    try {
      setLoading(true);
      
      // Fetch user data
      const userRes = await fetch(`/api/user/${telegramId}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserPoints(userData.points);
      }
      
      // ✅ IMPROVED: Fetch both fight types with proper error handling
      const [upcomingRes, pastRes] = await Promise.all([
        fetch('/api/fights/upcoming'),
        fetch('/api/fights/past')
      ]);
      
      const upcomingData = upcomingRes.ok ? await upcomingRes.json() : [];
      const pastData = pastRes.ok ? await pastRes.json() : [];
      
      // Combine them: Upcoming first, then Past
      const allFights = [...upcomingData, ...pastData];
      setFights(allFights);
      console.log('Loaded fights:', allFights.length);
      
    } catch (err) { 
      console.error('Fetch error:', err);
      setError("Failed to load arena"); 
    } finally { 
      setLoading(false); 
    }
  };
  fetchData();
}, [telegramId]);

  // Touch handlers for screen sliding (Fights Slider)
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { 
    touchStartX.current = e.touches[0].clientX; 
    touchStartY.current = e.touches[0].clientY; // Add this line
  // setTapping(true);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY; 
  
  const diffX = touchStartX.current - touchEndX;
  const diffY = Math.abs(touchStartY.current - touchEndY);
    
    console.log('Swipe diff:', diffX, 'Current index:', currentIndex, 'Total fights:', fights.length);
    
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > diffY) {
    if (diffX > 0 && currentIndex < fights.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (diffX < 0 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic">LOADING ARENA...</div>;
  
  if (fights.length === 0) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic">NO FIGHTS AVAILABLE</div>;

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

      {/* FIXED SLIDER CONTAINER */}
<div 
  className="flex-1 relative overflow-hidden"
  onTouchStart={handleTouchStart} 
  onTouchEnd={handleTouchEnd}
>
  {/* 2. This is the div that actually slides left/right */}
  <div 
    className="flex h-full transition-transform duration-500 ease-out"
    style={{ transform: `translateX(-${currentIndex * 100}vw)` }}
  >
    {fights.map((fight) => (
      <div key={fight.id} className="w-screen flex-shrink-0 px-4 flex flex-col">
        <FightCard fight={fight} userPoints={userPoints} telegramId={telegramId} />
      </div>
    ))}
  </div>
</div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 p-8 relative z-50">
        {fights.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-yellow-500' : 'w-2 bg-zinc-800'}`}
          />
        ))}
      </div>
      
      {/* Debug Info */}
      <div className="fixed top-20 left-4 bg-black/80 p-2 rounded text-xs z-50">
        Fight {currentIndex + 1} of {fights.length}
      </div>
    </div>
  );
}

function FightCard({ fight, userPoints, telegramId }: { fight: Fight, userPoints: number, telegramId: string | null }) {
 const [timer, setTimer] = useState<string>("");
 const [userStakes, setUserStakes] = useState<any[]>([]);
 const [loadingStakes, setLoadingStakes] = useState(true);
const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
  
  
  const isConcluded = !!fight && (
    fight.status === "COMPLETED" ||
    fight.status === "DRAW" ||
    fight.status === "CANCELLED" ||
    fight.status === "EXPIRED" ||
    new Date(fight.fightDate).getTime() <= Date.now()
  );
  
 const isActive = !!fight && 
    fight.status === "SCHEDULED" && 
    new Date(fight.fightDate).getTime() > Date.now();
    
   const isDraw = isConcluded && fight && !fight.winnerId && fight.status !== "CANCELLED" && fight.status !== "EXPIRED";
   
  const winner = isConcluded && fight?.winnerId 
    ? (fight.fighter1.id === fight.winnerId ? fight.fighter1 : fight.fighter2)
    : null;

    // Inside FightCard
const [isClaimed, setIsClaimed] = useState(false);

// FETCH USER'S STAKE FOR THIS SPECIFIC FIGHT
  useEffect(() => {
    const fetchMyStakes = async () => {
      if (!telegramId || !fight.id) return;
      try {
        setLoadingStakes(true);
        // This endpoint should return all stakes made by this user for this fight
        const res = await fetch(`/api/stakes/user/${telegramId}/${fight.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserStakes(data.stakes || []);
          setIsClaimed(data.claimed || false);
        }
      } catch (err) {
        console.error("Error fetching user stakes:", err);
      } finally {
        setLoadingStakes(false);
      }
    };

    fetchMyStakes();
  }, [fight.id, telegramId]);

// Logic to check if user deserves a reward
// Assuming you have 'userStakes' data available
const userStakeOnWinner = userStakes?.find(s => s.fighterId === fight.winnerId);
const canClaim = isConcluded && userStakeOnWinner && !isClaimed && fight.status === "COMPLETED";

const handleClaim = async () => {
  try {
    const res = await fetch('/api/stakes/claim', {
      method: 'POST',
      body: JSON.stringify({ fightId: fight.id, telegramId })
    });
    
    if (res.ok) {
      const data = await res.json();
      setIsClaimed(true);
      
      // If the backend says they hit a streak
      if (data.newStreak >= 3) {
         // Show a special "NFT EARNED" Modal
         webApp?.HapticFeedback?.notificationOccurred("success");
         alert("🏆 STREAK UNLOCKED! Check your profile for your new NFT Badge.");
      }
    }
  } catch (err) {
    console.error("Claim failed", err);
  }
};


  useEffect(() => {
    if (!fight) return;
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(fight.fightDate);
      if (remaining.total <= 0) {
        clearInterval(interval);
        setTimer("Fight Concluded");
      } else {
        setTimer(`${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fight]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="text-center mb-8 relative z-10">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">{fight.title}</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-widest">{timer}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-4xl font-black italic text-zinc-800/50 pointer-events-none">VS</div>
        
        {/* Fighter 1 Column */}
        <div className="flex flex-col items-center">
          <FighterStaking 
             fighter={fight?.fighter1 || undefined}
          opponent={fight?.fighter2 || undefined}
          fight={fight}
          userPoints={userPoints}
          isActive={isActive}
          isConcluded={isConcluded}
          telegramId={telegramId}
          position="left"
            color="red" 
          />
          <p className="mt-2 text-white font-bold italic uppercase text-xs tracking-tight leading-none">
            {fight.fighter1.name}
          </p>
        </div>
        
        {/* Fighter 2 Column */}
        <div className="flex flex-col items-center">
          <FighterStaking 
            fighter={fight.fighter2} 
            opponent={fight.fighter1} 
            fight={fight} 
            userPoints={userPoints} 
            isActive={isActive} 
            isConcluded={isConcluded}
            telegramId={telegramId} 
            position="right" 
            color="blue" 
          />
          <p className="mt-2 text-white font-bold italic uppercase text-xs tracking-tight leading-none">
            {fight.fighter2.name}
          </p>
        </div>
         {/* Enhanced Winner/Draw Overlay */}
      {isConcluded && (
  <div className="fight-result-overlay">
    {/* Animated background glow */}
    <div className={`result-glow ${isDraw ? 'draw-glow' : 'winner-glow'}`}></div>
    
    <div className="result-card-glass">
      {/* Top Badge */}
      <div className="result-badge">
        {fight.status === "CANCELLED" ? "VOID" : 
         fight.status === "EXPIRED" ? "PENDING" : "FINAL RESULT"}
      </div>

      <div className="result-main-content">
        {winner ? (
          <>
            <div className="winner-presentation">
              <div className="portrait-frame">
                <img src={winner.imageUrl} alt={winner.name} className="winner-img" />
                <div className="crown-icon">👑</div>
              </div>
              <h2 className="winner-text-name">{winner.name}</h2>
              <p className="winner-subtitle">DOMINANT VICTORY</p>
            </div>
            
            {/* Minimal Confetti */}
            <div className="confetti-wrapper">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="dot-confetti" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`
                }}></div>
              ))}
            </div>
          </>
        ) : (
          <div className="status-display">
            <div className="status-icon">
              {fight.status === "CANCELLED" ? "🚫" : isDraw ? "🤝" : "⏰"}
            </div>
            <h2 className="status-title">
              {isDraw ? "STALEMATE" : fight.status === "CANCELLED" ? "CANCELLED" : "VERIFYING"}
            </h2>
            <p className="status-desc">
              {isDraw ? "Split Decision" : "Official scores are being processed"}
            </p>
          </div>
        )}
      </div>

     <div className="claim-section">
  {canClaim ? (
    <button className="claim-button-premium" onClick={handleClaim}>
      <span className="button-glow"></span>
      <div className="button-content">
        <span className="claim-icon">💰</span>
        <div className="claim-text">
          <span className="claim-label">COLLECT REWARDS</span>
          <span className="claim-amount">
            +{ (userStakeOnWinner.amount * 1.8).toLocaleString() } Shells
          </span>
        </div>
      </div>
    </button>
  ) : isClaimed ? (
    <div className="claimed-status">
      <span className="check-icon">✓</span> REWARDS COLLECTED
    </div>
  ) : userStakeOnWinner === undefined && isConcluded ? (
     <p className="no-stake-msg">Better luck next time!</p>
  ) : null}
</div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}

function FighterStaking({ fighter, fight, userPoints, isActive, isConcluded = false, telegramId, color, position  }: FighterStakingProps) {
  const [stakeType, setStakeType] = useState<'STARS' | 'POINTS'>('POINTS');
  const [barHeight, setBarHeight] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [barLocked, setBarLocked] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const decayRef = useRef<NodeJS.Timeout | null>(null);
  const [popups, setPopups] = useState<any[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const barLockedRef = useRef(false);
  const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

  const MAX_STARS = 100000;
  const MIN_POINTS_REQUIRED = 200000;
  const MAX_AMOUNT = stakeType === 'STARS' ? MAX_STARS : userPoints;
const canParticipate = userPoints >= MIN_POINTS_REQUIRED && isActive && !isConcluded;
  const isFighter = fighter?.telegramId === telegramId;
  
  const isWinner = isConcluded && fight?.winnerId === fighter?.id;
  const isLoser = isConcluded && fight?.winnerId !== fighter?.id && fight?.winnerId;
 const touchStartX = useRef(0);
  const touchStartY = useRef(0);
const SEED_POOL = 100000; // House seed
  // @ts-ignore (Assuming these exist in your updated API)
  const redPool = (fight.totalRedStakes || 0) + SEED_POOL;
  // @ts-ignore
  const bluePool = (fight.totalBlueStakes || 0) + SEED_POOL;
  const totalPool = (redPool + bluePool) * 0.9; // 10% Arena Fee

  const currentPool = color === 'red' ? redPool : bluePool;
  const multiplier = (totalPool / currentPool).toFixed(2);

  useEffect(() => { barLockedRef.current = barLocked; }, [barLocked]);

  useEffect(() => {
    const handleGlobalTouchEnd = () => setTapping(false);
    window.addEventListener('touchend', handleGlobalTouchEnd);
    return () => window.removeEventListener('touchend', handleGlobalTouchEnd);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
  e.stopPropagation();
    touchStartX.current = e.touches[0].clientX;
  touchStartY.current = e.touches[0].clientY;
  setTapping(true);
};
  // --- REFINED DRAGGING LOGIC ---
 const handleTouchMove = (e: React.TouchEvent) => {
  if (barLocked || !isActive || !barRef.current) return;
e.stopPropagation();

    const touch = e.touches[0];
    // const rect = barRef.current.getBoundingClientRect();
  
  // 1. DIRECTION CHECK
  const deltaX = Math.abs(touch.clientX - touchStartX.current);
  const deltaY = Math.abs(touch.clientY - touchStartY.current);

  // If the user is swiping LEFT or RIGHT, we return immediately.
  // This allows the touch event to "bubble up" to your slider.
  if (deltaX > deltaY && deltaX > 10) {
    return; 
  }

  // 2. STAKING LOGIC
  // If we reach here, the user is moving UP/DOWN. 
  // We prevent the page from moving so the gauge fills smoothly.
  if (e.cancelable) e.preventDefault();

  const rect = barRef.current.getBoundingClientRect();
  let pct = ((rect.bottom - touch.clientY) / rect.height) * 100;
  pct = Math.max(0, Math.min(100, pct));
  
  setBarHeight(pct);
  setStakeAmount(Math.floor((pct / 100) * MAX_AMOUNT));

  // 3. YOUR POPUP LOGIC (Keep this!)
  if (Math.random() > 0.94) {
    const id = Math.random();
    const text = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    const xPos = Math.floor(Math.random() * 80) + 10;
    setPopups(prev => [...prev, { id, text, xPos }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id !== id)), 1000);
    webApp?.HapticFeedback?.impactOccurred("light");
  }
};

  // DECAY LOGIC
useEffect(() => {
    if (!barLocked && barHeight > 0 && !tapping) {
      decayRef.current = setInterval(() => {
        setBarHeight(prev => {
          const next = Math.max(0, prev - 1.5);
          setStakeAmount(Math.floor((next / 100) * MAX_AMOUNT));
          return next;
        });
      }, 30);
    } else {
      if (decayRef.current) clearInterval(decayRef.current);
    }
    return () => { if (decayRef.current) clearInterval(decayRef.current); };
  }, [barLocked, barHeight, tapping, MAX_AMOUNT]);

  const toggleLock = () => {
  if (!barLocked && stakeAmount <= 0) return;

  const newLocked = !barLocked;
  setBarLocked(newLocked);
  webApp?.HapticFeedback?.notificationOccurred(
    newLocked ? "success" : "warning"
  );
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
    <div className="flex flex-col items-center h-full relative z-30">
     
      <div className="relative mb-4">
        <div className={`w-20 h-20 rounded-full border-2 overflow-hidden ${color === 'red' ? 'border-red-600' : 'border-blue-600'}`}>
          <img src={fighter?.imageUrl} className="w-full h-full object-cover grayscale-[0.5]" />
        </div>
        {barLocked && <div className="absolute inset-0 bg-yellow-500/30 backdrop-blur-[1px] rounded-full flex items-center justify-center"><Lock size={24} className="text-yellow-400" /></div>}
      </div>

      {/* NEW: Risk Multiplier Badge */}
      <div className="mb-2 px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-black text-green-400 italic">
        {multiplier}x PAYOUT
      </div>
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


      <div 
        ref={barRef}
        className={`w-14 min-h-[180px] flex-1 rounded-2xl border bg-black/60 relative overflow-hidden transition-all ${barLocked ? 'border-yellow-500/50 scale-95' : 'border-zinc-800'}`}
        onTouchStart={handleTouchStart}  
        onTouchMove={handleTouchMove}
        onClick={toggleLock}
      >
        <motion.div 
          className={`absolute bottom-0 w-full ${color === 'red' ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)]'}`}
          animate={{ height: `${barHeight}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        {!barLocked && (
          <div className="absolute inset-0 flex items-center justify-center rotate-[-90deg] pointer-events-none opacity-30">
            <span className="text-[10px] font-black text-white tracking-[0.3em]">DRAG UP</span>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
  <p className="text-lg font-mono font-bold leading-none">
    {stakeAmount.toLocaleString()}
  </p>

  <p className="text-[9px] text-zinc-500 font-black uppercase mt-1">
    EST. WIN: {Math.floor(stakeAmount * parseFloat(multiplier)).toLocaleString()}
  </p>

  <p className="text-[9px] text-zinc-500 font-black uppercase leading-none">
    {stakeType}
  </p>
</div>


        <button 
        onClick={submitStake}
        disabled={!barLocked || stakeAmount <= 0}
        className={`mt-4 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${barLocked && stakeAmount > 0 ? 'bg-white text-black translate-y-0 shadow-lg shadow-white/10' : 'bg-zinc-900 text-zinc-600 translate-y-2 opacity-50'}`}
      >
        {barLocked ? 'Confirm' : 'Lock Bar'}
      </button>

      {typeof window !== "undefined" &&
  createPortal(
    <AnimatePresence>
      {popups.map((m, index)=> (
        <motion.div
          key={m.id}
          initial={{ y: 0, opacity: 0, scale: 0.6 }}
          animate={{ y: -80, opacity: 1, scale: 1.4 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            left: `${m.xPos}%`,
            bottom: `${200 + index * 22}px`,
            transform: "translateX(-50%)",
          }}
          className="text-[14px] font-black text-yellow-500 italic uppercase
                     drop-shadow-[0_0_16px_rgba(234,179,8,0.85)]"
        >
          {m.text}
        </motion.div>
      ))}
    </AnimatePresence>,
    document.getElementById("popup-layer")!
  )}
    </div>
  );
}