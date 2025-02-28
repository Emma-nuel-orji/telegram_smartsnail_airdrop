// app/api/verify-payment/route.ts
import { NextResponse } from 'next/server';
import { prisma }  from '@/lib/prisma';
import { processPayment } from '../purchase/route';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      transactionHash,
      paymentMethod,
      totalAmount,
      userId,
      bookCount,
      bookId,
      fxckedUpBagsQty,
      humanRelationsQty
    } = body;

    console.log('Received payment verification request:', {
      orderId,
      transactionHash,
      paymentMethod
    });

    // In your verify-payment/route.ts
if (paymentMethod === 'TON') {
  // For TON payments, only require transactionHash
  if (!transactionHash) {
    return NextResponse.json(
      { success: false, error: 'Missing transaction hash for TON payment' },
      { status: 400 }
    );
  }
} else {
  // For other payment methods, require orderId
  if (!orderId || !transactionHash) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }
}
const result = await prisma.$transaction(async (tx) => {
  // Check if payment was already processed - MODIFIED THIS PART
  let existingOrder = null;
  
  if (orderId) {
    // If we have an orderId, try to find by orderId
    existingOrder = await tx.order.findUnique({
      where: { orderId },
    });
  } else if (transactionHash && paymentMethod === 'TON') {
    // For TON payments, try to find by transaction reference
    existingOrder = await tx.order.findFirst({
      where: {
        transactionReference: transactionHash
      },
    });
  }
  
  if (existingOrder?.status === "SUCCESS") {
    return {
      success: true,
      message: "Payment was already processed",
      orderId: existingOrder.orderId,
    };
  }

  // Process the payment using your existing processPayment function
  const paymentResult = await processPayment(
    tx,
    paymentMethod,
    transactionHash, 
    totalAmount,
     
    userId,
    bookCount,
    bookId,
    fxckedUpBagsQty,
    humanRelationsQty
  );

  return {
    success: true,
    message: 'Payment verified successfully',
    orderId: paymentResult.orderId
  };
});

return NextResponse.json(result);

} catch (error) {
console.error('Payment verification error:', error);
return NextResponse.json(
  { 
    success: false, 
    error: error instanceof Error ? error.message : 'Payment verification failed' 
  },
  { status: 400 }
);
}
}