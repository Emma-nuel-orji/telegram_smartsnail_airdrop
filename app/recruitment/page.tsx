'use client';
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Wallet, Zap, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useWallet } from '../context/walletContext';

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

  useEffect(() => {
    // Fetch only "Unsigned" or "Available" fighters
    fetch('/api/fighters/available')
      .then(res => res.json())
      .then(data => {
        setFighters(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Shimmer Effect Global CSS */}
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
             <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em]">PolyCombat Intelligence</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* Market Stats */}
      <div className="p-6 grid grid-cols-2 gap-3">
        <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
           <p className="text-[8px] text-zinc-500 font-black uppercase">Active Deals</p>
           <p className="text-lg font-mono font-bold">124</p>
        </div>
        <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
           <p className="text-[8px] text-zinc-500 font-black uppercase">Volume (24h)</p>
           <p className="text-lg font-mono font-bold text-blue-400">8.4k TON</p>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="flex-1 p-6 grid grid-cols-2 gap-6 overflow-y-auto pb-24">
        {fighters.map((fighter: any) => (
          <FighterNFTCard key={fighter.id} fighter={fighter} />
        ))}
      </div>

      {/* Footer Instructions */}
      <div className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black to-transparent pointer-events-none">
        <div className="bg-blue-600 p-4 rounded-2xl flex items-center justify-between pointer-events-auto shadow-2xl shadow-blue-900/50">
          <div className="flex items-center gap-3">
            <Shield className="text-white" size={20} />
            <div>
              <p className="text-[10px] font-black uppercase leading-none">Management Bonus</p>
              <p className="text-[9px] text-blue-100 opacity-80">Earn 10% from every stake</p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-white/20" />
          <Zap size={20} className="text-yellow-400 fill-yellow-400" />
        </div>
      </div>
    </div>
  );
}

function FighterNFTCard({ fighter }: { fighter: Fighter }) {
  const { isConnected, tonConnectUI, walletAddress } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSignContract = async () => {
    // 1. Validation Logic
    if (!isConnected || !tonConnectUI || !walletAddress) {
      alert("Wallet not connected! Please connect your wallet first.");
      return;
    }

    const priceTon = fighter.salePriceTon || 5.0; 
    const receiverAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS;

    if (!receiverAddress) {
      alert("Receiver address not configured.");
      return;
    }

    // 2. Build Transaction
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: receiverAddress,
          amount: String(Math.floor(priceTon * 1e9)), // Convert to nanoTON
        },
      ],
    };

    try {
      setIsProcessing(true);
      
      // 3. Send Transaction
      const tonResult = await tonConnectUI.sendTransaction(transaction);

      if (!tonResult || !tonResult.boc) {
        throw new Error("Transaction failed or missing data.");
      }

      // 4. Verify with Backend (Passing the fighterId)
      const userId = window.Telegram?.WebApp.initDataUnsafe?.user?.id;

      const verifyResponse = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionHash: tonResult.boc,
          paymentMethod: "TON",
          totalAmount: priceTon,
          userId: userId,
          fighterId: fighter.id, // Linking the payment to this specific fighter
          itemType: "FIGHTER_RECRUITMENT"
        })
      });

      const result = await verifyResponse.json();
      
      if (result.success) {
        alert(`${fighter.name} is now under your command!`);
        // Optional: Trigger a refresh or local state update
      }

    } catch (error) {
      console.error("TON transaction error:", error);
      alert("Transaction failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div className="relative flex flex-col group">
      {/* ... (Your existing UI for image and stats) ... */}

      <button 
        onClick={handleSignContract}
        disabled={isProcessing}
        className={`mt-3 w-full py-3 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${
          isProcessing ? 'bg-zinc-700' : 'bg-white hover:bg-zinc-200 text-black'
        }`}
      >
        <span className="text-[7px] font-black uppercase opacity-60">
          {isProcessing ? "Verifying..." : "Sign Contract"}
        </span>
        <div className="flex items-center gap-1">
          <img src="/ton-icon.png" className="w-3 h-3" alt="TON" />
          <span className="text-xs font-black uppercase">{fighter.salePriceTon || "5.00"} TON</span>
        </div>
      </button>
    </motion.div>
  );
}