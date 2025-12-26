import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const now = new Date();

    const result = await prisma.fight.updateMany({
      where: {
        status: "SCHEDULED",
        fightDate: { lt: now },
      },
      data: {
        status: "EXPIRED",
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: `Manually updated ${result.count} expired fights`,
    });
  } catch (error: any) {
    console.error("Error updating fights:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}