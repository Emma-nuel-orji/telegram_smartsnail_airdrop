import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get("telegramId");

    console.log("--- ASSET FETCH START ---");
    console.log("Incoming Telegram ID:", telegramId);

    if (!telegramId || telegramId === "undefined" || telegramId === "null") {
      console.error("Critical Error: Invalid or missing Telegram ID");
      return NextResponse.json({ error: "Invalid ID", nfts: [] }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        ownedNfts: {
          include: { collection: true }
        }
      }
    });

    console.log("User Found in DB:", user ? "YES" : "NO");
    
    if (!user) {
      console.log("Result: User not found, returning empty array.");
      return NextResponse.json({ nfts: [] });
    }

    console.log(`NFTs found for user: ${user.ownedNfts?.length || 0}`);

    // BigInt Serialization
    const data = JSON.parse(
      JSON.stringify(user.ownedNfts, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    console.log("--- ASSET FETCH SUCCESS ---");
    return NextResponse.json({ nfts: data });

  } catch (error: any) {
    console.error("!!! ASSETS API CRASH !!!");
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}