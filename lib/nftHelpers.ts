export const getNftData = (index: number, collection: string) => {
  const coll = collection.toLowerCase();

  // --- MANCHIES LOGIC ---
  if (coll === 'manchies') {
    const manchieImages = [
      "Ape.png", "Ardilla.png", "Ardillla.png", "Black Phanter.png", "Bull.png",
      "Cabra.png", "Cabraa.png", "Cat.png", "Cerdo.png", "dog.png",
      "Eriso.png", "Fox.png", "Jaguarr.png", "Koala.png", "Lion 1.png",
      "Mouse.png", "Nutria.png", "Oso Polar.png", "Panda.png", "Perezoso.png",
      "Perezosoo.png", "Phanter.png", "platypus.png", "Rabbit.png", "Red Panda.png",
      "Sheep.png", "skunk.png", "Teddy.png", "Tiger.png", "Vaca.png"
    ];

    const imageFile = manchieImages[(index - 1) % manchieImages.length];
    
    return {
      rarity: 'Legendary' as const, // Strict typing
      nickname: imageFile.replace('.png', ''),
      image: `/images/manchies/${encodeURIComponent(imageFile)}`,
      price: 150,
      desc: "A rare Manchie beast. Early adoption series."
    };
  }

  // --- SMART SNAIL LOGIC ---
  const base = '/images/snail';

  if (index <= 600) {
    return { rarity: 'Legendary' as const, nickname: 'African Giant', image: `${base}/3.png`, price: 50, desc: 'God-tier snail.' };
  } 
  if (index <= 1350) { 
    return { rarity: 'Epic' as const, nickname: 'Strong Snail', image: `${base}/006.png`, price: 20, desc: 'High endurance.' };
  } 
  if (index <= 2500) { 
    return { rarity: 'Rare' as const, nickname: 'Speedy Snail', image: `${base}/20.png`, price: 10, desc: 'Super fast.' };
  } 
  if (index <= 4000) { 
    return { rarity: 'Uncommon' as const, nickname: 'Camouflage Snail', image: `${base}/80.png`, price: 50, desc: 'Stealth expert.' };
  } 

  return { rarity: 'Common' as const, nickname: 'Sensory Snail', image: `${base}/1204.png`, price: 25, desc: 'Standard shell.' }; 
};