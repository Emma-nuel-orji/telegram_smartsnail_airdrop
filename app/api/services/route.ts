// app/api/services/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ServiceType } from '@prisma/client'

export const dynamic = "force-dynamic"; // <--- Important fix

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const typeParam = url.searchParams.get('type')
    const partnerId = url.searchParams.get('partnerId')

    if (!typeParam || !Object.values(ServiceType).includes(typeParam as ServiceType)) {
      return new NextResponse('Invalid or missing "type" parameter', { status: 400 })
    }

    const type = typeParam as ServiceType

    const services = await prisma.service.findMany({
      where: {
        type,
        ...(partnerId ? { partnerId } : {}),
      },
      include: {
        partner: true,
      },
      orderBy: {
        id: 'desc',
      },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Error fetching services:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
