'use client';
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Wallet, Zap, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../context/walletContext';
import { User } from 'lucide-react';
import { useOnboardingTour } from '../hooks/useOnboardingTour';
import OnboardingTour, { TourStep } from '../../components/OnboardingTour';
// import { motion, AnimatePresence } from 'framer-motion';
interface Fighter {
  id: string;
  name: string;
  imageUrl: string;
  weightClass: string;
  salePriceTon: number;
  // Add any other fields you use
}

export default function RecruitmentOffice() {
  const [fighters, setFighters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewEarnings, setHasNewEarnings] = useState(false);
  const activeDeals = fighters.filter((f: any) => f.isForSale).length;
  const totalVolume = fighters
  .filter((f: any) => f.isForSale)
  .reduce((sum: number, f: any) => sum + (f.salePriceTon || 0), 0);

  useEffect(() => {
    // Check if there are recent 'EARN' transactions
    const userId = window.Telegram?.WebApp.initDataUnsafe?.user?.id;
    if (userId) {
      fetch(`/api/user/notifications?userId=${userId}`)
        .then(res => res.json())
        .then(data => setHasNewEarnings(data.unreadEarnings));
    }
  }, []);

  useEffect(() => {
    // Fetch only "Unsigned" or "Available" fighters
    fetch('/api/fighter/available', { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        setFighters(data);
        setLoading(false);
      });
  }, []);

  const [telegramId, setTelegramId] = useState<string | null>(null);

useEffect(() => {
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
  if (id) setTelegramId(id);
}, []);

const { showTour, completeTour } = useOnboardingTour('recruitment', telegramId);

const RECRUITMENT_TOUR: TourStep[] = [
  {
    targetId: "market-stats",
    emoji: "📊",
    label: "Market Analysis",
    text: "This is the PolyCombat NFT marketplace. These are the first ever real-life unique NFTs — you can sign and own them and they generate rewards for you."
  },

   {
    targetId: "market-stats", // Highlights the Active Deals/Value box
    emoji: "🥊",
    label: "Real-life NFTs",
    text: "These are the first ever real-life NFTs — actual PolyCombat fighters you can sign and own."
  },
  {
    targetId: "fighter-card-0",
    emoji: "📋",
    label: "Sign Talent",
    text: "Recruit a fighter to your team. Once you own them, Earn 50% of every stake instantly (win or lose) + 2️⃣ 10% of the entire losing pool on every victory!"
  },
  {
    targetId: "management-bonus-bar",
    emoji: "🎁",
    label: "Owner Rewards",
    text: "Managers not only get a 10% bonus from the winner's pot they also get a FREE NFT for every 3-win streak."
  },
  {
    targetId: "my-roster-btn",
    emoji: "👤",
    label: "Your Empire",
    text: "Access your roster here to see your active fighters and claim your accumulated management earnings."
  },
];

  return (
    <div id="market-stats" className="min-h-screen bg-[#050505] text-white flex flex-col">
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(150%) skewX(-20deg); }
        }
        .nft-shimmer::after {
          content: "";
          position: absolute;
          top: 0; left: 0; width: 50%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
          animation: shimmer 3s infinite;
        }
      `}</style>

      {/* Header Area */}
      <header className="p-6 border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex justify-between items-center mb-4">
          <Link href="/staking" className="p-2 bg-zinc-900 rounded-full"><ChevronLeft /></Link>
          <div className="text-center">
             <h1 className="text-xl font-black italic uppercase tracking-tighter">Scouting Deck</h1>
             <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em]">PolyCombat NFTs</p>
          </div>
          
          <Link href="/recruitment/myteam" id="my-roster-btn" className="relative p-2 bg-blue-600 rounded-full text-white shadow-lg shadow-blue-900/40">
            <User size={20} />
            {hasNewEarnings && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-black"></span>
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Market Stats (Tour Step 1) */}
      <div  className="p-6 grid grid-cols-2 gap-3">
         <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <p className="text-[8px] text-zinc-500 font-black uppercase">Active Deals</p>
            <p className="text-lg font-mono font-bold">{activeDeals}</p>
          </div>
          <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <p className="text-[8px] text-zinc-500 font-black uppercase">Market Value</p>
            <p className="text-lg font-mono font-bold text-blue-400">{totalVolume.toFixed(1)} TON</p>
          </div>
      </div>

      {/* NFT Grid (First card will have id="fighter-card-0") */}
      <div className="flex-1 p-6 grid grid-cols-2 gap-6 overflow-y-auto pb-24">
        {fighters.map((fighter: any, index: number) => (
          <FighterNFTCard key={fighter.id} fighter={fighter} index={index} />
        ))}
      </div>

      {/* Footer Instructions (Tour Step 3) */}
      <div className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black to-transparent pointer-events-none">
        <div id="management-bonus-bar" className="bg-blue-600 p-4 rounded-2xl flex items-center justify-between pointer-events-auto shadow-2xl shadow-blue-900/50">
          <div className="flex items-center gap-3">
            <Shield className="text-white" size={20} />
            <div>
              <p className="text-[10px] font-black uppercase leading-none">Management Bonus</p>
              <p className="text-[9px] text-blue-100 opacity-80">Earn up to 50% from every stake</p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-white/20" />
          <Zap size={20} className="text-yellow-400 fill-yellow-400" />
        </div>
      </div>

      <AnimatePresence>
        {showTour && !loading && <OnboardingTour steps={RECRUITMENT_TOUR} onDone={completeTour} />}
      </AnimatePresence>

      {/* THE POPUP LAYER (Required for tour/interaction feedback) */}
      <div id="popup-layer" className="fixed inset-0 pointer-events-none z-[9999]" />
    </div>
  );
}

function FighterNFTCard({ fighter, index }: { fighter: any; index: number }) {
  const { isConnected, tonConnectUI, walletAddress } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const shellPrice = fighter.salePriceShells || (fighter.salePriceTon ? fighter.salePriceTon * 1000 : 5000);
  // Logic to determine if this is a TON sale or a Shells sale
  // If ownerId is null or matches your Admin ID, it's a TON sale
  const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;
  const isPrimarySale = !fighter.ownerId || String(fighter.ownerId) === String(ADMIN_ID);
  const handlePurchase = async () => {
    const userId = window.Telegram?.WebApp.initDataUnsafe?.user?.id;
    if (!userId) return alert("Please open this app inside Telegram");

    if (isPrimarySale) {
      // --- TON PAYMENT LOGIC ---
      if (!isConnected || !tonConnectUI) return alert("Connect Wallet!");
      
      const priceTon = fighter.salePriceTon || 5.0;
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [{
          address: process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS,
          amount: String(Math.floor(priceTon * 1e9)),
        }],
      };

     try {
    setIsProcessing(true);

    if (isPrimarySale) {
      // --- TON PAYMENT LOGIC ---
      if (!isConnected || !tonConnectUI) return alert("Connect Wallet!");

      const priceTon = fighter.salePriceTon || 5.0;
      const receiverAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS;

      if (!receiverAddress) throw new Error("Receiver address not configured.");

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [{
          address: receiverAddress,
          amount: String(Math.floor(priceTon * 1e9)),
        }],
      };

      const tonResult = await tonConnectUI.sendTransaction(transaction);
      if (!tonResult?.boc) throw new Error("Transaction rejected.");

      // Verify TON Payment
      const response = await fetch("/api/recruit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionHash: tonResult.boc,
          paymentMethod: "TON",
          userId: userId,
          fighterId: fighter.id,
          itemType: "FIGHTER_RECRUITMENT"
        })
      });
      const result = await response.json();
      if (result.success) {
        alert("Fighter successfully recruited via TON!");
        window.location.reload();
      } else { alert(result.error || "Verification failed"); }

    } else {
      // --- SHELLS PAYMENT LOGIC ---
      const shellPrice = fighter.salePriceShells || (fighter.salePriceTon * 1000);
      
      const response = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "SHELLS",
          totalAmount: shellPrice,
          userId: userId,
          fighterId: fighter.id,
          itemType: "FIGHTER_RESALE"
        })
      });
      const result = await response.json();
      if (result.success) {
        alert("Fighter purchased via Shells!");
        window.location.reload();
      } else { alert(result.error || "Insufficient Shells"); }
    }
  } catch (error) {
    console.error("Purchase Error:", error);
    alert("Transaction failed.");
  } finally {
    setIsProcessing(false);
  }
}
};

  return (
    <motion.div id={index === 0 ? "fighter-card-0" : undefined} className="relative flex flex-col p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800">
      <img src={fighter.imageUrl} className="w-full aspect-square object-cover rounded-xl mb-3" />
      <h3 className="text-xs font-black uppercase italic">{fighter.name}</h3>
      
     <button 
        onClick={handlePurchase}
        disabled={isProcessing}
        className={`mt-3 w-full py-3 rounded-xl flex flex-col items-center justify-center transition-all ${
          isPrimarySale ? 'bg-white text-black' : 'bg-yellow-500 text-black shadow-lg shadow-yellow-900/20'
        }`}
      >
        <span className="text-[7px] font-black uppercase opacity-60">
          {isPrimarySale ? "Primary Recruitment" : "Manager Resale"}
        </span>
        <div className="flex items-center gap-1">
          {isPrimarySale ? (
            <>
              <Wallet size={10} />
              <span className="text-xs font-black">{fighter.salePriceTon || "5.0"} TON</span>
            </>
          ) : (
            <>
              <Zap size={10} className="fill-current" />
              <span className="text-xs font-black">{shellPrice} SHELLS</span>
            </>
          )}
        </div>
      </button>
      
      {!isPrimarySale && (
        <p className="text-[7px] text-center mt-1 text-zinc-500 font-bold uppercase tracking-widest">
          TON Equivalence applied
        </p>
      )}
    </motion.div>
  );
}