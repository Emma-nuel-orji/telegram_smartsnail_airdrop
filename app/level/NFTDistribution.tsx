'use client';

import React from 'react';

const NFTDistribution = () => {
  return (
    <div style={{ background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(79, 70, 229))' }} className="text-white p-6 rounded-lg shadow-lg mb-6">
      <h3 className="text-xl font-semibold mb-4 text-center">NFT Distribution Breakdown:</h3>
      <ul className="space-y-3">
        <li className="flex items-center gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-xl">
            1
          </div>
          <div>
            <span className="font-semibold">Camouflage Level - 10 NFTs</span><br />
            10 (randomly chosen) from the first 500 players on this level will receive a SmartSnail NFT (Camouflage tier).
          </div>
        </li>
        <li className="flex items-center gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-xl">
            2
          </div>
          <div>
            <span className="font-semibold">Level 2 (Speedy) - 200 NFTs</span><br />
            The first 20 players to reach this level will get a SmartSnail NFT (Speedy tier).
          </div>
        </li>
        <li className="flex items-center gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-xl">
            3
          </div>
          <div>
            <span className="font-semibold">Level 3 (Strong) - 150 NFTs</span><br />
            The first 15 players to reach this level will get a SmartSnail NFT (Strong tier).
          </div>
        </li>
        <li className="flex items-center gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-xl">
            4
          </div>
          <div>
            <span className="font-semibold">Level 4 (Sensory) - 100 NFTs</span><br />
            The first 10 players to reach this level will get a SmartSnail NFT (Sensory tier).
          </div>
        </li>
        <li className="flex items-center gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-xl">
            5
          </div>
          <div>
            <span className="font-semibold">Level 5 (God NFT) - 50 NFTs</span><br />
            The first 5 players to reach this level will get a SmartSnail NFT (African Giant tier).
          </div>
        </li>
      </ul>
    </div>
  );
};

export default NFTDistribution;