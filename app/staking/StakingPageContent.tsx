"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from 'next/image';
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/loader";
import "./staking.css";

// Define interfaces for our data structures
interface Fighter {
  id: string;
  name: string;
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

function FightCard({ fight, userPoints, telegramId }: FightCardProps) {
  const isActive = !!fight;
  
  return (
    <div className={`fight-card ${!isActive ? 'inactive-fight' : ''}`}>
      <div className="fight-header">
        <h2>{fight ? fight.title : "No Current Fight"}</h2>
        <div className="fight-date">
          {fight ? new Date(fight.fightDate).toLocaleString() : "To be announced"}
        </div>
      </div>
      
      
      <div className="fighters-container">
        <FighterStaking 
          fighter={fight?.fighter1}
          opponent={fight?.fighter2}
          fight={fight}
          userPoints={userPoints}
          isActive={isActive}
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
          telegramId={telegramId}
          position="right"
        />
      </div>
    </div>
  );
}

function FighterStaking({ fighter, opponent, fight, userPoints, isActive, telegramId, position }: FighterStakingProps) {
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
  const barDecayInterval = useRef<NodeJS.Timeout | null>(null);
  const messageInterval = useRef<NodeJS.Timeout | null>(null);
  const fighterRef = useRef<HTMLDivElement | null>(null);

  const MAX_STARS = 100000;
  const MIN_POINTS_REQUIRED = 200000;
  const canParticipate = localUserPoints >= MIN_POINTS_REQUIRED && isActive;
  const isFighter = fighter?.telegramId === telegramId;

  useEffect(() => {
    if (fighter?.id && isActive) {
      fetchTotalSupport();
    }
  }, [fighter, isActive]);

  const fetchTotalSupport = async () => {
    try {
      const response = await fetch(`/api/stakes/total/${fighter?.id}`);
      if (response.ok) {
        const data = await response.json();
        setTotalSupport(data);
      }
    } catch (error) {
      console.error("Error fetching total support:", error);
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
  
  const handleTapStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canParticipate || barLocked || isFighter) return;

    setTapping(true);

    if (barDecayInterval.current) {
      clearInterval(barDecayInterval.current);
      barDecayInterval.current = null;
    }

    if (messageInterval.current) {
      clearInterval(messageInterval.current);
      messageInterval.current = null;
    }

    messageInterval.current = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
      setMessage(MOTIVATIONAL_MESSAGES[randomIndex]);
    }, 2000);

    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    setMessage(MOTIVATIONAL_MESSAGES[randomIndex]);
  };
  
  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canParticipate || barLocked || !tapping || isFighter) return;
    
    const now = Date.now();
    const timeDiff = now - lastTapTime;
    
    if (timeDiff < 50) return;
    
    let x: number, y: number;
    if ('touches' in e) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    createTapEffect(x, y);
    
    setLastTapTime(now);
    setTapCount(prev => prev + 1);
    
    const increment = Math.max(0.5, 2 - (timeDiff < 300 ? 0.5 : 0));
    setBarHeight(prev => {
      const newHeight = Math.min(100, prev + increment);
      const newStakeAmount = Math.floor((newHeight / 100) * MAX_STARS);
      setStakeAmount(newStakeAmount);
      return newHeight;
    });
  };
  
  const handleTapEnd = () => {
    if (!canParticipate || barLocked || isFighter) return;
  
    setTapping(false);
  
    if (messageInterval.current) {
      clearInterval(messageInterval.current);
      messageInterval.current = null;
    }
  
    if (barDecayInterval.current) {
      clearInterval(barDecayInterval.current);
      barDecayInterval.current = null;
    }
    
    barDecayInterval.current = setInterval(() => {
      setBarHeight((prev) => {
        if (prev <= 0) {
          if (barDecayInterval.current) {
            clearInterval(barDecayInterval.current);
            barDecayInterval.current = null;
          }
          return 0;
        }
        const newHeight = prev - 0.5;
        const newStakeAmount = Math.floor((newHeight / 100) * MAX_STARS);
        setStakeAmount(newStakeAmount);
        return newHeight;
      });
    }, 100);
  };
  
  const handleBarClick = () => {
    if (!canParticipate || isFighter) return;

    setBarLocked(prev => !prev);
    if (!barLocked) {
      if (barDecayInterval.current) {
        clearInterval(barDecayInterval.current);
        barDecayInterval.current = null;
      }
    } else {
      handleTapEnd();
    }
  };

  const handleStakeWithStars = async () => {
    if (!canParticipate || stakeAmount <= 0 || isFighter) return;

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
        }),
      });

      const data = await response.json();

      if (data.invoiceLink) {
        // Redirect the user to the Telegram Stars payment page
        window.location.href = data.invoiceLink;
      } else {
        throw new Error("Failed to create payment link");
      }
    } catch (error) {
      console.error("Staking with Stars failed:", error);
      setMessage("Failed to place stake. Please try again.");
    }
  };

  const submitStake = async () => {
    if (!canParticipate || stakeAmount <= 0 || isFighter) return;

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
      className={`fighter-staking ${position} ${!isActive ? 'inactive' : ''} ${tapping ? 'active-stake' : ''} ${isFighter ? 'is-fighter' : ''}`}
      onMouseDown={handleTapStart}
      onMouseUp={handleTapEnd}
      onMouseLeave={handleTapEnd}
      onMouseMove={tapping ? handleTap : undefined}
      onTouchStart={handleTapStart}
      onTouchEnd={handleTapEnd}
      onTouchMove={tapping ? handleTap : undefined}
    >
      <div className="fighter-info">
        <div className="fighter-image">
          {fighter?.imageUrl ? (
            <Image 
              src={fighter.imageUrl} 
              alt={fighter.name} 
              width={150} 
              height={150} 
              className="fighter-portrait"
            />
          ) : (
            <div className="fighter-placeholder">
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
                onClick={handleBarClick}
              >
                <div className="tapping-bar-track">
                  <div 
                    className={`tapping-bar-fill ${stakeType.toLowerCase()}`} 
                    style={{ height: `${barHeight}%` }}
                  >
                    {tapping && <div className="tapping-bar-pulse"></div>}
                  </div>
                </div>
                {message && (
                  <div className="motivation-message">{message}</div>
                )}
              </div>
              
              <div className="stake-amount">
                {stakeAmount.toLocaleString()} {stakeType === 'STARS' ? 'Stars' : 'Points'}
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
                  className="stake-button"
                  onClick={submitStake}
                  disabled={!canParticipate || stakeAmount === 0 || !barLocked}
                >
                  Place Stake
                </button>
              )}
              
              <div className="stake-info">
                <div className="instruction">
                  <span className="icon">👆</span>
                  <p className="text">Tap repeatedly to increase your stake</p>
                </div>
                <div className="instruction">
                  <span className="icon">🔒</span>
                  <p className="text">Tap the bar once to lock in your stake</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
    <div className="support-container">
      {/* Back Button */}
      <Link href="/" className="back-button">
        <svg 
          width="40" 
          height="40" 
          viewBox="0 0 24 24"
          className="back-icon"
        >
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </Link>

      {/* Engraved Title */}
      <div className="title-wrapper">
        <h1 className="engraved-title">
          <span className="engraved-text">SUPPORT YOUR FIGHTER</span>
          <span className="engraved-shadow" aria-hidden>SUPPORT YOUR FIGHTER</span>
        </h1>
      </div>

      {/* Points Display */}
      <div className="points-display">
        <span className="points-label">SHELLS BALANCE:</span>
        <span className="points-value">{userPoints.toLocaleString()}</span>
      </div>

      {/* Fight Cards */}
      <div className="fights-grid">
        {fights.length === 0 ? (
          <FightCard userPoints={userPoints} telegramId={telegramId} />
        ) : (
          fights.map(fight => (
            <FightCard 
              key={fight.id} 
              fight={fight} 
              userPoints={userPoints}
              telegramId={telegramId}
            />
          ))
        )}
      </div>

      {/* Component-scoped styles */}
      <style jsx>{`
        .support-container {
          position: relative;
          padding: 2rem;
          min-height: 100vh;
          background: 
            linear-gradient(135deg, rgba(58, 12, 163, 0.2) 0%, rgba(114, 9, 183, 0.4) 100%),
            url('/images/textures/stone-wall.jpg') center/cover;
        }
        
        .back-button {
          position: absolute;
          left: 1rem;
          top: 1rem;
          z-index: 10;
        }
        
        .back-icon {
          fill: white;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
          transition: transform 0.3s ease;
        }
        
        .back-button:hover .back-icon {
          transform: translateX(-4px);
        }
        
        .title-wrapper {
          position: relative;
          text-align: center;
          margin: 3rem 0 2rem;
        }
        
        .engraved-title {
          position: relative;
          font-family: 'Cinzel', serif;
          font-size: 2.5rem;
          letter-spacing: 2px;
          color: transparent;
          margin: 0 auto;
          width: fit-content;
        }
        
        .engraved-text {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          color: #f8f9fa;
          text-shadow: 
            1px 1px 0 #000,
            -1px -1px 0 rgba(255,255,255,0.1);
          clip-path: polygon(0 0, 100% 0, 100% 60%, 0 60%);
        }
        
        .engraved-shadow {
          display: block;
          color: rgba(0,0,0,0.3);
          text-shadow: 
            2px 2px 3px rgba(0,0,0,0.5),
            -1px -1px 1px rgba(255,255,255,0.1);
        }
        
        .points-display {
          text-align: center;
          margin: 2rem 0;
          font-family: 'Rajdhani', sans-serif;
        }
        
        .points-label {
          color: var(--purple-light);
          margin-right: 0.5rem;
          font-size: 1.2rem;
        }
        
        .points-value {
          color: var(--green-glowing);
          font-size: 1.5rem;
          font-weight: 600;
          text-shadow: 0 0 8px rgba(74, 222, 128, 0.7);
        }
        
        .fights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        
        @media (max-width: 768px) {
          .engraved-title {
            font-size: 1.8rem;
          }
          
          .fights-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}