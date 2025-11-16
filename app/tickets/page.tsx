'use client';
import React, { useState, useEffect } from 'react';
import { Check, Ticket, Star, Coins, Crown, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface TicketType {
  id: string;
  name: string;
  icon: any;
  color: string;
  borderColor: string;
  priceStars: number;
  priceShells: number;
  features: string[];
}

interface PurchasedTicket {
  id: string;
  ticketId: string;
  ticketType: string;
  quantity: number;
  paymentMethod: string;
  totalCost: number;
  status: string;
  purchaseDate: string;
}

export default function TicketPurchaseSystem() {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [userBalance, setUserBalance] = useState(0);
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  const ticketTypes: TicketType[] = [
    {
      id: 'regular',
      name: 'Regular',
      icon: Ticket,
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-400',
      priceStars: 10000,
      priceShells: 50000,
      features: ['General Admission', 'Event Access', 'Basic Seating']
    },
    {
      id: 'vip',
      name: 'VIP',
      icon: Crown,
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-400',
      priceStars: 25000,
      priceShells: 125000,
      features: ['Priority Seating', 'VIP Lounge Access', 'Welcome Drink', 'Event Merchandise']
    },
    {
      id: 'vvip',
      name: 'VVIP',
      icon: Sparkles,
      color: 'from-amber-500 to-amber-600',
      borderColor: 'border-amber-400',
      priceStars: 50000,
      priceShells: 250000,
      features: ['Premium Front Row', 'Exclusive Backstage Access', 'Meet & Greet', 'Luxury Gift Bag', 'Private Lounge']
    }
  ];

  // Initialize Telegram user data
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const webApp = (window as any).Telegram.WebApp;
      const user = webApp.initDataUnsafe?.user;
      
      if (user) {
        setTelegramId(user.id.toString());
        setUserName(`${user.first_name} ${user.last_name || ''}`.trim());
      }
    }
  }, []);

  // Fetch user balance and purchased tickets
  useEffect(() => {
    const fetchUserData = async () => {
      if (!telegramId) return;

      try {
        // Fetch user balance
        const balanceResponse = await fetch(`/api/user/${telegramId}`);
        const balanceData = await balanceResponse.json();
        setUserBalance(Number(balanceData.points) || 0);

        // Fetch purchased tickets
        const ticketsResponse = await fetch(`/api/tickets/user/${telegramId}`);
        const ticketsData = await ticketsResponse.json();
        setPurchasedTickets(ticketsData.tickets || []);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchUserData, 5000);
    return () => clearInterval(interval);
  }, [telegramId]);

const handleTicketPurchase = async (paymentMethod: 'stars' | 'shells') => {
  if (!telegramId) {
    alert('User authentication required. Please restart the app.');
    return;
  }

  if (!selectedTicket) {
    alert('Please select a ticket type.');
    return;
  }

  const ticket = ticketTypes.find(t => t.id === selectedTicket);
  if (!ticket) return;

  const totalCost = paymentMethod === 'shells'
    ? ticket.priceShells * quantity
    : ticket.priceStars * quantity;

  if (paymentMethod === 'shells' && userBalance < totalCost) {
    alert('Insufficient shell balance!');
    return;
  }

  setIsProcessing(true);

  try {
    const purchaseData = {
      telegramId,
      userName,
      ticketType: ticket.name,
      quantity,
      paymentMethod,
      totalCost,
      pricePerTicket: paymentMethod === 'shells'
        ? ticket.priceShells
        : ticket.priceStars
    };

    if (paymentMethod === 'stars') {
      // Create Stars invoice
      const response = await fetch('/api/tickets/purchase-stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
      });

      const data = await response.json();

      if (data.invoiceLink) {
        window.location.href = data.invoiceLink;
      } else {
        throw new Error('Failed to create payment link');
      }

    } else {
      // Purchase with shells
      const response = await fetch('/api/tickets/purchase-shells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
      });

      const data = await response.json();

      if (data.success) {

        // ✅ Telegram haptic feedback
        (window as any).Telegram?.WebApp.HapticFeedback.notificationOccurred('success');

        // ✅ Telegram success popup
        (window as any).Telegram?.WebApp.showPopup({
          title: 'Purchase Successful!',
          message: 'Your ticket has been purchased successfully.',
          buttons: [{ text: 'OK', type: 'default' }]
        });

        // --- Your existing UI updates ---
        setUserBalance(data.newBalance);
        setPurchasedTickets(prev => [...prev, data.ticket]);
        setShowSuccess(true);
        setQuantity(1);
        setSelectedTicket(null);

        setTimeout(() => setShowSuccess(false), 3000);

      } else {
        throw new Error(data.message || 'Purchase failed');
      }
    }
  } catch (error: any) {
    console.error('Purchase error:', error);
    alert(error.message || 'Purchase failed. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};


 const handlePresentTicket = async (ticketId: string) => {
  if (!telegramId) return;

  const ticket = purchasedTickets.find(t => t.ticketId === ticketId);
  if (!ticket) return;

  // If already approved
  if (ticket.status === 'approved') {

    // ✅ Success haptic feedback
    (window as any).Telegram?.WebApp.HapticFeedback.notificationOccurred('success');

    (window as any).Telegram?.WebApp.showPopup({
      title: '✅ Verified Ticket',
      message: `Your ${ticket.ticketType} ticket (${ticket.quantity}x) has been approved and verified!`,
      buttons: [{ text: 'OK', type: 'default' }]
    });

    return;
  }

  setIsProcessing(true);

  try {
    const response = await fetch('/api/tickets/present', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId: ticket.ticketId,
        telegramId,
        userName,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        paymentMethod: ticket.paymentMethod,
        purchaseDate: ticket.purchaseDate
      })
    });

    const data = await response.json();

    if (data.success) {

      // ✅ Soft haptic feedback (subtle tap)
      (window as any).Telegram?.WebApp.HapticFeedback.impactOccurred('light');

      (window as any).Telegram?.WebApp.showPopup({
        title: '📤 Ticket Submitted',
        message: 'Your ticket has been submitted to admins for verification. You will be notified once approved.',
        buttons: [{ text: 'OK', type: 'default' }]
      });
    }
  } catch (error) {
    console.error('Present ticket error:', error);
    alert('Failed to submit ticket. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Ticket className="text-purple-400" />
              Event Tickets
            </h1>
            <Link href="/">
              <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-white/80">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span>{userBalance.toLocaleString()} Shells</span>
            </div>
            {purchasedTickets.length > 0 && (
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-purple-400" />
                <span>{purchasedTickets.length} Ticket(s) Purchased</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-green-500 text-white p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <Check className="w-6 h-6" />
            <span className="font-semibold">Purchase Successful! Pending admin approval.</span>
          </div>
        </div>
      )}

      {/* Ticket Selection */}
      <div className="max-w-6xl mx-auto mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Select Ticket Type</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {ticketTypes.map((ticket) => {
            const Icon = ticket.icon;
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket.id)}
                className={`relative cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  selectedTicket === ticket.id ? 'scale-105' : ''
                }`}
              >
                <div className={`bg-gradient-to-br ${ticket.color} rounded-2xl p-6 border-2 ${
                  selectedTicket === ticket.id ? ticket.borderColor : 'border-transparent'
                } shadow-xl`}>
                  {selectedTicket === ticket.id && (
                    <div className="absolute -top-3 -right-3 bg-green-500 rounded-full p-2">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-8 h-8 text-white" />
                    <h3 className="text-2xl font-bold text-white">{ticket.name}</h3>
                  </div>

                  <div className="space-y-2 mb-4">
                    {ticket.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-white/90">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/20 pt-4 space-y-2">
                    <div className="flex items-center justify-between text-white">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        Stars
                      </span>
                      <span className="font-bold">{ticket.priceStars.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-white">
                      <span className="flex items-center gap-1">
                        <Coins className="w-4 h-4" />
                        Shells
                      </span>
                      <span className="font-bold">{ticket.priceShells.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase Section */}
      {selectedTicket && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Complete Your Purchase</h2>
            
            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-white mb-2 font-semibold">Number of Tickets</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-white/20 hover:bg-white/30 text-white w-12 h-12 rounded-xl font-bold text-xl"
                  disabled={isProcessing}
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-white/10 text-white text-center text-2xl font-bold w-24 h-12 rounded-xl border border-white/20 focus:outline-none focus:border-purple-400"
                  min="1"
                  disabled={isProcessing}
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="bg-white/20 hover:bg-white/30 text-white w-12 h-12 rounded-xl font-bold text-xl"
                  disabled={isProcessing}
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Cost */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center text-white mb-2">
                <span>Total (Stars):</span>
                <span className="text-2xl font-bold">
                  {(ticketTypes.find(t => t.id === selectedTicket)!.priceStars * quantity).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-white">
                <span>Total (Shells):</span>
                <span className="text-2xl font-bold">
                  {(ticketTypes.find(t => t.id === selectedTicket)!.priceShells * quantity).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => handleTicketPurchase('stars')}
                disabled={isProcessing}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="animate-spin">⚙️</span>
                ) : (
                  <>
                    <Star className="w-5 h-5" />
                    Pay with Stars
                  </>
                )}
              </button>
              <button
                onClick={() => handleTicketPurchase('shells')}
                disabled={isProcessing}
                className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="animate-spin">⚙️</span>
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    Pay with Shells
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchased Tickets */}
      {purchasedTickets.length > 0 && (
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Your Tickets</h2>
          <div className="space-y-4">
            {purchasedTickets.map((purchase) => (
              <div key={purchase.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{purchase.ticketType} Ticket</h3>
                    <p className="text-white/60 text-sm">{new Date(purchase.purchaseDate).toLocaleString()}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-semibold ${
                    purchase.status === 'approved' 
                      ? 'bg-green-500/20 text-green-400 border border-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-400'
                  }`}>
                    {purchase.status === 'approved' ? (
                        <span className="flex items-center gap-2">
                            <Check className="w-4 h-4" /> Approved
                        </span>
                        ) : purchase.status === 'pending' ? (
                        'Pending Verification'
                        ) : (
                        'Not Presented'
                        )}

                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-sm">Quantity</p>
                    <p className="text-white font-bold">{purchase.quantity} ticket(s)</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-sm">Payment Method</p>
                    <p className="text-white font-bold capitalize">{purchase.paymentMethod}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-sm">Total Cost</p>
                    <p className="text-white font-bold">{purchase.totalCost.toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => handlePresentTicket(purchase.ticketId)}
                  disabled={isProcessing}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    purchase.status === 'approved'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  <Ticket className="w-5 h-5" />
                  {purchase.status === 'approved' ? 'Show Verified Ticket' : 'Present for Verification'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}