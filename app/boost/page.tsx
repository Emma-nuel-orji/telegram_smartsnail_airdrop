"use client";

import React, { useState } from 'react';

const BoostPage = () => {
  const [fuckedUpBagsQty, setFuckedUpBagsQty] = useState(0);
  const [humanNatureQty, setHumanNatureQty] = useState(0);
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Ton');
  const [uniqueCode, setUniqueCode] = useState('');
  const [referralId, setReferralId] = useState('');

  // Book data
  const BOOKS = {
    fuckedUpBags: { price: 1, tappingRate: 5, coins: 100000, availableCopies: 5000 },
    humanNature: { price: 1, tappingRate: 2, coins: 70000, availableCopies: 7000 },
  };

  // Calculate totals
  const calculateTotals = () => {
    const fuckedUpBagsTotal = fuckedUpBagsQty * BOOKS.fuckedUpBags.price;
    const humanNatureTotal = humanNatureQty * BOOKS.humanNature.price;

    const totalTappingRate =
      fuckedUpBagsQty * BOOKS.fuckedUpBags.tappingRate +
      humanNatureQty * BOOKS.humanNature.tappingRate;

    const totalCoins =
      fuckedUpBagsQty * BOOKS.fuckedUpBags.coins +
      humanNatureQty * BOOKS.humanNature.coins;

    const totalCostInTon = fuckedUpBagsTotal + humanNatureTotal;

    return { totalTappingRate, totalCoins, totalCostInTon };
  };

  const totals = calculateTotals();

  // Handle card payment redirection
  const handleCardPayment = () => {
    window.location.href = 'https://flutterwave.com/pay/yourpaymentlink';
  };

  // Handle purchase and send unique codes
  const handlePurchase = async () => {
    const purchaseData = {
      fuckedUpBagsQty,
      humanNatureQty,
      email,
      paymentMethod,
      uniqueCode,
      referralId,
    };

    await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchaseData),
    });

    alert("Purchase completed! Check your email for the codes.");
  };

  return (
    <div>
      <h2>Boost Page</h2>
      
      <div>
        <h3>Fxckedupbags (Undo yourself)</h3>
        <p>Available copies: {BOOKS.fuckedUpBags.availableCopies}</p>
        <p>Price: {BOOKS.fuckedUpBags.price} Ton per copy</p>
        <p>Tapping Rate Boost: +{BOOKS.fuckedUpBags.tappingRate} per copy</p>
        <p>Coins: {BOOKS.fuckedUpBags.coins} per copy</p>
        <input
          type="number"
          value={fuckedUpBagsQty}
          onChange={(e) => setFuckedUpBagsQty(Number(e.target.value))}
          placeholder="Quantity"
        />
      </div>

      <div>
        <h3>Human Nature</h3>
        <p>Available copies: {BOOKS.humanNature.availableCopies}</p>
        <p>Price: {BOOKS.humanNature.price} Ton per copy</p>
        <p>Tapping Rate Boost: +{BOOKS.humanNature.tappingRate} per copy</p>
        <p>Coins: {BOOKS.humanNature.coins} per copy</p>
        <input
          type="number"
          value={humanNatureQty}
          onChange={(e) => setHumanNatureQty(Number(e.target.value))}
          placeholder="Quantity"
        />
      </div>

      <h4>Summary</h4>
      <p>Total Tapping Rate Boost: {totals.totalTappingRate}</p>
      <p>Total Coins: {totals.totalCoins}</p>
      <p>Total Cost: {totals.totalCostInTon} Ton</p>

      <div>
        <h4>Email for Book Delivery</h4>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
      </div>

      <div>
        <h4>Choose Payment Method</h4>
        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="Ton">Ton</option>
          <option value="Card">Card (Flutterwave)</option>
        </select>
      </div>

      {paymentMethod === 'Card' && (
        <button onClick={handleCardPayment}>Proceed to Flutterwave</button>
      )}

      <div>
        <h4>Physical Book Owners</h4>
        <p>Enter your unique code and referral ID for rewards:</p>
        <input
          type="text"
          value={uniqueCode}
          onChange={(e) => setUniqueCode(e.target.value)}
          placeholder="Unique Code"
        />
        <input
          type="text"
          value={referralId}
          onChange={(e) => setReferralId(e.target.value)}
          placeholder="Referral ID"
        />
      </div>

      <button onClick={handlePurchase}>Complete Purchase</button>
    </div>
  );
};

export default BoostPage;
