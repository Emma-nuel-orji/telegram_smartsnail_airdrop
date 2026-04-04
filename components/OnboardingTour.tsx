import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


export interface TourStep {
  label: string;
  text: string;
  emoji?: string;        // optional icon per step
}

interface Props {
  steps: TourStep[];
  onDone: () => void;
}

export default function OnboardingTour({ steps, onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = steps[step];

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else onDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/85 flex flex-col justify-end p-5"
    >
      <div className="flex gap-1.5 mb-3">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${
            i === step ? 'w-5 bg-yellow-500' : 'w-1.5 bg-zinc-700'
          }`} />
        ))}
      </div>

      <div className="bg-zinc-950 border border-yellow-500/40 rounded-2xl p-4 mb-3">
        {current.emoji && (
          <span className="text-2xl mb-2 block">{current.emoji}</span>
        )}
        <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mb-1">
          {current.label}
        </p>
        <p className="text-sm text-zinc-300 leading-snug">
          {current.text}
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={onDone} className="px-4 py-3 text-xs text-zinc-500 font-bold">
          SKIP
        </button>
        <button onClick={next} className="flex-1 py-3 bg-yellow-500 text-black rounded-xl text-xs font-black uppercase">
          {step < steps.length - 1 ? 'NEXT →' : 'GOT IT'}
        </button>
      </div>
    </motion.div>
  );
}