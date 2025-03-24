 export interface Task {
  id: string; 
    description: string;
    completed: boolean;
    section: "main" | "daily" | "partners";
    type: "daily" | "permanent" | "flexible"; 
    image: string;
    link: string;
    active?: boolean; 
    completedTime?: string | null;
    batchId?: string;
    mediaUrl?: string;
    isStoryTask?: boolean;
    mediaType?: string;
    reward?: number;
  }

  // types.ts
  export interface VerifyPaymentRequest {
  orderId: string;
  transactionHash: string;
  paymentMethod: string;
  totalAmount: number;
  userId: string;
  bookCount: number;
  bookId: string;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
}