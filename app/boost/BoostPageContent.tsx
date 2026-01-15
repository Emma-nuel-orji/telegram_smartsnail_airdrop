'use client';
import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback, useContext, useRef, Suspense   } from "react";
import { Check, Ticket, Star, Coins, Users, Crown, Sparkles } from 'lucide-react';
// import React, { Suspense } from 'react';
import { io } from "socket.io-client";
import Link from "next/link";
import axios from "axios";
import WebApp from "@twa-dev/sdk";
import Loader from "@/loader";
import confetti from 'canvas-confetti';
import TelegramInit from "@/components/TelegramInit";
import "./BoostPage.css";
import { useRouter } from "next/navigation";
import { useWallet } from '../context/walletContext';
import Confetti from "react-confetti";
import { useWindowSize } from 'react-use';
// import TicketPurchaseSystem from '@/app/tickets/page';


// import { generateHMACSignature } from "@/src/utils/paymentUtils"

// Context
import { useBoostContext } from "../api/context/BoostContext";

const TicketPurchaseSystem = dynamic(() => import('@/app/tickets/page'), {
  ssr: false
});

interface StockLimit {
  fxckedUpBagsLimit: number;
  humanRelationsLimit: number;
  fxckedUpBagsUsed: number;
  fxckedUpBags: number;
  humanRelationsUsed: number;
  humanRelations: number;
}

interface BookSchema {
  id: string;
  author: string;
  coinsReward: number;
  description: string;
  priceCard: number;
  priceStars: number;
  priceTon: number;
  stockLimit: number;
  tappingRate: number;
  title: string;
  usedStock: number;
}

interface PurchasePayload {
  email: string;
  paymentMethod: string;
  bookCount: number;
  tappingRate: number;
  coinsReward: number;
  priceTon: number;
  priceStars: number;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
  telegramId?: string;
  referrerId?: string;
  userId?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

// Initial Stock Limit
const INITIAL_STOCK_LIMIT = {
  fxckedUpBagsLimit: 10000,
  humanRelationsLimit: 10000,
  fxckedUpBagsUsed: 0,
  fxckedUpBags: 0,
  humanRelationsUsed: 0,
  humanRelations: 0,
};

// WebSocket server URL
// const SOCKET_SERVER_URL = "http://localhost:3000"; 

export default function BoostPageContent() {
  const router = useRouter();
  const {
    user,
    stockLimit,
    syncStock,
    setStockLimit,
    setUser,
    performOptimisticUpdate,
    handlePurchaseError,
    updateStockAfterOrder,
    updateStockDisplay,
  } = useBoostContext();

  // State Management

  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
const [windowSize, setWindowSize] = useState({
  width: 0,
  height: 0
});

useEffect(() => {
  if (typeof window !== "undefined") {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }
}, []); // ✅ 


  const { isConnected, tonConnectUI, walletAddress } = useWallet();
  const [isClient, setIsClient] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [optimisticFUBUsed, setOptimisticFUBUsed] = useState<number | null>(null);
  const [optimisticHRUsed, setOptimisticHRUsed] = useState<number | null>(null);


// Fetch user ID when telegramId is available
useEffect(() => {
  const fetchUserData = async () => {
    if (!telegramId) return; // Prevent API call if telegramId is missing

    try {
      const response = await axios.get(`/api/user/${telegramId}`);
      console.log("✅ Fetched user data:", response.data);

      setUserId(response.data.id); // Ensure userId is correctly set
    } catch (error) {
      console.error("🔥 Error fetching user ID:", error);
    }
  };

  fetchUserData();
}, [telegramId]); // Runs when telegramId changes

  
  const [uniqueCode, setUniqueCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [purchaseEmail, setPurchaseEmail] = useState("");
  const [redemptionEmail, setRedemptionEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Book Quantities
  const [fxckedUpBagsQty, setFxckedUpBagsQty] = useState(0);
  const [humanRelationsQty, setHumanRelationsQty] = useState(0);

  // const [isSocketConnected, setIsSocketConnected] = useState(false);

  // UI States
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showFuckedUpInfo, setShowFuckedUpInfo] = useState(false);
  const [showHumanRelationsInfo, setShowHumanRelationsInfo] = useState(false);
  const prevStockRef = useRef(stockLimit);
  

  useEffect(() => {
    console.log("Purchase Email:", purchaseEmail);
    console.log("Redemption Email:", redemptionEmail);
    console.log("Referral Link:", referralLink);
  }, [purchaseEmail, redemptionEmail, referralLink]);

 
  

  //   // Change analysis
  useEffect(() => {
    const prevStock = prevStockRef.current;
    const changes = {
      fxckedUp: stockLimit.fxckedUpBagsUsed - prevStock.fxckedUpBagsUsed,
      human: stockLimit.humanRelationsUsed - prevStock.humanRelationsUsed
    };
  
    if (changes.fxckedUp !== 0 || changes.human !== 0) {
      console.log('📊 Stock Changes Detected:', {
        previous: prevStock,
        current: stockLimit,
        changes,
        timestamp: new Date().toISOString()
      });
    }
  
    prevStockRef.current = stockLimit;
  }, [stockLimit]);
  

  // Calculations
  const totalBooks = fxckedUpBagsQty + humanRelationsQty;
  const tappingRate = fxckedUpBagsQty * 4 + humanRelationsQty * 7;
  const points = fxckedUpBagsQty * 100000 + humanRelationsQty * 30000;
  const priceTon = totalBooks * 0.001;
  const priceStars = totalBooks * 4 * 100;

  // Stock Calculations
  const totalBooksRemaining = 
    stockLimit.fxckedUpBagsLimit - stockLimit.fxckedUpBagsUsed +
    (stockLimit.humanRelationsLimit - stockLimit.humanRelationsUsed);

const triggerConfetti = () => {
  const duration = 2 * 1000; // 2 seconds
  const end = Date.now() + duration;

  // Create a canvas to ensure confetti is on top
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none"; // Ensures clicks go through
  canvas.style.zIndex = "9999"; // Ensures it's above everything
  document.body.appendChild(canvas);

  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      document.body.removeChild(canvas); // Remove canvas after animation
      return;
    }

    confetti({
      particleCount: 50,
      startVelocity: 30,
      spread: 360,
      origin: { x: 0.5, y: 0.3 }, // Centered near the top
      zIndex: 9999, // Ensure it appears above popups
    });

  }, 250); // Fire confetti every 250ms for the duration
};
  




  useEffect(() => {
    syncStock(); // Initial load
    console.log("🟡 Initial syncStock called");
    const interval = setInterval(syncStock, 30000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // Initialize client data
    const initializeClient = async () => {
      if (typeof window !== 'undefined') {
        if (WebApp?.initDataUnsafe?.user?.id) {
          setTelegramId(WebApp.initDataUnsafe.user.id.toString());
        }
  
        const ref = new URLSearchParams(window.location.search).get("ref");
        if (ref) setReferrerId(ref);
  
        setIsClient(true);
      }
    };
  
    initializeClient();
  
    // Combined polling logic
    let pollingInterval: NodeJS.Timeout;
    let retryTimeout: NodeJS.Timeout | undefined; 
  
    const startPolling = () => {
      // Immediate first fetch
      syncStock();
    
    // Regular polling every 15 seconds
    pollingInterval = setInterval(syncStock, 15000);
  };
  
    startPolling();
  
    return () => {
      clearInterval(pollingInterval);
      if (retryTimeout) { // Only clear if it exists
        clearTimeout(retryTimeout);
      }
    };
  }, [syncStock]);

  // Purchase Handler
  const fxckedUpBagsId = "6796dbfa223a935d969d56e6"; 
  const humanRelationsId = "6796dbfa223a935d969d56e7"; 

 

// const performOptimisticUpdate = (addedFUB: number, addedHR: number) => {
//   setOptimisticFUBUsed(prev => (prev !== null ? prev + addedFUB : stockLimit.fxckedUpBagsUsed + addedFUB));
//   setOptimisticHRUsed(prev => (prev !== null ? prev + addedHR : stockLimit.humanRelationsUsed + addedHR));
// };

const syncStockFromAPI = async () => {
  try {
    console.log("Manually syncing stock...");
    syncStock(); // just call the context function
  } catch (err) {
    console.error("Failed to sync stock:", err);
  }
};




  // Modify your handlePurchase function to ensure stock updates:
  const handlePurchase = async (paymentMethod: string) => {
    try {
      // Validate inputs
      if (!purchaseEmail || !/\S+@\S+\.\S+/.test(purchaseEmail)) {
        alert("Please enter a valid email.");
        return;
      }
  
      if (totalBooks === 0) {
        alert("Please select at least one book.");
        return;
      }
  
      // TON payment specific logic
      if (paymentMethod === "TON") {
        console.log("2. TON payment selected, checking wallet connection");
        console.log("isConnected:", isConnected);
        console.log("tonConnectUI:", !!tonConnectUI);
        console.log("walletAddress:", walletAddress);
  
        if (!isConnected || !tonConnectUI || !walletAddress) {
          alert("Wallet not connected, go to task 18 to connect wallet.");
          return;
        }
       
        // Validate priceTon
        if (!priceTon || priceTon <= 0) {
          alert("Invalid payment amount. Please try again.");
          return;
        }
  
        const receiverAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS;
        if (!receiverAddress) {
          console.error("Receiver address is not configured in environment variables.");
          alert("Receiver address is not configured. Please contact support.");
          return;
        }
  
        console.log("Receiver Address:", receiverAddress);
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 360, // 6 minutes validity
          messages: [
            {
              address: receiverAddress,
              amount: String(Math.floor(priceTon * 1e9)), // Convert TON to nanoTON
            },
          ],
        };
  
        try {
          console.log("4. Sending TON transaction...");
          const tonResult = await tonConnectUI.sendTransaction(transaction);
          console.log("5. TON transaction result:", tonResult);
  
          if (!tonResult || !tonResult.boc) {
            throw new Error("Transaction failed or missing data.");
          }
  
          console.log("6. Verifying TON transaction with backend...");
  
          const userId = window.Telegram?.WebApp.initDataUnsafe?.user?.id || undefined;
  
          const verifyResponse = await axios.post("/api/verify-payment", {
            transactionHash: tonResult.boc,
            paymentMethod: "TON",
            totalAmount: priceTon,
            userId: userId,
            fxckedUpBagsQty: fxckedUpBagsQty,
            humanRelationsQty: humanRelationsQty
          });
  
          console.log("7. Verification response:", verifyResponse.data);
          if (!verifyResponse.data || !verifyResponse.data.success) {
            throw new Error("Payment verification failed.");
          }
  
          console.log("8. TON payment verified! Now creating order...");
  
        } catch (txError) {
          console.error("TON transaction error:", txError);
          alert("Transaction failed. Please try again.");
          return;
        }
      }
  
      setIsProcessing(true);
      
      
  
      const orderPayload = {
        email: purchaseEmail,
        paymentMethod: paymentMethod.toUpperCase(),
        bookCount: totalBooks,
        tappingRate: tappingRate,
        coinsReward: Number(points),
        priceTon: priceTon,
        priceStars: priceStars,
        fxckedUpBagsQty,
        humanRelationsQty,
        telegramId: telegramId ? String(telegramId) : '',
        referrerId: referrerId ? String(referrerId) : '',
        bookIds: [
          ...(fxckedUpBagsQty > 0 ? [fxckedUpBagsId] : []),
          ...(humanRelationsQty > 0 ? [humanRelationsId] : []),
        ],
      };
      console.log("🛒 Attempting purchase with stock:", stockLimit);
      console.log("9. Creating order with payload:", orderPayload);
  
      const headers = {
        "Content-Type": "application/json",
        ...(process.env.NODE_ENV === "production" &&
        window.Telegram?.WebApp?.initData
          ? { "x-telegram-init-data": window.Telegram.WebApp.initData }
          : {}),
      };
  
      const orderResponse = await axios.post("/api/purchase", orderPayload, {
        headers,
      });
      
      console.log("10. Order response:", orderResponse.data);
      
      if (!orderResponse.data || !orderResponse.data.orderId) {
        throw new Error("Invalid response from purchase API");
      }
      
      const orderId = orderResponse.data.orderId;
      const data = orderResponse.data; // No need for `.json()` with axios
      
      // Update the context with the finalized order
      if (data.stockStatus) {
        updateStockDisplay(data.stockStatus, true); // `true` = optimistic flag to show change immediately
      }
      // performOptimisticUpdate(fxckedUpBagsQty, humanRelationsQty);

          await syncStockFromAPI(); // Immediate
          setTimeout(() => {
            syncStockFromAPI(); // Delayed backup sync
          }, 20 * 60 * 1000);

      // Reset form and handle success
      setFxckedUpBagsQty(0);
      setHumanRelationsQty(0);
      handlePaymentSuccess(fxckedUpBagsQty, humanRelationsQty);
      
    } catch (error) {
      // Use context method for consistent error handling
      handlePurchaseError(error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handlePaymentViaStars = async (paymentMethod?: string) => {
    if (paymentMethod !== "Stars") {
      alert("Invalid payment method");
      return;
    }
  
    if (!purchaseEmail || !/\S+@\S+\.\S+/.test(purchaseEmail)) {
      alert("Please enter a valid email");
      return;
    }
  
    if (totalBooks === 0) {
      alert("Please select at least one book");
      return;
    }
  
    setIsProcessing(true);
  
    try {
      // Apply optimistic UI update immediately
      // performOptimisticUpdate(fxckedUpBagsQty, humanRelationsQty);
  
      const purchasedFxckedUp = fxckedUpBagsQty;
      const purchasedHuman = humanRelationsQty;
  
      const payload = JSON.stringify({  
        email: purchaseEmail,
        title: `Stars Payment for ${totalBooks} Books`,
        description: `Stars payment includes ${purchasedFxckedUp} FxckedUpBags and ${purchasedHuman} Human Relations books.`,
        amount: Math.round(priceStars),  
        label: "SMARTSNAIL Stars Payment",
        paymentMethod: "Stars",
        bookCount: totalBooks,
        tappingRate,
        points,
        priceTon,
        priceStars: Math.round(priceStars), 
        fxckedUpBagsQty: purchasedFxckedUp,
        humanRelationsQty: purchasedHuman,
        telegramId,
        referrerId,
      });
  
      const headers: { [key: string]: string } = {
        "Content-Type": "application/json",  
      };
  
      if (process.env.NODE_ENV === "production") {
        const initData = window.Telegram?.WebApp?.initData;
        if (initData) {
          headers["x-telegram-init-data"] = initData;
        }
      }
  
      const response = await axios.post("/api/paymentByStars", payload, { headers });
  
      if (response.data.invoiceLink) {
        // Update the context with the finalized order
        updateStockAfterOrder(fxckedUpBagsQty, humanRelationsQty);
         performOptimisticUpdate(fxckedUpBagsQty, humanRelationsQty);


        await syncStockFromAPI(); // Immediate
        setTimeout(() => {
          syncStockFromAPI(); // Delayed backup sync
        }, 20 * 60 * 1000);
        
        // Reset quantities before redirecting
        setFxckedUpBagsQty(0);
        setHumanRelationsQty(0);
        
        window.location.href = response.data.invoiceLink; 
      } else {
        throw new Error("Failed to create payment link");
      }
    } catch (error) {
      handlePurchaseError(error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const response = await axios.post("/api/verify-payment", {
          telegramId,
          paymentMethod: "Stars",
        });
  
        if (response.data.success) {
          handlePaymentSuccess(fxckedUpBagsQty, humanRelationsQty);
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
      }
    };
  
    verifyPayment();
  }, []);
  
  


// Function to handle successful payment callback
const handlePaymentSuccess = async (bagsQty: number, humanQty: number) => {
  try {
    console.log("Triggering confetti... 🎉");

    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);

    setTimeout(() => {
      alert("Purchase successful! Check your email for details.");
    }, 500);

    // ✅ Now apply optimistic update using correct values
    performOptimisticUpdate(bagsQty, humanQty);

    // ❌ THEN reset
    setFxckedUpBagsQty(0);
    setHumanRelationsQty(0);
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
};



  // Code Redemption Handler
  const handleCodeRedemption = async () => {
    if (!uniqueCode || !redemptionEmail || !referralLink) {
      alert("Please fill in all fields: Unique Code, Email, and Referral Link");
      return;
    }
  
    setLoading(true);
  
    try {
      console.log("📤 Sending redemption request...", {
        userId: telegramId,
        email: redemptionEmail,
        uniqueCode,
        referrerId: referralLink,
      });
  
      // Validate inputs before making the request
      if (!telegramId) {
        throw new Error("🚨 Telegram ID is missing!");
      }
  
      const response = await axios.post("/api/redeemCode", {
        userId: telegramId,
        email: redemptionEmail,
        uniqueCode,
        referrerId: referralLink,
      });
  
      console.log("📥 Redemption response:", response.data);
  
      if (response.status === 200) {
        triggerConfetti()
  
        // Show Telegram pop-up instead of an alert
        window.Telegram?.WebApp.showPopup({
          title: "✅ Success",
          message: "Code redeemed successfully! You've earned 100,000 Shells!",
          buttons: [{ text: "OK", type: "default" }],
        });
      } else {
        console.error("⚠️ Unexpected response status:", response.status);
        
        // Show Telegram alert for errors
        window.Telegram?.WebApp.showAlert(response.data.error || "❌ Code redemption failed.");
      }
    } catch (error) {
      console.error("❌ Redemption error:", error);
  
      if (axios.isAxiosError(error)) {
        console.error("🔍 Axios error response:", error.response?.data);
        window.Telegram?.WebApp.showAlert(error.response?.data?.error || "⚠️ Code redemption failed.");
      } else {
        window.Telegram?.WebApp.showAlert("❌ Unexpected error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  

  // Render Loading State
  if (!isClient) {
    return ;
  }

  return (
  <>
    {showConfetti && (
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <Confetti width={width} height={height} />
      </div>
    )}

    <div className="min-h-screen bg-[#070707] text-zinc-100 p-4 pb-24 selection:bg-purple-500">
      <div className="max-w-xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col gap-2 pt-4">
          <Link href="/" className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800 active:scale-90 transition-transform">
            <img src="/images/info/output-onlinepngtools (6).png" className="w-6 h-6 invert" alt="back" />
          </Link>
          <div className="mt-4">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
              Boost <span className="text-purple-500">Center</span>
            </h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
              Purchase books to upgrade your tapping rate
            </p>
          </div>
        </header>

        {/* BOOKS GRID */}
        <div className="grid gap-4">
          {[
            {
              id: 'fub',
              title: 'FxckedUpBags',
              img: '/images/fuckedup.jpg',
              rate: '+5',
              shells: '100,000',
              qty: fxckedUpBagsQty,
              setQty: setFxckedUpBagsQty,
              used: stockLimit.fxckedUpBagsUsed,
              limit: stockLimit.fxckedUpBagsLimit,
              info: () => setShowFuckedUpInfo(true)
            },
            {
              id: 'hr',
              title: 'Human Relations',
              img: '/images/human.jpg',
              rate: '+7',
              shells: '30,000',
              qty: humanRelationsQty,
              setQty: setHumanRelationsQty,
              used: stockLimit.humanRelationsUsed,
              limit: stockLimit.humanRelationsLimit,
              info: () => setShowHumanRelationsInfo(true)
            }
          ].map((book) => (
            <div key={book.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-4 relative overflow-hidden group">
              <div className="flex gap-4">
                <div className="relative w-24 h-32 flex-shrink-0">
                  <img src={book.img} className="w-full h-full object-cover rounded-xl shadow-2xl" alt={book.title} />
                  <button onClick={book.info} className="absolute -top-2 -right-2 bg-purple-600 rounded-full p-1 border-2 border-[#070707]">
                    <Sparkles size={14} className="text-white" />
                  </button>
                </div>
                
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tight">{book.title}</h2>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">{book.rate} Rate</span>
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-bold uppercase">{book.shells} Shells</span>
                    </div>
                  </div>

                  {/* CUSTOM STEPPER INPUT */}
                  <div className="flex items-center gap-4 bg-black/40 w-fit rounded-2xl p-1 border border-zinc-800">
                    <button 
                      onClick={() => book.setQty(Math.max(0, book.qty - 1))}
                      className="w-10 h-10 flex items-center justify-center font-bold text-xl hover:text-purple-500 transition-colors"
                    >–</button>
                    <span className="font-black italic text-lg w-4 text-center">{book.qty}</span>
                    <button 
                      onClick={() => book.setQty(book.qty + 1)}
                      className="w-10 h-10 flex items-center justify-center font-bold text-xl hover:text-purple-500 transition-colors"
                    >+</button>
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-zinc-500">
                  <span>Supply Status</span>
                  <span>{book.used.toLocaleString()} / {book.limit.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 transition-all duration-1000"
                    style={{ width: `${(book.used / book.limit) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SUMMARY & CHECKOUT */}
        <div className="bg-purple-600/10 border-2 border-purple-500/30 rounded-[2.5rem] p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Tap Boost</p>
              <p className="text-xl font-black italic text-purple-400">+{tappingRate}</p>
            </div>
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Coin Reward</p>
              <p className="text-xl font-black italic text-yellow-500">{points.toLocaleString()}</p>
            </div>
          </div>

          <div className="relative">
            <input
              type="email"
              value={purchaseEmail}
              onChange={(e) => setPurchaseEmail(e.target.value)}
              placeholder="Confirm your email..."
              className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 outline-none focus:border-purple-600 transition-all font-bold italic"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handlePurchase("TON")} 
              disabled={isProcessing}
              className="w-full bg-[#0088cc] text-white font-black italic text-xl p-5 rounded-2xl flex justify-between items-center active:scale-95 transition-all shadow-xl disabled:opacity-50"
            >
              PAY WITH TON <div className="bg-white/20 p-1 rounded-lg"><Check size={20}/></div>
            </button>

            <button 
              onClick={() => handlePaymentViaStars("Stars")} 
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black italic text-xl p-5 rounded-2xl flex justify-between items-center active:scale-95 transition-all shadow-xl disabled:opacity-50"
            >
              PAY WITH STARS <Star className="fill-black" size={24}/>
            </button>
          </div>
        </div>

        {/* REDEMPTION SECTION */}
        <div className="border-t border-zinc-800 pt-8 space-y-4">
          <h3 className="text-center font-black italic uppercase tracking-widest text-zinc-500 text-sm">Have a secret code?</h3>
          <div className="bg-zinc-900/30 p-4 rounded-3xl border border-zinc-800 space-y-3">
             <input type="text" value={uniqueCode} onChange={(e) => setUniqueCode(e.target.value)} placeholder="Enter Code" className="w-full bg-transparent border-b border-zinc-800 p-3 outline-none focus:border-purple-500 font-bold italic text-center text-xl"/>
             <button onClick={handleCodeRedemption} className="w-full py-4 text-purple-500 font-black italic uppercase tracking-tighter">Activate Code</button>
          </div>
        </div>

        {/* TICKET SECTION */}
        <div className="pt-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-zinc-800"></div>
            <h2 className="font-black italic uppercase text-zinc-500">Event Tickets</h2>
            <div className="h-px flex-1 bg-zinc-800"></div>
          </div>
          <Suspense fallback={<div className="text-center p-10 animate-pulse text-zinc-600 font-black italic uppercase">Loading Marketplace...</div>}>
            <TicketPurchaseSystem />
          </Suspense>
        </div>
      </div>
    </div>

    {/* Info Popups - Repositioned to be center screen modals */}
    {showFuckedUpInfo && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-purple-500/50 p-8 rounded-[2rem] max-w-sm relative">
          <button onClick={() => setShowFuckedUpInfo(false)} className="absolute top-4 right-4 text-zinc-500 font-black">CLOSE</button>
          <h2 className="text-2xl font-black italic uppercase mb-4 text-purple-500">About the Book</h2>
          <p className="text-zinc-400 text-sm leading-relaxed italic">FxckedUpBags by AlexanderTheSage explores personal transformation...</p>
        </div>
      </div>
    )}
  </>
);
}