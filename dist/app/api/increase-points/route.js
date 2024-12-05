"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
async function POST(req) {
    try {
        const { telegramId } = await req.json();
        if (!telegramId) {
            return server_1.NextResponse.json({ error: 'Invalid telegramId' }, { status: 400 });
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { telegramId },
            data: { points: { increment: 1 } }
        });
        return server_1.NextResponse.json({ success: true, points: updatedUser.points });
    }
    catch (error) {
        console.error('Error increasing points:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
