"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import crypto from "crypto";
import axios from "axios";
import Loader from "../../Loader";
import "./BoostPage.css";
import WebApp from "@twa-dev/sdk";


interface StockLimit {
  fxckedUpBagsLimit: number;
  humanRelationsLimit: number;
  fxckedUpBagsUsed: number;
  fxckedUpBags: number;
  humanRelationsUsed: number;
  humanRelations: number;
}

const BoostPage: React.FC = () => {
  const [fxckedUpBagsQty, setFxckedUpBagsQty] = useState(0);
  const [humanRelationsQty, setHumanRelationsQty] = useState(0);
  const [email, setEmail] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");
  const [referralId, setreferralId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [stockLimit, setStockLimit] = useState<StockLimit>({
    fxckedUpBagsLimit: 10000,
    humanRelationsLimit: 20000,
    fxckedUpBagsUsed: 0,
    humanRelationsUsed: 0,
    fxckedUpBags: 0,
    humanRelations: 0,
  });
  
  const [showFuckedUpInfo, setShowFuckedUpInfo] = useState(false);
  const [showHumanRelationsInfo, setShowHumanRelationsInfo] = useState(false);
  const [referrerIdInput, setReferrerIdInput] = useState('');
  const totalBooks = fxckedUpBagsQty + humanRelationsQty;
  const totalTappingRate = fxckedUpBagsQty * 5 + humanRelationsQty * 2;
  const totalPoints = fxckedUpBagsQty * 100000 + humanRelationsQty * 70000;
  const totalTon = totalBooks * 1;
  const starsAmount = totalBooks * 100;
  const [referralLink, setReferralLink] = useState<string>('');

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null); // Replace `any` with a specific type if possible
  // Calculate total remaining stock
  const totalBooksRemaining =
    stockLimit.fxckedUpBagsLimit - stockLimit.fxckedUpBagsUsed +
    (stockLimit.humanRelationsLimit - stockLimit.humanRelationsUsed);

  const remainingFxckedUpBags = stockLimit.fxckedUpBagsLimit - stockLimit.fxckedUpBagsUsed;
  const remainingHumanRelations = stockLimit.humanRelationsLimit - stockLimit.humanRelationsUsed;

  // Fetch stock data function
  const fetchStockData = async () => {
    try {
      const stockResponse = await axios.get("/api/stock");
      const stockData = stockResponse.data;
      setStockLimit({
        fxckedUpBagsLimit: stockData.fxckedUpBagsLimit,
        humanRelationsLimit: stockData.humanRelationsLimit,
        fxckedUpBagsUsed: stockData.fxckedUpBagsUsed || 0,
        humanRelationsUsed: stockData.humanRelationsUsed || 0,
        fxckedUpBags: stockData.fxckedUpBags || 0,
        humanRelations: stockData.humanRelations || 0,
      });
    } catch (error) {
      console.error("Error fetching stock data:", error);
    }
  };

  useEffect(() => {
    fetchStockData();
  

    // Fetch Telegram user details (if available)
    const telegramUser = Telegram.WebApp.initDataUnsafe?.user;
    if (telegramUser) {
      setTelegramId(telegramUser.id.toString());
    }
  }, []);



  const handlePurchaseHelper = async (
    paymentMethod: string,
    payload: Record<string, any>,
    endpoint: string
  ) => {
    try {
      // Send the request to the appropriate backend endpoint
      const response = await axios.post(endpoint, payload);
  
      if (response.status === 200) {
        alert("Purchase successful! Check your email for details.");
  
        if (response.data.redirectUrl) {
          // Redirect to the URL if provided
          window.location.href = response.data.redirectUrl;
        }
  
        return response.data; // Return response data for further use if needed
      } else {
        throw new Error(response.data.error || "An error occurred during the purchase.");
      }
    } catch (error) {
      console.error(`Error during ${paymentMethod} purchase:`, error);
      alert((error as Error).message || "An error occurred during the purchase.");
      throw error; // Re-throw the error if further handling is needed
    }
  };
  
  const handlePurchase = async (paymentMethod: string) => {
    if (!email) {
      alert("Please enter your email to proceed with the purchase.");
      return;
    }
  
    if (fxckedUpBagsQty === 0 && humanRelationsQty === 0) {
      alert("Please select at least one book to purchase.");
      return;
    }
  
    if (
      fxckedUpBagsQty > stockLimit.fxckedUpBagsLimit ||
      humanRelationsQty > stockLimit.humanRelationsLimit
    ) {
      alert("Not enough stock available.");
      return;
    }
  
    setLoading(true); // Show loading indicator
  
    try {
      const payload = {
        email,
        paymentMethod,
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
  
      const endpoint =
        paymentMethod === "Ton" || paymentMethod === "Card"
          ? "/api/purchase"
          : "/api/paymentByStars";
  
      await handlePurchaseHelper(paymentMethod, payload, endpoint);
  
      // Reset quantities after successful purchase
      setFxckedUpBagsQty(0);
      setHumanRelationsQty(0);
  
      // Refresh stock limits
      fetchStockData(); // Update stock limits
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };
  
  const handlePaymentViaStars = async () => {
    if (!fxckedUpBagsQty && !humanRelationsQty) {
      alert("Please select at least one book to proceed with payment.");
      return;
    }
  
    setLoading(true); // Show loading indicator
  
    try {
      // Build payload dynamically
      const payload = {
        email,
        title: `Stars Payment for ${fxckedUpBagsQty + humanRelationsQty} Books`,
        description: `Stars payment includes ${fxckedUpBagsQty} FxckedUpBags and ${humanRelationsQty} Human Relations books.`,
        amount: starsAmount,
        label: "SMARTSNAIL Stars Payment",
        paymentMethod: "Stars",
        paymentData: {
          fxckedUpBagsQty,
          humanRelationsQty,
          totalTappingRate,
          totalPoints,
          referrerId, // Include referrer if available
        },
      };
  
      // Pass payload to helper for API call
      await handlePurchaseHelper("Stars", payload, "/api/paymentByStars");
    } catch (error) {
      console.error("Payment failed:", error);
      alert("An error occurred during payment. Please try again.");
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };
  

  const [referrerId, setReferrerId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      setReferrerId(ref);
    }
  }, []);


  const handleCodeRedemption = async () => {
    if (!uniqueCode || !email || !referralLink) {
      alert("Please enter all required fields: Unique Code, Email, and Referral Link.");
      return;
    }
  
    try {
      const telegramUser = WebApp.initDataUnsafe?.user; // Retrieve Telegram ID
      if (!telegramUser?.id) {
        setMessage("Unable to retrieve your Telegram ID. Please try again.");
        return;
      }
  
      const userId = telegramUser.id; // Assign the user ID
  
      // Extract the referral user ID from the referral link
      const extractUserIdFromReferralLink = (link: string): string | null => {
        try {
          const url = new URL(link);  // This helps parse the referral URL
          const startParam = url.searchParams.get("startapp");
          return startParam; // Return the user ID (typically numeric) or null if not found
        } catch (error) {
          console.error("Invalid referral link format", error);
          return null;
        }
      };
  
      let referrerId: string | null = null;
  
      if (referralLink) {
        // Extract referrer ID from referral link (expected to be a permanent numeric ID)
        referrerId = extractUserIdFromReferralLink(referralLink);
        if (!referrerId) {
          setMessage("Invalid referral link format.");
          return;
        }
      }
      // If no referral link provided, check for direct referrer ID input
      else if (referrerIdInput) {
        // Validate the direct referrer ID format (@<telegramuserid>)
        if (referrerIdInput.startsWith('@')) {
          referrerId = referrerIdInput;
        } else {
          setMessage("Invalid referrer ID format. It must start with '@' followed by the Telegram User ID.");
          return;
        }
      } else {
        setMessage("You must provide either a referral link or a referrer ID.");
        return;
      }
  
      // Check if the provided referrerId is "SMARTSNAIL" (bypass referral logic)
      if (referrerId === 'SMARTSNAIL') {
        setMessage("Code redeemed successfully! You have earned 100,000 Shells!");
      } else {
        // Regular redemption with referral check
        const response = await axios.post("/api/redeemCode", {
          userId,
          email,
          uniqueCode,
          referrerId, // Use referrerId here
        });
  
        if (response.status === 200) {
          setMessage("Code redeemed successfully! You have earned 100,000 Shells!");
          if (response.data.redirectUrl) {
            // Redirect to the URL returned from the backend
            window.location.href = response.data.redirectUrl;
          }
        } else {
          setMessage(response.data.error || "An error occurred. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error in redemption process:", error);
      setMessage("An error occurred. Please try again.");
    }
  };
  

  return (
    <div className="boost-page">
      {loading && <Loader />}
      <Link href="/">
        <img
          src="/images/info/output-onlinepngtools (6).png"
          width={24}
          height={24}
          alt="back"
        />
      </Link>
      <h1>Ahh.. I see you want some boost!</h1>
      <p>Easy peasy! Buy a book in our marketplace for a boost!</p>

      <div className="books-container">
        {/* Fxcked Up Bags */}
        <div className="book-card">
          <div className="book-header">
            <img src="/images/fuckedup.jpg" alt="fuckedup" />
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
            value={fxckedUpBagsQty || ""}
            onChange={(e) => setFxckedUpBagsQty(Number(e.target.value))}
            placeholder={`${totalBooksRemaining} more sales until launch`}
          />
          <span className="counter-text">{`${stockLimit.fxckedUpBagsUsed}/${stockLimit.fxckedUpBags} sold`}</span>
        </div>
        {/* Human Relations */}
        <div className="book-card">
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
          <p>+2 Tapping Rate</p>
          <p>+70,000 Shells per Copy</p>
          <input
            type="number"
            value={humanRelationsQty || ""}
            onChange={(e) => setHumanRelationsQty(Number(e.target.value))}
            placeholder={`${totalBooksRemaining} more sales until launch`}
          /> <span className="counter-text">{`${stockLimit.humanRelationsUsed}/${stockLimit.humanRelations} sold`}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-container">
        <p>Total Tapping Rate: {totalTappingRate}</p>
        <p>Total Coins: {totalPoints}</p>
        <p>Total Ton: {totalTon}</p>
        <p>Total Stars: {starsAmount}</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      {/* Payment Buttons */}
      <div className="payment-buttons">
        <button onClick={() => handlePurchase("Ton")}>Pay with Ton</button>
        <button onClick={() => handlePurchase("Card")}>Pay with Card</button>
        <button onClick={handlePaymentViaStars}>Pay with Stars</button>
      </div>

      {/* Code Redemption */}
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
  placeholder="Enter Username or Referral Link "
/>
<input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <button onClick={handleCodeRedemption}>Redeem</button>
      </div>

      {message && <p className="message">{message}</p>}
    </div>
    
  );
  
};

export default BoostPage;
