import { NextResponse } from "next/server";
import { prisma } from "@prisma";

export async function POST(request) {
  try {
    const { code, telegramId, batchId } = await request.json();

    if (!code || !telegramId || !batchId) {
      return NextResponse.json(
        { error: "Missing required fields: code, telegramId, or batchId." },
        { status: 400 }
      );
    }

    const generatedCode = await prisma.generatedCode.findUnique({
      where: { code },
    });

    if (!generatedCode) {
      return NextResponse.json(
        { error: "Invalid code. Please check your input." },
        { status: 400 }
      );
    }

    if (generatedCode.batchId !== batchId) {
      return NextResponse.json(
        { error: "This code is not valid for the selected batch." },
        { status: 400 }
      );
    }

    if (generatedCode.isRedeemed) {
      return NextResponse.json(
        { error: "Code already redeemed. Please try another one." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Cap the reward between 1000 and 1,000,000
    const rewardAmount = Math.floor(Math.random() * 1000000) + 1000;

    await prisma.$transaction([
      prisma.user.update({
        where: { telegramId },
        data: {
          points: { increment: rewardAmount },
        },
      }),
      prisma.generatedCode.update({
        where: { code },
        data: {
          isRedeemed: true,
          redeemedAt: new Date(),
          redeemedBy: telegramId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      reward: rewardAmount,
      message: `Congratulations! You just received ${rewardAmount} Shells.`,
    });
  } catch (error) {
    console.error("Error processing redeem code:", error);
    return NextResponse.json(
      { error: "Internal Server Error. Please try again later." },
      { status: 500 }
    );
  }
}
