'use client';
import TonWalletPayment from '@/components/TonWalletPayment';
import Loader from "@/loader";
import { useSearchParams } from 'next/navigation';
import { useRouter } from "next/navigation";
import React, { Suspense } from 'react';

// Create a separate component for the content that uses useSearchParams
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const handlePaymentSuccess = (order: any) => {
    console.log('Payment successful for order:', order);
    router.push('/success');
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
  };

  return (
    <TonWalletPayment
      tonRecipientAddress={process.env.NEXT_PUBLIC_TON_RECIPIENT_ADDRESS!}
      onPaymentSuccess={handlePaymentSuccess}
      onPaymentError={handlePaymentError}
    />
  );
}

// Main page component
export default function CheckoutPage() {
  return (
    <Suspense fallback={<Loader />}>
      <CheckoutContent />
    </Suspense>
  );
}