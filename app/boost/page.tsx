"use client";

import React, { useState, useEffect } from 'react';
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

  // countdown section 

  const [fuckedUpBagsAvailable, setFuckedUpBagsAvailable] = useState(5000);
  const [humanNatureAvailable, setHumanNatureAvailable] = useState(7000);

  useEffect(() => {
    const fetchSoldCount = () => {
      const fuckedUpBagsSold = 1500;
      const humanNatureSold = 2000;

      setFuckedUpBagsAvailable(5000 - fuckedUpBagsSold);
      setHumanNatureAvailable(7000 - humanNatureSold);
    };

    fetchSoldCount();
  }, []);

  return (
    <div className="boost-page">
      <Link href="/"><img  src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back" /></Link>

      <h1>Boost Your Tapping Power!</h1>
      <p>Choose a book to enhance your tapping rate and earn more coins!</p>

      <div className="books-container">
        {/* Book Card 1 */}
        <div className="book-card">
          <div className="book-header">
            <img  src="/images/fuckedup.jpg" width={24} height={24} alt="fuckedup" />
            <h2 className='fontss'>Fxckedupbags (Undo Yourself)</h2>
          
            <span className="info-icon" onClick={() => setShowFuckedUpInfo(!showFuckedUpInfo)}>ℹ️</span>
            {showFuckedUpInfo && (
              <div className="info-popup">
                <button onClick={() => setShowFuckedUpInfo(false)}>X</button>
                <p>FxckedUpBags by AlexanderTheSage explores personal transformation and self-discipline, focusing on how mindset and choices shape success. It challenges readers to confront ways they may be sabotaging their goals or "messing up their bags" by missing opportunities or wealth. Through practical strategies, the book emphasizes shifting language from "I will" to "I am going to," helping readers take control and align actions with long-term goals. It also critiques hustle culture and encourages a balanced approach to ambition, empowering readers to unlock their true potential.</p>
              </div>
            )}
          </div>
          <p className='pp'>+5 tapping rate. </p>
          <p className='pp'>+100,000 Shells per copy</p>
          <input
            type="number"
            value={fuckedUpBagsQty === 0 ? '' : fuckedUpBagsQty}
            placeholder="0" // Display "0" as a placeholder
            onChange={(e) => setFuckedUpBagsQty(Number(e.target.value))}
          />
          <span className="counter-text">{`${5000 - fuckedUpBagsAvailable}/5000 sold`}</span>
        </div>

        {/* Book Card 2 */}
        <div className="book-card">
          <div className="book-header">
            <img  src="/images/human.jpg" width={24} height={24} alt="human" />
            <h2 className='fontss'>Human Relations <span className='spann'>(Human Relations)</span></h2>

            <span className="info-icon" onClick={() => setShowHumanNatureInfo(!showHumanNatureInfo)}>ℹ️</span>
            {showHumanNatureInfo && (
              <div className="info-popup">
                <button onClick={() => setShowHumanNatureInfo(false)}>X</button>
                <p>The book Human Relations by Kennedy E. O. wass inspired by the need to properly educate individuals about the nature of life and its existence using the principles of human relations. The book which is in fourteen chapters discusses in detail the process of human relations as a tool for a better life and the best tool to deal with all individuals you meet in life, while using the principles of human relations as basis for achieving greatness. It also explores many solutions to the challenges we face as humans in making ourselves sociable and accepted.</p>
              </div>
            )}
          </div>
          <p className='pp'>+2 tapping rate.</p>
          <p className='pp'>+70,000 Shells per copy</p>
          <input type="number" 
          placeholder="0" // Display "0" as a placeholder 
          value={humanNatureQty === 0 ? '' : humanNatureQty} // If 0, show empty input 
          onChange={(e) => setHumanNatureQty(Number(e.target.value))} 
          />
          <span className="counter-text">{`${7000 - humanNatureAvailable}/7000 sold`}</span>
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
      <br />
      <div className="or-divider">OR</div>

        {/* Unique Code Entry Section */}
        <div className="code-section">
        <h3 className="tests">Redeem with Unique Code</h3>
        <input type="text" placeholder="Unique Code" />
        <input type="text" placeholder="Referral ID" />
        <input
          type="email"
          value={email}
          placeholder="Enter your email"
        />

      </div>
      <div className="payment-buttons">
        <button>Submit</button>
      </div>
    </div>
  );
};

export default BoostPage;
