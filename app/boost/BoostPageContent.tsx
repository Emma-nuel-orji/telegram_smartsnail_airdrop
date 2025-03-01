'use client';
import React, { useState, useEffect, useCallback, useContext } from "react";
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
    setStockLimit,
    setUser,
  } = useBoostContext();

  // State Management
  const [showConfetti, setShowConfetti] = useState(false);
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
  const fetchStockData = useCallback(async () => {
    try {
      const stockResponse = await axios.get("/api/stock");
      console.log("Fetched stock data:", stockResponse.data); // Debugging log
      setStockLimit(stockResponse.data);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    }
  }, [setStockLimit]);

  useEffect(() => {
    const initializeClient = async () => {
      if (typeof window !== 'undefined') {
        if (WebApp && WebApp.initDataUnsafe) {
          const telegramUser = WebApp.initDataUnsafe.user;
          if (telegramUser?.id) {
            setTelegramId(telegramUser.id.toString());
          }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get("ref");
        if (ref) {
          setReferrerId(ref);
        }

        setIsClient(true);
        await fetchStockData();
      }
    };

    initializeClient();

    let pollingInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      pollingInterval = setInterval(async () => {
        try {
          await fetchStockData();
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 10000); // Poll every 10 seconds
    };

  
    
return () => {
  if (pollingInterval) clearInterval(pollingInterval);
  
};
  }, [fetchStockData, telegramId, setStockLimit]);
  

  // Purchase Handler
  const fxckedUpBagsId = "6796dbfa223a935d969d56e6"; 
  const humanRelationsId = "6796dbfa223a935d969d56e7"; 

  
  const handlePurchase = async (paymentMethod: string) => {
    try {
      if (!purchaseEmail || !/\S+@\S+\.\S+/.test(purchaseEmail)) {
        alert("Please enter a valid email to proceed with the purchase.");
        return;
      }
  
      if (totalBooks === 0) {
        alert("Please select at least one book to purchase.");
        return;
      }
  
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

  // Validate receiver address
  // const receiverAddress = process.env.NEXT_PUBLIC_TON_WALLET_ADDRESS; 
  const receiverAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS;
if (!receiverAddress) {
  console.error("Receiver address is not configured in environment variables.");
  alert("Receiver address is not configured. Please contact support.");
  return;
}

console.log("Receiver Address:", receiverAddress); // Debugging: Verify the address

const transaction = {
  validUntil: Math.floor(Date.now() / 1000) + 360, // 6 minutes validity
  messages: [
    {
      address: receiverAddress, // Use the validated receiver address
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

          const userId = window.Telegram.WebApp.initDataUnsafe?.user?.id || undefined;

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
  
      console.log("11. Purchase successful!");
      handlePaymentSuccess();
     
      console.log("Redirecting with userId:", userId);

      if (userId) {
        setTimeout(() => {
          router.push(`/payment-result?orderId=${orderId}&userId=${userId}`);
        }, 2000);
      } else {
        console.error("User ID is missing. Payment result page might not load correctly.");
      }

  
    } catch (error) {
      console.error("Purchase error:", error);
      if (axios.isAxiosError(error)) {
        alert(`Purchase failed: ${error.response?.data?.error || error.message}`);
      } else {
        alert("Purchase failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  


  const handlePaymentViaStars = async (paymentMethod?: string) => {
    if (paymentMethod !== "Stars") {
      alert("Invalid payment method.");
      return;
    }
  
    // Validation checks
    if (!purchaseEmail) {
      alert("Please enter your email to proceed with the payment.");
      return;
    }
  
    if (totalBooks === 0) {
      alert("Please select at least one book to purchase.");
      return;
    }
  
    setIsProcessing(true);
  
    try {
      const payload = JSON.stringify({  
        email: purchaseEmail,
        title: `Stars Payment for ${totalBooks} Books`,
        description: `Stars payment includes ${fxckedUpBagsQty} FxckedUpBags and ${humanRelationsQty} Human Relations books.`,
        amount: Math.round(priceStars),  
        label: "SMARTSNAIL Stars Payment",
        paymentMethod: "Stars",
        bookCount: totalBooks,
        tappingRate,
        points,
        priceTon,
        priceStars: Math.round(priceStars), 
        fxckedUpBagsQty,
        humanRelationsQty,
        telegramId,
        referrerId,
      });
  
      // Set headers and conditionally add Telegram init data
      const headers: { [key: string]: string } = {
        "Content-Type": "application/json",  
      };
  
      if (process.env.NODE_ENV === "production") {
        const initData = window.Telegram.WebApp.initData;
        headers["x-telegram-init-data"] = initData;
      }
  
      const response = await axios.post("/api/paymentByStars", payload, { headers });
  
      if (response.data.invoiceLink) {
        // localStorage.setItem("starsPaymentSuccess", "true");
        window.location.href = response.data.invoiceLink; 
       
      } else {
        throw new Error("Failed to create payment link");
      }
    } catch (error) {
      console.error("Payment failed:", error);
      alert("An error occurred during payment. Please try again.");
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
    await fetchStockData();
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
};


  // Code Redemption Handler
  const handleCodeRedemption = async () => {
    if (!uniqueCode || !redemptionEmail  || !referralLink) {
      alert("Please fill in all fields: Unique Code, Email, and Referral Link");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/redeemCode", {
        userId: telegramId,
        email: redemptionEmail,  
        uniqueCode,
        referrerId: referralLink,
      });

      if (response.status === 200) {
        setMessage("Code redeemed successfully! You've earned 100,000 Shells!");
      } else {
        setMessage(response.data.error || "Code redemption failed.");
      }
    } catch (error) {
      console.error("Redemption error:", error);
      setMessage("An error occurred during redemption.");
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
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={500}
      />
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
            value={fxckedUpBagsQty}
            onChange={(e) => setFxckedUpBagsQty(Number(e.target.value))}
            placeholder={`${totalBooksRemaining} more sales until launch`}
            max={stockLimit.fxckedUpBagsLimit - stockLimit.fxckedUpBagsUsed}
          />
          <span className="counter-text">{`${stockLimit.fxckedUpBagsUsed}/${stockLimit.fxckedUpBagsLimit} sold`}</span>
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
            value={humanRelationsQty}
            onChange={(e) => setHumanRelationsQty(Number(e.target.value))}
            placeholder={`${totalBooksRemaining} more sales until launch`}
            max={stockLimit.humanRelationsLimit - stockLimit.humanRelationsUsed}
          />
          <span className="counter-text">{`${stockLimit.humanRelationsUsed}/${stockLimit.humanRelationsLimit} sold`}</span>
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
        <button onClick={() => handlePurchase("Card")} disabled={isProcessing}>
          {isProcessing ? <span className="spinner-gear"></span> : "Pay with Card"}
        </button>
        <button onClick={() => handlePaymentViaStars("Stars")} disabled={isProcessing}>
          {isProcessing ? <span className="spinner-gear"></span> : "Pay with Stars"}
        </button>
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