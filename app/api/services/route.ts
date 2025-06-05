// app/api/services/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' // adjust path if your prisma client is elsewhere

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    if (!type) {
      return new NextResponse('Missing "type" parameter', { status: 400 })
    }

    const services = await prisma.service.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
    })

    if (!services.length) {
      return new NextResponse('No services found for this type', { status: 404 })
    }

    return NextResponse.json(services)
  } catch (error) {
    console.error('Failed to fetch services:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
