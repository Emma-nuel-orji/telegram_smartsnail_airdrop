import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ServiceType } from '@prisma/client' // ✅ import the enum from Prisma
export async function GET() {
  try {
    console.log('Testing database connection...')
    
    // Test basic Prisma connection
    const count = await prisma.service.count()
    console.log('Service count:', count)
    
    return NextResponse.json({ 
      message: 'Database connected', 
      serviceCount: count 
    })
  } catch (error) {
  console.error('Database error:', error)
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
  
  return NextResponse.json({ 
    error: 'Database connection failed',
    details: errorMessage 
  }, { status: 500 })
}
}