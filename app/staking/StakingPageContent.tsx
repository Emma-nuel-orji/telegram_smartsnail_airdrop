import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from "react-dom";
import { Lock, X, Zap, Star, Wallet, ChevronLeft, Trophy, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import "./staking.css";
import { useOnboardingTour } from '@/app/hooks/useOnboardingTour';
import OnboardingTour, { TourStep } from '@/components/OnboardingTour';
import Loader from '@/loader';
// --- INTERFACES ---
interface Fighter {
  id: string;
  name: string;
  telegramId?: string;
  imageUrl?: string;
  socialMedia?: string;
  isPrivate?: boolean;
  ownerId?: string | null;
  collection?: {
  name: string;
  imageUrl?: string;
  };
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
  side: string;
  userPoints: number;
  isActive: boolean;
  isConcluded?: boolean;
  telegramId: string | null;
  position: "left" | "right";
  color: "red" | "blue" | "gold" | "silver";
  onImageClick?: () => void;
  onStakeSuccess?: () => void;
  
}

interface NFT {
  id: string;
  name: string;
  collectionId: string;
  collection?: {
    name: string;
  };
  priceShells?: number | null;
  priceStars: number;
  priceTon: number;
 
}

interface NFTRewardModalProps {
  nft: {
    name: string;
    imageUrl: string;
    priceShells: number;
    rarity: string;
     collection?: {
    name: string;
  };
  };
  userReferralCode: string; // Pass this from your User state
  onClose: () => void;
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

const STAKING_TOUR: TourStep[] = [
  { targetId: "staking-bar", emoji: "👆", label: "Stake", text: "Drag UP to set your Stake, the higher the bar the higher the earning." },
  { targetId: "staking-bar", emoji: "🔒", label: "Confirm", text: "Tap once to lock-in your stake, then confirm." },
  { targetId: "currency-toggle", emoji: "💳", label: "Switch Currency", text: "Switch between Points/Shells or Stars." },
  { targetId: "confirm-stake", emoji: "🔒", label: "Confirm", text: "Click to Pay." },
  
  { targetId: "team-badge-icon1", emoji: "🏅", label: "Badges", text: "This is the NFT team this fighter is signed under, in this case SmartSnail NFT." },
    { targetId: "team-badge-icon2", emoji: "🏅", label: "Badges", text: "This is the NFT team this fighter is signed under, in this case Manchies NFT." },

  { targetId: "scout-talent-btn", emoji: "🥊", label: "Scout", text: "Tap here to sign real-life Fighter NFTs. Don't just bet—own the talent. Managers earn a cut of every fight their NFT wins" },



  { targetId: "fights-slider", emoji: "👉", label: "Swipe", text: "Swipe to see other fights." },
  // { targetId: "claim-button", emoji: "💰", label: "Rewards", text: "Tap here to claim winnings." },
  { 
    targetId: "multiplier-badge-1", 
    emoji: "📈", 
    label: "Yield", 
    text: "winning stakers receive their stake multiplied by the fighter's payout." 
  },
  { 
    targetId: "multiplier-badge-2", 
    emoji: "⚖️", 
    label: "Dynamic Odds", 
    text: "Caution: Payout multiplier changes in real-time! If more people stake on this side, the payout drops and increases on the other side. Strategy is key." 
  },
  // { 
  //   targetId: "currency-toggle", 
  //   emoji: "💎", 
  //   label: "Stars", 
  //   text: "Staking with Stars bypasses point requirements and boosts the prize pool." 
  // },
  // { 
  //   targetId: "team-badge-icon", 
  //   emoji: "🛡️", 
  //   label: "Manager Bonus", 
  //   text: "Owning this NFT collection grants you staking rights and specialized rewards." 
  // },
  // { 
  //   targetId: "scout-talent-btn", 
  //   emoji: "🤝", 
  //   label: "Ownership", 
  //   text: "Don't just bet—own the talent. Managers earn a cut of every fight their NFT wins." 
  // },

  { 
  targetId: `fighter-portrait-1`, 
  emoji: "👑", 
  label: "Manager Revenue", 
  text: "Don't just bet—sign this talent and receive manager benefits   1️⃣ 50% of every stake on your fighter instantly (win or lose) + 2️⃣ 10% of the entire losing pool on every victory!" 
},

{ 
  targetId: `fighter-portrait-2`, 
  emoji: "👑", 
  label: "Manager Revenue", 
  text: "Don't just bet—sign this talent and receive manager benefits   1️⃣ 50% of every stake on your fighter instantly (win or lose) + 2️⃣ 10% of the entire losing pool on every victory!" 
},

  { targetId: "fights-slider", emoji: "🛡️", label: "Swipe", text: "to enage in this staking you need a minimum of 200,000 points/shells or either of the SmartSnail or Manchies NFTs." },
];

// --- MAIN CONTENT COMPONENT ---
export default function StakingPageContent() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
   const { showTour, completeTour } = useOnboardingTour('staking', telegramId);
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



const refreshUserPoints = async () => {
  if (!telegramId) return;
  const userRes = await fetch(`/api/user/${telegramId}`);
  if (userRes.ok) {
    const userData = await userRes.json();
    setUserPoints(userData.points);
  }
};

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

useEffect(() => {
  if (showTour) {
    setCurrentIndex(0); // Reset to first fight so the tour starts at the beginning
  }
}, [showTour]);

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

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic">POLYCOMBAT LOADING...</div>;
  
  if (fights.length === 0) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic">NO FIGHTS AVAILABLE</div>;

  return (
    <div id='fights-slider' className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden">
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
        {/* NEW: Scouting Office Button */}
  <Link href="/recruitment">
    <button id="scout-talent-btn" className="relative group px-4 py-2 bg-blue-600/10 border border-blue-500/30 rounded-xl flex items-center gap-2 transition-all hover:bg-blue-600/20 active:scale-95">
      <div className="absolute -top-1 -right-1">
        <span className="flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
      </div>
      <Shield size={16} className="text-blue-400" />
      <span className="text-[10px] font-black uppercase tracking-tighter text-blue-100">Scout Talent</span>
    </button>
  </Link>
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
              <FightCard fight={fight} userPoints={userPoints} telegramId={telegramId} onStakeSuccess={refreshUserPoints} />
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


      <AnimatePresence>
        {showTour && <OnboardingTour steps={STAKING_TOUR} onDone={completeTour} />}
      </AnimatePresence>
<div id="popup-layer" className="fixed inset-0 pointer-events-none z-[9999]" />
    </div>


  );
}
function FighterModal({ fighter,  onClose, userStakes = [],fight }: { fighter: any, onClose: () => void, userStakes?: any[], fight?: any 
}) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
  const userTelegramId = webApp?.initDataUnsafe?.user?.id?.toString();
  const myStakesOnFighter = userStakes
    .filter((s: any) => s.fighterId === fighter.id)
    .reduce((sum: number, s: any) => sum + Number(s.stakeAmount), 0);

  // Calculate global stakes for this fighter (from the fight object)
  const totalGlobalStakes = fight?.stakes
    ? fight.stakes
        .filter((s: any) => s.fighterId === fighter.id)
        .reduce((sum: number, s: any) => sum + Number(s.stakeAmount), 0)
    : 0;

  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, []);

  const handleSign = async (fighterId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recruit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fighterId, telegramId: userTelegramId })
      });

      if (response.ok) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setShowSuccess(true);
        setTimeout(() => { onClose(); window.location.reload(); }, 2500);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const isAvailableForSign = !fighter.isPrivate && !fighter.ownerId;
  const displayPrice = fighter.salePriceTon ? `${fighter.salePriceTon} TON` : "NOT LISTED";
  const winRate = (fighter.wins + fighter.losses + fighter.draws) > 0 
    ? Math.round((fighter.wins / (fighter.wins + fighter.losses + fighter.draws)) * 100) : 0;
console.log("🔍 Debug Stakes for:", fighter.name);
console.log("Raw userStakes array:", userStakes);
console.log("Raw fight.stakes array:", fight?.stakes);
  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-[360px] bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-5 shadow-[0_0_60px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] no-scrollbar">
        
        {/* CLOSE BUTTON */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-zinc-900 rounded-full text-zinc-500 z-10 active:scale-90">
          <X size={18} />
        </button>

        <div className="flex flex-col items-center">
          {/* IMAGE SECTION */}
          <div className={`w-28 h-28 rounded-full mb-3 flex items-center justify-center ${fighter.isPrivate ? 'gold-shimmer-border p-[3px]' : 'border-2 border-zinc-800 p-[2px]'}`}>
            <img src={fighter.imageUrl} className="w-full h-full rounded-full object-cover bg-black" alt="" />
          </div>

          <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter text-center leading-none mb-1">{fighter.name}</h2>
          {/* <div className="px-3 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-4">
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">{displayPrice}</p>
          </div> */}

          {/* 🛡️ TEAM / COLLECTION INDICATOR */}
          {fighter.collection?.name && (
            <div className="flex items-center gap-1.5 mb-2">
               <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Team:</span>
               <span className="text-[10px] font-black text-blue-400 uppercase italic tracking-tight bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                {fighter.collection.name}
               </span>
            </div>
          )}

          <div className="px-3 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-4">
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">{displayPrice}</p>
          </div>

          {/* 🚨 NEW: STAKING STATS SECTION */}
          <div className="grid grid-cols-2 gap-2 w-full mb-4">
            <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
              <p className="text-[8px] text-blue-400 font-black uppercase mb-1">Total Pool</p>
              <p className="text-sm font-black text-white italic">
                {totalGlobalStakes.toLocaleString()} <span className="text-[10px] opacity-50">🐚</span>
              </p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-2xl border border-green-500/20">
              <p className="text-[8px] text-green-400 font-black uppercase mb-1">Your Stake</p>
              <p className="text-sm font-black text-white italic">
                {myStakesOnFighter.toLocaleString()} <span className="text-[10px] opacity-50">🐚</span>
              </p>
            </div>
          </div>

          {/* PHYSICAL SPECS (Restored) */}
          <div className="grid grid-cols-2 gap-2 w-full mb-4">
            <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-white/5">
              <p className="text-[8px] text-zinc-500 font-black uppercase mb-0.5">Height / Gender</p>
              <p className="text-xs font-bold text-white italic">{fighter.height}cm / {fighter.gender}</p>
            </div>
            <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-white/5">
              <p className="text-[8px] text-zinc-500 font-black uppercase mb-0.5">Socials</p>
              {fighter.socialMedia ? (
                <a href={fighter.socialMedia} target="_blank" className="text-xs font-bold text-blue-400 underline italic uppercase">Instagram</a>
              ) : <p className="text-xs font-bold text-zinc-700 italic uppercase">Private</p>}
            </div>
          </div>

          {/* STREAK METER (Restored) */}
          <div className={`w-full p-4 rounded-2xl border mb-4 ${fighter.currentStreak % 3 === 2 ? 'bg-orange-500/10 border-orange-500/50 animate-pulse' : 'bg-zinc-900/80 border-zinc-800'}`}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[9px] font-black uppercase text-zinc-400">NFT Progress</h4>
              <span className="text-[10px] font-bold text-white italic">{3 - (fighter.currentStreak % 3)} to drop</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-8 flex-1 rounded-lg border flex items-center justify-center ${ (fighter.currentStreak % 3) >= s ? 'bg-yellow-500/20 border-yellow-500' : 'bg-black/40 border-zinc-800' }`}>
                  <span className={`text-lg ${(fighter.currentStreak % 3) >= s ? 'opacity-100' : 'opacity-10 grayscale'}`}>🐚</span>
                </div>
              ))}
            </div>
          </div>

          {/* CAREER RECORD (Restored) */}
          <div className="w-full bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/50 mb-6">
            <div className="flex justify-between text-[8px] font-black uppercase text-zinc-500 mb-2 tracking-widest">
              <span>Career Record</span>
              <span className="text-green-500">{winRate}% Win Rate</span>
            </div>
            <div className="flex justify-between text-center">
              <div><p className="text-xl font-black text-white leading-none">{fighter.wins}</p><p className="text-[8px] font-bold text-zinc-600 uppercase">W</p></div>
              <div className="w-px h-6 bg-zinc-800 self-center" />
              <div><p className="text-xl font-black text-white leading-none">{fighter.losses}</p><p className="text-[8px] font-bold text-zinc-600 uppercase">L</p></div>
              <div className="w-px h-6 bg-zinc-800 self-center" />
              <div><p className="text-xl font-black text-white leading-none">{fighter.draws}</p><p className="text-[8px] font-bold text-zinc-600 uppercase">D</p></div>
            </div>
          </div>

          {/* ACTION BUTTON */}
          {isAvailableForSign ? (
            <button onClick={() => handleSign(fighter.id)} disabled={loading} className="w-full py-4 bg-green-600 rounded-2xl font-black uppercase italic text-xs tracking-widest text-white shadow-lg active:scale-95 transition-all">
              {loading ? "SIGNING..." : `SIGN CONTRACT`}
            </button>
          ) : (
            <div className="w-full py-4 bg-zinc-900/50 rounded-2xl text-center border border-zinc-800 opacity-50">
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">CONTRACTED</p>
            </div>
          )}
        </div>

        {/* SUCCESS MESSAGE */}
        {showSuccess && (
          <div className="absolute inset-0 bg-zinc-950 rounded-[2.5rem] flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
            <Zap size={40} className="text-yellow-500 animate-bounce" fill="currentColor" />
            <p className="text-xl font-black italic text-white mt-2">SIGNED!</p>
          </div>
        )}
      </div>
    </div>
    
  );
}

function FightCard({ fight, userPoints, telegramId, onStakeSuccess }: { fight: Fight, userPoints: number, telegramId: string | null, onStakeSuccess?: () => void  }) {
 const [timer, setTimer] = useState<string>("");
 const [userStakes, setUserStakes] = useState<any[]>([]);
 const [loadingStakes, setLoadingStakes] = useState(true);
 const webApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
 const [selectedFighter, setSelectedFighter] = useState<any>(null); 
const [isClaimed, setIsClaimed] = useState(false);
const [showConfetti, setShowConfetti] = useState(false);
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
     const fightStartTime = new Date(fight.fightDate).getTime();
const fiveMinutesInMs = 5 * 60 * 1000;
const isTooLateToStake = Date.now() >= (fightStartTime - fiveMinutesInMs);
const canUserStake = isActive && !isTooLateToStake;
 const [rewardData, setRewardData] = useState<any | null>(null);


// FETCH USER'S STAKE FOR THIS SPECIFIC FIGHT
 useEffect(() => {
  const fetchMyStakes = async () => {
    if (!telegramId || !fight.id) return;
    try {
      setLoadingStakes(true);
      const res = await fetch(`/api/stakes/user/${telegramId}/${fight.id}`);
      
      if (res.ok) {
        const data = await res.json();
        
        // ✅ Correctly sanitized and stored
        const sanitizedStakes = (data.stakes || []).map((s: any) => ({
          ...s,
          stakeAmount: Number(s.stakeAmount), 
          initialStakeAmount: Number(s.initialStakeAmount)
        }));

        setUserStakes(sanitizedStakes);
        setIsClaimed(data.claimed || false);
      } // End of if (res.ok)
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
const triggerNFTRewardAnimation = (message: string) => {
  console.log("🏆 NFT REWARD:", message);
  webApp?.HapticFeedback?.notificationOccurred("success");
};

const triggerAirdropAnimation = (message: string) => {
  console.log("💰 AIRDROP:", message);
  webApp?.HapticFeedback?.impactOccurred("heavy");
};

const handleClaim = async () => {
  try {
    const res = await fetch('/api/stakes/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // Good practice to add this
      body: JSON.stringify({ 
        fightId: fight.id, 
        telegramId,
        fightTitle: fight.title 
      })
    });
    
    if (res.ok) {
      const data = await res.json();

      // --- START VISUAL EFFECTS ---
      setShowConfetti(true);
      setIsClaimed(true);
      webApp?.HapticFeedback?.notificationOccurred("success");
      // ----------------------------

      // TRIGGER THE GLOW MODAL IF AN NFT WAS MINTED
      if (data.nftMinted && data.nftData) {
        setRewardData(data.nftData); // This opens the modal
        triggerNFTRewardAnimation("Fighter Milestone: New NFT Earned!");
      }

      if (data.isAirdropActive) {
        triggerAirdropAnimation("TEAM WIN! +50k Airdrop Credited!");
      }
            // Stop confetti after a few seconds
      setTimeout(() => setShowConfetti(false), 4000);
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

  const getFighterColor = (fighter: any) => {
  // 1. If the fighter has an owner or is marked private -> GOLD
  if (fighter.ownerId || fighter.isPrivate) return "gold";
  
  // 2. Otherwise, check the collection name
  if (fighter.collection?.name === "SmartSnail") return "red";
  if (fighter.collection?.name === "Manchies") return "blue";
  
  // 3. Fallback/Default
  return "silver"; 
};

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
             side="1"
          opponent={fight?.fighter2 || undefined}
          fight={fight}
          userPoints={userPoints}
          isActive={isActive && canUserStake}
          isConcluded={isConcluded}
          telegramId={telegramId}
          position="left"
          color={getFighterColor(fight.fighter1)}
           onImageClick={() => setSelectedFighter(fight.fighter1)} 
           onStakeSuccess={onStakeSuccess}
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
            side="2"
            userPoints={userPoints} 
            isActive={isActive && canUserStake}
            isConcluded={isConcluded}
            telegramId={telegramId} 
            position="right" 
            color={getFighterColor(fight.fighter2)}
             onImageClick={() => setSelectedFighter(fight.fighter2)} 
             onStakeSuccess={onStakeSuccess}
          />
          <p className="mt-2 text-white font-bold italic uppercase text-xs tracking-tight leading-none">
            {fight.fighter2.name}
          </p>
          {selectedFighter && (
         <FighterModal 
           fighter={selectedFighter} 
           onClose={() => setSelectedFighter(null)} 
           userStakes={userStakes}
           fight={fight}
         />
       )}
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
              <p className="winner-subtitle">WINS</p>
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

        {rewardData && (
    <NFTRewardModal 
      nft={rewardData} 
      userReferralCode={telegramId || "friend"} 
      onClose={() => setRewardData(null)} 
    />
  )}
      </div>

     <div className="claim-section relative">
      {showConfetti && (
    <div className="absolute inset-0 pointer-events-none z-50">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
          animate={{ 
            y: -250 - Math.random() * 150, 
            x: (Math.random() - 0.5) * 300,
            opacity: 0,
            scale: 0.2,
            rotate: Math.random() * 720
          }}
          transition={{ duration: 2, ease: "easeOut" }}
          className={`absolute left-1/2 top-1/2 w-2 h-2 rounded-full ${
            i % 2 === 0 ? 'bg-yellow-400' : 'bg-white'
          } shadow-[0_0_10px_rgba(255,255,255,0.8)]`}
        />
      ))}
    </div>
  )}
      {canClaim ? (
    <button className="claim-button-premium" onClick={handleClaim}>
      <span className="button-glow"></span>
      <div className="button-content">
        <span className="claim-icon">💰</span>
        <div className="claim-text">
          <span className="claim-label">COLLECT REWARDS</span>
          <span className="claim-amount">
            {/* We use the pointsEarned saved in the stake record directly */}
            +{ Number(userStakeOnWinner.pointsEarned).toLocaleString() } Shells
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



const NFTRewardModal: React.FC<NFTRewardModalProps> = ({ nft, userReferralCode, onClose }) => {
  const handleShareStory = () => {
    const webApp = (window as any).Telegram?.WebApp;
    // "https://t.me/SmartSnails_Bot"
    // Referral link to your Bot
    const refLink = `https://t.me/SmartSnails_Bot?start=${userReferralCode}`;
    const text = `🏆 I just minted a ${nft.rarity} ${nft.name} from the ${nft.collection?.name} squad! \n\n🔥 My betting power increased by ${nft.priceShells.toLocaleString()} Shells! \n\nJoin my team here: ${refLink}`;
    if (webApp?.shareToStory) {
      // Point the Story media to the actual NFT image from your DB
      webApp.shareToStory(nft.imageUrl, {
        text: text,
        widget_link: { url: refLink, name: "Play Now 🐚" }
      });
    } else {
      // Fallback: Standard Telegram Message Share
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`;
      webApp?.openTelegramLink(shareUrl);
    }
  };

  // Dynamic colors based on Rarity
  const rarityColor = nft.rarity === 'LEGENDARY' ? 'text-orange-500' : 'text-yellow-500';
  const glowColor = nft.rarity === 'LEGENDARY' ? 'shadow-[0_0_50px_rgba(249,115,22,0.4)]' : 'shadow-[0_0_50px_rgba(234,179,8,0.4)]';

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'unset'; };
    }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
      <div className={`relative w-full max-w-sm bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] p-8 text-center ${glowColor} animate-in fade-in zoom-in duration-300`}>
        
        {/* NFT Image with Glow */}
        <div className="relative w-40 h-40 mx-auto mb-6">
          <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
          <img 
            src={nft.imageUrl} 
            className="relative w-full h-full object-contain drop-shadow-2xl" 
            alt="NFT Reward"
          />
        </div>

        <h3 className={`text-xs font-black uppercase tracking-widest mb-1 ${rarityColor}`}>
          {nft.rarity} UNLOCKED
        </h3>
        <h2 className="text-2xl font-black text-white uppercase italic mb-4">
          {nft.name}
        </h2>

        {/* Dynamic Power from DB */}
        <div className="bg-white/5 border border-white/10 rounded-2xl py-4 mb-6">
          <span className="text-[10px] text-zinc-500 font-bold block uppercase mb-1">Betting Limit Boost</span>
          <span className="text-3xl font-black text-white">+{nft.priceShells.toLocaleString()}</span>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleShareStory}
            className="w-full py-4 bg-yellow-500 text-black font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            📲 SHARE TO STORY
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 text-zinc-500 font-bold hover:text-white transition-colors"
          >
            SKIP
          </button>
        </div>
      </div>
    </div>
  );
};

function FighterStaking({ fighter, fight, userPoints, isActive, onImageClick, isConcluded = false, telegramId, color, side, position, onStakeSuccess   }: FighterStakingProps) {
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
  const isFighter = fighter?.telegramId === telegramId;
  
  const isWinner = isConcluded && fight?.winnerId === fighter?.id;
  const isLoser = isConcluded && fight?.winnerId !== fighter?.id && fight?.winnerId;
 const touchStartX = useRef(0);
  const touchStartY = useRef(0);

const themes = {
    red: {
      border: "border-red-600",
      glow: "shadow-[0_0_15px_rgba(220,38,38,0.5)]",
      bg: "bg-red-600"
    },
    blue: {
      border: "border-blue-600",
      glow: "shadow-[0_0_15px_rgba(37,99,235,0.5)]",
      bg: "bg-blue-600"
    },
    gold: {
      border: "border-yellow-500",
      glow: "shadow-[0_0_20px_rgba(234,179,8,0.7)]",
      bg: "bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-400"
    },
    zinc: {
      border: "border-zinc-500",
      glow: "",
      bg: "bg-zinc-500"
    }
  };

const activeTheme = themes[color as keyof typeof themes] || themes.zinc;

const getFighterTheme = (fighter: Fighter) => {
  if (fighter.isPrivate || fighter.ownerId) return themes.gold;
  if (fighter.collection?.name === "SmartSnail") return themes.red;
  if (fighter.collection?.name === "Manchies") return themes.blue;
  
  // Default fallback
  return themes.zinc; 
};


 const [livePools, setLivePools] = useState({ red: 0, blue: 0 });

useEffect(() => {
  if (!fight?.id) return;

  const loadPools = async () => {
    try {
      const res = await fetch(`/api/stakes/total/${fight.id}`);
      if (!res.ok) return;

      const data = await res.json();

      setLivePools({
        red: Number(data.totalRedStakes),
        blue: Number(data.totalBlueStakes)
      });
    } catch (err) {
      console.error("Failed to load pools", err);
    }
  };

  loadPools();
}, [fight?.id]);

// 2. These variables now match your existing logic perfectly
  const redPool = livePools.red;
  const bluePool = livePools.blue;
  const SEED = 100000;
  const [submitting, setSubmitting] = useState(false);
  const [userOwnedNfts, setUserOwnedNfts] = useState<NFT[]>([]);
  const mySide = (color === 'red' ? redPool : bluePool) + SEED;
  const oppositeSide = (color === 'red' ? bluePool : redPool) + SEED;
  const totalPool = redPool + bluePool + (SEED * 2);
  const totalStakes = redPool + bluePool;
  const oppositeSideStakes = color === 'red' ? bluePool : redPool;
  const stakerProfitPool = oppositeSideStakes * 0.7; 
  const accurateTotalPool = mySide + stakerProfitPool;
  const multiplier = (accurateTotalPool / mySide).toFixed(2);
  const [userId, setUserId] = useState<string | null>(null);
    const userNft = userOwnedNfts.find(
      (n: NFT) => n.collection?.name === fighter?.collection?.name
    );

// const userNft = userOwnedNfts.find(
//   (n: NFT) => n.collection?.toLowerCase() === fighter?.collection?.name?.toLowerCase()
// );

  const hasMatchingNFT = !!userNft;
  const nftPower = userNft?.priceShells || 0; 


  const canInteract = () => {
  if (!fighter) return false;
  
  const hasEnoughPoints = userPoints >= MIN_POINTS_REQUIRED;

  // We use hasMatchingNFT (the true/false version) here
  return hasMatchingNFT || hasEnoughPoints;
};
  const canParticipate =
  (userPoints >= MIN_POINTS_REQUIRED || hasMatchingNFT) &&
  isActive &&
  !isConcluded;
  const MAX_AMOUNT = stakeType === 'STARS' 
    ? MAX_STARS 
    : (hasMatchingNFT ? (userPoints + nftPower) : userPoints); 

    useEffect(() => {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user?.id) {
    setUserId(tg.initDataUnsafe.user.id.toString());
  }
}, []);

// 3. Update your NFT fetch to watch for that 'userId'
useEffect(() => {
  if (!userId) return;

  async function getMyNfts() {
    const res = await fetch(`/api/user/nfts?telegramId=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setUserOwnedNfts(data);
    }
  }
  getMyNfts();
}, [userId]);

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
  if (!canParticipate || barLocked || !isActive || !barRef.current) return;
e.stopPropagation();

  const touch = e.touches[0];

  const deltaX = Math.abs(touch.clientX - touchStartX.current);
  const deltaY = Math.abs(touch.clientY - touchStartY.current);
  if (deltaX > deltaY && deltaX > 10) {
    return; 
  }

  if (e.cancelable) e.preventDefault();

  const rect = barRef.current.getBoundingClientRect();
  let pct = ((rect.bottom - touch.clientY) / rect.height) * 100;
  pct = Math.max(0, Math.min(100, pct));
  
  setBarHeight(pct);
  setStakeAmount(Math.floor((pct / 100) * MAX_AMOUNT));

  // 3. YOUR POPUP LOGIC (Keep this!)
  if (Math.random() > 0.97) {
    const id = Math.random();
    const text = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    const xPos = Math.floor(Math.random() * 50) + 25;
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
          const next = Math.max(0, prev - 0.9);
          setStakeAmount(Math.floor((next / 100) * MAX_AMOUNT));
          return next;
        });
      }, 40);
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
  setSubmitting(true);

  try {
    const endpoint = stakeType === 'STARS' ? '/api/stakes/stars' : '/api/stakes/place';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fightId: fight.id,
        fighterId: fighter?.id,
        stakeAmount: stakeAmount.toString(),
        telegramId,
        stakeType,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      webApp?.HapticFeedback?.notificationOccurred("error");
      alert(`Error: ${data.error}`);
      return;
    }

    if (stakeType === 'STARS' && data.invoiceLink) {
      // ⭐ STARS FLOW
      webApp?.HapticFeedback?.impactOccurred("heavy"); // Big vibration before checkout
      window.location.href = data.invoiceLink;
    } else {
      // 🐚 SHELLS FLOW
      // 1. Visual/Physical Feedback
      webApp?.HapticFeedback?.notificationOccurred("success");
      
      // 2. Local UI Reset
      setBarHeight(0);
      setBarLocked(false);
      setStakeAmount(0);

      // 3. Trigger Parent Success (Refreshes points/shows confetti)
      if (onStakeSuccess) {
        onStakeSuccess(); 
      }
      
      alert("✅ Stake Placed!");
    }
  } catch (e) {
    webApp?.HapticFeedback?.notificationOccurred("error");
    alert("Connection failed.");
  } finally {
    setSubmitting(false);
  }
};

  return (
  <div className="flex flex-col items-center h-full relative z-30">
   <div className="relative mb-4">
    {/* Wrap the frame inside the clickable div */}
     <div 
      onClick={onImageClick} 
      className="relative cursor-pointer active:scale-95 transition-transform group"
     >
      {/* Main Portrait Frame */}
      <div  className={`w-20 h-20 rounded-full p-[3px] transition-all duration-500 ${color === 'gold' ? 'gold-shimmer-border' : activeTheme.border} ${activeTheme.glow}`}>
        <div id={`fighter-portrait-${side}`} className="w-full h-full rounded-full overflow-hidden bg-black">
          <img src={fighter?.imageUrl} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* TINY NFT IMAGE / TEAM BADGE (Conditional Rendering) */}
     <div id={`team-badge-icon${side}`} className="absolute -bottom-1 -right-1 flex items-center">
        {/* If it's NOT gold (not private) AND has a team image, show the badge */}
        {color !== 'gold' && fighter?.collection?.imageUrl ? (
          <div className="w-8 h-8 rounded-lg border-2 border-zinc-900 overflow-hidden shadow-xl rotate-12 bg-zinc-800">
            <img src={fighter.collection.imageUrl} className="w-full h-full object-cover" />
          </div>
        ) : (
          /* If it IS gold (private) or missing image, show the text badge only */
          <div className={`px-2 py-0.5 rounded text-[7px] font-black text-white uppercase ${activeTheme.bg} shadow-lg shadow-black/50`}>
            {color === 'gold' ? "PRIVATE" : "FREE AGENT"}
          </div>
        )}
      </div>
    </div>
  </div>
      
      {/* NEW: Risk Multiplier Badge */}
      <div id={`multiplier-badge-${side}`}className="mb-2 px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-black text-green-400 italic">
        {multiplier}x PAYOUT
      </div>
       {/* Currency Switcher */}
      <div id="currency-toggle" className="flex bg-black/60 p-1 rounded-full border border-zinc-800 mb-4">
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
  id="staking-bar" 
  className={`w-14 min-h-[180px] flex-1 rounded-2xl border bg-black/60 relative overflow-hidden transition-all duration-300 
    ${barLocked ? 'border-yellow-500/50 scale-95 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-zinc-800'}
    ${!canParticipate ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-ns-resize'}`} 
  onTouchStart={handleTouchStart}  
  onTouchMove={handleTouchMove}
  onClick={canParticipate ? toggleLock : undefined}
>
  {/* 1. DYNAMIC FILL (Red, Blue, Gold, or Zinc) */}
  <motion.div 
    className={`absolute bottom-0 w-full transition-colors duration-500 ${
      color === 'red' ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 
      color === 'blue' ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 
      color === 'gold' ? 'bg-gradient-to-t from-yellow-700 via-yellow-500 to-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.6)]' : 
      'bg-zinc-500 shadow-[0_0_15px_rgba(113,113,122,0.4)]'
    }`}
    animate={{ height: `${canParticipate ? barHeight : 0}%` }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
  />

  {/* 2. PADLOCK OVERLAY (Shows if Locked OR if Requirements not met) */}
  {(barLocked || !canParticipate) && (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
      <div className={`${barLocked ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-zinc-800'} p-2 rounded-full border border-white/10 animate-in zoom-in duration-200`}>
        <Lock 
          size={16} 
          className={barLocked ? 'text-black' : 'text-zinc-500'} 
          fill="currentColor" 
        />
      </div>
    </div>
  )}

  {/* 3. DRAG CUE (Only if active and not locked) */}
  {canParticipate && !barLocked && (
    <div className="absolute inset-0 flex items-center justify-center rotate-[-90deg] pointer-events-none opacity-30">
      <span className="text-[10px] font-black text-white tracking-[0.3em] animate-pulse">DRAG UP</span>
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
    CURRENCY:{stakeType}
  </p>
</div>


        <button id="confirm-stake"
  onClick={barLocked ? submitStake : toggleLock} 
  disabled={(!barLocked && stakeAmount <= 0) || !canParticipate || submitting} 
  className={`mt-4 w-full py-2.5 rounded-xl text-[10px] font-black uppercase transition-all 
    ${!canParticipate ? 'bg-red-900/20 text-red-500 border border-red-500/30 cursor-not-allowed' : 
      submitting ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' :
      barLocked ? 'bg-white text-black shadow-lg' : 'bg-zinc-800 text-white'}`}
>
  {!canParticipate ? 'NOT QUALIFIED' : 
   submitting ? (
     <span className="flex items-center justify-center gap-2">
       <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
       PROCESSING...
     </span>
   ) : 
   barLocked ? 'CONFIRM STAKE' : 'LOCK STAKE'}
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
            bottom: `${280 + index * 22}px`,
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