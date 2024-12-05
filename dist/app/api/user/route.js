"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
async function POST(req) {
    try {
        const userData = await req.json();
        // Check for the necessary user data
        if (!userData || !userData.id) {
            return server_1.NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
        }
        const user = await prisma_1.prisma.user.upsert({
            where: { telegramId: userData.id },
            update: {
                email: userData.email || undefined, // Update email only if provided
                username: userData.username || undefined,
                firstName: userData.first_name || undefined,
                lastName: userData.last_name || undefined,
            },
            create: {
                telegramId: userData.id,
                username: userData.username || '',
                firstName: userData.first_name || '',
                lastName: userData.last_name || '',
                email: userData.email || '', // Create with email if provided
            },
        });
        return server_1.NextResponse.json(user);
    }
    catch (error) {
        console.error('Error processing user data:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
