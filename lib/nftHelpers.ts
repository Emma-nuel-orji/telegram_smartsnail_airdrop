export const getNftData = (index: number, collection: string) => {
  // --- MANCHIES LOGIC ---
  if (collection.toLowerCase() === 'manchies') {
    const manchieImages = [
      "Ape.png", "Ardilla.png", "Ardillla.png", "Black Phanter.png", "Bull.png",
      "Cabra.png", "Cabraa.png", "Cat.png", "Cerdo.png", "dog.png",
      "Eriso.png", "Fox.png", "Jaguarr.png", "Koala.png", "Lion 1.png",
      "Mouse.png", "Nutria.png", "Oso Polar.png", "Panda.png", "Perezoso.png",
      "Perezosoo.png", "Phanter.png", "platypus.png", "Rabbit.png", "Red Panda.png",
      "Sheep.png", "skunk.png", "Teddy.png", "Tiger.png", "Vaca.png"
    ];

    // This selects an image from 0-29 based on the index
    const imageFile = manchieImages[(index - 1) % manchieImages.length];
    
    return {
      rarity: 'Legendary', // Marking all early Manchies as Legendary
      nickname: imageFile.replace('.png', ''), // e.g., "Black Phanter"
      image: `/images/manchies/${encodeURIComponent(imageFile)}`,
      price: 1500000,
      desc: "A rare Manchie beast. Early adoption series."
    };
  }

  // --- SMART SNAIL LOGIC ---
 const base = '/images/snail';

if (index <= 600) {
  return { rarity: 'Legendary', nickname: 'African Giant', image: `${base}/3.png`, price: 5000000, desc: 'God-tier snail.' };
} 
if (index <= 1350) { 
  // This covers IDs 601 to 1350 (750 total Epics)
  return { rarity: 'Epic', nickname: 'Strong Snail', image: `${base}/006.png`, price: 2000000, desc: 'High endurance.' };
} 
if (index <= 2500) { 
  // This covers IDs 1351 to 2500 (1,150 total Rares)
  return { rarity: 'Rare', nickname: 'Speedy Snail', image: `${base}/20.png`, price: 1000000, desc: 'Super fast.' };
} 
if (index <= 4000) { 
  // This covers IDs 2501 to 4000 (1,500 total Uncommons)
  return { rarity: 'Uncommon', nickname: 'Camouflage Snail', image: `${base}/80.png`, price: 500000, desc: 'Stealth expert.' };
} 

// Anything from 4001 to 6000 is Common
return { rarity: 'Common', nickname: 'Sensory Snail', image: `${base}/1204.png`, price: 250000, desc: 'Standard shell.' }; 
};