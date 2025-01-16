'use client';
import React from 'react';

const InfoPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Welcome Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to SmartSnail</h1>
        <p className="text-lg text-gray-700">
          A revolutionary project at the forefront of integrating blockchain technology with real-world applications. 
          Designed to redefine how you interact with assets, fitness, leisure, and more, SmartSnail is a dynamic 
          ecosystem that bridges the gap between the digital and physical worlds.
        </p>
      </section>

      {/* About Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">About SmartSnail</h2>
        <p className="text-gray-700">
          SmartSnail is a proud initiative of <span className="font-bold">Web3Chinonsolution</span>, 
          a pioneering company that innovates, educates, and integrates in the Web3 space. At Web3Chinonsolution, 
          we help clients bring their visions to life, whether in 3D animation, graphic design, smart contract 
          development, or full-stack Web3 solutions.
        </p>
      </div>

      {/* Features Section */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold mb-6">What SmartSnail Offers</h2>
        
        {/* Marketplace Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-bold mb-4">1. SmartSnail Marketplace for Real-World Assets</h3>
          <p className="mb-4">
            The <span className="font-bold">SmartSnail Marketplace</span> transforms how real-world assets are 
            bought, sold, and managed. By tokenizing these assets into NFTs, SmartSnail creates a new asset 
            class that benefits both creators and users.
          </p>
          <div className="pl-4 border-l-4 border-purple-500 space-y-2">
            <p>• Books become tokenized assets that authors and readers can earn from</p>
            <p>• Readers can resell or rent their books, creating a dynamic market for knowledge sharing</p>
            <p>• Authors earn royalties, ensuring they benefit from every transaction involving their work</p>
            <p>• With AI and VR, SmartSnail enhances the reading experience, making it more interactive and engaging</p>
          </div>
        </div>

        {/* NFTs Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-bold mb-4">2. SmartSnail NFTs</h3>
          <p className="text-gray-700">
            Our <span className="font-bold">SmartSnail NFTs</span> aren't just digital collectibles; they're 
            gateways to unparalleled opportunities in fitness, leisure, hospitality, travel, real-world assets, 
            and sports. Holders of these NFTs enjoy exclusive access to partnered services and earn a percentage 
            of revenue generated from real-world assets listed on the SmartSnail Marketplace.
          </p>
        </div>

        {/* Shells Token Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-2xl font-bold mb-4">3. Shells - The ERC-20 Coin of SmartSnail</h3>
          <p className="text-gray-700">
            The <span className="font-bold">Shells token</span> powers the entire SmartSnail ecosystem, 
            facilitating transactions across the marketplace and providing holders with access to premium 
            features and rewards. Shells are fast, secure, and versatile, allowing seamless participation 
            in the SmartSnail universe.
          </p>
        </div>
      </div>

      {/* Shell Tokenomics Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Shell Tokenomics</h2>
        <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg">
          <p className="text-xl font-semibold text-gray-500">Coming Soon</p>
        </div>
      </div>

      {/* Roadmap Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Project Roadmap</h2>
        <div className="flex items-center justify-center h-40 bg-gray-100 rounded-lg">
          <p className="text-xl font-semibold text-gray-500">Coming Soon</p>
        </div>
      </div>

      {/* What's Next Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">What's Next for SmartSnail</h2>
        <p className="text-gray-700">
          In line with the <span className="font-bold">sports segment</span> of our project, we are excited 
          to announce an upcoming product that will tokenize athletes—particularly boxers and martial artists. 
          Fans will have the opportunity to invest in and earn alongside their favorite fighters, creating a 
          deeper connection between athletes and their supporters.
        </p>
        <p className="mt-4 font-medium text-center">
          SmartSnail is here to redefine how we interact with the world—whether through digital innovation, 
          real-world applications, or groundbreaking opportunities. Join us on this transformative journey 
          and be part of the future.
        </p>
      </div>
    </div>
  );
};

export default InfoPage;