"use client";

import React, { useState } from 'react';
import './BoostPage.css';
import Link from 'next/link';

const BoostPage: React.FC = () => {
  const [fuckedUpBagsQty, setFuckedUpBagsQty] = useState(0);
  const [humanNatureQty, setHumanNatureQty] = useState(0);
  const [email, setEmail] = useState('');
  const [showFuckedUpInfo, setShowFuckedUpInfo] = useState(false);
  const [showHumanNatureInfo, setShowHumanNatureInfo] = useState(false);

  const totalBooks = fuckedUpBagsQty + humanNatureQty;
  const totalTappingRate = fuckedUpBagsQty * 5 + humanNatureQty * 2;
  const totalCoins = fuckedUpBagsQty * 100000 + humanNatureQty * 70000;
  const totalTon = totalBooks * 1; // Assuming 1 ton per book

  const handlePurchase = (paymentMethod: string) => {
    console.log(`Purchasing with ${paymentMethod}`);
    console.log(`Email: ${email}, Unique Codes for ${totalBooks} books`);
  };

  return (
    <div className="boost-page">
      <Link href="/"><img  src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back" /></Link>

      <h1>Boost Your Tapping Power!</h1>
      <p>Choose a book to enhance your tapping rate and earn more coins!</p>

      <div className="books-container">
        {/* Book Card 1 */}
        <div className="book-card">
          <div className="book-header">
            <h2>Fxckedupbags (Undo Yourself)</h2>
            <span className="info-icon" onClick={() => setShowFuckedUpInfo(!showFuckedUpInfo)}>ℹ️</span>
            {showFuckedUpInfo && (
              <div className="info-popup">
                <p>Fxckedupbags boosts tapping rate by +5 and grants 100,000 coins per copy.</p>
                <button onClick={() => setShowFuckedUpInfo(false)}>Close</button>
              </div>
            )}
          </div>
          <p>+5 tapping rate, 100,000 coins per copy</p>
          <input
            type="number"
            value={fuckedUpBagsQty}
            onChange={(e) => setFuckedUpBagsQty(Number(e.target.value))}
          />
        </div>

        {/* Book Card 2 */}
        <div className="book-card">
          <div className="book-header">
            <h2>Human Nature</h2>
            <span className="info-icon" onClick={() => setShowHumanNatureInfo(!showHumanNatureInfo)}>ℹ️</span>
            {showHumanNatureInfo && (
              <div className="info-popup">
                <p>Human Nature boosts tapping rate by +2 and grants 70,000 coins per copy.</p>
                <button onClick={() => setShowHumanNatureInfo(false)}>Close</button>
              </div>
            )}
          </div>
          <p>+2 tapping rate, 70,000 coins per copy</p>
          <input
            type="number"
            value={humanNatureQty}
            onChange={(e) => setHumanNatureQty(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Summary and Email */}
      <div className="summary-container">
        <p>Total Tapping Rate: {totalTappingRate}</p>
        <p>Total Coins: {totalCoins}</p>
        <p>Total Ton: {totalTon}</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      {/* Payment Options */}
      <div className="payment-buttons">
        <button onClick={() => handlePurchase('Ton')}>Pay with Ton</button>
        <button onClick={() => handlePurchase('Card')}>Pay with Card</button>
      </div>
    </div>
  );
};

export default BoostPage;
