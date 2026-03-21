// lib/nftHelpers.ts

export const getNftData = (index: number, collection: string | null) => {
  const base = '/images/snail';
  
  if (index <= 60) {
    return { 
      rarity: 'Legendary', 
      nickname: 'African Giant (GODnft)', 
      image: `${base}/3.png`, 
      price: 5000000,
      desc: 'The ultimate predator. Only 60 exist in the ecosystem.'
    };
  } else if (index <= 360) {
    return { 
      rarity: 'Epic', 
      nickname: 'Strong Snail', 
      image: `${base}/006.png`, 
      price: 2000000,
      desc: 'Built for endurance and heavy lifting.'
    };
  } else if (index <= 1200) {
    return { 
      rarity: 'Rare', 
      nickname: 'Speedy Snail', 
      image: `${base}/20.png`, 
      price: 1000000,
      desc: 'The fastest shell in the metaverse.'
    };
  } else if (index <= 2400) {
    return { 
      rarity: 'Uncommon', 
      nickname: 'Camouflage Snail', 
      image: `${base}/80.png`, 
      price: 500000,
      desc: 'Hidden in plain sight. Expert at stealth.'
    };
  } else {
    return { 
      rarity: 'Common', 
      nickname: 'Sensory Snail', 
      image: `${base}/1204.png`, 
      price: 250000,
      desc: 'Highly tuned to the environment.'
    };
  }
};