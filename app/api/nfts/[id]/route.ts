import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function GET(_: Request, { params }: Params) {
  const nft = await prisma.nft.findUnique({
    where: { id: params.id }
  });

  if (!nft) {
    return NextResponse.json({ error: "NFT not found" }, { status: 404 });
  }

  return NextResponse.json(nft);
}
