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
    
    // Refresh every 30 seconds
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
        pricePerTicket: paymentMethod === 'shells' ? ticket.priceShells : ticket.priceStars
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

    if (ticket.status === 'approved') {
      // Show verified ticket
      (window as any).Telegram?.WebApp.showPopup({
        title: '✅ Verified Ticket',
        message: `Your ${ticket.ticketType} ticket (${ticket.quantity}x) has been approved and verified!`,
        buttons: [{ text: 'OK', type: 'default' }]
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Send ticket presentation request to admin
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

      {/* Ticket Selection - Rest of the JSX remains the same as in the artifact */}
      {/* Copy the rest from the artifact above */}
    </div>
  );
}