"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LevelsPage;
const link_1 = __importDefault(require("next/link"));
function LevelsPage() {
    return (<div className="min-h-screen bg-gray-100 px-6 py-8 text-gray-900">
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

        <h2 className="text-xl font-semibold mt-6 mb-2 text-indigo-500">Level Rewards:</h2>
        <ul className="list-disc ml-6 mb-6">
          <li>The first 20 to reach Level 2 (Speedy) will receive a SmartSnail NFT (Speedy tier).</li>
          <li>The first 15 to reach Level 3 (Strong) will receive a SmartSnail NFT (Strong tier).</li>
          <li>The first 10 to reach Level 4 (Sensory) will receive a SmartSnail NFT (Sensory tier).</li>
          <li>The first 5 to reach Level 5 (God NFT) will receive a SmartSnail NFT (African Giant tier).</li>
        </ul>

        <div className="text-center mt-8">
          <p className="text-lg font-semibold">Start picking shells now!</p>
          <link_1.default href="/">
            <a className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md">
              Back to Home
            </a>
          </link_1.default>
        </div>
      </div>
    </div>);
}
