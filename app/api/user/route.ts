// File: /api/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const userSchema = z.object({
    telegramId: z.string().min(1).regex(/^[0-9]+$/, "Telegram ID must be numeric").transform(val => BigInt(val)),
    username: z.string().nullable(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    points: z.number().int().min(0).default(0),
    tappingRate: z.number().int().positive().default(1),
    hasClaimedWelcome: z.boolean().default(false),
    nft: z.boolean().default(false),
    email: z.string().email().nullable().optional()
});

// This explicitly declares which HTTP methods are allowed
export async function POST(req: NextRequest): Promise<Response> {
    try {
        const jsonBody = await req.json();
        console.log("📥 Received request body:", jsonBody);

        const validationResult = userSchema.safeParse(jsonBody);
        if (!validationResult.success) {
            console.error("❌ Validation error:", validationResult.error.flatten());
            return new NextResponse(
                JSON.stringify({
                    error: "Validation error",
                    details: validationResult.error.flatten(),
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const userData = validationResult.data;
        const user = await prisma.user.upsert({
            where: { telegramId: userData.telegramId },
            update: {
                username: userData.username,
                firstName: userData.first_name,
                lastName: userData.last_name,
                points: userData.points,
                tappingRate: userData.tappingRate,
                hasClaimedWelcome: userData.hasClaimedWelcome,
                nft: userData.nft,
                email: userData.email ?? undefined,
                updatedAt: new Date(),
            },
            create: {
                telegramId: userData.telegramId,
                username: userData.username,
                firstName: userData.first_name,
                lastName: userData.last_name,
                points: userData.points,
                tappingRate: userData.tappingRate,
                hasClaimedWelcome: userData.hasClaimedWelcome,
                nft: userData.nft,
                email: userData.email ?? undefined,
            },
        });

        return new NextResponse(
            JSON.stringify({
                ...user,
                telegramId: user.telegramId.toString(),
                points: Number(user.points),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("❌ Error processing user creation request:", error);
        return new NextResponse(
            JSON.stringify({
                error: "Internal server error",
                details: (error as Error).message,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}