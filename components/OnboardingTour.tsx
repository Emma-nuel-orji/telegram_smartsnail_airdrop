"use client";
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TourStep {
  targetId: string; // The ID of the element to point to
  label: string;
  text: string;
  emoji?: string;
}

interface Props {
  steps: TourStep[];
  onDone: () => void;
}

export default function OnboardingTour({ steps, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const current = steps[step];

  // Update coordinates whenever the step changes
  useLayoutEffect(() => {
    const updateCoords = () => {
      const element = document.getElementById(current.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
        // Ensure element is visible
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [step, current.targetId]);

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else onDone();
  };

  // Determine if tooltip should be above or below the target
  const isTooltipAbove = coords.top > window.innerHeight / 2;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* 1. DARK OVERLAY WITH HOLE (SVG Mask) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.rect
              animate={{ 
                x: coords.left - 8, 
                y: coords.top - 8, 
                width: coords.width + 16, 
                height: coords.height + 16 
              }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.85)" mask="url(#spotlight-mask)" />
      </svg>

      {/* 2. TARGET BORDER GLOW */}
      <motion.div
        animate={{ 
          top: coords.top - 8, 
          left: coords.left - 8, 
          width: coords.width + 16, 
          height: coords.height + 16 
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute border-2 border-yellow-500 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.4)] z-[10001]"
      />

      {/* 3. FLOATING TOOLTIP */}

<AnimatePresence mode="wait">
  <motion.div
    key={step}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      // Logic: Position it relative to the target, but "clamped" within screen bounds
      top: isTooltipAbove 
        ? Math.max(10, coords.top - 210) // Prevents going off the top
        : Math.min(window.innerHeight - 250, coords.top + coords.height + 20), // Prevents going off the bottom
      
      // Magic Centering: Try to center on target, but keep at least 20px from screen edges
      left: Math.max(20, Math.min(window.innerWidth - 300, coords.left + (coords.width / 2) - 140))
    }}
    exit={{ opacity: 0, scale: 0.95 }}
    // Changed to fixed for better stability during scrolls
    className="fixed w-[280px] pointer-events-auto z-[10002]"
  >
    {/* Arrow - Centered relative to the target if possible */}
    <div 
      className={`absolute w-4 h-4 bg-zinc-950 rotate-45 border-zinc-800 ${
        isTooltipAbove ? '-bottom-2 border-r border-b' : '-top-2 border-l border-t'
      }`} 
      style={{ 
        left: 'calc(50% - 8px)', // Keeps arrow centered on the tooltip bubble
      }}
    />

    <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3 mb-3">
        {current.emoji && <span className="text-2xl">{current.emoji}</span>}
        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-500 transition-all duration-500" 
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-500 mb-1">
        {current.label}
      </p>
      
      {/* Added max-height and overflow-y-auto in case text is very long */}
      <div className="max-h-[120px] overflow-y-auto mb-5 pr-1 custom-scrollbar">
        <p className="text-sm text-zinc-300 leading-snug font-medium">
          {current.text}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onDone} className="px-3 py-2 text-[10px] text-zinc-500 font-bold uppercase active:opacity-50">
          Skip
        </button>
        <button 
          onClick={next} 
          className="flex-1 py-3 bg-yellow-500 text-black rounded-xl text-[10px] font-black uppercase shadow-lg shadow-yellow-500/20 active:scale-95 transition-transform"
        >
          {step < steps.length - 1 ? 'Next →' : 'Finish'}
        </button>
      </div>
    </div>
  </motion.div>
</AnimatePresence>
    </div>
  );
}