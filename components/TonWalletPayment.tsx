// import { useState, useEffect, useCallback } from 'react';
// import { useTonConnectUI } from '@tonconnect/ui-react';
// import { Address, toNano } from "@ton/core";
// import Link from 'next/link';
// import Loader from "@/loader";

// interface Order {
//   id: string;
//   status: string;
//   priceTon: number;
//   user_order_id: string;
//   email?: string;
//   telegramId?: string;
//   fxckedUpBagsQty?: number;
//   humanRelationsQty?: number;
//   referrerId?: string;
//   transactionId?: string;
// }

// interface PaymentProps {
//   tonRecipientAddress: string;
//   onPaymentSuccess?: (order: Order) => void;
//   onPaymentError?: (error: Error) => void;
// }

// export default function TonWalletPayment({
//   tonRecipientAddress,
//   onPaymentSuccess,
//   onPaymentError
// }: PaymentProps) {
//   const [tonConnectUI] = useTonConnectUI();
//   const [tonWalletAddress, setTonWalletAddress] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);

//   // Wallet connection handlers
//   const handleWalletConnection = useCallback((address: string) => {
//     setTonWalletAddress(address);
//     setIsLoading(false);
//   }, []);

//   const handleWalletDisconnection = useCallback(() => {
//     setTonWalletAddress(null);
//     setIsLoading(false);
//   }, []);

//   useEffect(() => {
//     const checkWalletConnection = async () => {
//       if (tonConnectUI.account?.address) {
//         handleWalletConnection(tonConnectUI.account.address);
//       } else {
//         handleWalletDisconnection();
//       }
//     };

//     checkWalletConnection();

//     const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
//       if (wallet?.account?.address) {
//         handleWalletConnection(wallet.account.address);
//       } else {
//         handleWalletDisconnection();
//       }
//     });

//     return () => unsubscribe();
//   }, [tonConnectUI, handleWalletConnection, handleWalletDisconnection]);

//   const handleWalletAction = async () => {
//     if (tonConnectUI.connected) {
//       setIsLoading(true);
//       await tonConnectUI.disconnect(); // Disconnect the wallet
//     } else {
//       await tonConnectUI.openModal(); // Open wallet modal to connect
//     }
//   };

//   const handlePayment = async (order: Order) => {
//     if (!tonConnectUI.connected) {
//       throw new Error("Wallet not connected");
//     }

//     setIsProcessing(true);

//     try {
//       const transaction = {
//         validUntil: Math.floor(Date.now() / 1000) + 600,
//         messages: [
//           {
//             address: Address.parse(tonRecipientAddress).toString(),
//             amount: toNano(order.priceTon).toString(),
//           },
//         ],
//       };

//       const result = await tonConnectUI.sendTransaction(transaction);

//       if (result && result.boc) {
//         const purchaseResponse = await fetch('/api/purchase', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             email: order.email || '',
//             paymentMethod: 'TON',
//             hmacSignature: '',
//             telegramId: order.telegramId || '',
//             paymentReference: result.boc,
//             fxckedUpBagsQty: order.fxckedUpBagsQty || 0,
//             humanRelationsQty: order.humanRelationsQty || 0,
//             referrerId: order.referrerId || '',
//           }),
//         });

//         if (!purchaseResponse.ok) {
//           throw new Error('Purchase API call failed');
//         }

//         const purchaseData = await purchaseResponse.json();

//         await sendOrderToTelegramBot({
//           ...order,
//           status: 'Paid',
//           transactionId: result.boc
//         });

//         setSelectedOrder(null);
//         onPaymentSuccess?.(order);
//       } else {
//         throw new Error("Transaction failed or was rejected by user");
//       }
//     } catch (error) {
//       console.error("Payment error:", error);
//       onPaymentError?.(error instanceof Error ? error : new Error("Payment failed"));
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const formatAddress = (address: string) => {
//     const tempAddress = Address.parse(address).toString();
//     return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
//   };

//   const sendOrderToTelegramBot = async (order: Order) => {
//     try {
//       const response = await fetch('/api/sendOrderToTelegram', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(order),
//       });

//       if (!response.ok) {
//         throw new Error('Failed to send order to Telegram');
//       }
//     } catch (error) {
//       console.error('Error sending order to Telegram:', error);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center">
//         <div className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded">
//           Loading...
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex min-h-screen flex-col items-center justify-center">
//       <div className="back-button">
//         <Link href="/">
//           <img
//             src="/images/info/output-onlinepngtools (6).png"
//             width={24}
//             height={24}
//             alt="back"
//           />
//         </Link>
//       </div>

//       {tonWalletAddress ? (
//         <div className="flex flex-col items-center">
//           <p className="mb-4">Connected: {formatAddress(tonWalletAddress)}</p>

//           {selectedOrder && (
//             <button
//               onClick={() => handlePayment(selectedOrder)}
//               disabled={isProcessing}
//               className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
//             >
//               {isProcessing ? 'Processing...' : 'Pay Now'}
//             </button>
//           )}

//           <button
//             onClick={handleWalletAction}
//             disabled={isProcessing}
//             className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
//           >
//             Disconnect Wallet
//           </button>
//         </div>
//       ) : (
//         <button
//           onClick={handleWalletAction}
//           className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
//         >
//           Connect TON Wallet
//         </button>
//       )}
//     </div>
//   );
// }
