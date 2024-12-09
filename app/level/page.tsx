'use client'

import Link from 'next/link';

export default function LevelsPage() {
  return (
    <div className="min-h-screen bg-gray-100 px-6 py-8 text-gray-900">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-4 text-indigo-600">SmartSnail NFT Levels</h1>

        <p className="mb-4">
          The levels are designed according to a 5-tier rarity system of SmartSnail NFTs.
          SmartSnail NFT is a token for the SmartSnail marketplace and ecosystem, granting access
          and special benefits to its holders, including a percentage of Real World Assets (RWA)
          sold on the marketplace.
        </p>

        <p className="mb-4">
          Learn more about SmartSnail NFT at{' '}
          <a href="https://www.smartsnailnft.com" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
            www.smartsnailnft.com
          </a>.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-indigo-500">Rarities of SmartSnail NFT:</h2>
        <p className="mb-4">
          The rarities range from common to legendary:
        </p>
        <ul className="list-disc ml-6 mb-6">
          <li>Camouflage Snail - Common (Level 1)</li>
          <li>Speedy Snail - Uncommon (Level 2)</li>
          <li>Strong Snail - Rare (Level 3)</li>
          <li>Sensory Snail - Epic (Level 4)</li>
          <li>African Giant or God NFT - Legendary (Level 5)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-indigo-500">Level Requirements:</h2>
        <p className="mb-4">Your level is determined by the number of shells you've earned:</p>
        <ul className="list-disc ml-6 mb-6">
          <li>Level 1 Camouflage: 0 - 1,000,000 shells</li>
          <li>Level 2 Speedy: 1,000,001 - 3,000,000 shells</li>
          <li>Level 3 Strong: 3,000,001 - 6,000,000 shells</li>
          <li>Level 4 Sensory: 6,000,001 - 10,000,000 shells</li>
          <li>Level 5 African Giant/God NFT: 10,000,001 - ♾️ shells</li>
        </ul>

        <h2 className="text-3xl font-bold text-purple-600 mt-8 mb-4 text-center">
  <span className="underline decoration-wavy decoration-purple-400">Level Rewards</span>
</h2>

<p className="text-lg text-gray-600 mb-6 text-center">
  500 SmartSnail NFTs are up for grabs! Here's how the distribution works across levels, with a few lucky users being randomly selected at the lower levels!
</p>

<div className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white p-6 rounded-lg shadow-lg mb-6">
  <h3 className="text-xl font-semibold mb-4 text-center">NFT Distribution Breakdown:</h3>
  <ul className="list-inside space-y-3 text-lg">
  <li className="flex items-center">
      <span className="w-8 h-8 bg-purple-400 rounded-full text-center text-xl mr-4">1</span>
      <div>
        <span className="font-semibold">Camouflage Level - 10 NFTs</span><br />
        10 (randomly chosen) from the first 500 players on this level will receive a SmartSnail NFT (Camouflage tier). 
      </div>
    </li>


    <li className="flex items-center">
      <span className="w-8 h-8 bg-purple-400 rounded-full text-center text-xl mr-4">1</span>
      <div>
        <span className="font-semibold">Level 2 (Speedy) - 200 NFTs</span><br />
        The first 20 players to reach this level will get a SmartSnail NFT (Speedy tier).
      </div>
    </li>
    <li className="flex items-center">
      <span className="w-8 h-8 bg-purple-400 rounded-full text-center text-xl mr-4">2</span>
      <div>
        <span className="font-semibold">Level 3 (Strong) - 150 NFTs</span><br />
        The first 15 players to reach this level will get a SmartSnail NFT (Strong tier).
      </div>
    </li>
    <li className="flex items-center">
      <span className="w-8 h-8 bg-purple-400 rounded-full text-center text-xl mr-4">3</span>
      <div>
        <span className="font-semibold">Level 4 (Sensory) - 100 NFTs</span><br />
        The first 10 players to reach this level will get a SmartSnail NFT (Sensory tier).
      </div>
    </li>
    <li className="flex items-center">
      <span className="w-8 h-8 bg-purple-400 rounded-full text-center text-xl mr-4">4</span>
      <div>
        <span className="font-semibold">Level 5 (God NFT) - 50 NFTs</span><br />
        The first 5 players to reach this level will get a SmartSnail NFT (African Giant tier).
      </div>
    </li>
  </ul>
</div>

<p className="text-lg text-gray-600 text-center mt-4">
  Keep progressing and collect NFTs as you rise through the levels. The competition is on!
</p>


        <div className="text-center mt-8">
          <p className="text-lg font-semibold">Start picking shells now!</p>
          <Link href="/">
            <a className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md">
              Back to Home
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
