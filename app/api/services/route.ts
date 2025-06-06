import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ServiceType } from '@prisma/client' // ✅ import the enum from Prisma
export async function GET() {
  try {
    console.log('API route called')
    return NextResponse.json({ message: 'API working' })
  } catch (error) {
    console.error('Error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}