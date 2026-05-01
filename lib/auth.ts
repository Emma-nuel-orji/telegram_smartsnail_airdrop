import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTelegram } from "@/lib/telegramAuth";

export type AuthResult = 
  | { isAuthenticated: false } 
  | { isAuthenticated: true; telegramId: bigint; user: any; isAdmin: boolean };

export async function authenticateTelegramUser(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("tma ")) return { isAuthenticated: false };

    const initData = authHeader.replace("tma ", "");
    const { valid, user } = verifyTelegram(initData);

    if (!valid || !user?.id) return { isAuthenticated: false };

    const telegramId = BigInt(user.id);
    let dbUser = await prisma.user.findUnique({ where: { telegramId } });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          telegramId,
          username: user.username || "",
          firstName: user.first_name || "",
          lastName: user.last_name || "",
        },
      });
    }

    const isAdmin = process.env.SUPER_ADMIN_IDS?.split(",").includes(user.id.toString()) || false;
    return { isAuthenticated: true, telegramId, user: dbUser, isAdmin };
  } catch (err) {
    console.error("Auth error:", err);
    return { isAuthenticated: false };
  }
}