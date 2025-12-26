import React, { useState, useEffect, useRef } from "react";
import Image from 'next/image';
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/loader";
import "./stakingg.css";

// Define interfaces for our data structures
interface Fighter {
  id: string;
  name: string;
  gender?: string; 
  imageUrl?: string;
  telegramId?: string;
  socialMedia?: string;
}

interface Fight {
  id: string;
  title: string;
  status: "SCHEDULED" | "COMPLETED" | "DRAW" | "CANCELLED" | "EXPIRED";
  fightDate: string;
  fighter1: Fighter;
  fighter2: Fighter;
  winnerId?: string;
  winner?: Fighter | null;
}

interface TotalSupport {
  stars: number;
  points: number;
}

interface FightCardProps {
  fight?: Fight;
  userPoints: number;
  telegramId: string | null;
}

interface FighterStakingProps {
  fighter?: Fighter;
  opponent?: Fighter;
  fight?: Fight;
  userPoints: number;
  isActive: boolean;
  isConcluded?: boolean;
  telegramId: string | null;
  position: 'left' | 'right';
}

const MOTIVATIONAL_MESSAGES = [
  "Wow! Keep supporting your fighter!",
  "Awesome support!",
  "Your fighter will definitely make you proud!",
  "Amazing! Keep it up!",
  "You're on fire!",
  "That's the spirit!",
  "Show your support!",
  "Back your champion!",
  "Great choice!",
  "Let's go!"
];

function getTimeRemaining(fightDate: string) {
  const total = Date.parse(fightDate) - Date.now();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}

function FightCard({ fight, userPoints, telegramId }: FightCardProps) {
  const isActive = !!fight && 
    fight.status === "SCHEDULED" && 
    new Date(fight.fightDate).getTime() > Date.now();
  
  const isConcluded = !!fight && (
  fight.status === "COMPLETED" ||
  fight.status === "DRAW" ||
  fight.status === "CANCELLED"
);

const isExpiredByTime =
  !!fight && new Date(fight.fightDate).getTime() <= Date.now();

  
  const [timer, setTimer] = useState<string>("");

  const isDraw = fight?.status === "DRAW";

  const winner =
  isConcluded
    ? fight?.winner ??
      (fight?.winnerId
        ? fight.fighter1?.id === fight.winnerId
          ? fight.fighter1
          : fight.fighter2
        : null)
    : null;

    console.log("WINNER DEBUG", {
  fightId: fight?.id,
  status: fight?.status,
  winnerId: fight?.winnerId,
  winner: fight?.winner,
  fighter1: fight?.fighter1?.id,
  fighter2: fight?.fighter2?.id,
});

 useEffect(() => {
  if (!fight) return;

  const interval = setInterval(() => {
    const remaining = getTimeRemaining(fight.fightDate);

    if (remaining.total <= 0) {
      clearInterval(interval);

      if (fight.status === "DRAW") {
        setTimer("Fight ended in a draw");
      } else if (fight.status === "CANCELLED") {
        setTimer("Fight cancelled");
      } else if (fight.status === "EXPIRED") {
        setTimer("Awaiting results");
      } else if (fight.status === "COMPLETED") {
        setTimer("Fight completed");
      } else {
        setTimer("Fight concluded");
      }
    } else {
      setTimer(
        `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`
      );
    }
  }, 1000);

  return () => clearInterval(interval);
}, [fight]);

  
  return (
    <div className={`fight-card ${isConcluded ? 'concluded' : ''} ${!isActive && !isConcluded ? 'inactive-fight' : ''}`}>
      <div className="fight-header">
        <h2>{fight ? fight.title : "No Current Fight"}</h2>
        <div className="fight-date">
          {fight ? new Date(fight.fightDate).toLocaleString() : "To be announced"}
        </div>
        {fight && (
          <div className={`fight-timer ${isConcluded ? 'concluded' : ''}`}>
            {timer}
          </div>
        )}
      </div>
      
      <div className="fighters-container">
        <FighterStaking 
          fighter={fight?.fighter1 || undefined}
          opponent={fight?.fighter2 || undefined}
          fight={fight}
          userPoints={userPoints}
          isActive={isActive}
          isConcluded={isConcluded}
          telegramId={telegramId}
          position="left"
        />
        <div className="vs-container">VS</div>
        <FighterStaking 
          fighter={fight?.fighter2}
          opponent={fight?.fighter1}
          fight={fight}
          userPoints={userPoints}
          isActive={isActive}
          isConcluded={isConcluded}
          telegramId={telegramId}
          position="right"
        />
      </div>
      
      {/* Enhanced Winner/Draw Overlay */}
      {isConcluded && (
        <div className="fight-result-overlay">
          <div className="result-backdrop"></div>
          
          {fight.status === "CANCELLED" ? (
            <div className="result-content cancelled-result">
              <div className="result-icon">🚫</div>
              <h2 className="result-title">FIGHT CANCELLED</h2>
            </div>
          ) : fight.status === "EXPIRED" ? (
            <div className="result-content expired-result">
              <div className="result-icon">⏰</div>
              <h2 className="result-title">AWAITING RESULTS</h2>
            </div>
          ) : isDraw ? (
            <div className="result-content draw-result">
              <div className="result-icon">🤝</div>
              <h2 className="result-title">IT'S A DRAW!</h2>
              <p className="result-subtitle">Both fighters showed incredible skill</p>
            </div>
          ) : winner ? (
            <div className="result-content winner-result">
              <div className="winner-image-container">
                {winner.imageUrl ? (
                  <img 
                    src={winner.imageUrl} 
                    alt={winner.name}
                    className="winner-portrait"
                  />
                ) : (
                  <div className="winner-placeholder">
                    {winner.name?.[0] || "W"}
                  </div>
                )}
                <div className="winner-crown">👑</div>
              </div>
              <h2 className="result-title winner-name">{winner.name}</h2>
              <p className="result-subtitle winner-label">WINS!</p>
              <div className="confetti-container">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="confetti" style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    backgroundColor: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'][Math.floor(Math.random() * 5)]
                  }}></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="result-content">
              <h2 className="result-title">FIGHT CONCLUDED</h2>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function FighterStaking({ fighter, opponent, fight, userPoints, isActive, isConcluded = false, telegramId, position }: FighterStakingProps) {
  type StakeTypeOption = 'STARS' | 'POINTS';
  const isBarFillingModeRef = useRef(false);
  const [stakeType, setStakeType] = useState<StakeTypeOption>('STARS');
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [tapping, setTapping] = useState<boolean>(false);
  const [barHeight, setBarHeight] = useState<number>(0);
  const [barLocked, setBarLocked] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [localUserPoints, setLocalUserPoints] = useState<number>(userPoints);
  const [buttonAnimation, setButtonAnimation] = useState<string>('');
  const [totalSupport, setTotalSupport] = useState<TotalSupport>({ stars: 0, points: 0 });
  const [messageQueue, setMessageQueue] = useState<Array<{id: number, text: string, x: number, y: number}>>([]);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchIntentRef = useRef<"idle" | "scroll" | "swipe" | "stake" | "detecting">("idle");
  const barLockedRef = useRef<boolean>(barLocked);
  const decayRef = useRef<number | null>(null);
  const fighterRef = useRef<HTMLDivElement | null>(null);


  const MAX_STARS = 100000;
  const MIN_POINTS_REQUIRED = 200000;
  const MAX_AMOUNT = stakeType === 'STARS' ? MAX_STARS : localUserPoints;
  const canParticipate = localUserPoints >= MIN_POINTS_REQUIRED && isActive && !isConcluded;
  const isFighter = fighter?.telegramId === telegramId;
  
  const isWinner = isConcluded && fight?.winnerId === fighter?.id;
  const isLoser = isConcluded && fight?.winnerId !== fighter?.id && fight?.winnerId;

  // Keep barLockedRef in sync
  useEffect(() => { 
    barLockedRef.current = barLocked; 
  }, [barLocked]);

  // Fetch total support
  useEffect(() => {
    if (fighter?.id && isActive) {
      fetchTotalSupport();
    }
  }, [fighter, isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (decayRef.current) {
        cancelAnimationFrame(decayRef.current);
        decayRef.current = null;
      }
    };
  }, []);

  // const startBarDecay = () => {
  //   if (decayRef.current) {
  //     cancelAnimationFrame(decayRef.current);
  //     decayRef.current = null;
  //   }

  //   let lastTime = 0;
  //   const smoothDecay = (timestamp: number) => {
  //     if (!lastTime) lastTime = timestamp;
  //     const delta = (timestamp - lastTime) / 1000;
  //     lastTime = timestamp;

  //     setBarHeight(prev => {
  //       if (barLockedRef.current || prev <= 0) return prev;
  //       const newHeight = Math.max(0, prev - delta * 20);
  //       setStakeAmount(Math.floor((newHeight / 100) * MAX_AMOUNT));
  //       return newHeight;
  //     });

  //     if (!barLockedRef.current && barHeight > 0) {
  //       decayRef.current = requestAnimationFrame(smoothDecay);
  //     }
  //   };

  //   decayRef.current = requestAnimationFrame(smoothDecay);
  // };
const startBarDecay = () => {
  if (decayRef.current) {
    cancelAnimationFrame(decayRef.current);
    decayRef.current = null;
  }

  let lastTime = 0;

  const smoothDecay = (timestamp: number) => {
    if (!lastTime) lastTime = timestamp;
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    setBarHeight(prev => {
      if (barLockedRef.current || prev <= 0) return prev;

      const newHeight = Math.max(0, prev - delta * 20);
      setStakeAmount(Math.floor((newHeight / 100) * MAX_AMOUNT));
      return newHeight;
    });

    if (!barLockedRef.current) {
      decayRef.current = requestAnimationFrame(smoothDecay);
    }
  };

  decayRef.current = requestAnimationFrame(smoothDecay);
};


  const stopBarDecay = () => {
    if (decayRef.current) {
      cancelAnimationFrame(decayRef.current);
      decayRef.current = null;
    }
  };

  // Touch handlers
useEffect(() => {
  const el = fighterRef.current;
  const barElement = el?.querySelector('.tapping-bar-track');

  if (!el || !barElement) return;

  let lastTouchY = 0;
  let lastTouchX = 0;
  let barRect: DOMRect | null = null;

  const handleTouchStart = (e: TouchEvent) => {
    if (!canParticipate || isFighter) return;

    const t = e.touches[0];
    if (!t) return;

    const barBounds = barElement.getBoundingClientRect();
    const touchX = t.clientX;
    const touchY = t.clientY;

    const touchedBar =
      touchX >= barBounds.left &&
      touchX <= barBounds.right &&
      touchY >= barBounds.top &&
      touchY <= barBounds.bottom;

    if (!touchedBar) return;

    e.preventDefault();
    e.stopPropagation();

    lastTouchY = t.clientY;
    lastTouchX = t.clientX;
    barRect = barBounds;

    isBarFillingModeRef.current = true;
    setTapping(true);
    stopBarDecay();

    document.body.classList.add('staking-active');
  };

  const handleTouchMove = (e: TouchEvent) => {
  if (!isBarFillingModeRef.current || !barRect) return;

  const touch = e.touches[0];
  if (!touch) return;

  e.preventDefault();
  e.stopPropagation();

  // Movement deltas
  const deltaY = lastTouchY - touch.clientY; // up = +
  const deltaX = touch.clientX - lastTouchX; // right = +

  lastTouchY = touch.clientY;
  lastTouchX = touch.clientX;

  // 🎛️ Sensitivity tuning
  const VERTICAL_WEIGHT = 0.6;
  const HORIZONTAL_WEIGHT = 0.4;
  const SENSITIVITY = 1.1; // 🔽 lower = slower (0.7 – 1.3 is ideal)

  // True 2D directional drag
  const directionalDelta =
    Math.sign(deltaY) * Math.abs(deltaY) * VERTICAL_WEIGHT +
    Math.sign(deltaX) * Math.abs(deltaX) * HORIZONTAL_WEIGHT;

  const percentageChange =
    (directionalDelta / barRect.height) * 100 * SENSITIVITY;

  // Ignore micro jitter
  if (Math.abs(percentageChange) < 0.05) return;

  setBarHeight(prev => {
    const newHeight = Math.max(0, Math.min(100, prev + percentageChange));
    setStakeAmount(Math.floor((newHeight / 100) * MAX_AMOUNT));
    return newHeight;
  });
};


  const handleTouchEnd = () => {
    document.body.classList.remove('staking-active');

    setTapping(false);
    isBarFillingModeRef.current = false;
    barRect = null;

    if (!barLockedRef.current) {
      setTimeout(startBarDecay, 400);
    }
  };

  el.addEventListener("touchstart", handleTouchStart, { passive: false });
  el.addEventListener("touchmove", handleTouchMove, { passive: false });
  el.addEventListener("touchend", handleTouchEnd);
  el.addEventListener("touchcancel", handleTouchEnd);

  return () => {
    document.body.classList.remove('staking-active');

    el.removeEventListener("touchstart", handleTouchStart);
    el.removeEventListener("touchmove", handleTouchMove);
    el.removeEventListener("touchend", handleTouchEnd);
    el.removeEventListener("touchcancel", handleTouchEnd);
  };
}, [canParticipate, isFighter, MAX_AMOUNT]);


  const fetchTotalSupport = async () => {
    try {
      const response = await fetch(`/api/stakes/total/${fighter?.id}`);
      if (response.ok) {
        const data = await response.json();
        setTotalSupport(data);
      } else {
        setTotalSupport({ stars: 0, points: 0 });
      }
    } catch (error) {
      console.error("Error fetching total support:", error);
      setTotalSupport({ stars: 0, points: 0 });
    }
  };

  const handleStakeTypeChange = (type: StakeTypeOption) => {
    if (!canParticipate) return;
    
    setBarHeight(0);
    setStakeAmount(0);
    setBarLocked(false);
    
    setButtonAnimation(type);
    setTimeout(() => setButtonAnimation(''), 700);
    
    setStakeType(type);
  };

  const createTapEffect = (x: number, y: number) => {
    if (!fighterRef.current) return;
    
    const ripple = document.createElement('div');
    ripple.className = 'tap-effect';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    fighterRef.current.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const showMotivationalMessage = (x: number, y: number) => {
    const randomMessage = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    const newMessage = {
      id: messageIdCounter,
      text: randomMessage,
      x,
      y
    };
    
    setMessageQueue(prev => [...prev, newMessage]);
    setMessageIdCounter(prev => prev + 1);
    
    setTimeout(() => {
      setMessageQueue(prev => prev.filter(msg => msg.id !== newMessage.id));
    }, 2500);
  };

  const preventTextInteraction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleBarClick = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const newLocked = !barLockedRef.current;
    setBarLocked(newLocked);
    barLockedRef.current = newLocked;

    if (newLocked) {
      stopBarDecay();
    } else {
      startBarDecay();
    }
  };

  const handleStakeWithStars = async () => {
    if (!canParticipate || stakeAmount <= 0 || isFighter || !barLocked) return;

    try {
      const response = await fetch('/api/stakes/stars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fightId: fight?.id,
          fighterId: fighter?.id,
          stakeAmount,
          telegramId,
          title: `Support ${fighter?.name || 'Fighter'}`,
          description: `Stake ${stakeAmount} Stars to support ${fighter?.name || 'your fighter'} in ${fight?.title || 'the fight'}`,
          label: `${stakeAmount} Telegram Stars`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Stars payment');
      }

      const data = await response.json();

      if (data.invoiceLink) {
        window.location.href = data.invoiceLink;
      } else {
        throw new Error("No invoice link received from server");
      }
    } catch (error) {
      console.error("Staking with Stars failed:", error);
      setMessage(error instanceof Error ? error.message : "Failed to place stake. Please try again.");
    }
  };

  const submitStake = async () => {
    if (!canParticipate || stakeAmount <= 0 || isFighter || !barLocked) return;

    if (stakeType === 'STARS') {
      await handleStakeWithStars();
    } else {
      try {
        const response = await fetch('/api/stakes/place', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fightId: fight?.id,
            fighterId: fighter?.id,
            stakeAmount,
            stakeType,
            telegramId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to place stake');
        }

        setBarHeight(0);
        setStakeAmount(0);
        setBarLocked(false);
        setMessage('Stake placed successfully!');

        if (telegramId) {
          const userResponse = await fetch(`/api/user/${telegramId}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setLocalUserPoints(userData.points);
          }
        }

        fetchTotalSupport();
      } catch (error) {
        let errorMessage = 'An unexpected error occurred';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        setMessage(`Error: ${errorMessage}`);
      }
    }
  };

  useEffect(() => {
    setLocalUserPoints(userPoints);
  }, [userPoints]);
  
  return (
    <div 
      ref={fighterRef}
      className={`fighter-staking ${position} ${!isActive && !isConcluded ? 'inactive' : ''} ${tapping ? 'active-stake' : ''} ${isFighter ? 'is-fighter' : ''} ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}`}
      style={{ 
        userSelect: 'none', 
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onContextMenu={preventTextInteraction}
      onDragStart={preventTextInteraction}
    >
      {/* Motivational Messages */}
      <div className="motivational-messages-container">
        {messageQueue.map((msg) => (
          <div
            key={msg.id}
            className="floating-message"
            style={{
              left: `${msg.x}px`,
              top: `${msg.y}px`,
            }}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {isWinner && <div className="winner-badge">WINNER</div>}
      
      <div className="fighter-info">
        <div className="fighter-image">
          {fighter?.imageUrl ? (
            <img
              src={fighter.imageUrl}
              alt={fighter.name || "Fighter"}
              width={150}
              height={150}
              className="fighter-portrait"
              draggable={false}
              onDragStart={preventTextInteraction}
              style={{ 
                borderRadius: '50%', 
                border: '3px solid rgba(255,255,255,0.3)', 
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)', 
                objectFit: 'cover',
                display: 'block'
              }}
            />
          ) : (
            <div 
              className="fighter-placeholder"
              data-fighter-id={fighter?.id}
            >
              {!isActive ? "?" : fighter?.name?.[0] || "?"}
            </div>
          )}
        </div>
        <h3 className="fighter-name">{fighter?.name || "Unknown Fighter"}</h3>
        
        {fighter?.socialMedia && isActive && (
          <a href={fighter.socialMedia} target="_blank" rel="noopener noreferrer" className="social-button">
            View Profile
          </a>
        )}
        
        {isFighter && (
          <div className="fighter-support-stats">
            <h4>Your Fan Support</h4>
            <div className="support-stats">
              <div className="stat-item">
                <span className="stat-label">Stars:</span>
                <span className="stat-value">{totalSupport.stars.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Shells:</span>
                <span className="stat-value">{totalSupport.points.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="staking-controls">
        {!isFighter && (
          <>
            <div className="stake-type-selector">
              <button 
                className={`stake-type-button ${stakeType === 'STARS' ? 'active' : ''} ${buttonAnimation === 'STARS' ? 'btn-pulse' : ''}`}
                onClick={() => handleStakeTypeChange('STARS')}
                disabled={!isActive}
              >
                Stake with Stars
              </button>
              <button 
                className={`stake-type-button ${stakeType === 'POINTS' ? 'active' : ''} ${buttonAnimation === 'POINTS' ? 'btn-pulse' : ''}`}
                onClick={() => handleStakeTypeChange('POINTS')}
                disabled={!isActive}
              >
                Stake with Shells
              </button>
            </div>
            
            <div className="staking-area">
              <div 
                className={`tapping-bar-container ${!canParticipate ? 'disabled' : ''} ${barLocked ? 'locked' : ''}`}
              >
                <div 
                  className="tapping-bar-track"
                  onClick={handleBarClick}
                  onTouchEnd={handleBarClick}
                >
                  <div 
                    className={`tapping-bar-fill ${stakeType.toLowerCase()}`} 
                    style={{ height: `${barHeight}%` }}
                  >
                    {tapping && <div className="tapping-bar-pulse"></div>}
                  </div>
                  {barLocked && (
                    <div className="lock-indicator">🔒</div>
                  )}
                </div>
              </div>
              
              <div className="stake-amount">
                {stakeAmount.toLocaleString()} {stakeType === 'STARS' ? 'Stars' : 'Shells'}
                <div className="stake-amount-max">
                  Max: {MAX_AMOUNT.toLocaleString()} {stakeType === 'STARS' ? 'Stars' : 'Shells'}
                </div>
              </div>
              
              {!canParticipate && isActive && (
                <div className="insufficient-balance">
                  Minimum {MIN_POINTS_REQUIRED.toLocaleString()} Shells required to participate
                </div>
              )}
              
              {!isActive && (
                <div className="no-fight-message">
                  No active fight to support
                </div>
              )}
              
              {isActive && (
                <button 
                  className={`stake-button ${barLocked && stakeAmount > 0 ? 'active' : ''}`}
                  onClick={submitStake}
                  disabled={!canParticipate || stakeAmount === 0 || !barLocked}
                >
                  {!barLocked ? 'Lock bar to place stake' : 
                   stakeAmount === 0 ? 'Fill and lock bar first' :
                   'Place Stake'}
                </button>
              )}
              
              <div className="stake-info">
                <div className="instruction">
                  <span className="icon">👆</span>
                  <p className="text">Tap and hold to fill the bar</p>
                </div>
                <div className="instruction">
                  <span className="icon">🔒</span>
                  <p className="text">Tap the bar to lock your stake</p>
                </div>
              </div>
            </div>
          </>
        )}
        {isConcluded && (
          <div className="concluded-message">
            Staking is closed for this fight
          </div>
        )}
      </div>
    </div>
  );
}


interface FightSliderProps {
  fights: Fight[];
  userPoints: number;
  telegramId: string | null;
}

const FightSlider: React.FC<FightSliderProps> = ({ fights, userPoints, telegramId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pastFights, setPastFights] = useState<Fight[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const fetchPastFights = async () => {
      try {
        const res = await fetch('/api/fights/past');
        const data = await res.json();
        setPastFights(data);
      } catch (err) {
        console.error('Error fetching past fights:', err);
      }
    };
    fetchPastFights();
  }, []);

  const allSlides = [...fights, ...pastFights];
  const slidesToShow = allSlides.length > 0 ? allSlides : [undefined]; 

  const goToSlide = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, slidesToShow.length - 1)));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < slidesToShow.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;
    
    // Minimum swipe distance
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < slidesToShow.length - 1) {
        // Swipe left - next slide
        handleNext();
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous slide
        handlePrevious();
      }
    }
    
    setIsDragging(false);
  };

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setScrollLeft(currentIndex);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const endX = e.clientX;
    const diff = startX - endX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < slidesToShow.length - 1) {
        handleNext();
      } else if (diff < 0 && currentIndex > 0) {
        handlePrevious();
      }
    }
    
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
  return (
    <div className="fight-slider-container">
      <div 
        className="fight-slider"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-in-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {slidesToShow.map((fight, index) => (
          <div key={fight?.id || `empty-${index}`} className="slide">
            <FightCard 
              fight={fight} 
              userPoints={userPoints}
              telegramId={telegramId}
            />
          </div>
        ))}
      </div>
      
      {/* Navigation arrows */}
      {slidesToShow.length > 1 && (
        <>
          <button 
            className={`slider-nav prev ${currentIndex === 0 ? 'disabled' : ''}`}
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            ‹
          </button>
          <button 
            className={`slider-nav next ${currentIndex === slidesToShow.length - 1 ? 'disabled' : ''}`}
            onClick={handleNext}
            disabled={currentIndex === slidesToShow.length - 1}
          >
            ›
          </button>
        </>
      )}
      
      {/* Dots indicator */}
      <div className="slider-dots">
        {slidesToShow.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};
export default function StakingPageContent() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [fights, setFights] = useState<Fight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);

  // Initialize Telegram WebApp
 useEffect(() => {
  if (typeof window !== "undefined") {
    const webApp = window.Telegram?.WebApp;

    if (webApp) {
      webApp.ready();
      webApp.expand();

      try {
        // Cast once, reuse everywhere Telegram lacks proper typings
        const anyWebApp = webApp as any;

        // Official method — but missing in types, so use anyWebApp
        if (typeof anyWebApp.disableVerticalSwipes === "function") {
          anyWebApp.disableVerticalSwipes();
          console.log("✅ Vertical swipes disabled");
        }

        // Unofficial method — also via any
        if (typeof anyWebApp.postEvent === "function") {
          anyWebApp.postEvent("web_app_setup_swipe_behavior", {
            allow_vertical_swipe: false,
          });
          console.log("✅ Swipe behavior configured");
        }
      } catch (err) {
        console.log("⚠️ Could not configure swipes:", err);
      }

      // Haptic Feedback
      if (webApp.HapticFeedback) {
        console.log("✅ Haptic available");
        webApp.HapticFeedback.impactOccurred("light");
      } else {
        console.log("❌ Haptic NOT available");
      }

      // Retrieve Telegram ID
      if (webApp.initDataUnsafe?.user?.id) {
        setTelegramId(webApp.initDataUnsafe.user.id.toString());
      } else {
        setError("Could not retrieve Telegram ID");
      }
    } else {
      setError("Telegram WebApp not initialized");
    }
  }
}, []);



  useEffect(() => {
    const fetchData = async () => {
      if (!telegramId) return;
      
      try {
        setLoading(true);

        const userResponse = await fetch(`/api/user/${telegramId}`);
        if (!userResponse.ok) throw new Error('Failed to fetch user info');
        const userData = await userResponse.json();
        setUserPoints(userData.points);
        
        const fightsResponse = await fetch('/api/fights/upcoming');
        if (!fightsResponse.ok) throw new Error('Failed to fetch fights');
        const fightsData = await fightsResponse.json();
        setFights(fightsData);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [telegramId]);

  if (loading) return <Loader />;
  if (error) return <div className="error-container">Error: {error}</div>;

  return (
    <div className="staking-container">
      <Link href="/">
        <img
          src="/images/info/output-onlinepngtools (6).png"
          width={24}
          height={24}
          alt="back"
        />
      </Link>
      <h1 className="staking-title">Support Your Fighter</h1>
      <p className="points-balance">Shells Balance: {userPoints.toLocaleString()}</p>
      
      <FightSlider 
        fights={fights} 
        userPoints={userPoints}
        telegramId={telegramId}
      />
    </div>
  );
}