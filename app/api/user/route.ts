import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const userData = await req.json()

        // Check for the necessary user data
        if (!userData || !userData.id) {
            return NextResponse.json({ error: 'Invalid user data' }, { status: 400 })
        }

        const user = await prisma.user.upsert({
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
        return NextResponse.json(user)
    } catch (error) {
        console.error('Error processing user data:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
