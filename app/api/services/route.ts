import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ServiceType } from '@prisma/client' // ✅ import the enum from Prisma

export async function GET(req: Request) {
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Missing')
  try {
    const url = new URL(req.url)
    const typeParam = url.searchParams.get('type')
    const partnerId = url.searchParams.get('partnerId')

    // ✅ validate type is one of the enum values
    if (!typeParam || !Object.values(ServiceType).includes(typeParam as ServiceType)) {
      return new NextResponse('Invalid or missing "type" parameter', { status: 400 })
    }

    const type = typeParam as ServiceType // ✅ safe cast

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
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
