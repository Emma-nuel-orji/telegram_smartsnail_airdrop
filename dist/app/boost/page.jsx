"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
require("./BoostPage.css");
const link_1 = __importDefault(require("next/link"));
const BoostPage = () => {
    const [fxckedUpBagsQty, setfxckedUpBagsQty] = (0, react_1.useState)(0);
    const [humanRelationsQty, sethumanRelationsQty] = (0, react_1.useState)(0);
    const [email, setEmail] = (0, react_1.useState)("");
    const [uniqueCode, setUniqueCode] = (0, react_1.useState)("");
    const [referralId, setreferralId] = (0, react_1.useState)("");
    const [message, setMessage] = (0, react_1.useState)("");
    const [telegramId, setTelegramId] = (0, react_1.useState)(null);
    const [showFuckedUpInfo, setShowFuckedUpInfo] = (0, react_1.useState)(false);
    const [showhumanRelationsInfo, setShowhumanRelationsInfo] = (0, react_1.useState)(false);
    const [fxckedUpBagsAvailable, setfxckedUpBagsAvailable] = (0, react_1.useState)(5000);
    const [humanRelationsAvailable, sethumanRelationsAvailable] = (0, react_1.useState)(7000);
    const totalBooks = fxckedUpBagsQty + humanRelationsQty;
    const totalTappingRate = fxckedUpBagsQty * 5 + humanRelationsQty * 2;
    const totalPoints = fxckedUpBagsQty * 100000 + humanRelationsQty * 70000;
    const totalTon = totalBooks * 1;
    (0, react_1.useEffect)(() => {
        // Fetch available stock and sold counts dynamically
        const fetchStockDetails = async () => {
            try {
                const response = await fetch("/api/getStockDetails");
                const data = await response.json();
                setfxckedUpBagsAvailable(data.fxckedUpBagsAvailable);
                sethumanRelationsAvailable(data.humanRelationsAvailable);
            }
            catch (error) {
                console.error("Error fetching stock details:", error);
            }
        };
        fetchStockDetails();
    }, []);
    (0, react_1.useEffect)(() => {
        const telegramUser = Telegram.WebApp.initDataUnsafe?.user;
        if (telegramUser) {
            setTelegramId(telegramUser.id.toString());
        }
    }, []);
    const handlePurchase = async (paymentMethod) => {
        if (!email) {
            alert("Please enter your email to proceed with the purchase.");
            return;
        }
        if (totalBooks === 0) {
            alert("Please select at least one book to purchase.");
            return;
        }
        try {
            const response = await fetch("/api/purchaseBooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    paymentMethod,
                    fxckedUpBagsQty,
                    humanRelationsQty,
                    telegramId,
                }),
            });
            const result = await response.json();
            if (response.ok) {
                alert("Purchase successful! Check your email for details.");
                setfxckedUpBagsQty(0);
                sethumanRelationsQty(0);
                setMessage(result.message);
                // Update the tapping rate dynamically
                const { updatedTappingRate } = result;
                alert(`Your tapping rate is now ${updatedTappingRate}!`);
                // Optional: Add state or function to display the tapping rate on the page.
                // Refresh available stock
                const stockResponse = await fetch("/api/getStockDetails");
                const stockData = await stockResponse.json();
                setfxckedUpBagsAvailable(stockData.fxckedUpBagsAvailable);
                sethumanRelationsAvailable(stockData.humanRelationsAvailable);
            }
            else {
                alert(result.error || "An error occurred during the purchase.");
            }
        }
        catch (error) {
            alert("An error occurred during the purchase. Please try again.");
        }
    };
    const [currentTappingRate, setCurrentTappingRate] = (0, react_1.useState)(1);
    // Update tapping rate after purchase
    const updateTappingRate = (newRate) => {
        setCurrentTappingRate(newRate);
    };
    // Use the new rate in the purchase flow
    if (response.ok) {
        const { updatedTappingRate } = result;
        updateTappingRate(updatedTappingRate);
    }
    const handleCodeRedemption = async () => {
        if (!uniqueCode || !referralId || !email) {
            alert("Please enter all fields for code redemption.");
            return;
        }
        try {
            const response = await fetch("/api/redeemCode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, uniqueCode, referralId }),
            });
            const result = await response.json();
            if (response.ok) {
                setMessage("Code redeemed successfully! You have earned 100,000 Shells!");
            }
            else {
                setMessage(result.error || "An error occurred. Please try again.");
            }
        }
        catch (error) {
            setMessage("An error occurred. Please try again.");
        }
    };
    return (<div className="boost-page">
      <link_1.default href="/">
        <img src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back"/>
      </link_1.default>

      <h1>Ahh.. I see you want some boost!</h1>
      <p>Very easy! Just buy a book in our marketplace, as much as you can and see how much nitro you get!</p>

      <div className="books-container">
        {/* Book 1 */}
        <div className="book-card">
          <div className="book-header">
            <img src="/images/fuckedup.jpg" alt="fuckedup"/>
            <h2>FxckedUpBags</h2>
            <span className="info-icon" onClick={() => setShowFuckedUpInfo(!showFuckedUpInfo)}>
              ℹ️
            </span>
            {showFuckedUpInfo && (<div className="info-popup">
                <button onClick={() => setShowFuckedUpInfo(false)}>X</button>
                <p>FxckedUpBags by <b>AlexanderTheSage</b> explores personal transformation and self-discipline, focusing on how mindset and choices shape success. It challenges readers to confront ways they may be sabotaging their goals or "messing up their bags" by missing opportunities or wealth. Through practical strategies, the book emphasizes shifting language from "I will" to "I am going to," helping readers take control and align actions with long-term goals. It also critiques hustle culture and encourages a balanced approach to ambition, empowering readers to unlock their true potential.</p>
              </div>)}
          </div>
          <p>+5 Tapping Rate</p>
          <p>+100,000 Shells per Copy</p>
          <input type="number" value={fxckedUpBagsQty || ""} onChange={(e) => setfxckedUpBagsQty(Number(e.target.value))} placeholder={`Available: ${fxckedUpBagsAvailable}`}/>
          <span className="counter-text">{`${5000 - fxckedUpBagsAvailable}/5000 sold`}</span>
        </div>

        {/* Book 2 */}
        <div className="book-card">
          <div className="book-header">
            <img src="/images/human.jpg" alt="human"/>
            <h2>Human Relations</h2>
            <span className="info-icon" onClick={() => setShowhumanRelationsInfo(!showhumanRelationsInfo)}>
              ℹ️
            </span>
            {showhumanRelationsInfo && (<div className="info-popup">
                <button onClick={() => setShowhumanRelationsInfo(false)}>X</button>
                <p>The book Human Relations by <b>Kennedy E. O.</b> wass inspired by the need to properly educate individuals about the nature of life and its existence using the principles of human relations. The book which is in fourteen chapters discusses in detail the process of human relations as a tool for a better life and the best tool to deal with all individuals you meet in life, while using the principles of human relations as basis for achieving greatness. It also explores many solutions to the challenges we face as humans in making ourselves sociable and accepted.</p>
              </div>)}
          </div>
          <p>+2 Tapping Rate</p>
          <p>+70,000 Shells per Copy</p>
          <input type="number" value={humanRelationsQty || ""} onChange={(e) => sethumanRelationsQty(Number(e.target.value))} placeholder={`Available: ${humanRelationsAvailable}`}/>
          <span className="counter-text">{`${7000 - humanRelationsAvailable}/7000 sold`}</span>
        </div>
      </div>

      {/* Summary and Email */}
      <div className="summary-container">
        <p>Total Tapping Rate: {totalTappingRate}</p>
        <p>Total Coins: {totalPoints}</p>
        <p>Total Ton: {totalTon}</p>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email"/>
      </div>

      {/* Payment Buttons */}
      <div className="payment-buttons">
        <button onClick={() => handlePurchase("Ton")}>Pay with Ton</button>
        <button onClick={() => handlePurchase("Card")}>Pay with Card</button>
      </div>

      {/* Code Redemption */}
      <div className="code-section">
        <h3>Redeem with Unique Code</h3>
        <input type="text" value={uniqueCode} onChange={(e) => setUniqueCode(e.target.value)} placeholder="Unique Code"/>
        <input type="text" value={referralId} onChange={(e) => setreferralId(e.target.value)} placeholder="Referral ID"/>
        <button onClick={handleCodeRedemption}>Submit</button>
      </div>
    </div>);
};
exports.default = BoostPage;
