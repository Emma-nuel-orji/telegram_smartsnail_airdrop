<<<<<<< HEAD
=======
// app/api/stakes/stars/route.ts
>>>>>>> cbf09fff1ae30a6fbf87301eb353ad4ef0840d72
import { NextResponse } from "next/server";
import { prisma } from "@/prisma/client";

export async function POST(request: Request) {
  try {
<<<<<<< HEAD
    const { fightId, fighterId, stakeAmount, telegramId } = await request.json();
=======
    const { fightId, fighterId, stakeAmount, title, description, label, telegramId } =
      await request.json();
>>>>>>> cbf09fff1ae30a6fbf87301eb353ad4ef0840d72

    if (!fightId || !fighterId || !stakeAmount || !telegramId) {
      return NextResponse.json({ error: "Invalid stake details" }, { status: 400 });
    }

<<<<<<< HEAD
=======
    // 1️⃣ Ensure user exists
>>>>>>> cbf09fff1ae30a6fbf87301eb353ad4ef0840d72
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

<<<<<<< HEAD
    const starsCount = Math.round(Number(stakeAmount));
    const shellEquivalent = (BigInt(starsCount) * 1000n).toString();

=======
    // 2️⃣ Conversion Stars -> Shells
    const starsCount = BigInt(Math.round(Number(stakeAmount)));
    const shellEquivalent = starsCount * 1000n; // 1 Star = 1000 Shells

    // 3️⃣ Create invoice payload
>>>>>>> cbf09fff1ae30a6fbf87301eb353ad4ef0840d72
    const payload = JSON.stringify({
      fightId,
      fighterId,
      starsCount: starsCount.toString(),
<<<<<<< HEAD
      shellEquivalent,
      telegramId,
    });

    // 🔑 Call Telegram Bot API to create the invoice link
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Fight Stake",
          description: `Staking ${starsCount} Stars on this fight`,
          payload,
          currency: "XTR",           // XTR = Telegram Stars
          prices: [{ label: "Stake", amount: starsCount }],
        }),
      }
    );

    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      console.error("Telegram invoice error:", telegramData);
      return NextResponse.json(
        { error: "Failed to create Telegram invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoiceLink: telegramData.result });
=======
      shellEquivalent: shellEquivalent.toString(),
      telegramId,
      title,
      description,
      label,
    });

    // 4️⃣ Return payload to frontend to generate Telegram invoice
    return NextResponse.json({ payload });
>>>>>>> cbf09fff1ae30a6fbf87301eb353ad4ef0840d72

  } catch (error) {
    console.error("Error preparing Stars stake:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}