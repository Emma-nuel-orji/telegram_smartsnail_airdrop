import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

// Helper function to safely serialize user data
function serializeUser(user: any) {
  return {
    ...user,
    id: user.id.toString(),
    telegramId: user.telegramId.toString(),
    points: Number(user.points),
    hasClaimedWelcome: user.hasClaimedWelcome ?? false,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
  };
}

export async function GET(req: NextRequest): Promise<Response> {
    try {
        const urlParts = req.nextUrl.pathname.split("/");
        const telegramId = urlParts[urlParts.length - 1];

        console.log(`🔍 Checking for user in database: ${telegramId}`);

        if (!/^[0-9]+$/.test(telegramId)) {
            console.warn(`❌ Invalid Telegram ID format: ${telegramId}`);
            return NextResponse.json(
                { error: "Invalid Telegram ID format" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findFirst({
            where: { telegramId: BigInt(telegramId) }
        });

        if (!user) {
            console.warn(`⚠️ User not found in database: ${telegramId}`);
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        console.log(`✅ User found:`, user);

        // Serialize the user data safely
        const safeUser = serializeUser(user);

        return NextResponse.json(safeUser);
    } catch (error) {
        console.error("❌ Error fetching user:", error);
        return NextResponse.json(
            { 
                error: "Internal server error", 
                details: (error as Error).message 
            },
            { status: 500 }
        );
    }
}