'use client'

import { useState, useEffect, useCallback } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Address, toNano } from "@ton/core";
import Link from 'next/link';
import Loader from "@/loader";




interface Order {
  id: string;
  status: string;
  totalTon: number;
  user_order_id: string;
  email?: string;
  telegramId?: string;
  fxckedUpBagsQty?: number;
  humanRelationsQty?: number;
  referrerId?: string;
  transactionId?: string;
  // Add other properties as needed
}

interface PaymentProps {
  tonRecipientAddress: string;
  onPaymentSuccess?: (order: Order) => void;
  onPaymentError?: (error: Error) => void;
}

export default function TonWalletPayment({ 
  tonRecipientAddress, 
  onPaymentSuccess, 
  onPaymentError 
}: PaymentProps) {
  // Initialize required services
  const [tonConnectUI] = useTonConnectUI();

  
  // State management
  const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Wallet connection handlers
  const handleWalletConnection = useCallback((address: string) => {
    setTonWalletAddress(address);
    console.log("Wallet connected successfully!");
    setIsLoading(false);
  }, []);

  const handleWalletDisconnection = useCallback(() => {
    setTonWalletAddress(null);
    console.log("Wallet disconnected successfully!");
    setIsLoading(false);
  }, []);

  // Set up wallet connection listener
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (tonConnectUI.account?.address) {
        handleWalletConnection(tonConnectUI.account.address);
      } else {
        handleWalletDisconnection();
      }
    };

    checkWalletConnection();

    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        handleWalletConnection(wallet.account.address);
      } else {
        handleWalletDisconnection();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, handleWalletConnection, handleWalletDisconnection]);

  // Handle wallet connection/disconnection
  const handleWalletAction = async () => {
    if (tonConnectUI.connected) {
      setIsLoading(true);
      await tonConnectUI.disconnect();
    } else {
      await tonConnectUI.openModal();
    }
  };

  // Payment processing
  const handlePayment = async (order: Order) => {
    if (!tonConnectUI.connected) {
      throw new Error("Wallet not connected");
    }
  
    setIsProcessing(true);
    
    try {
      // Prepare transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: Address.parse(tonRecipientAddress).toString(),
            amount: toNano(order.totalTon).toString(),
          },
        ],
      };
  
      // Send transaction
      const result = await tonConnectUI.sendTransaction(transaction);
  
      if (result && result.boc) {
        // Call your purchase API
        const purchaseResponse = await fetch('/api/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: order.email || '', // Default to empty string if null
            paymentMethod: 'TON',
            hmacSignature: '', // This should be generated on your backend
            telegramId: order.telegramId || '', // Default to empty string if null
            paymentReference: result.boc,
            fxckedUpBagsQty: order.fxckedUpBagsQty || 0, // Default to 0 if null
            humanRelationsQty: order.humanRelationsQty || 0, // Default to 0 if null
            referrerId: order.referrerId || '', // Default to empty string if null
          }),
        });
        
  
        if (!purchaseResponse.ok) {
          throw new Error('Purchase API call failed');
        }
  
        const purchaseData = await purchaseResponse.json();
  
  
        // Send notification to Telegram bot
        await sendOrderToTelegramBot({
          ...order,
          status: 'Paid',
          transactionId: result.boc
        });
  
        // Update local state and trigger success callback
        setSelectedOrder(null);
        onPaymentSuccess?.(order);
  
      } else {
        throw new Error("Transaction failed or was rejected by user");
      }
    } catch (error) {
      console.error("Payment error:", error);
      onPaymentError?.(error instanceof Error ? error : new Error("Payment failed"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to format wallet address
  const formatAddress = (address: string) => {
    const tempAddress = Address.parse(address).toString();
    return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
  };

  // Async function to send order to Telegram bot
  const sendOrderToTelegramBot = async (order: Order) => {
    try {
      const response = await fetch('/api/sendOrderToTelegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        throw new Error('Failed to send order to Telegram');
      }
    } catch (error) {
      console.error('Error sending order to Telegram:', error);
      // Don't throw error here as this is a non-critical operation
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="back-button">
        <Link href="/">
          <img 
            src="/images/info/output-onlinepngtools (6).png" 
            width={24} 
            height={24} 
            alt="back" 
          />
        </Link>
      </div>

      {tonWalletAddress ? (
        <div className="flex flex-col items-center">
          <p className="mb-4">Connected: {formatAddress(tonWalletAddress)}</p>
          
          {selectedOrder && (
            <button
              onClick={() => handlePayment(selectedOrder)}
              disabled={isProcessing}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
            >
              {isProcessing ? 'Processing...' : 'Pay Now'}
            </button>
          )}

          <button
            onClick={handleWalletAction}
            disabled={isProcessing}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <button
          onClick={handleWalletAction}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Connect TON Wallet
        </button>
      )}
    </div>
  );
}