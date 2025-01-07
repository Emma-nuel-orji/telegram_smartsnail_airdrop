'use client';
import React, { useState, useEffect, useCallback, useContext } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import axios from "axios";
import WebApp from "@twa-dev/sdk";
import Loader from "@/loader";
import TelegramInit from "@/components/TelegramInit";
import "./BoostPage.css";
import { useRouter } from "next/navigation";
import { generateHMACSignature } from "@/src/utils/paymentUtils"

// Context
// import { BoostContext, StockLimit } from "@/context/BoostContext";
import { useBoostContext } from "../api/context/BoostContext";



interface StockLimit {
  fxckedUpBagsLimit: number;
  humanRelationsLimit: number;
  fxckedUpBagsUsed: number;
  fxckedUpBags: number;
  humanRelationsUsed: number;
  humanRelations: number;
}
// Initial Stock Limit
const INITIAL_STOCK_LIMIT = {
  fxckedUpBagsLimit: 10000,
  humanRelationsLimit: 15000,
  fxckedUpBagsUsed: 0,
  fxckedUpBags: 0,
  humanRelationsUsed: 0,
  humanRelations: 0,
};

// WebSocket server URL
const SOCKET_SERVER_URL = "http://localhost:3000"; // Update with your server's address

export default function BoostPageContent() {
  const router = useRouter();
  const {
    user,
    stockLimit,
    setStockLimit,
    setUser,
  } = useBoostContext();

  // State Management
  const [isClient, setIsClient] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [uniqueCode, setUniqueCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [purchaseEmail, setPurchaseEmail] = useState("");
  const [redemptionEmail, setRedemptionEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Book Quantities
  const [fxckedUpBagsQty, setFxckedUpBagsQty] = useState(0);
  const [humanRelationsQty, setHumanRelationsQty] = useState(0);

const [isSocketConnected, setIsSocketConnected] = useState(false);

  // UI States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showFuckedUpInfo, setShowFuckedUpInfo] = useState(false);
  const [showHumanRelationsInfo, setShowHumanRelationsInfo] = useState(false);

  // Calculations
  const totalBooks = fxckedUpBagsQty + humanRelationsQty;
  const totalTappingRate = fxckedUpBagsQty * 5 + humanRelationsQty * 2;
  const totalPoints = fxckedUpBagsQty * 100000 + humanRelationsQty * 70000;
  const totalTon = totalBooks * 1;
  const starsAmount = totalBooks * 4 * 100;

  // Stock Calculations
  const totalBooksRemaining = 
    stockLimit.fxckedUpBagsLimit - stockLimit.fxckedUpBagsUsed +
    (stockLimit.humanRelationsLimit - stockLimit.humanRelationsUsed);

  // Fetch Stock Data
  const fetchStockData = useCallback(async () => {
    try {
      const stockResponse = await axios.get("/api/stok");
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
      }, 100000);// Poll every 10 se
    };

    const socket = new WebSocket("ws://localhost:3000/socket");

    socket.onopen = () => {
      console.log("WebSocket connection established.");
      socket.send(JSON.stringify({ action: "initialize", telegramId }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "stock-update") {
        setStockLimit(data.payload);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      socket.close();
    };
  }, [fetchStockData, telegramId, setStockLimit]);

  // Purchase Handler
  const handlePurchase = async (paymentMethod: string) => {
    if (!purchaseEmail || !/\S+@\S+\.\S+/.test(purchaseEmail)) {
      alert("Please enter a valid email to proceed with the purchase.");
      return;
    }
  
    if (totalBooks === 0) {
      alert("Please select at least one book to purchase.");
      return;
    }
  
    setIsProcessing(true);
  
    // Ensure paymentMethod is correctly capitalized
    const formattedPaymentMethod = paymentMethod.toUpperCase();
    const paymentReference = `TX-${Date.now()}`;
    
    const hmacSignature = generateHMACSignature(
      `${telegramId}:${paymentMethod}:${paymentReference}`, 
    
      process.env.SECRET_KEY || ''
    );
  
  
  
    try {
      const payload = {
        email: purchaseEmail,
        paymentMethod: formattedPaymentMethod,
        bookCount: totalBooks,
        totalTappingRate,
        totalPoints,
        totalTon,
        starsAmount,
        fxckedUpBagsQty,
        humanRelationsQty,
        telegramId: telegramId || "",  // Ensure telegramId is not null or undefined
        referrerId,
        hmacSignature,                // Include the HMAC signature
        paymentReference,             // Include the payment reference
      };
  
      const endpoint =
        formattedPaymentMethod === "TON" || formattedPaymentMethod === "CARD"
          ? "../api/purchase"
          : "../api/paymentByStars";
  
      const response = await axios.post(endpoint, payload);
  
      if (response.status === 200) {
        if (formattedPaymentMethod === "TON") {
          // Redirect to TON wallet payment page with order ID
          router.push(`/wallet?orderId=${response.data.orderId}`);
          return;
        }
  
        // For other payment methods, continue with existing success flow
        alert("Purchase successful! Check your email for details.");
  
        // Reset quantities
        setFxckedUpBagsQty(0);
        setHumanRelationsQty(0);
  
        // Refresh stock
        await fetchStockData();
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Purchase failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

    // Purchase Handler for Stars
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
        const payload = {
          email: purchaseEmail,
          title: `Stars Payment for ${totalBooks} Books`,
          description: `Stars payment includes ${fxckedUpBagsQty} FxckedUpBags and ${humanRelationsQty} Human Relations books.`,
          amount: starsAmount,
          label: "SMARTSNAIL Stars Payment",
          paymentMethod: "Stars",
          bookCount: totalBooks,
          totalTappingRate,
          totalPoints,
          totalTon,
          starsAmount,
          fxckedUpBagsQty,
          humanRelationsQty,
          telegramId,
          referrerId,
        };
  
        const response = await axios.post("/api/paymentByStars", payload);

    if (response.data.invoiceLink) {
      // Instead of showing success alert immediately, redirect to Telegram's payment interface
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

// Function to handle successful payment callback
const handlePaymentSuccess = async () => {
  try {
    // Reset quantities
    setFxckedUpBagsQty(0);
    setHumanRelationsQty(0);

    // Refresh stock
    await fetchStockData();

    // Show success message
    alert("Purchase successful! Check your email for details.");
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
    return <Loader />;
  }

  return (
    <div className="boost-page">
      {loading && <Loader />}

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
          <p>+2 Tapping Rate</p>
          <p>+70,000 Shells per Copy</p>
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
        <p>Total Tapping Rate: {totalTappingRate}</p>
        <p>Total Coins: {totalPoints}</p>
        <p>Total TON: {totalTon}</p>
        <p>Total Stars: {starsAmount}</p>
        
        <input
          type="email"
          value={purchaseEmail}
          onChange={(e) => setPurchaseEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      {/* Payment Buttons */}
      <div className="payment-buttons">
        <button onClick={() => handlePurchase("Ton")} disabled={isProcessing}>
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
  );
}