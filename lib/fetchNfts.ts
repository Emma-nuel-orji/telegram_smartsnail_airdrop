// Update the type inside the curly braces to include rarity
export async function fetchNFTs({ 
  page = 1, 
  collection = "smartsnail", 
  rarity = "All" 
}: { 
  page?: number; 
  collection?: string; 
  rarity?: string; // Add this line!
}) {
  const res = await fetch(
    `/api/nfts?page=${page}&limit=20&collection=${collection}&rarity=${rarity}`
  );

  if (!res.ok) throw new Error("Failed to fetch NFTs");
  return res.json();
}