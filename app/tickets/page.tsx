'use client';
import React, { useState, useEffect } from 'react';
import { Check, Ticket, Star, Coins, Crown, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import confetti from "canvas-confetti";
import "./tickets.css"
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


  // Check for payment success on page load (after redirect from Telegram)
useEffect(() => {
  const checkPaymentStatus = async () => {
    if (telegramId) {
      try {
        const response = await fetch(`/api/tickets/user/${telegramId}`);
        const data = await response.json();
        
        if (data.success) {
          setPurchasedTickets(data.tickets);
        }
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
      }
    }
  };

  checkPaymentStatus();
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

      if (data.success && data.invoiceLink) {
        // Redirect user to Telegram Stars payment
        window.location.href = data.invoiceLink;
      } else {
        throw new Error(data.message || 'Failed to create Stars payment link');
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
        // Only update UI after purchase is actually successful
        setUserBalance(data.newBalance);
        setPurchasedTickets(prev => [...prev, data.ticket]);

        // ✅ Telegram haptic feedback
        (window as any).Telegram?.WebApp.HapticFeedback.notificationOccurred('success');

        // ✅ Telegram success popup
        (window as any).Telegram?.WebApp.showPopup({
          title: 'Purchase Successful!',
          message: 'Your ticket has been purchased successfully.',
          buttons: [{ text: 'OK', type: 'default' }]
        });

        // Confetti
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });

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
            {/* <Link href="/">
              <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </Link> */}
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
      <div className="grid grid-cols-1 gap-6">
        {ticketTypes.map((ticket) => {
          const Icon = ticket.icon;
          const isSelected = selectedTicket === ticket.id;
          
          return (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket.id)}
              className={`relative group transition-all duration-500 active:scale-[0.98] cursor-pointer`}
            >
              {/* Ticket Background with "Perforated Edge" feel */}
              <div className={`
                relative overflow-hidden rounded-3xl p-6 
                bg-gradient-to-br ${ticket.color} 
                border-2 transition-all
                ${isSelected ? 'border-white scale-[1.02] shadow-[0_0_25px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-80'}
              `}>
                
                {/* Decorative Circles for the "Ticket" look */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-gray-900 rounded-full -translate-y-1/2" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-gray-900 rounded-full -translate-y-1/2" />

                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter">
                        {ticket.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                        Admission Pass
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-6 h-6 text-white bg-green-500 rounded-full p-1" />}
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {ticket.features.map((feature, idx) => (
                    <span key={idx} className="bg-black/20 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-lg text-white/90 border border-white/10 uppercase">
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Pricing Row */}
                <div className="flex items-center justify-between border-t border-dashed border-white/30 pt-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white/50 uppercase">Price</p>
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1 font-black text-white">
                        <Star size={14} className="fill-yellow-400 text-yellow-400" /> {ticket.priceStars}
                      </span>
                      <span className="flex items-center gap-1 font-black text-white">
                        <Coins size={14} className="text-purple-300" /> {ticket.priceShells}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-white/50 uppercase">Status</p>
                    <p className="text-xs font-black text-white italic">AVAILABLE</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Purchase Section */}
          {selectedTicket && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 blur-[100px]" />
            
            <h2 className="text-xl font-black italic uppercase text-white mb-6">Checkout</h2>
            
            <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl mb-6">
              <span className="text-zinc-400 font-bold uppercase text-xs">Quantity</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">-</button>
                <span className="text-xl font-bold text-white italic">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">+</button>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-zinc-400 text-sm font-bold uppercase">
                <span>Total stars</span>
                <span className="text-white">{(ticketTypes.find(t => t.id === selectedTicket)!.priceStars * quantity).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-sm font-bold uppercase">
                <span>Total shells</span>
                <span className="text-white">{(ticketTypes.find(t => t.id === selectedTicket)!.priceShells * quantity).toLocaleString()}</span>
              </div>
            </div>
<div className="grid grid-cols-1 gap-3">
  <button 
    onClick={() => handleTicketPurchase('stars')}
    disabled={isProcessing}
    className="w-full bg-white text-black font-black italic py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-400 transition-colors disabled:opacity-50"
  >
    {isProcessing ? (
      <span className="animate-spin text-black">⚙️</span>
    ) : (
      <>PURCHASE WITH STARS</>
    )}
  </button>

  <button 
    onClick={() => handleTicketPurchase('shells')}
    disabled={isProcessing}
    className="w-full bg-zinc-800 text-white font-black italic py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
  >
    {isProcessing ? (
      <span className="animate-spin text-white">⚙️</span>
    ) : (
      <>PURCHASE WITH SHELLS</>
    )}
  </button>
</div>
          </div>
        </div>
      )}

      {/* Purchased Tickets */}
      {/* Purchased Tickets Section */}
{purchasedTickets.length > 0 && (
  <div className="max-w-6xl mx-auto mt-12 px-4">
    <h2 className="text-2xl font-black italic text-white uppercase mb-6 tracking-tighter">
      Your Collection
    </h2>
    
    <div className="flex flex-col gap-6">
      {purchasedTickets.map((purchase) => (
        <div key={purchase.id} className="relative group">
          
          {/* Use the new Ticket Design here */}
          <div className="ticket-container">
            {/* Left Stub: The "Scan" Area */}
            <div className="ticket-stub-left">
               {purchase.status === 'approved' ? (
                 <div className="bg-white p-2 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                   {/* You can replace this with a real QRCode component later */}
                   <div className="w-12 h-12 bg-black flex items-center justify-center text-[8px] text-white font-bold">QR</div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center">
                    <span className="animate-spin text-purple-500 mb-2">⚙️</span>
                    <span className="text-[10px] font-bold text-zinc-500">VERIFYING</span>
                 </div>
               )}
               <p className="mt-2 text-[9px] font-black text-zinc-400 tracking-widest uppercase">
                 Stub #0{purchase.id.toString().slice(-3)}
               </p>
            </div>

            {/* The Perforated Divider Line */}
            <div className="ticket-divider"></div>

            {/* Right Stub: The Event Info */}
            <div className="ticket-stub-right">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black italic text-white uppercase leading-none">
                    {purchase.ticketType} PASS
                  </h3>
                  <p className="text-[10px] text-purple-400 font-bold mt-1">POLYCOMBAT GLOBAL EVENT</p>
                </div>
                <div className={`status-badge ${purchase.status}`}>
                  {purchase.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
  <div className="detail-group">
    <span>HOLDER</span>
    {/* Use the userName state here */}
    <p className="text-white font-bold text-sm uppercase truncate">
      {userName || 'Player'} 
    </p>
  </div>
  <div className="detail-group">
    <span>QUANTITY</span>
    {/* Use purchase.quantity from the map iteration */}
    <p className="text-white font-bold text-sm">
      x{purchase.quantity}
    </p>
  </div>
</div>

              <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-end">
                 <p className="text-[10px] text-zinc-500 font-bold">
                   ISSUED: {new Date(purchase.purchaseDate).toLocaleDateString()}
                 </p>
                 <div className="text-right">
                    <p className="text-[8px] text-zinc-500 font-black uppercase">Total Paid</p>
                    <p className="text-white font-black italic text-lg leading-none">
                       {purchase.totalCost.toLocaleString()} <span className="text-xs text-purple-500">Shells</span>
                    </p>
                 </div>
              </div>
            </div>
          </div>

          {/* Action Button: Hovering over the ticket shows the button */}
          <button
            onClick={() => handlePresentTicket(purchase.ticketId)}
            className="w-full mt-2 py-3 rounded-xl font-black italic uppercase text-xs tracking-widest bg-zinc-800 text-zinc-400 hover:bg-white hover:text-black transition-all"
          >
            {purchase.status === 'approved' ? 'Open Digital Pass' : 'View Transaction Details'}
          </button>
        </div>
      ))}
    </div>
  </div>
)}

      
    </div>
    
  );
}