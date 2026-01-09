'use client';
import axios from "axios";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Loader from "@/loader";
import confetti from 'canvas-confetti';
import ScrollingText from '@/components/ScrollingText';
import { useWallet } from './context/walletContext';
import { ConnectButton } from './ConnectButton';
import UserSyncManager from '@/src/utils/userSync';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
type Click = {
  opacity: number;
  velocityY: number;
  id: number;
  x: number;
  y: number;
  tappingRate: number;
};

type User = {
  telegramId: string;
  points: number;
  tappingRate: number;
  first_name?: string;
  last_name?: string;
  hasClaimedWelcome?: boolean;
};

export default function Home() {
  // --- STATE ---
  const [firstName, setFirstName] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [energy, setEnergy] = useState(1500);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [isClicking, setIsClicking] = useState(false);
  const [speed] = useState(1); // (kept, harmless)
  const [isLoading, setLoading] = useState(true);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false); // ✅ FIX: default false
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError] = useState(false); // kept, unused but harmless
  const [notification] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const syncManager = useRef<UserSyncManager>();
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const { isConnected, walletAddress } = useWallet();

  const maxEnergy = 1500;
  const ENERGY_REDUCTION_RATE = 20;
  const STORAGE_KEY = (telegramId: string) => `user_${telegramId}`;
  const [isPressing, setIsPressing] = useState(false);

  const formatWalletAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const shake = Math.min(user?.tappingRate ? user.tappingRate * 0.8 : 2, 10);

  // --- LEVELS LOGIC ---
  const getLevel = (pts: number) => {
    if (pts < 1000000) return 'Camouflage';
    if (pts <= 3000000) return 'Speedy';
    if (pts <= 6000000) return 'Strong';
    if (pts <= 10000000) return 'Sensory';
    return 'African Giant Snail/god NFT';
  };

  // --- INIT ---
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (!tg?.initDataUnsafe?.user?.id) {
          throw new Error("Telegram not initialized");
        }

        tg.ready();
        tg.expand();

        const telegramId = tg.initDataUnsafe.user.id.toString();
        setFirstName(tg.initDataUnsafe.user.first_name || "Snail");

        const storageKey = STORAGE_KEY(telegramId);
        const cached = localStorage.getItem(storageKey);
        let cachedUser: User | null = null;

        if (cached) {
          try {
            cachedUser = JSON.parse(cached);
            setUser(cachedUser);
            setShowWelcomePopup(!cachedUser!.hasClaimedWelcome); 
          } catch {
            localStorage.removeItem(storageKey);
          }
        }

        if (!syncManager.current) {
          syncManager.current = new UserSyncManager(telegramId);
        }

        try {
          const res = await axios.get(`/api/user/${telegramId}`);
          const serverUser = res.data;

          const hasPending = syncManager.current?.hasPendingSync() || false;
          const pendingPoints =
            hasPending && cachedUser
              ? cachedUser.points - serverUser.points
              : 0;

          const finalUser = {
            ...serverUser,
            points: serverUser.points + Math.max(0, pendingPoints),
          };

          localStorage.setItem(storageKey, JSON.stringify(finalUser));
          setUser(finalUser);
          setShowWelcomePopup(!finalUser.hasClaimedWelcome); // ✅ FIX

        } catch (fetchError: any) {
          // --- NEW USER FALLBACK ---
          if (!cachedUser && fetchError?.response?.status === 404) {
            const newUser = {
              telegramId,
              username: tg.initDataUnsafe.user.username || "",
              first_name: tg.initDataUnsafe.user.first_name || "",
              last_name: tg.initDataUnsafe.user.last_name || "",
              points: 0,
              tappingRate: 1,
              hasClaimedWelcome: false,
            };

            const createRes = await axios.post('/api/user', newUser);
            const createdUser = createRes.data;

            localStorage.setItem(storageKey, JSON.stringify(createdUser)); // ✅ FIX
            setUser(createdUser);
            setShowWelcomePopup(true); // ✅ FIX
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        // ✅ FIX: clean legacy keys
        localStorage.removeItem('points');
        localStorage.removeItem('telegramId');
        localStorage.removeItem('tappingRate');
        localStorage.removeItem('hasClaimedWelcome');

        setLoading(false);
      }
    };

    initApp();
  }, []);

  // --- GLOBAL USER UPDATE LISTENER (CRITICAL FIX) ---
  useEffect(() => {
    const handler = (event: CustomEvent<User>) => {
      setUser(prev => {
        if (!prev) return event.detail;

        const merged = {
          ...prev,
          ...event.detail,
          points: event.detail.points,
        };

        localStorage.setItem(
          STORAGE_KEY(prev.telegramId),
          JSON.stringify(merged)
        );

        return merged;
      });
    };

    window.addEventListener('userDataUpdate', handler as EventListener);
    return () =>
      window.removeEventListener('userDataUpdate', handler as EventListener);
  }, []);

  // --- SYNC CALLBACK ---
  useEffect(() => {
    if (!syncManager.current || !user?.telegramId) return;

    syncManager.current.onSyncSuccess = (serverPoints: number) => {
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, points: serverPoints };
        localStorage.setItem(STORAGE_KEY(prev.telegramId), JSON.stringify(updated));
        return updated;
      });
    };

    return () => syncManager.current?.cleanup();
  }, [user?.telegramId]);

  // --- VIDEO PLAY SAFETY ---
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, [isLoading]);

  // --- CLICK HANDLER ---
  const handleClick = async (e: React.MouseEvent) => {
    if (!user?.telegramId || energy <= 0 || !syncManager.current) return;

    const tappingRate = Number(user.tappingRate) || 1;

    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, points: prev.points + tappingRate };
      localStorage.setItem(STORAGE_KEY(prev.telegramId), JSON.stringify(updated));
      return updated;
    });

    setEnergy(prev => Math.max(0, prev - ENERGY_REDUCTION_RATE));
    syncManager.current.addPoints(tappingRate);
    setIsClicking(true);

    const newClick = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
      tappingRate,
      velocityY: -2,
      opacity: 1,
    };

    setClicks(prev => [...prev, newClick]);

    if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
    inactivityTimeout.current = setTimeout(() => setIsClicking(false), 100);
  };

  const handleAnimationEnd = (id: number) => {
    setClicks(prev => prev.filter(click => click.id !== id));
  };

  // --- CLAIM ---
  const handleClaim = async () => {
    try {
      if (!user?.telegramId || user.hasClaimedWelcome) return;

      setLoading(true);

      const res = await fetch("/api/claim-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: user.telegramId,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      const updatedUser = {
        ...user,
        points: data.points,
        hasClaimedWelcome: true,
      };

      localStorage.setItem(STORAGE_KEY(user.telegramId), JSON.stringify(updatedUser));
      setUser(updatedUser);
      setShowWelcomePopup(false);

      confetti({ particleCount: 150, spread: 70 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ENERGY REFILL (SAFE) ---
  useEffect(() => {
    if (isClicking || energy >= maxEnergy) return;

    const interval = setInterval(() => {
      setEnergy(prev => Math.min(maxEnergy, prev + 10));
    }, 300);

    return () => clearInterval(interval);
  }, [isClicking, energy]);

  if (isLoading)
    return (
      <div className="h-screen bg-[#0f021a] flex items-center justify-center">
        <Loader />
      </div>
    );


  return (
    <div className="min-h-screen bg-[#0f021a] text-white flex flex-col items-center relative overflow-hidden pb-32">
      <ToastContainer theme="dark" />
      
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-20 w-full px-6 pt-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black tracking-tight text-purple-400">SMARTSNAIL</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Marketplace</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-lg p-1.5 rounded-2xl border border-white/10">
          <Link href="/Leaderboard">
            <img src="/images/info/output-onlinepngtools (4).png" className="w-6 h-6 p-1" alt="rank" />
          </Link>
          <ConnectButton />
          <Link href="/info">
            <img src="/images/info/output-onlinepngtools (1).png" className="w-6 h-6 p-1" alt="info" />
          </Link>
        </div>
      </div>
      
      {isConnected && walletAddress && (
        <div className="z-20 mt-2 px-3 py-1 bg-purple-900/30 border border-purple-500/20 rounded-md text-[10px] font-mono text-purple-300">
          Connected: {formatWalletAddress(walletAddress)}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center mt-10">
        <div className="flex items-center gap-3">
          <img src="/images/shell.png" className="w-12 h-12" alt="shell" />
          <span className="text-5xl font-black italic tracking-tighter shadow-purple-500/50">
            {user?.points.toLocaleString()}
          </span>
        </div>
        
        <Link href="/level" className="mt-4 flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-4 py-2 rounded-xl">
          <img src="/images/trophy.png" className="w-5 h-5" alt="trophy" />
          <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
             {getLevel(user?.points || 0)} Level
          </span>
        </Link>
      </div>

      <div className="relative flex-grow flex items-center justify-center w-full max-sm mt-8 px-6">
        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
          {[
            { href: "/staking", img: "/images/boxing-gloves.png" },
            { href: "/gym", img: "/images/gym.png" },
            { href: "/register", img: "/images/register.png" },
            { href: "/marketplace", img: "/images/shop.png" }
          ].map((item, idx) => (
            <Link key={idx} href={item.href}>
              <div className="w-12 h-12 bg-purple-900/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-xl">
                <img src={item.img} className="w-6 h-6" alt="nav" />
              </div>
            </Link>
          ))}
        </div>

        {/* CLICKER VIDEO WITH REPAIRED VIBRATION */}
        <motion.div
          onPointerDown={(e) => {
            if (showWelcomePopup || energy <= 0) return;
            setIsPressing(true);
            handleClick(e as any);
          }}
          onPointerUp={() => setIsPressing(false)}
          onPointerLeave={() => setIsPressing(false)}
          onPointerCancel={() => setIsPressing(false)}
          initial={false}
          animate={{
                scale: isPressing ? 1.06 : 1,
                x: isPressing ? [-shake, shake] : 0,
                y: isPressing ? [shake, -shake] : 0,
              }}
              transition={{
                duration: 0.08,
                repeat: isPressing ? 1 : 0,
                repeatType: "reverse",
                ease: "linear",
              }}

          className={`relative w-full aspect-square rounded-full border-[10px] 
            border-purple-900/20 overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.2)]
            cursor-pointer ${energy <= 0 ? 'grayscale opacity-40' : ''}`}
        >
          <video
            ref={videoRef}
            src="/images/snails.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover scale-110 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent" />
        </motion.div>

        <AnimatePresence>
          {clicks.map((click) => {
            const spawnY = click.y - 90;
            const floatY = spawnY - 120;

            return (
              <motion.div
                key={click.id}
                initial={{ opacity: 1, y: spawnY, x: click.x - 20, scale: 0.9 }}
                animate={{ opacity: 0, y: floatY, x: click.x + (Math.random() * 60 - 30), scale: 1.5 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                onAnimationComplete={() => handleAnimationEnd(click.id)}
                className="fixed pointer-events-none text-4xl font-black text-purple-400 z-[100] drop-shadow-[0_0_15px_rgba(168,85,247,0.9)]"
              >
                +{click.tappingRate}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 w-full z-40 p-6 pb-8 bg-gradient-to-t from-[#0f021a] via-[#0f021a]/90 to-transparent">
        <div className="max-w-md mx-auto">
          {/* HIGH VISIBILITY ROCKET FIRE ENERGY BAR */}
          <div className="flex justify-between items-end mb-2 px-1">
            <div className="flex items-center gap-2">
              <img src="/images/turbosnail-1.png" className="w-8 h-8" alt="bolt" />
              <span className="text-xl font-black">{energy} <span className="text-[10px] text-zinc-500">/ {maxEnergy}</span></span>
            </div>
          </div>
          
          <div className="w-full h-4 bg-black/50 rounded-full border border-white/10 p-0.5 overflow-hidden shadow-[0_0_15px_rgba(234,179,8,0.1)]">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-orange-600 via-yellow-400 to-white shadow-[0_0_20px_rgba(251,191,36,0.8)] relative"
              animate={{ width: `${(energy / maxEnergy) * 100}%` }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            >
              {/* Glowing shimmer effect for visibility */}
              <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite]" />
            </motion.div>
          </div>

          <nav className="mt-6 bg-[#1a0b2e]/90 backdrop-blur-2xl border border-purple-500/20 rounded-[2.5rem] flex items-center justify-around p-2 shadow-2xl">
            <Link href="/referralsystem" className="flex flex-col items-center py-2 px-6 rounded-3xl hover:bg-white/5 transition-all">
              <img src="/images/SNAILNEW.png" className="w-8 h-8" alt="frens" />
              <span className="text-[9px] font-black mt-1 text-zinc-400">FRENS</span>
            </Link>
            <div className="h-8 w-[1px] bg-white/10" />
            <Link href="/task" className="flex flex-col items-center py-2 px-6 rounded-3xl hover:bg-white/5 transition-all">
              <img src="/images/shell.png" className="w-7 h-7" alt="earn" />
              <span className="text-[9px] font-black mt-1 text-zinc-400">EARN</span>
            </Link>
            <div className="h-8 w-[1px] bg-white/10" />
            <Link href="/boost" className="flex flex-col items-center py-2 px-6 rounded-3xl hover:bg-white/5 transition-all">
              <img src="/images/startup.png" className="w-7 h-7" alt="boost" />
              <span className="text-[9px] font-black mt-1 text-zinc-400">BOOST</span>
            </Link>
          </nav>
        </div>
      </div>

      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
              className="bg-[#1a0b2e] border border-purple-500/30 p-8 rounded-[3rem] w-full max-w-sm text-center shadow-[0_0_80px_rgba(168,85,247,0.2)]"
            >
              <h2 className="text-2xl font-black mb-2 uppercase">Welcome, {firstName}!</h2>
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/5 mb-6 relative">
                {isVideoLoading && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">LOADING...</div>}
                <video 
                  autoPlay loop muted playsInline 
                  onLoadedData={() => setIsVideoLoading(false)}
                  className="w-full h-full object-cover"
                >
                  <source src="/videos/speedsnail-optimized.mp4" type="video/mp4" />
                </video>
              </div>
              <ScrollingText />
              <button 
                onClick={handleClaim}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-transform"
              >
                Claim Bonus
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div className="fixed bottom-32 bg-red-600/80 px-4 py-2 rounded-lg text-xs z-50 backdrop-blur-md">{error}</div>}
      
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}