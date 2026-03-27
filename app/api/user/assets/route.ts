import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) return NextResponse.json({ error: "No ID" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        ownedNfts: {
          include: { collection: true }
        }
      }
    });

    if (!user) return NextResponse.json({ nfts: [] });

    // Use a replacer function to handle BigInt serialization
    const data = JSON.parse(
      JSON.stringify(user.ownedNfts, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json({ nfts: data });

  } catch (error: any) {
    console.error("Assets API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}