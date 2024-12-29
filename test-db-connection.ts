// test-db-connection.ts
import  prisma  from '@/lib/prisma';

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Simple count operation to test connection
    const userCount = await prisma.user.count();
    console.log('Successfully connected! Total users:', userCount);
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();