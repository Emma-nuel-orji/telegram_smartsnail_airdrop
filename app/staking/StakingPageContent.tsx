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
  fightDate: string;
  fighter1: Fighter;
  fighter2: Fighter;
   winnerId?: string;
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
  const isActive = !!fight && new Date(fight.fightDate).getTime() > Date.now();
  const isConcluded = !!fight && new Date(fight.fightDate).getTime() <= Date.now();
  const [timer, setTimer] = useState<string>("");

  useEffect(() => {
    if (!fight) return;
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(fight.fightDate);
      if (remaining.total <= 0) {
        clearInterval(interval);
        setTimer("Fight Concluded");
      } else {
        setTimer(`${remaining.days}d ${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`);
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
          fighter={fight?.fighter1}
          opponent={fight?.fighter2}
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
      
      {isConcluded && (
        <div className="concluded-fight-overlay">
          FIGHT CONCLUDED
        </div>
      )}
    </div>
  );
}

function FighterStaking({ fighter, opponent, fight, userPoints, isActive, isConcluded = false, telegramId, position }: FighterStakingProps) {
  type StakeTypeOption = 'STARS' | 'POINTS';
  
  const [stakeType, setStakeType] = useState<StakeTypeOption>('STARS');
  const [stakeAmount, setStakeAmount] = useState<number>(0);
  const [tapping, setTapping] = useState<boolean>(false);
  const [barHeight, setBarHeight] = useState<number>(0);
  const [barLocked, setBarLocked] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [tapCount, setTapCount] = useState<number>(0);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [localUserPoints, setLocalUserPoints] = useState<number>(userPoints);
  const [buttonAnimation, setButtonAnimation] = useState<string>('');
  const [totalSupport, setTotalSupport] = useState<TotalSupport>({ stars: 0, points: 0 });
  const [messageQueue, setMessageQueue] = useState<Array<{id: number, text: string, x: number, y: number}>>([]);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [isTouchMoving, setIsTouchMoving] = useState<boolean>(false);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchIntentRef = useRef('idle'); // 'idle' | 'scroll' | 'stake'
  const barLockedRef = useRef<boolean>(barLocked); // keep a ref mirror of state
  const lastTapTimeRef = useRef<number>(0);
  
  const barDecayInterval = useRef<NodeJS.Timeout | null>(null);
  const messageInterval = useRef<NodeJS.Timeout | null>(null);
  const fighterRef = useRef<HTMLDivElement | null>(null);

  const MAX_STARS = 100000;
  const MIN_POINTS_REQUIRED = 200000;
  const MAX_AMOUNT = stakeType === 'STARS' ? MAX_STARS : localUserPoints;
  const canParticipate = localUserPoints >= MIN_POINTS_REQUIRED && isActive && !isConcluded;
  const isFighter = fighter?.telegramId === telegramId;
  
  // Determine winner/loser
  const isWinner = isConcluded && fight?.winnerId === fighter?.id;
  const isLoser = isConcluded && fight?.winnerId !== fighter?.id && fight?.winnerId;

  useEffect(() => {
    if (fighter?.id && isActive) {
      fetchTotalSupport();
    }
  }, [fighter, isActive]);

  // keep the barLockedRef in sync with state
useEffect(() => { barLockedRef.current = barLocked; }, [barLocked]);



// Ensure we clear the decay interval on unmount
useEffect(() => {
  return () => {
    if (barDecayInterval.current) {
      clearInterval(barDecayInterval.current);
      barDecayInterval.current = null;
    }
  };
}, []);

const startBarDecay = () => {
  if (barDecayInterval.current) {
    clearInterval(barDecayInterval.current);
    barDecayInterval.current = null;
  }

  if (barHeight > 0) {
    barDecayInterval.current = setInterval(() => {
      setBarHeight((prev) => {
        if (barLockedRef.current) {
          clearInterval(barDecayInterval.current!);
          barDecayInterval.current = null;
          return prev;
        }
        if (prev <= 0) {
          clearInterval(barDecayInterval.current!);
          barDecayInterval.current = null;
          return 0;
        }
        const newH = Math.max(0, prev - 0.4);
        setStakeAmount(Math.floor((newH / 100) * MAX_STARS));
        return newH;
      });
    }, 150);
  }
};

const stopBarDecay = () => {
  if (barDecayInterval.current) {
    clearInterval(barDecayInterval.current);
    barDecayInterval.current = null;
  }
};


// IMPORTANT: attach a non-passive touchmove listener to reliably prevent scroll.
// This ensures that when we call e.preventDefault() the browser honors it.
// 1. Define your handler for *native DOM TouchEvent*
// Use the correct type for native DOM handler
// const handleTouchMove = (e: globalThis.TouchEvent) => {
//   if (!canParticipate || isFighter) return;

//   const touch = e.touches[0];
//   if (!touch) return;

//   const dy = Math.abs(touch.clientY - touchStartYRef.current);

//   if (touchIntentRef.current === "idle") {
//     if (dy < 8) return;
//     if (dy < 30) {
//       touchIntentRef.current = "scroll";
//       setIsTouchMoving(true);
//       setTapping(false);
//       return;
//     }
//     touchIntentRef.current = "stake";
//     setIsTouchMoving(false);
//     setTapping(true);
//   }

//   if (touchIntentRef.current === "scroll") return;

//   // ✅ Only works because we used { passive: false }
//   e.preventDefault();
//   e.stopPropagation();

//   // Use e.target instead of e.currentTarget
//   const target = e.target as HTMLElement | null;
//   const rect = target?.getBoundingClientRect() ?? { left: 0, top: 0 };

//   const x = touch.clientX - rect.left;
//   const y = touch.clientY - rect.top;
//   createTapEffect(x, y);

//   const now = Date.now();
//   if (now - lastTapTimeRef.current > 40) {
//     setBarHeight((prev) => {
//       const increment = 1.5;
//       const newHeight = Math.min(100, prev + increment);
//       setStakeAmount(Math.floor((newHeight / 100) * MAX_STARS));
//       return newHeight;
//     });
//     lastTapTimeRef.current = now;

//     if (Math.random() < 0.25) {
//       showMotivationalMessage(x, y);
//     }
//   }
// };

// Handlers stay native
useEffect(() => {
  const el = fighterRef.current;
  if (!el) return;

  let lastTapTime = 0;
  let stakeMode = false;

  const handleTouchStart = (e: TouchEvent) => {
    if (!canParticipate || isFighter) return;
    const now = Date.now();

    const t = e.touches[0];
    if (!t) return;

    // double-tap activates stake mode
    if (now - lastTapTime < 300) {
      stakeMode = true;
      e.preventDefault();
      e.stopPropagation();
      stopBarDecay();
    } else {
      stakeMode = false;
    }

    lastTapTime = now;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!stakeMode) return; // if not in stake mode, let page scroll
    e.preventDefault();
    e.stopPropagation();

    const t = e.touches[0];
    if (!t) return;

    const rect = el.getBoundingClientRect();
    const relY = Math.max(0, Math.min(1, 1 - (t.clientY - rect.top) / rect.height));
    const relX = Math.max(0, Math.min(1, (t.clientX - rect.left) / rect.width));

    // choose whichever movement is stronger (horizontal OR vertical)
    const value = Math.max(relY, relX);

    const newHeight = Math.round(value * 100);

    setBarHeight(newHeight);
    setStakeAmount(Math.floor((newHeight / 100) * MAX_STARS));

    createTapEffect(t.clientX - rect.left, t.clientY - rect.top);

    if (Math.random() < 0.2) {
      showMotivationalMessage(t.clientX, t.clientY);
    }
  };

  const handleTouchEnd = () => {
    stakeMode = false;
    setTapping(false);
    setIsTouchMoving(false);

    if (!barLockedRef.current && barHeight > 0) {
      setTimeout(() => {
        if (!barLockedRef.current) {
          startBarDecay();
        }
      }, 2000);
    }
  };

  el.addEventListener("touchstart", handleTouchStart, { passive: false });
  el.addEventListener("touchmove", handleTouchMove, { passive: false });
  el.addEventListener("touchend", handleTouchEnd, { passive: false });

  return () => {
    el.removeEventListener("touchstart", handleTouchStart);
    el.removeEventListener("touchmove", handleTouchMove);
    el.removeEventListener("touchend", handleTouchEnd);
  };
}, [canParticipate, isFighter, barHeight]);



// Hook up as a native listener
// useEffect(() => {
//   const el = fighterRef.current;
//   if (!el) return;

//   el.addEventListener("touchmove", handleTouchMove, { passive: false });
//   return () => {
//     el.removeEventListener("touchmove", handleTouchMove);
//   };
// }, []);

// useEffect(() => {
//   const el = fighterRef.current;
//   if (!el) return;

//   el.addEventListener("touchstart", handleTouchStart, { passive: false });
//   el.addEventListener("touchmove", handleTouchMove, { passive: false });
//   el.addEventListener("touchend", handleTouchEnd, { passive: false });

//   return () => {
//     el.removeEventListener("touchstart", handleTouchStart);
//     el.removeEventListener("touchmove", handleTouchMove);
//     el.removeEventListener("touchend", handleTouchEnd);
//   };
// }, [canParticipate, isFighter, barLocked, barHeight]);m



  const fetchTotalSupport = async () => {
    try {
      const response = await fetch(`/api/stakes/total/${fighter?.id}`);
      if (response.ok) {
        const data = await response.json();
        setTotalSupport(data);
      } else {
        console.warn('Failed to fetch total support:', response.status);
        // Set default values if fetch fails
        setTotalSupport({ stars: 0, points: 0 });
      }
    } catch (error) {
      console.error("Error fetching total support:", error);
      // Set default values if fetch fails
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

  // Touch handlers with CORRECT logic
// const handleTouchStart = (e: TouchEvent) => {
//   if (!canParticipate || isFighter) return;
//   const t = e.touches && e.touches[0];
//   if (!t) return;

//   touchStartYRef.current = t.clientY;
//   touchIntentRef.current = 'idle'; // undecided yet
//   setTapping(true);
//   setIsTouchMoving(false);
//   lastTapTimeRef.current = 0;

//   // Stop any pending decay immediately while user starts interaction
//   if (barDecayInterval.current) {
//     clearInterval(barDecayInterval.current);
//     barDecayInterval.current = null;
//   }
// };


 

//   const handleTouchEnd = () => {
//   setTapping(false);
//   setIsTouchMoving(false);

//   // if intent was stake, start decay (if not locked)
//   touchIntentRef.current = 'idle';

//   if (!barLockedRef.current && barHeight > 0) {
//     // small delay before starting decay (2s used in your code)
//     setTimeout(() => {
//       if (barDecayInterval.current) {
//         clearInterval(barDecayInterval.current);
//         barDecayInterval.current = null;
//       }
//       if (barLockedRef.current) return; // might be locked in the meantime
//       barDecayInterval.current = setInterval(() => {
//         setBarHeight(prev => {
//           // stop decay if locked
//           if (barLockedRef.current) {
//             if (barDecayInterval.current) {
//               clearInterval(barDecayInterval.current);
//               barDecayInterval.current = null;
//             }
//             return prev;
//           }
//           if (prev <= 0) {
//             if (barDecayInterval.current) {
//               clearInterval(barDecayInterval.current);
//               barDecayInterval.current = null;
//             }
//             return 0;
//           }
//           const newHeight = Math.max(0, prev - 0.4); // decay speed; tweak as desired
//           setStakeAmount(Math.floor((newHeight / 100) * MAX_STARS));
//           return newHeight;
//         });
//       }, 150);
//     }, 1200);
//   }
// };


  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canParticipate || isFighter) return;
    
    e.preventDefault();
    setTapping(true);
    
    if (barDecayInterval.current) {
      clearInterval(barDecayInterval.current);
      barDecayInterval.current = null;
    }

    const x = e.nativeEvent.offsetX || 0;
    const y = e.nativeEvent.offsetY || 0;
    
    createTapEffect(x, y);
    showMotivationalMessage(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canParticipate || isFighter || !tapping || barLocked) return;
    
    e.preventDefault();
    
    const x = e.nativeEvent.offsetX || 0;
    const y = e.nativeEvent.offsetY || 0;
    
    createTapEffect(x, y);
    
    const now = Date.now();
    if (now - lastTapTime > 30) {
      setBarHeight(prev => {
        const newHeight = Math.min(100, prev + 1.5);
        const newStakeAmount = Math.floor((newHeight / 100) * MAX_AMOUNT);
        setStakeAmount(newStakeAmount);
        return newHeight;
      });
      setLastTapTime(now);
      
      if (Math.random() < 0.3) {
        showMotivationalMessage(x, y);
      }
    }
  };

  const handleMouseUp = () => {
    setTapping(false);
    
    // Start decay if not locked
    if (!barLocked && barHeight > 0) {
      setTimeout(() => {
        if (!barLocked && barDecayInterval.current === null) {
          barDecayInterval.current = setInterval(() => {
            setBarHeight((prev) => {
              if (barLocked) {
                if (barDecayInterval.current) {
                  clearInterval(barDecayInterval.current);
                  barDecayInterval.current = null;
                }
                return prev;
              }
              
              if (prev <= 0) {
                if (barDecayInterval.current) {
                  clearInterval(barDecayInterval.current);
                  barDecayInterval.current = null;
                }
                return 0;
              }
              
              const newHeight = Math.max(0, prev - 0.2);
              const newStakeAmount = Math.floor((newHeight / 100) * MAX_AMOUNT);
              setStakeAmount(newStakeAmount);
              return newHeight;
            });
          }, 150);
        }
      }, 2000);
    }
  };

  // Fixed bar click handler with immediate decay on unlock
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
        // Redirect to Telegram payment
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
  
  useEffect(() => {
    return () => {
      if (barDecayInterval.current) {
        clearInterval(barDecayInterval.current);
        barDecayInterval.current = null;
      }
      if (messageInterval.current) {
        clearInterval(messageInterval.current);
        messageInterval.current = null;
      }
    };
  }, []);
  
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
      // onTouchStart={!isConcluded ? handleTouchStart : undefined}
      // onTouchMove={!isConcluded ? handleTouchMove : undefined}
      // onTouchEnd={!isConcluded ? handleTouchEnd : undefined}
      onMouseDown={!isConcluded ? handleMouseDown : undefined}
      onMouseMove={!isConcluded ? handleMouseMove : undefined}
      onMouseUp={!isConcluded ? handleMouseUp : undefined}
      onMouseLeave={!isConcluded ? handleMouseUp : undefined}
      onContextMenu={preventTextInteraction}
      onDragStart={preventTextInteraction}
    >
      {/* Motivational Messages Overlay */}
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
            <>
              <img
                src={fighter.imageUrl}
                alt={fighter.name || "Fighter"}
                width={150}
                height={150}
                className="fighter-portrait"
                draggable={false}
                onDragStart={preventTextInteraction}
                onError={(e) => {
                  console.log("Image failed to load:", fighter.imageUrl);
                  e.currentTarget.style.display = 'none';
                  const placeholder = e.currentTarget.parentElement?.querySelector('.fighter-placeholder') as HTMLElement;
                  if (placeholder) {
                    placeholder.style.display = 'flex';
                  }
                }}
                onLoad={(e) => {
                  console.log("Image loaded successfully:", fighter.imageUrl);
                  const placeholder = e.currentTarget.parentElement?.querySelector('.fighter-placeholder') as HTMLElement;
                  if (placeholder) {
                    placeholder.style.display = 'none';
                  }
                }}
                style={{ 
                  borderRadius: '50%', 
                  border: '3px solid rgba(255,255,255,0.3)', 
                  boxShadow: '0 5px 15px rgba(0,0,0,0.3)', 
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </>
          ) : null}
          <div 
            className="fighter-placeholder"
            data-fighter-id={fighter?.id}
            style={{ display: fighter?.imageUrl ? 'none' : 'flex' }}
          >
            {!isActive ? "?" : fighter?.name?.[0] || "?"}
          </div>
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
                style={{ userSelect: 'none' }}
              >
                Stake with Stars
              </button>
              <button 
                className={`stake-type-button ${stakeType === 'POINTS' ? 'active' : ''} ${buttonAnimation === 'POINTS' ? 'btn-pulse' : ''}`}
                onClick={() => handleStakeTypeChange('POINTS')}
                disabled={!isActive}
                style={{ userSelect: 'none' }}
              >
                Stake with Shells
              </button>
            </div>
            
            <div className="staking-area">
              <div 
                className={`tapping-bar-container ${!canParticipate ? 'disabled' : ''} ${barLocked ? 'locked' : ''}`}
                style={{ userSelect: 'none' }}
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
                  style={{ 
                    userSelect: 'none',
                    pointerEvents: (!canParticipate || stakeAmount === 0 || !barLocked) ? 'none' : 'auto',
                    opacity: (!canParticipate || stakeAmount === 0 || !barLocked) ? 0.5 : 1
                  }}
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
  const router = useRouter();
  const [fights, setFights] = useState<Fight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [isRouterReady, setIsRouterReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsRouterReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isRouterReady) {
      try {
        if (window.Telegram?.WebApp) {
          const webApp = window.Telegram.WebApp;
          if (webApp.initDataUnsafe?.user?.id) {
            setTelegramId(webApp.initDataUnsafe.user.id.toString());
          } else {
            setError("Could not retrieve Telegram ID. Please open this app from Telegram.");
          }
        } else {
          setError("Telegram WebApp not initialized");
        }
      } catch (err) {
        console.error("Error initializing Telegram data:", err);
        setError("Failed to initialize Telegram data");
      }
    }
  }, [isRouterReady]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!telegramId) {
          throw new Error('Telegram ID is not available');
        }

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

    if (telegramId) {
      fetchData();
    }
  }, [telegramId]);

  if (!isRouterReady || loading) return <Loader />;
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