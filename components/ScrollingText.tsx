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
          Some are farmers here, while some are Snailonauts. Over here we earn something more valuable than coins: Shells!
          Some are farmers here, while some are Snailonauts. Over here we earn something more valuable than coins: Shells!
          Some are farmers here, while some are Snailonauts. Over here we earn something more valuable than coins: Shells!
          Some are farmers here, while some are Snailonauts. Over here we earn something more valuable than coins: Shells!
          Some are farmers here, while some are Snailonauts. Over here we earn something more valuable than coins: Shells!
        </p>
        <p className="text-lg font-semibold text-white py-4">
          Earn your first 5,000 Shells
        </p>
      </div>
    </div>
  );
};

export default ScrollingText;
