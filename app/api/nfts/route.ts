import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const collection = searchParams.get("collection") || "smartsnail";
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);

  const skip = (page - 1) * limit;

  const items = await prisma.nft.findMany({
    where: { collection },
    skip,
    take: limit,
    orderBy: { indexNumber: "asc" },
  });

  const total = await prisma.nft.count({ where: { collection } });

  return NextResponse.json({
    items,
    page,
    total,
    hasMore: skip + items.length < total,
  });
}
