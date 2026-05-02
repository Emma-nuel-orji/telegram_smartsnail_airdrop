'use client';
import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback, useContext, useRef, Suspense   } from "react";
import { Check, Ticket, Star, Coins, Users, Crown, Sparkles } from 'lucide-react';
import { ChevronLeft, ArrowLeft, ChevronRight, CheckCircle2, Lock, Terminal, X } from 'lucide-react';
// import React, { Suspense } from 'react';
import { io } from "socket.io-client";
import Link from "next/link";
import axios from "axios";
// import WebApp from "@twa-dev/sdk";
import Loader from "@/loader";
import confetti from 'canvas-confetti';
import TelegramInitializer from "@/src/components/TelegramInitializer";
import "./BoostPage.css";
import BoostIndicator from './BoostIndicator';
import { useRouter } from "next/navigation";
import { useWallet } from '../context/walletContext';
import Confetti from "react-confetti";
import { useWindowSize } from 'react-use';
import { useOnboardingTour } from '../hooks/useOnboardingTour';
import OnboardingTour, { TourStep } from '../../components/OnboardingTour';
import { AnimatePresence } from 'framer-motion';

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

interface BoostUser {
  boostExpiresAt?: string | Date | null;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
}

interface BoostUser {
  boostExpiresAt?: string | Date | null;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
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
  const WebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
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
  const [userPoints, setUserPoints] = useState<number>(0);

// Fetch user ID when telegramId is available
useEffect(() => {
  const fetchUserData = async () => {
    if (!telegramId) return;
    try {
      const initData = window.Telegram?.WebApp?.initData;
      const response = await axios.get(`/api/user/${telegramId}`, {
        headers: {
          ...(initData ? { "Authorization": `tma ${initData}` } : {})
        }
      });
      setUserId(response.data.id);
      setUser(response.data);        // ← sets points in context
      setUserPoints(response.data.points || 0); // ← sets local points
    } catch (error) {
      // silent fail
    }
  };
  fetchUserData();
}, [telegramId]);

  
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
  
  const { showTour, completeTour } = useOnboardingTour('boost', telegramId);

const BOOST_TOUR: TourStep[] = [
  {
    targetId: "boost-books-list", // 👈 Changed from 'target' to 'targetId'
    emoji: "📚",
    label: "Buy books to boost",
    text: "Purchase real books by real authors to permanently upgrade your tapping rate."
  },

  {
  targetId: 'boost-books-list',
  emoji: "⏳",
    label:  'Power Duration ',
  text: 'Each book grants you its specific Tapping Rate for exactly 24 hours. Buying multiple books extends this duration—for example, 3 books equals 3 full days of upgraded power!',
},
  {
    targetId: "checkout-summary", 
    emoji: "⚡",
    label: "Tapping rate",
    text: "FxckedUpBags gives +2 rate. Human Relations gives +4 rate per copy."
  },
  {
    targetId: "checkout-summary", 
    emoji: "💎",
    label: "Two ways to pay",
    text: "Pay with TON or Telegram Stars — both unlock your boost instantly."
  },
  {
    targetId: "supply-tracker", 
    emoji: "📦",
    label: "Limited supply",
    text: "Each book has a limited stock. Once they sell out, that boost is gone."
  },
  {
    targetId: "ticket-section", 
    emoji: "🎟️",
    label: "Event tickets",
    text: "Scroll down to buy tickets to real PolyCombat events."
  },

  {
  // Point to the first ticket if it exists, otherwise point to the empty state
  targetId: 'ticket-section', 
  emoji: "🎫",
  label: 'Event Access',
  text: 'Purchase tickets here to enter exclusive live events. Your collection will appear below once you secure your spot!',
},
  {
    targetId: "referral-section", 
    emoji: "🔑",
    label: "Secret codes",
    text: "Enter a referral or promo code to redeem 100,000 bonus Shells."
  },
];


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
  const tappingRate = fxckedUpBagsQty * 2 + humanRelationsQty * 4;
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
    if (!purchaseEmail || !/\S+@\S+\.\S+/.test(purchaseEmail)) {
      alert("Please enter a valid email.");
      return;
    }

    if (totalBooks === 0) {
      alert("Please select at least one book.");
      return;
    }

    if (paymentMethod === "TON") {
      if (!isConnected || !tonConnectUI || !walletAddress) {
        alert("Wallet not connected, go to task 18 to connect wallet.");
        return;
      }

      if (!priceTon || priceTon <= 0) {
        alert("Invalid payment amount. Please try again.");
        return;
      }

      const receiverAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS;
      if (!receiverAddress) {
        alert("Receiver address is not configured. Please contact support.");
        return;
      }

      const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramUserId) {
        alert("Could not verify your Telegram identity. Please restart the app.");
        return;
      }

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: receiverAddress,
            amount: String(Math.floor(priceTon * 1e9)),
          },
        ],
      };

      try {
        setIsProcessing(true);
        console.log("4. Sending TON transaction...");
        const tonResult = await tonConnectUI.sendTransaction(transaction);
        console.log("5. TON transaction result:", tonResult);

        if (!tonResult || !tonResult.boc) {
          throw new Error("Transaction failed or missing data.");
        }

        console.log("6. Verifying TON transaction with backend...");
        const verifyInitData = window.Telegram?.WebApp?.initData;
        const verifyResponse = await axios.post("/api/verify-payment", {
              paymentMethod: "TON",
              transactionHash: tonResult.boc,
              fxckedUpBagsQty,
              humanRelationsQty,

            }, {
              headers: {
                "Content-Type": "application/json",
                ...(verifyInitData ? { "Authorization": `tma ${verifyInitData}` } : {})
              }
            });

        console.log("7. Verification response:", verifyResponse.data);
        if (!verifyResponse.data?.success) {
          throw new Error("Payment verification failed.");
        }

        // ✅ TON is fully handled — skip /api/purchase entirely
        await syncStockFromAPI();
        setTimeout(() => syncStockFromAPI(), 20 * 60 * 1000);

        setFxckedUpBagsQty(0);
        setHumanRelationsQty(0);
        handlePaymentSuccess(fxckedUpBagsQty, humanRelationsQty);
        return; // ✅ Exit here for TON — do NOT fall through to /api/purchase
        
      } catch (txError) {
        console.error("TON transaction error:", txError);
        alert("Transaction failed. Please try again.");
        return;
      } finally {
        setIsProcessing(false);
      }
    }

    // ── Non-TON payments (CARD, STARS) fall through to here ──
    setIsProcessing(true);

    const orderPayload = {
      email: purchaseEmail,
      paymentMethod: paymentMethod.toUpperCase(),
      fxckedUpBagsQty,
      humanRelationsQty,
      referrerId: referrerId ? String(referrerId) : '',
    };
    console.log("9. Creating order with payload:", orderPayload);

    const initData = window.Telegram?.WebApp?.initData;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(initData ? { "Authorization": `tma ${initData}` } : {}),
    };

    const orderResponse = await axios.post("/api/purchase", orderPayload, { headers });
    console.log("10. Order response:", orderResponse.data);

    if (!orderResponse.data?.orderId) {
      throw new Error("Invalid response from purchase API");
    }

    const data = orderResponse.data;

    if (data.stockStatus) {
      updateStockDisplay(data.stockStatus, true);
    }

    await syncStockFromAPI();
    setTimeout(() => syncStockFromAPI(), 20 * 60 * 1000);

    setFxckedUpBagsQty(0);
    setHumanRelationsQty(0);
    handlePaymentSuccess(fxckedUpBagsQty, humanRelationsQty);

  } catch (error) {
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
        // tappingRate,
        // points,
        // priceTon,
        priceStars: Math.round(priceStars), 
        fxckedUpBagsQty: purchasedFxckedUp,
        humanRelationsQty: purchasedHuman,
        // telegramId,
        referrerId,
      });
  
      const headers: { [key: string]: string } = {
        "Content-Type": "application/json",  
      };
  
     const initData = window.Telegram?.WebApp?.initData;
        if (initData) {
          headers["Authorization"] = `tma ${initData}`;
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
  // Only verify if redirected back from Stars payment
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get("payment");
  
  if (paymentStatus !== "success") return; // Don't fire on normal page loads

  const verifyPayment = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData;
      const response = await axios.post("/api/verify-payment", {
        paymentMethod: "Stars",
      }, {
        headers: {
          "Content-Type": "application/json",
          ...(initData ? { "Authorization": `tma ${initData}` } : {}),
        }
      });

      if (response.data.success) {
        handlePaymentSuccess(fxckedUpBagsQty, humanRelationsQty);
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname);
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
  
      const initData = window.Telegram?.WebApp?.initData;
      const response = await axios.post("/api/redeemCode", {
        uniqueCode,
        referrerId: referralLink,
        // REMOVED: userId/telegramId and email — server gets telegramId from token
      }, {
        headers: {
          "Content-Type": "application/json",
          ...(initData ? { "Authorization": `tma ${initData}` } : {})
        }
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
      
<header className="sticky top-0 z-50 bg-[#070707]/80 backdrop-blur-lg -mx-4 px-4 py-4 flex items-center justify-between border-b border-zinc-800/50">
  <div className="flex items-center gap-3">
    <Link 
      href="/" 
      className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800 active:scale-90 transition-transform shadow-lg"
    >
      <ArrowLeft size={20} className="text-zinc-100" />
    </Link>
    <div>
      <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">
        SmartSnail <span className="text-purple-500">Marketplace</span>
      </h1>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-1">
        Boost your Tapping rate
      </p>
    </div>
  </div>

  {/* USER POINTS DISPLAY */}
  <div className="bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-inner">
    <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.3)]">
      <span className="text-[10px] text-black font-black">S</span>
    </div>
    <span className="text-sm font-black italic tracking-tight text-zinc-100">
      {userPoints.toLocaleString()}
    </span>
  </div>
</header>

        {/* BOOKS GRID */}
        <div id="boost-books-list" className="grid gap-4">
          {[
            {
              id: 'fub',
              title: 'FxckedUpBags',
              img: '/images/fuckedup.jpg',
              rate: '+2',
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
              rate: '+4',
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
              <div id="supply-tracker" className="space-y-1">
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
        <div id="checkout-summary" className="bg-purple-600/10 border-2 border-purple-500/30 rounded-[2.5rem] p-6 space-y-6">
  
  {/* LIVE PREVIEW SECTION */}
  {(fxckedUpBagsQty > 0 || humanRelationsQty > 0) && (
    <div className="grid grid-cols-2 gap-3 animate-in zoom-in duration-300">
      <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Tapping Boost</p>
        <p className="text-2xl font-black italic text-purple-500">
          +{(fxckedUpBagsQty * 2) + (humanRelationsQty * 4)}
        </p>
      </div>
      <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Boost Duration</p>
        <p className="text-2xl font-black italic text-green-400">
          {fxckedUpBagsQty + humanRelationsQty} Days
        </p>
      </div>
    </div>
  )}

  <div className="grid grid-cols-2 gap-4">
    <div className="relative">
      {/* Current Active Status */}
      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1 ml-1">Current Active Boost</p>
      {/* <BoostIndicator 
        user={{
          boostExpiresAt: (user as any)?.boostExpiresAt, 
          fxckedUpBagsQty: fxckedUpBagsQty, 
          humanRelationsQty: humanRelationsQty
        }} 
      /> */}
    </div>
    
    <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col justify-center">
      <p className="text-[10px] text-zinc-500 font-bold uppercase">Points Reward</p>
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
    className={`w-full font-black italic text-xl p-5 rounded-2xl flex justify-between items-center active:scale-95 transition-all shadow-xl disabled:opacity-70 disabled:cursor-not-allowed ${
      isProcessing ? "bg-zinc-800" : "bg-[#0088cc] text-white"
    }`}
  >
    <div className="flex items-center gap-3">
      {isProcessing ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <div className="bg-white/20 p-1 rounded-lg"><Check size={20}/></div>
      )}
      <span>{isProcessing ? "INITIALIZING..." : "PAY WITH TON"}</span>
    </div>
    {!isProcessing && <span className="text-xs opacity-50 font-mono">TON</span>}
  </button>

  {/* STARS PAYMENT BUTTON */}
  <button 
    onClick={() => handlePaymentViaStars("Stars")} 
    disabled={isProcessing}
    className={`w-full font-black italic text-xl p-5 rounded-2xl flex justify-between items-center active:scale-95 transition-all shadow-xl disabled:opacity-70 disabled:cursor-not-allowed ${
      isProcessing ? "bg-zinc-800" : "bg-gradient-to-r from-yellow-400 to-orange-500 text-black"
    }`}
  >
    <div className="flex items-center gap-3">
      {isProcessing ? (
        <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
      ) : (
        <Star className="fill-black" size={24}/>
      )}
      <span>{isProcessing ? "PREPARING..." : "PAY WITH STARS"}</span>
    </div>
    {!isProcessing && <span className="text-xs opacity-50 font-mono">TG</span>}
  </button>
</div>
        </div>

        {/* REDEMPTION SECTION */}
       
        {/* REDEMPTION SECTION: CYBER-TERMINAL UPGRADE */}
<div id="referral-section" className="border-t border-zinc-800 pt-10 pb-4 space-y-4 px-4">
  <div className="flex flex-col items-center gap-1">
    <h3 className="font-black italic uppercase tracking-[0.2em] text-purple-500 text-[11px] animate-pulse">
      Have a secret code?
    </h3>
    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
      Enter Secret Code
    </p>
  </div>

  <div className="relative group max-w-md mx-auto w-full">
    {/* Outer Glow Effect */}
    <div className="absolute -inset-1 bg-purple-600/20 rounded-[2rem] blur-xl group-focus-within:bg-purple-600/40 transition-all duration-500 opacity-0 group-focus-within:opacity-100" />
    
    {/* Layout: Vertical on mobile, Horizontal on sm+ */}
    <div className="relative bg-zinc-950 p-1.5 rounded-[1.5rem] sm:rounded-[2.2rem] border-2 border-zinc-800 focus-within:border-purple-500/50 flex flex-col sm:flex-row items-center gap-2 shadow-2xl transition-all">
      <div className="flex items-center w-full sm:w-auto">
        <div className="pl-4 sm:pl-5 text-purple-500/50">
          <Terminal size={18} />
        </div>
        
        <input 
          type="text" 
          value={uniqueCode} 
          onChange={(e) => setUniqueCode(e.target.value.toUpperCase())} 
          placeholder="_ _ _ _ _ _" 
          className="flex-1 bg-transparent py-4 px-3 outline-none text-white font-mono font-black text-lg sm:text-xl tracking-[0.2em] sm:tracking-[0.3em] placeholder:text-zinc-800 uppercase min-w-0"
        />
      </div>
      
      {/* Button: Full width on mobile, Auto width on sm+ */}
      <button 
        onClick={handleCodeRedemption} 
        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-400 text-white h-[52px] px-8 rounded-[1.2rem] sm:rounded-[1.8rem] font-black italic uppercase tracking-tighter shadow-[0_0_20px_rgba(147,51,234,0.3)] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
      >
        ACTIVATE
        <ChevronRight size={18} />
      </button>
    </div>
  </div>
</div>
        {/* TICKET SECTION */}
        <div  className="pt-10">
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
          <p className="text-zinc-400 text-sm leading-relaxed italic">FxckedUpBags by <b>AlexanderTheSage</b> explores personal transformation and self-discipline, focusing on how mindset and choices shape success. It challenges readers to confront ways they may be sabotaging their goals or "messing up their bags" by missing opportunities or wealth. Through practical strategies, the book emphasizes shifting language from "I will" to "I am going to," helping readers take control and align actions with long-term goals. It also critiques hustle culture and encourages a balanced approach to ambition, empowering readers to unlock their true potential.</p>
        </div>
      </div>
    )}

    {showHumanRelationsInfo && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-purple-500/50 p-8 rounded-[2rem] max-w-sm relative">
          <button onClick={() => setShowHumanRelationsInfo(false)} className="absolute top-4 right-4 text-zinc-500 font-black">CLOSE</button>
          <h2 className="text-2xl font-black italic uppercase mb-4 text-purple-500">About the Book</h2>
          <p className="text-zinc-400 text-sm leading-relaxed italic">The book Human Relations by <b>Kennedy E. O.</b> was inspired by the need to properly educate individuals about the nature of life and its existence using the principles of human relations. The book which is in fourteen chapters discusses in detail the process of human relations as a tool for a better life and the best tool to deal with all individuals you meet in life, while using the principles of human relations as basis for achieving greatness. It also explores many solutions to the challenges we face as humans in making ourselves sociable and accepted</p>
        </div>
      </div>
    )}

  <AnimatePresence>
        {showTour && <OnboardingTour steps={BOOST_TOUR} onDone={completeTour} />}
      </AnimatePresence>
    </>
  );
}