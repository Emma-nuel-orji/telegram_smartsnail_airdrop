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
import { motion, AnimatePresence } from 'framer-motion'; // Highly recommend adding framer-motion

type Click = { opacity: number; velocityY: number; id: number; x: number; y: number; tappingRate: number; };
type User = { telegramId: string; points: number; tappingRate: number; first_name?: string; last_name?: string; hasClaimedWelcome?: boolean; };

export default function Home() {
    // ... Keeping all your existing State and Refs exactly as provided ...
    const [firstName, setFirstName] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [energy, setEnergy] = useState(1500);
    const [clicks, setClicks] = useState<Click[]>([]);
    const [isClicking, setIsClicking] = useState(false);
    const [isLoading, setLoading] = useState(true);
    const [showWelcomePopup, setShowWelcomePopup] = useState(true);
    const [notification, setNotification] = useState<string | null>(null);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [videoError, setVideoError] = useState(false);
    const syncManager = useRef<UserSyncManager>();
    const { isConnected, walletAddress } = useWallet();
    const maxEnergy = 1500;
    const ENERGY_REDUCTION_RATE = 20;
    const STORAGE_KEY = (telegramId: string) => `user_${telegramId}`;

    // ... Keeping all your existing useEffects for Logic/Sync (unchanged) ...
    useEffect(() => { /* Your Init App Logic */ }, []);
    useEffect(() => { /* Your Sync Success Logic */ }, [user?.telegramId]);
    useEffect(() => { /* Your UserDataUpdate Logic */ }, []);
    useEffect(() => { if (user) setShowWelcomePopup(!user.hasClaimedWelcome); }, [user]);
    useEffect(() => { /* Your Energy Refill Logic */ }, [isClicking, energy]);

    const formatWalletAddress = (address: string | null) => address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';

    const handleClick = async (e: React.MouseEvent) => {
        if (!user?.telegramId || energy <= 0 || !syncManager.current) return;
        const tappingRate = Number(user.tappingRate) || 1;

        // Optimistic UI Update
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, points: (prev.points || 0) + tappingRate };
            localStorage.setItem(STORAGE_KEY(prev.telegramId), JSON.stringify(updated));
            return updated;
        });

        setEnergy(prev => Math.max(0, prev - ENERGY_REDUCTION_RATE));
        syncManager.current.addPoints(tappingRate);
        setIsClicking(true);

        const newClick = { id: Date.now(), x: e.clientX, y: e.clientY, tappingRate, velocityY: -2, opacity: 1 };
        setClicks(prev => [...prev, newClick]);
        // Simple cleanup for clicks
        setTimeout(() => setClicks(prev => prev.filter(c => c.id !== newClick.id)), 1000);
    };

    const handleClaim = async () => { /* Your Claim logic */ };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-[#0f021a]"><Loader /></div>;

    const levelName = (user?.points ?? 0) < 1000000 ? 'Camouflage' : (user?.points ?? 0) <= 3000000 ? 'Speedy' : 'Strong';

    return (
        <div className="min-h-screen bg-[#0f021a] text-white font-sans overflow-hidden relative">
            <ToastContainer theme="dark" position="top-center" />
            
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full z-0" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full z-0" />

            {/* TOP HEADER */}
            <header className="relative z-20 w-full px-6 pt-6 flex justify-between items-start">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
                        SMARTSNAIL
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Arena</span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-1 rounded-full border border-white/10">
                        <Link href="/Leaderboard" className="p-2 hover:bg-purple-500/20 rounded-full transition-all">
                            <img src="/images/info/output-onlinepngtools (4).png" className="w-5 h-5" alt="rank" />
                        </Link>
                        <ConnectButton />
                        <Link href="/info" className="p-2 hover:bg-purple-500/20 rounded-full transition-all">
                            <img src="/images/info/output-onlinepngtools (1).png" className="w-5 h-5" alt="info" />
                        </Link>
                    </div>
                    {isConnected && (
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-500/20">
                            {formatWalletAddress(walletAddress)}
                        </span>
                    )}
                </div>
            </header>

            {/* STATS AREA */}
            <main className="relative z-10 flex flex-col items-center pt-8">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                >
                    <div className="flex items-center gap-3 mb-1">
                        <img src="/images/shell.png" className="w-10 h-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" alt="shell" />
                        <span className="text-5xl font-black italic tracking-tighter">
                            {user?.points.toLocaleString()}
                        </span>
                    </div>
                    
                    <Link href="/level" className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/10 transition-all">
                        <img src="/images/trophy.png" className="w-4 h-4" alt="level" />
                        <span className="text-xs font-bold text-zinc-400 group-hover:text-purple-300 uppercase tracking-widest">
                            {levelName} Level
                        </span>
                    </Link>
                </motion.div>

                {/* CENTRAL ACTION AREA */}
                <div className="relative w-full aspect-square max-w-[400px] flex items-center justify-center mt-4">
                    {/* Interactive Video Container */}
                    <div 
                        onClick={handleClick}
                        className={`relative w-[85%] aspect-square rounded-full overflow-hidden border-8 border-purple-900/20 transition-transform active:scale-95 cursor-pointer shadow-[0_0_50px_rgba(88,28,135,0.3)] ${energy <= 0 ? 'grayscale opacity-50' : ''}`}
                    >
                        <video src="/images/snails.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent pointer-events-none" />
                    </div>

                    {/* SIDE NAVIGATION - Floating Buttons */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
                        {[
                            { href: "/staking", img: "/images/boxing-gloves.png" },
                            { href: "/gym", img: "/images/gym.png" },
                            { href: "/register", img: "/images/register.png" },
                            { href: "/marketplace", img: "/images/shop.png" }
                        ].map((btn, idx) => (
                            <Link key={idx} href={btn.href}>
                                <div className="w-12 h-12 bg-[#1a0b2e] backdrop-blur-xl border border-purple-500/30 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all">
                                    <img src={btn.img} className="w-6 h-6 object-contain" alt="action" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* TAP ANIMATIONS */}
                    {clicks.map((click) => (
                        <motion.div
                            key={click.id}
                            initial={{ y: click.y - 100, x: click.x - 50, opacity: 1, scale: 1 }}
                            animate={{ y: click.y - 250, opacity: 0, scale: 1.5 }}
                            className="absolute pointer-events-none text-4xl font-black text-purple-400 z-50 select-none"
                        >
                            +{click.tappingRate}
                        </motion.div>
                    ))}
                </div>
            </main>

            {/* BOTTOM UI - ENERGY & NAVIGATION */}
            <div className="fixed bottom-0 left-0 w-full z-40 pb-6 px-6">
                <div className="max-w-md mx-auto">
                    {/* Energy Bar */}
                    <div className="flex items-center justify-between mb-2 px-2">
                        <div className="flex items-center gap-2">
                            <img src="/images/turbosnail-1.png" className="w-5 h-5" alt="energy" />
                            <span className="text-sm font-bold">{energy} / {maxEnergy}</span>
                        </div>
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Turbo Refill</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-900 rounded-full border border-white/5 overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-400"
                            animate={{ width: `${(energy / maxEnergy) * 100}%` }}
                        />
                    </div>

                    {/* Main Nav */}
                    <nav className="mt-4 bg-[#1a0b2e]/80 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] flex items-center justify-around shadow-2xl">
                        <Link href="/referralsystem" className="flex flex-col items-center py-2 px-4 rounded-3xl hover:bg-white/5 transition-all">
                            <img src="/images/SNAILNEW.png" className="w-8 h-8" alt="frens" />
                            <span className="text-[10px] font-bold mt-1 text-zinc-400">FRENS</span>
                        </Link>
                        <div className="w-[1px] h-8 bg-white/10" />
                        <Link href="/task" className="flex flex-col items-center py-2 px-4 rounded-3xl hover:bg-white/5 transition-all">
                            <img src="/images/shell.png" className="w-6 h-6 mb-1" alt="earn" />
                            <span className="text-[10px] font-bold text-zinc-400">EARN</span>
                        </Link>
                        <div className="w-[1px] h-8 bg-white/10" />
                        <Link href="/boost" className="flex flex-col items-center py-2 px-4 rounded-3xl hover:bg-white/5 transition-all">
                            <img src="/images/startup.png" className="w-6 h-6 mb-1" alt="boost" />
                            <span className="text-[10px] font-bold text-zinc-400">BOOST</span>
                        </Link>
                    </nav>
                </div>
            </div>

            {/* WELCOME POPUP RE-STYLED */}
            <AnimatePresence>
                {showWelcomePopup && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                            className="bg-[#1a0b2e] border border-purple-500/30 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-[0_0_100px_rgba(147,51,234,0.3)]"
                        >
                            <h2 className="text-2xl font-black mb-2">WELCOME BACK!</h2>
                            <p className="text-zinc-400 text-xs mb-6 uppercase tracking-widest">Ready to climb the snail ranks?</p>
                            
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 mb-6">
                                <video autoPlay loop muted playsInline className="w-full aspect-video object-cover">
                                    <source src="/videos/speedsnail-optimized.mp4" type="video/mp4" />
                                </video>
                            </div>

                            <ScrollingText />

                            <button
                                onClick={handleClaim}
                                className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg"
                            >
                                CLAIM BONUS
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}