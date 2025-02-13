// app/api/test/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ message: "API is working" });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        return NextResponse.json({ 
            message: "POST is working", 
            receivedData: body 
        });
    } catch (error) {
        return NextResponse.json({ 
            error: "Error processing request",
            details: (error as Error).message 
        }, { status: 500 });
    }
}