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
type Click = { id: number; x: number; y: number; tappingRate: number; rotate: number; };
type User = { telegramId: string; points: number; tappingRate: number; first_name?: string; last_name?: string; hasClaimedWelcome?: boolean; };

export default function Home() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [energy, setEnergy] = useState(1500);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [isClicking, setIsClicking] = useState(false);
  const [combo, setCombo] = useState(0); // Tracks tapping intensity
  const [isLoading, setLoading] = useState(true);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const syncManager = useRef<UserSyncManager>();
  const comboTimeout = useRef<NodeJS.Timeout | null>(null);
  const { isConnected, walletAddress } = useWallet();

  const maxEnergy = 1500;
  const ENERGY_REDUCTION_PER_TAP = 1;
  const STORAGE_KEY = (telegramId: string) => `user_${telegramId}`;

  // --- LEVELS LOGIC ---
  const getLevel = (pts: number) => {
    if (pts < 1000000) return 'Camouflage';
    if (pts <= 3000000) return 'Speedy';
    if (pts <= 6000000) return 'Strong';
    if (pts <= 10000000) return 'Sensory';
    return 'African Giant Snail/god NFT';
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (!tg?.initDataUnsafe?.user?.id) throw new Error("Telegram not initialized");
        tg.ready();
        tg.expand();
        const telegramId = tg.initDataUnsafe.user.id.toString();
        setFirstName(tg.initDataUnsafe.user.first_name || "Snail");

        if (!syncManager.current) syncManager.current = new UserSyncManager(telegramId);

        const storageKey = STORAGE_KEY(telegramId);
        const cached = localStorage.getItem(storageKey);
        if (cached) setUser(JSON.parse(cached));

        const res = await axios.get(`/api/user/${telegramId}`);
        const serverUser = res.data;
        const hasPending = syncManager.current?.hasPendingSync() || false;
        const pendingPoints = hasPending ? (cached ? JSON.parse(cached).points : 0) - serverUser.points : 0;
        
        const finalUser = { ...serverUser, points: serverUser.points + Math.max(0, pendingPoints) };
        localStorage.setItem(storageKey, JSON.stringify(finalUser));
        setUser(finalUser);
        setShowWelcomePopup(!finalUser.hasClaimedWelcome);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // --- SYNC ---
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

  // --- TAP HANDLER ---
  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!user || energy <= 0) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const rate = Number(user.tappingRate) || 1;

    // Logic updates
    setUser(prev => prev ? { ...prev, points: prev.points + rate } : null);
    setEnergy(prev => Math.max(0, prev - ENERGY_REDUCTION_PER_TAP));
    syncManager.current?.addPoints(rate);

    // Intensity/Combo logic
    setIsClicking(true);
    setCombo(prev => Math.min(prev + 1, 20)); // Cap combo for animation intensity

    const newClick: Click = {
      id: Date.now(),
      x: clientX,
      y: clientY,
      tappingRate: rate,
      rotate: Math.random() * 40 - 20,
    };
    setClicks(prev => [...prev, newClick]);

    // Cleanup
    if (comboTimeout.current) clearTimeout(comboTimeout.current);
    comboTimeout.current = setTimeout(() => {
      setIsClicking(false);
      setCombo(0);
    }, 400); // Reset combo after 400ms of no tapping
  };

  // --- ENERGY REFILL ---
  useEffect(() => {
    const refillInterval = setInterval(() => {
      setEnergy(prev => {
        if (prev < maxEnergy && !isClicking) return Math.min(maxEnergy, prev + 5);
        return prev;
      });
    }, 600);
    return () => clearInterval(refillInterval);
  }, [isClicking]);

  // --- CLAIM ---
  const handleClaim = async () => {
    if (!user || user.hasClaimedWelcome) return;
    try {
      setLoading(true);
      const res = await axios.post("/api/claim-welcome", { telegramId: user.telegramId, timestamp: new Date().toISOString() });
      if (res.data.success) {
        const updated = { ...user, points: res.data.points, hasClaimedWelcome: true };
        setUser(updated);
        localStorage.setItem(STORAGE_KEY(user.telegramId), JSON.stringify(updated));
        setShowWelcomePopup(false);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err: any) { setError("Failed to claim"); } finally { setLoading(false); }
  };

  if (isLoading) return <div className="h-screen bg-[#0f021a] flex items-center justify-center"><Loader /></div>;

  return (
    <div className="min-h-screen bg-[#0f021a] text-white flex flex-col items-center relative overflow-hidden select-none">
      <ToastContainer theme="dark" />
      
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[70%] h-[40%] bg-purple-900/10 blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[70%] h-[40%] bg-indigo-900/10 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-20 w-full px-6 pt-6 flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-2xl font-black text-purple-400 italic tracking-tighter">SMARTSNAIL</span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Marketplace</span>
        </div>
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl">
          <Link href="/Leaderboard"><img src="/images/info/output-onlinepngtools (4).png" className="w-5 h-5 mx-1" alt="rank" /></Link>
          <ConnectButton />
          <Link href="/info"><img src="/images/info/output-onlinepngtools (1).png" className="w-5 h-5 mx-1" alt="info" /></Link>
        </div>
      </div>

      {/* Score & Level */}
      <div className="z-10 mt-8 flex flex-col items-center">
        <div className="flex items-center gap-3">
          <img src="/images/shell.png" className="w-10 h-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" alt="shell" />
          <span className="text-5xl font-black italic tracking-tighter">{user?.points.toLocaleString()}</span>
        </div>
        <Link href="/level" className="mt-3 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full hover:bg-purple-500/20 transition-all">
          <img src="/images/trophy.png" className="w-4 h-4" alt="trophy" />
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
            {getLevel(user?.points || 0)}
          </span>
        </Link>
      </div>

      {/* Center Clicker Section */}
      <div className="relative flex-grow flex items-center justify-center w-full max-w-md mt-4">
        {/* Floating Numbers Layer */}
        <AnimatePresence>
          {clicks.map((click) => (
            <motion.div
              key={click.id}
              initial={{ opacity: 1, y: click.y - 40, x: click.x - 20, scale: 0.8 }}
              animate={{ opacity: 0, y: click.y - 200, x: click.x + (Math.random() * 80 - 40), scale: 1.8 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="fixed pointer-events-none text-4xl font-black text-purple-400 z-[100] drop-shadow-[0_0_15px_purple]"
              style={{ rotate: `${click.rotate}deg` }}
            >
              +{click.tappingRate}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Side Nav Buttons */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
          {[
            { href: "/staking", img: "/images/boxing-gloves.png" },
            { href: "/gym", img: "/images/gym.png" },
            { href: "/register", img: "/images/register.png" },
            { href: "/marketplace", img: "/images/shop.png" }
          ].map((btn, i) => (
            <Link key={i} href={btn.href}>
              <div className="w-12 h-12 bg-purple-900/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <img src={btn.img} className="w-6 h-6 object-contain" alt="icon" />
              </div>
            </Link>
          ))}
        </div>

        {/* FRENZY VIDEO CLICKER */}
        <motion.div 
          onPointerDown={handleClick}
          animate={{
            scale: isClicking ? [1, 1.05, 1] : 1,
            x: combo > 5 ? [0, -2, 2, -2, 0] : 0, // Shaking effect
            y: combo > 5 ? [0, 2, -2, 2, 0] : 0,
          }}
          transition={{
            duration: 0.1,
            repeat: isClicking ? Infinity : 0,
          }}
          className={`relative w-[80%] aspect-square rounded-full border-[10px] border-purple-900/20 shadow-[0_0_80px_rgba(147,51,234,0.3)] overflow-hidden cursor-pointer ${energy <= 0 ? 'grayscale opacity-30' : ''}`}
        >
          <motion.video 
            src="/images/snails.mp4" 
            autoPlay muted loop playsInline 
            animate={{ scale: 1.1 + (combo * 0.01) }} // Enlarges as you tap faster
            className="w-full h-full object-cover pointer-events-none" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent pointer-events-none" />
          
          {/* Combo Flash Effect */}
          {combo > 10 && (
             <motion.div 
               animate={{ opacity: [0, 0.4, 0] }}
               transition={{ repeat: Infinity, duration: 0.2 }}
               className="absolute inset-0 bg-purple-500 mix-blend-overlay pointer-events-none" 
             />
          )}
        </motion.div>
      </div>

      {/* Bottom HUD */}
      <div className="fixed bottom-0 left-0 w-full z-40 p-6 flex flex-col items-center">
        <div className="w-full max-w-sm mb-4">
          <div className="flex justify-between items-end px-2 mb-2">
            <div className="flex items-center gap-2">
              <img src="/images/turbosnail-1.png" className="w-8 h-8" alt="energy" />
              <div>
                <span className="text-xl font-black block leading-none">{energy}</span>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">/ {maxEnergy} Energy</span>
              </div>
            </div>
            {combo > 0 && (
              <motion.span animate={{ scale: [1, 1.2, 1] }} className="text-[10px] text-purple-400 font-black uppercase italic">
                {combo}x Frenzy!
              </motion.span>
            )}
          </div>
          <div className="h-2.5 w-full bg-zinc-900 rounded-full border border-white/5 overflow-hidden">
            <motion.div 
              animate={{ width: `${(energy / maxEnergy) * 100}%` }}
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="w-full max-w-sm bg-[#1a0b2e]/90 backdrop-blur-2xl border border-purple-500/20 p-2 rounded-[2.5rem] flex items-center justify-around shadow-2xl">
          <Link href="/referralsystem" className="flex flex-col items-center py-2 px-5"><img src="/images/SNAILNEW.png" className="w-7 h-7" alt="frens" /><span className="text-[9px] font-bold text-zinc-400 mt-1 uppercase">Frens</span></Link>
          <div className="w-[1px] h-8 bg-white/10" />
          <Link href="/task" className="flex flex-col items-center py-2 px-5"><img src="/images/shell.png" className="w-6 h-6" alt="earn" /><span className="text-[9px] font-bold text-zinc-400 mt-1 uppercase">Earn</span></Link>
          <div className="w-[1px] h-8 bg-white/10" />
          <Link href="/boost" className="flex flex-col items-center py-2 px-5"><img src="/images/startup.png" className="w-6 h-6" alt="boost" /><span className="text-[9px] font-bold text-zinc-400 mt-1 uppercase">Boost</span></Link>
        </nav>
      </div>

      {/* Welcome Popup */}
      <AnimatePresence>
        {showWelcomePopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-[#1a0b2e] border border-purple-500/30 p-8 rounded-[3rem] w-full max-w-sm text-center shadow-2xl shadow-purple-500/10">
              <h2 className="text-2xl font-black mb-1 uppercase tracking-tighter text-purple-400">Welcome, {firstName}!</h2>
              <p className="text-zinc-500 text-[10px] mb-6 font-bold uppercase tracking-widest">The race is on</p>
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 mb-6">
                <video autoPlay loop muted playsInline className="w-full aspect-video object-cover"><source src="/videos/speedsnail-optimized.mp4" type="video/mp4" /></video>
              </div>
              <ScrollingText />
              <button onClick={handleClaim} className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Claim Bonus</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <div className="fixed top-20 bg-red-600 p-2 rounded text-xs z-[300]">{error}</div>}
    </div>
  );
}