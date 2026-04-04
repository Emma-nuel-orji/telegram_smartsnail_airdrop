import { useState, useEffect } from 'react';

export function useOnboardingTour(tourKey: string, telegramId: string | null) {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!telegramId) return;
    const seen = localStorage.getItem(`tour_${tourKey}_${telegramId}`);
    if (!seen) setShowTour(true);
  }, [telegramId, tourKey]);

  const completeTour = () => {
    if (!telegramId) return;
    localStorage.setItem(`tour_${tourKey}_${telegramId}`, '1');
    setShowTour(false);
  };

  return { showTour, completeTour };
}