import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function GET(_: Request, { params }: Params) {
  const nft = await prisma.nft.findUnique({
    where: { id: params.id },
    include: {
      collection: true // THIS IS REQUIRED for the NFTCard to show the collection name
    }
  });

  if (!nft) {
    return NextResponse.json({ error: "NFT not found" }, { status: 404 });
  }

  // Handle BigInt serialization just in case your prices use it
  const safeNft = JSON.parse(
    JSON.stringify(nft, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  return NextResponse.json(safeNft);
}
