'use client';
import React, { useState, useEffect, useCallback, useContext, useRef  } from "react";
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

// import { generateHMACSignature } from "@/src/utils/paymentUtils"

// Context
import { useBoostContext } from "../api/context/BoostContext";

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

 
  // useEffect(() => {
  //   // Basic snapshot
  //   console.log('Current Stock:', {
  //     fxckedUp: `${stockLimit.fxckedUpBagsUsed}/${stockLimit.fxckedUpBagsLimit}`,
  //     human: `${stockLimit.humanRelationsUsed}/${stockLimit.humanRelationsLimit}`,
  //     timestamp: new Date().toISOString()
  //   });
  
    

  //   // Change analysis
  //   const prevStock = prevStockRef.current;
  //   const changes = {
  //     fxckedUp: stockLimit.fxckedUpBagsUsed - prevStock.fxckedUpBagsUsed,
  //     human: stockLimit.humanRelationsUsed - prevStock.humanRelationsUsed
  //   };
  
  //   if (changes.fxckedUp !== 0 || changes.human !== 0) {
  //     console.log('Stock Changes Detected:', {
  //       previous: prevStock,
  //       changes,
  //       timestamp: new Date().toISOString()
  //     });
  //   }
  
  //   prevStockRef.current = stockLimit;
  // }, [stockLimit]);

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
  

  // Fetch Stock Data
  // const fetchStockData = async () => {
  //   try {
  //     const response = await fetch('/api/stock');
  //     const data = await response.json();
      
  //     setStockLimit({
  //       fxckedUpBagsLimit: data.fxckedUpBagsLimit,
  //     fxckedUpBagsUsed: data.fxckedUpBagsUsed,
  //     fxckedUpBags: data.fxckedUpBags, // Make sure API returns this
  //     humanRelationsLimit: data.humanRelationsLimit,
  //     humanRelationsUsed: data.humanRelationsUsed,
  //     humanRelations: data.humanRelations
      
  //     });
      
  //   } catch (error) {
  //     console.error("Failed to load stock:", error);
  //   }
  // }


  useEffect(() => {
    syncStock(); // Initial load
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
      
      // Apply optimistic UI update immediately
      // Using context method for consistent UI updates
      performOptimisticUpdate(fxckedUpBagsQty, humanRelationsQty);
  
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
      
      // Update the context with the finalized order
      // This will trigger a sync with the server as well
      updateStockAfterOrder(fxckedUpBagsQty, humanRelationsQty);

          await syncStockFromAPI(); // Immediate
          setTimeout(() => {
            syncStockFromAPI(); // Delayed backup sync
          }, 20 * 60 * 1000);

      // Reset form and handle success
      setFxckedUpBagsQty(0);
      setHumanRelationsQty(0);
      handlePaymentSuccess();
      
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
      performOptimisticUpdate(fxckedUpBagsQty, humanRelationsQty);
  
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
          handlePaymentSuccess();
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
      }
    };
  
    verifyPayment();
  }, []);
  
  


// Function to handle successful payment callback
const handlePaymentSuccess = async () => {
  try {
    console.log("Triggering confetti... 🎉");

    // ✅ Ensure confetti state update applies
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000); // Stop confetti after 5s

    // ✅ Delay alerts slightly to allow confetti to be visible first
    setTimeout(() => {
      alert("Purchase successful! Check your email for details.");
    }, 500);

    // Reset purchase quantities
    setFxckedUpBagsQty(0);
    setHumanRelationsQty(0);

    // Refresh stock data
    // await syncStock();
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <Confetti width={width} height={height} />
        </div>
      )}
    <div className="boost-page">
      {/* {loading && <Loader />} */}

    <div className="boost-header">  
      <Link href="/">
        
          <img
            src="/images/info/output-onlinepngtools (6).png"
            width={24}
            height={24}
            alt="back"
          />
        
      </Link>

    <h1>Ahh. I see you want some boost!</h1>
  </div>
      <h3>Easy peasy! Buy one of the listed books in SmartSnail marketplace </h3>
      
      <div className="books-container">
        {/* Fxcked Up Bags */}
        <div className="book-card">
          <div className="book-header">
            <img src="/images/fuckedup.jpg" alt="fxckedupbags" />
            <h2>FxckedUpBags</h2>
            <span
              className="info-icon"
              onClick={() => setShowFuckedUpInfo(!showFuckedUpInfo)}
            >
              ℹ️
            </span>
            {showFuckedUpInfo && (
              <div className="info-popup">
                <button onClick={() => setShowFuckedUpInfo(false)}>X</button>
                <p>FxckedUpBags by <b>AlexanderTheSage</b> explores personal transformation and self-discipline, focusing on how mindset and choices shape success. It challenges readers to confront ways they may be sabotaging their goals or "messing up their bags" by missing opportunities or wealth. Through practical strategies, the book emphasizes shifting language from "I will" to "I am going to," helping readers take control and align actions with long-term goals. It also critiques hustle culture and encourages a balanced approach to ambition, empowering readers to unlock their true potential.</p>
              </div>
            )}
          </div>
          <p>+5 Tapping Rate</p>
          <p>+100,000 Shells per Copy</p>
          <input
              type="number"
              value={fxckedUpBagsQty || ''} // Show placeholder when 0
              onChange={(e) => setFxckedUpBagsQty(Number(e.target.value) || 0)}
              placeholder={`${(
                stockLimit.fxckedUpBagsLimit - stockLimit.fxckedUpBagsUsed +
                stockLimit.humanRelationsLimit - stockLimit.humanRelationsUsed
              )} more sales until launch`}
              max={stockLimit.fxckedUpBagsLimit - stockLimit.fxckedUpBagsUsed}
            />
            <span className="counter-text" key={`fub-counter-${stockLimit.fxckedUpBagsUsed}`}
               id="fub-counter">
              {stockLimit.fxckedUpBagsUsed}/{stockLimit.fxckedUpBagsLimit} sold
            </span>
        </div>

        {/* Human Relations */}
        <div className="book-card">
          <div className="book-header">
            <img src="/images/human.jpg" alt="humanrelations" />
            <h2>Human Relations</h2>
            <span
              className="info-icon"
              onClick={() => setShowHumanRelationsInfo(!showHumanRelationsInfo)}
            >
              ℹ️
            </span>
            {showHumanRelationsInfo && (
              <div className="info-popup">
                <button onClick={() => setShowHumanRelationsInfo(false)}>X</button>
                <p>The book Human Relations by <b>Kennedy E. O.</b> was inspired by the need to properly educate individuals about the nature of life and its existence using the principles of human relations. The book which is in fourteen chapters discusses in detail the process of human relations as a tool for a better life and the best tool to deal with all individuals you meet in life, while using the principles of human relations as basis for achieving greatness. It also explores many solutions to the challenges we face as humans in making ourselves sociable and accepted</p>
              </div>
            )}
          </div> 
          <p>+7 Tapping Rate</p>
          <p>+30,000 Shells per Copy</p>
          <input
            type="number"
            value={humanRelationsQty || ''} // Show placeholder when 0
            onChange={(e) => setHumanRelationsQty(Number(e.target.value) || 0)}
            placeholder={`${(
              stockLimit.fxckedUpBagsLimit - stockLimit.fxckedUpBagsUsed +
              stockLimit.humanRelationsLimit - stockLimit.humanRelationsUsed
            )} more sales until launch`}
            max={stockLimit.humanRelationsLimit - stockLimit.humanRelationsUsed}
          />
            <span 
              className="counter-text"
              key={`hr-counter-${stockLimit.humanRelationsUsed}`}
               id="hr-counter"
            >
              {stockLimit.humanRelationsUsed}/{stockLimit.humanRelationsLimit} sold
            </span>
        </div>
      </div>

       {/* Summary Section */}
       <div className="summary-container">
        <p>Total Tapping Rate: {tappingRate}</p>
        <p>Total Coins: {points}</p>
        <p>Total TON: {priceTon}</p>
        <p>Total Stars: {priceStars}</p>
        
        <input
          type="email"
          value={purchaseEmail}
          onChange={(e) => setPurchaseEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      {/* Payment Buttons */}
      <div className="payment-buttons">
        <button onClick={() => handlePurchase("TON")} disabled={isProcessing}>

          {isProcessing ? <span className="spinner-gear"></span> : "Pay with TON"}
        </button>
        <button
      onClick={() => handlePurchase("Card")}
      disabled={true} // Permanently disabled
    >
      Pay with Card
    </button>
        <button onClick={() => handlePaymentViaStars("Stars")} disabled={isProcessing}>
          {isProcessing ? <span className="spinner-gear"></span> : "Pay with Stars"}
        </button>
      </div>

       {/* Divider with "OR" */}
        <div className="or-divider">
          <span>OR</span>
        </div>

      {/* Code Redemption Section */}
      <div className="code-section">
        <h3>Redeem with Unique Code</h3>
        <input
          type="text"
          value={uniqueCode}
          onChange={(e) => setUniqueCode(e.target.value)}
          placeholder="Unique Code"
        />
        <input
          type="text"
          value={referralLink}
          onChange={(e) => setReferralLink(e.target.value)}
          placeholder="Referral Link/ID"
        />
        <input
          type="email"
          value={redemptionEmail}
          onChange={(e) => setRedemptionEmail(e.target.value)}
          placeholder="Your Email"
        />
        <div className="payment-buttons">
          <button onClick={handleCodeRedemption} disabled={isProcessing}>
            {isProcessing ? <span className="spinner-gear"></span> : "Redeem Code"}
          </button>
        </div></div>

      {/* Message Display */}
      {message && <p className="message">{message}</p>}
      
    </div>
    </>
  );
}