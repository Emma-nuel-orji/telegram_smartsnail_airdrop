// app/api/cron/update-fight-status/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();

    // Update all SCHEDULED fights that have passed to EXPIRED
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
      message: `Updated ${result.count} expired fights`,
    });
  } catch (error: any) {
    console.error("Error updating fight status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update fight status" },
      { status: 500 }
    );
  }
}