import { PrismaClient } from '@prisma/client';

// Create a global object to store the Prisma instance in development mode
const prisma = global.prisma || new PrismaClient();

// If in development mode, store the Prisma instance globally
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;
