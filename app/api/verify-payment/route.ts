import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FUB_BOOK_ID = "fxcked-up-bags-id";
const HR_BOOK_ID = "human-relations-id";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      paymentMethod,
      telegram_payment_charge_id,
      payload,
    } = body;

    console.log("🔍 VERIFY REQUEST:", body);

    // ✅ VALIDATE
    if (paymentMethod !== "Stars") {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    if (!telegram_payment_charge_id || !payload) {
      return NextResponse.json(
        { error: "Missing payment data" },
        { status: 400 }
      );
    }

    // ✅ SAFE PARSE
    let parsed: any;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return NextResponse.json(
        { error: "Invalid payload format" },
        { status: 400 }
      );
    }

    const transactionId = parsed?.t;

    if (!transactionId) {
      return NextResponse.json(
        { error: "Missing transaction ID" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const pending = await tx.pendingTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!pending) {
        throw new Error("Transaction not found");
      }

      if (pending.status === "COMPLETED") {
        return { success: true, message: "Already processed" };
      }

      // 🔥 STOCK DEDUCTION (SAFE NOW)

      // FxckedUpBags
      if (pending.fxckedUpBagsQty > 0) {
        const codes = await tx.generatedCode.findMany({
          where: {
            bookId: FUB_BOOK_ID,
            isUsed: false,
          },
          take: pending.fxckedUpBagsQty,
        });

        if (codes.length < pending.fxckedUpBagsQty) {
          throw new Error("Not enough Fxcked Up Bags in stock");
        }

        await tx.generatedCode.updateMany({
          where: { id: { in: codes.map((c) => c.id) } },
          data: { isUsed: true },
        });
      }

      // HumanRelations
      if (pending.humanRelationsQty > 0) {
        const codes = await tx.generatedCode.findMany({
          where: {
            bookId: HR_BOOK_ID,
            isUsed: false,
          },
          take: pending.humanRelationsQty,
        });

        if (codes.length < pending.humanRelationsQty) {
          throw new Error("Not enough Human Relations in stock");
        }

        await tx.generatedCode.updateMany({
          where: { id: { in: codes.map((c) => c.id) } },
          data: { isUsed: true },
        });
      }

      // ✅ MARK COMPLETE
      await tx.pendingTransaction.update({
        where: { id: pending.id },
        data: {
          status: "COMPLETED",
        },
      });

      return { success: true };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("❌ VERIFY ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 400 }
    );
  }
}