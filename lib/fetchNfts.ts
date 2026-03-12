export async function fetchNFTs({ page = 1, collection = "smartsnail" }) {
  const res = await fetch(
    `/api/nfts?page=${page}&limit=50&collection=${collection}`
  );

  if (!res.ok) throw new Error("Failed to fetch NFTs");

  return res.json();
}
