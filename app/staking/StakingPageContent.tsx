import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from "react-dom";
import { Lock, X, Zap, Star, Wallet, ChevronLeft, Trophy, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import "./staking.css";
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
  userPoints: number;
  isActive: boolean;
  isConcluded?: boolean;
  telegramId: string | null;
  position: "left" | "right";
  color: "red" | "blue" | "gold";
  onImageClick?: () => void;
  
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
        {/* NEW: Scouting Office Button */}
  <Link href="/recruitment">
    <button className="relative group px-4 py-2 bg-blue-600/10 border border-blue-500/30 rounded-xl flex items-center gap-2 transition-all hover:bg-blue-600/20 active:scale-95">
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

 function FighterModal({ fighter, onClose }: { fighter: any, onClose: () => void }) {

const [loading, setLoading] = useState(false);
const [showSuccess, setShowSuccess] = useState(false);
const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
// const currentUserId = webApp?.initDataUnsafe?.user?.id?.toString();
const userTelegramId = webApp?.initDataUnsafe?.user?.id?.toString();
const handleSign = async (fighterId: string) => {
  try {
    setLoading(true);
    const response = await fetch(`/api/recruit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fighterId, 
        telegramId: userTelegramId 
      })
    });

    if (response.ok) {
      // 1. Trigger Confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EAB308', '#22C55E', '#FFFFFF']
      });

      // 2. Show Success Overlay
      setShowSuccess(true);
      
      // 3. Close after delay
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 3000);
    }
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};



  const isAvailableForSign = !fighter.isPrivate && !fighter.ownerId;
  const displayPrice = fighter.salePriceTon 
    ? `${fighter.salePriceTon} TON` 
    : "Not for Sale";
  const total = fighter.wins + fighter.losses + fighter.draws;
  const winRate = total > 0 ? Math.round((fighter.wins / total) * 100) : 0;
  const StreakMeter = ({ 
  streak = 0, 
  isOwner = false,
  price = "" 
}: { 
  streak?: number; 
  isOwner?: boolean;
  price?: string;
}) => {
  const progress = streak % 3;
  const isHot = progress === 2; // High value state

  return (
    <div className={`w-full p-5 rounded-2xl border-2 mb-6 relative group transition-all duration-500 ${
      isHot 
        ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)] animate-pulse' 
        : 'bg-zinc-900/80 border-yellow-500/20'
    }`}>
      
      {/* 1. THE STATUS HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isHot ? 'text-orange-500' : 'text-yellow-500'}`}>
            {isHot ? "⚠️ HIGH VALUE TARGET" : "Reward Progress"}
          </h4>
          <p className="text-white font-bold italic text-sm mt-0.5">
            {isHot ? "ONE WIN TO MINT NFT" : `${3 - progress} wins until NFT drop`}
          </p>
        </div>
        
        {isHot && (
          <div className="flex gap-1">
             <span className="animate-bounce">🔥</span>
             <span className="animate-bounce delay-75">🔥</span>
          </div>
        )}
      </div>

      {/* 2. THE SHELL SLOTS */}
      <div className="flex gap-4 justify-between relative z-10">
        {[1, 2, 3].map((step) => {
          const isActive = progress >= step;
          const isTarget = step === 3 && isHot;

          return (
            <div 
              key={step}
              className={`relative flex-1 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                isActive 
                  ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                  : isTarget
                    ? 'bg-orange-600/20 border-orange-500 border-dashed animate-pulse'
                    : 'bg-black/40 border-zinc-800'
              }`}
            >
              <span className={`text-3xl transition-transform duration-500 ${
                isActive ? 'scale-110 opacity-100' : isTarget ? 'scale-90 opacity-40 animate-spin-slow' : 'scale-75 opacity-20 grayscale'
              }`}>
                🐚
              </span>

              {/* Target Crosshair for the 3rd slot when Hot */}
              {isTarget && (
                <div className="absolute inset-0 border border-orange-500/30 rounded-lg scale-110 animate-ping" />
              )}
            </div>
          );
        })}
      </div>

      {/* 3. THE "SIGNING" ADVICE */}
      {!isOwner && (
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-[9px] text-zinc-400 max-w-[70%] leading-tight">
            Sign now for <span className="text-white font-bold">{price}</span>. The 3rd win bonus will go to <span className="text-green-500 italic">YOU</span>.
          </p>
          {isHot && <span className="text-[8px] font-black text-orange-500 underline uppercase italic">Action Required</span>}
        </div>
      )}
    </div>
  );
};


 return (
  <>
    {/* 1. SUCCESS OVERLAY */}
    {showSuccess && (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
        <div className="text-center p-8 bg-zinc-900 border-2 border-yellow-500 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.3)]">
          <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Zap size={40} fill="black" />
          </div>
          <h3 className="text-3xl font-black italic uppercase text-white">Signed!</h3>
          <p className="text-zinc-400 font-bold mt-2">Fighter added to your roster.</p>
        </div>
      </div>
    )}

    {/* 2. MAIN MODAL */}
    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in slide-in-from-bottom-6 overflow-y-auto">
      {/* Close Button */}
      <button onClick={onClose} className="self-end p-3 bg-zinc-900 rounded-full mb-4 active:scale-90 transition-transform">
        <X size={24} className="text-zinc-400" />
      </button>

      <div className="flex flex-col items-center max-w-sm mx-auto w-full">
        {/* Profile Image */}
        <div className={`w-40 h-40 rounded-full p-1.5 mb-6 shadow-2xl ${fighter.isPrivate ? 'gold-shimmer-border' : 'border-4 border-zinc-800'}`}>
          <img src={fighter.imageUrl} className="w-full h-full rounded-full object-cover bg-zinc-900" />
        </div>
        
        {/* Identity & Price */}
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white text-center">{fighter.name}</h2>
        <div className="mt-1 mb-8 px-4 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
          <p className="text-yellow-500 font-mono font-black text-sm uppercase tracking-widest">{displayPrice}</p>
        </div>

        {/* PHYSICAL SPECS GRID (2 columns) */}
        <div className="grid grid-cols-2 gap-4 w-full mb-4">
          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter mb-1">Gender</p>
            <p className="text-lg font-bold text-white uppercase italic leading-none">{fighter.gender || '—'}</p>
          </div>
          
          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter mb-1">Height</p>
            <p className="text-lg font-bold text-white italic leading-none">{fighter.height ? `${fighter.height} cm` : '—'}</p>
          </div>

          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter mb-1">Weight Class</p>
            <p className="text-lg font-bold text-white uppercase italic leading-none">{fighter.weightClass || '—'}</p>
          </div>

          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter mb-1">Social Media</p>
            {fighter.socialMedia ? (
              <a href={fighter.socialMedia} target="_blank" className="text-lg font-bold text-blue-400 hover:text-blue-300 underline uppercase italic leading-none">Open IG</a>
            ) : (
              <p className="text-lg font-bold text-zinc-700 uppercase italic leading-none">Private</p>
            )}
          </div>
        </div>

        {/* NEW: STREAK METER */}
        <StreakMeter 
          streak={fighter.currentStreak} 
          isOwner={fighter.ownerId === userTelegramId}
          price={displayPrice}
        />

        {/* CAREER RECORD (Full Width - Moved outside grid) */}
        <div className="w-full bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 mb-8">
          <div className="flex justify-between items-end mb-2">
            <p className="text-[10px] text-zinc-500 font-black uppercase">Career Record</p>
            <p className="text-xs font-bold text-green-500">{winRate}% Win Rate</p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-2xl font-black text-white leading-none">{fighter.wins || 0}<span className="text-[10px] text-zinc-500 ml-1">W</span></p>
            </div>
            <div className="flex-1 border-x border-zinc-800 px-4">
              <p className="text-2xl font-black text-white leading-none">{fighter.losses || 0}<span className="text-[10px] text-zinc-500 ml-1">L</span></p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-2xl font-black text-white leading-none">{fighter.draws || 0}<span className="text-[10px] text-zinc-500 ml-1">D</span></p>
            </div>
          </div>
        </div>

        {/* DYNAMIC ACTION BUTTON */}
        {isAvailableForSign ? (
          <button 
            disabled={loading}
            className="w-full py-5 bg-green-600 hover:bg-green-500 active:scale-95 transition-all rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(22,163,74,0.3)] disabled:opacity-50"
            onClick={() => handleSign(fighter.id)}
          >
            <Zap size={22} fill="currentColor" />
            {loading ? "Signing..." : `Sign for ${displayPrice}`}
          </button>
        ) : (
          <div className="w-full py-5 bg-zinc-800/50 rounded-2xl border border-zinc-800/50 text-center">
            <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Contract Status</p>
            <p className="text-white font-black uppercase italic tracking-widest">
              Signed by {fighter.owner?.username || "Management"}
            </p>
          </div>
        )}
      </div>
    </div>
  </>
); }

function FightCard({ fight, userPoints, telegramId }: { fight: Fight, userPoints: number, telegramId: string | null }) {
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
 const [rewardData, setRewardData] = useState<any | null>(null);


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
  return "red"; 
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
          opponent={fight?.fighter2 || undefined}
          fight={fight}
          userPoints={userPoints}
          isActive={isActive}
          isConcluded={isConcluded}
          telegramId={telegramId}
          position="left"
          color={getFighterColor(fight.fighter1)}
           onImageClick={() => setSelectedFighter(fight.fighter1)} 
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
            color={getFighterColor(fight.fighter2)}
             onImageClick={() => setSelectedFighter(fight.fighter1)} 
          />
          <p className="mt-2 text-white font-bold italic uppercase text-xs tracking-tight leading-none">
            {fight.fighter2.name}
          </p>
          {selectedFighter && (
         <FighterModal 
           fighter={selectedFighter} 
           onClose={() => setSelectedFighter(null)} 
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

function FighterStaking({ fighter, fight, userPoints, isActive, onImageClick, isConcluded = false, telegramId, color, position  }: FighterStakingProps) {
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
  const syncPools = async () => {
    const res = await fetch(`/api/stakes/total/fight/${fight.id}`);
    const data = await res.json();
    if (res.ok) {
      setLivePools({
        red: Number(data.totalRedStakes),
        blue: Number(data.totalBlueStakes)
      });
    }
  };
  syncPools();
  // Optional: Poll every 30 seconds for live updates
  const interval = setInterval(syncPools, 30000);
  return () => clearInterval(interval);
}, [fight.id]);

// 2. These variables now match your existing logic perfectly
  const redPool = livePools.red;
  const bluePool = livePools.blue;
  const SEED = 100000;
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
  (n: NFT) => n.collection === fighter?.collection?.name
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
  if (barLocked || !isActive || !barRef.current) return;
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
    
    const body = { 
      fightId: fight.id, 
      fighterId: fighter?.id, 
      // Convert to string so the backend BigInt() can read it safely
      stakeAmount: stakeAmount.toString(), 
      telegramId, 
      stakeType,
      multiplier: multiplier, // Send the multiplier used at the time of locking
      nftId: userNft?.id || null, 
      isNftBypass: hasMatchingNFT
    };

    const res = await fetch(endpoint, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    });

    if (res.ok) {
      const data = await res.json();
      if (data.invoiceLink) {
        window.location.href = data.invoiceLink;
      } else {
        // Success: Reset UI
        setBarHeight(0); 
        setBarLocked(false);
        alert("Stake placed successfully!");
      }
    } else {
      const errorData = await res.json();
      alert(`Error: ${errorData.error}`);
    }
  } catch (e) { 
    console.error("Stake submission failed:", e); 
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
      <div className={`w-20 h-20 rounded-full p-[3px] transition-all duration-500 ${color === 'gold' ? 'gold-shimmer-border' : activeTheme.border} ${activeTheme.glow}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-black">
          <img src={fighter?.imageUrl} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* TINY NFT IMAGE / TEAM BADGE (Conditional Rendering) */}
      <div className="absolute -bottom-1 -right-1 flex items-center">
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
    CURRENCY:{stakeType}
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