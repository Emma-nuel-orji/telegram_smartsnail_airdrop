// lib/prisma.js
import { PrismaClient } from '@prisma/client';  // Use import for ES modules
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], 
  });

export { prisma };  // Use export to make prisma available for import
