import { useEffect, useRef, useState } from 'react';

const ScrollingText = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(true); // Manage scrolling state

  useEffect(() => {
    if (!scrollRef.current) return;

    const element = scrollRef.current;
    let currentScroll = 0;
    let animationFrameId: number;

    const scroll = () => {
      if (!isScrolling) return; // Stop scrolling if isScrolling is false

      const maxScroll = element.scrollHeight - element.clientHeight;

      currentScroll += 0.15; // Reduced speed for better readability
      if (currentScroll >= maxScroll) {
        currentScroll = 0;
        setIsScrolling(false); // Stop scrolling
        // Add delay before restarting
        setTimeout(() => {
          setIsScrolling(true); // Restart scrolling after delay
        }, 3000); // 3-second delay before restarting
      }

      element.scrollTop = currentScroll;
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isScrolling]); // Dependency array includes isScrolling to re-run logic when it changes

  return (
    <div className="relative h-48 overflow-hidden rounded-md bg-purple-800/20 backdrop-blur-sm">
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-y-auto scrollbar-hide px-4"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <p className="text-white/90 py-4">
  Now you're a Smart Snail!
</p>
<p className="text-white/80 leading-relaxed">
  Some are farmers here, while some are Snailonauts. Over here we earn something more valuable than coins: <span className="text-yellow-500"> Shells!</span>
</p>
<p>
  Before you earn your first <span className="text-yellow-500">5000 Shells</span>, read the following:
</p>

<p className="text-white/70 leading-relaxed mt-4">
  Welcome to **SmartSnail**, a revolutionary project at the forefront of integrating blockchain technology with real-world applications. Designed to redefine how you interact with assets, fitness, leisure, and more, SmartSnail is a dynamic ecosystem bridging the gap between the digital and physical worlds.
</p>
<p className="text-white/70 leading-relaxed mt-2">
  **SmartSnail** is a proud initiative of **Web3Chinonsolutions**, a company that innovates, educates, and integrates in Web3. Web3Chinonsolutions helps clients build Web3-based projects, offering services like 3D animation, graphic design, smart contracts, and full-stack development. And this is just the beginning—there’s more to come!
</p>
<p className="text-white/70 leading-relaxed mt-2">
  The **SmartSnail Marketplace** tokenizes real-world assets like books, turning them into NFTs. Readers can **resell or rent books**, and authors earn royalties. Enhanced with **AI and VR**, SmartSnail creates an interactive reading experience. SmartSnail NFT holders also earn revenue from marketplace assets and enjoy access to services across fitness, leisure, hospitality, travel, and sports.
</p>
<p className="text-white/70 leading-relaxed mt-2">
  Soon, SmartSnail will tokenize athletes—boxers and martial artists—allowing fans to invest in and earn alongside their favorite fighters. Powered by **Shells**, our ERC-20 token, the SmartSnail ecosystem is here to redefine earning, ownership, and interaction.
</p>

        <p className="text-lg font-semibold text-white py-4">
          Earn your first 5,000 Shells
        </p>
      </div>
    </div>
  );
};

export default ScrollingText;
