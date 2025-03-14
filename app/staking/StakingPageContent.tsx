'use client';
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Loader from "@/loader";
import Link from "next/link";
import "./staking.css";

// Motivational messages that display while tapping
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

interface Fighter {
  id: string;
  name: string;
  imageUrl?: string; 
  socialMedia?: string; 
}

interface Fight {
  id: string;
  title: string;
  fightDate: string;
  fighter1: Fighter;
  fighter2: Fighter;
}

interface FightCardProps {
  fight?: Fight;
  userPoints: number;
}

interface FighterStakingProps {
  fighter?: Fighter;
  opponent?: Fighter;
  fight?: Fight;
  userPoints: number;
  isActive: boolean;
}

// This is the main page component
export default function StakingPage() {
  return (
    <div className="page-container">
      <StakingPageContent />
    </div>
  );
}

// Separated the content component
function StakingPageContent() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const router = useRouter();
  const [fights, setFights] = useState<Fight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  
  // Fetch upcoming fights and user points
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        // Try to get Telegram WebApp data
        if (window.Telegram?.WebApp) {
          const webApp = window.Telegram.WebApp;
          if (webApp.initDataUnsafe?.user?.id) {
            setTelegramId(webApp.initDataUnsafe.user.id.toString());
          } else {
            // For development/testing without Telegram
            setTelegramId("12345"); // Use a test ID for development
            console.log("Using test Telegram ID for development");
          }
        } else {
          setError("Telegram WebApp not initialized");
        }
      } catch (err) {
        console.error("Error initializing Telegram data:", err);
        setError("Failed to initialize Telegram data");
      }
    }
  }, []);
  
  // Fetch upcoming fights and user points
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
  
        if (!telegramId) {
          throw new Error('Telegram ID is not available');
        }
  
        // Fetch user info
        const userResponse = await fetch(`/api/user/${telegramId}`);
        if (!userResponse.ok) throw new Error('Failed to fetch user info');
        const userData = await userResponse.json();
        setUserPoints(userData.points);
        
        // Fetch upcoming fights
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
  
  
  if (loading) return <Loader />;
  if (error) return <div className="error-container">Error: {error}</div>;
  
  return (
    <div className="staking-container">
       <Link href="/">
          <img
            src="/images/info/left-arrow.png" 
            width={40}
            height={40}
            alt="back"
          />
        </Link>
      <h1 className="staking-title">Support Your Fighter</h1>
      <p className="points-balance">Shells Balance: {userPoints.toLocaleString()}</p>
      
      {fights.length === 0 ? (
        // When no fights are available, show inactive fight card
        <FightCard 
          userPoints={userPoints}
        />
      ) : (
        fights.map(fight => (
          <FightCard 
            key={fight.id} 
            fight={fight} 
            userPoints={userPoints}
          />
        ))
      )}
    </div>
  );
}

function FightCard({ fight, userPoints }: FightCardProps) {
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
        />
        <div className="vs-container">VS</div>
        <FighterStaking 
          fighter={fight?.fighter2}
          opponent={fight?.fighter1}
          fight={fight}
          userPoints={userPoints}
          isActive={isActive}
        />
      </div>
    </div>
  );
}

function FighterStaking({ fighter, opponent, fight, userPoints, isActive }: FighterStakingProps) {
  const [stakeType, setStakeType] = useState('STARS');
  const [stakeAmount, setStakeAmount] = useState(0);
  const [tapping, setTapping] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const [barLocked, setBarLocked] = useState(false);
  const [message, setMessage] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [localUserPoints, setLocalUserPoints] = useState(userPoints);
  const barDecayInterval = useRef<NodeJS.Timeout | null>(null);
  const messageInterval = useRef<NodeJS.Timeout | null>(null);

  const MAX_STARS = 100000;
  const MIN_POINTS_REQUIRED = 200000;
  const canParticipate = localUserPoints >= MIN_POINTS_REQUIRED && isActive;
  
  // Handle continuous tapping
  const handleTapStart = () => {
    if (!canParticipate || barLocked) return;

    setTapping(true);

    if (barDecayInterval.current) {
      clearInterval(barDecayInterval.current);
    }

    if (messageInterval.current) {
      clearInterval(messageInterval.current);
    }

    messageInterval.current = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
      setMessage(MOTIVATIONAL_MESSAGES[randomIndex]);
    }, 2000);

    // Show initial message
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    setMessage(MOTIVATIONAL_MESSAGES[randomIndex]);
  };
  
  const handleTap = () => {
    if (!canParticipate || barLocked || !tapping) return;
    
    const now = Date.now();
    const timeDiff = now - lastTapTime;
    
    // Prevent extremely rapid tapping (likely automated)
    if (timeDiff < 50) return;
    
    setLastTapTime(now);
    setTapCount(prev => prev + 1);
    
    // Increase bar width based on tapping, with diminishing returns for rapid tapping
    const increment = Math.max(0.5, 2 - (timeDiff < 300 ? 0.5 : 0));
    setBarWidth(prev => {
      const newWidth = Math.min(100, prev + increment);
      // Calculate stake amount based on bar width
      const newStakeAmount = Math.floor((newWidth / 100) * MAX_STARS);
      setStakeAmount(newStakeAmount);
      return newWidth;
    });
  };
  
  const handleTapEnd = () => {
    if (!canParticipate || barLocked) return;
  
    setTapping(false);
  
    if (messageInterval.current) {
      clearInterval(messageInterval.current);
    }
  
    // Start decay of bar if not locked
    if (barDecayInterval.current) {
      clearInterval(barDecayInterval.current);
    }
    
    barDecayInterval.current = setInterval(() => {
      setBarWidth((prev) => {
        if (prev <= 0) {
          if (barDecayInterval.current) {
            clearInterval(barDecayInterval.current);
          }
          return 0;
        }
        const newWidth = prev - 0.5;
        // Update stake amount as bar decreases
        const newStakeAmount = Math.floor((newWidth / 100) * MAX_STARS);
        setStakeAmount(newStakeAmount);
        return newWidth;
      });
    }, 100);
  };
  
  const handleBarClick = () => {
    if (!canParticipate) return;

    // Lock/unlock the bar with a single tap
    setBarLocked(prev => !prev);
    if (!barLocked) {
      // Clear decay interval when locking
      if (barDecayInterval.current) {
        clearInterval(barDecayInterval.current);
      }
    } else {
      // Start decay when unlocking
      handleTapEnd();
    }
  };
  
  const submitStake = async () => {
    if (!canParticipate || stakeAmount <= 0) return;
  
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
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to place stake');
      }
  
      // Reset after successful stake
      setBarWidth(0);
      setStakeAmount(0);
      setBarLocked(false);
      setMessage('Stake placed successfully!');
  
      // Refresh user points
      const userResponse = await fetch('/api/user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setLocalUserPoints(userData.points);
      }
    } catch (error) {
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setMessage(`Error: ${errorMessage}`);
    }
  };
  
  // Update localUserPoints when userPoints prop changes
  useEffect(() => {
    setLocalUserPoints(userPoints);
  }, [userPoints]);
  
  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (barDecayInterval.current) {
        clearInterval(barDecayInterval.current);
      }
      if (messageInterval.current) {
        clearInterval(messageInterval.current);
      }
    };
  }, []);
  
  return (
    <div className={`fighter-staking ${!isActive ? 'inactive' : ''}`}>
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
      </div>
      
      <div className="staking-controls">
        <div className="stake-type-selector">
          <button 
            className={`stake-type-button ${stakeType === 'STARS' ? 'active' : ''}`}
            onClick={() => setStakeType('STARS')}
            disabled={!isActive}
          >
            Stake with Stars
          </button>
          <button 
            className={`stake-type-button ${stakeType === 'POINTS' ? 'active' : ''}`}
            onClick={() => setStakeType('POINTS')}
            disabled={!isActive}
          >
            Stake with Points
          </button>
        </div>
        
        <div 
          className={`tapping-bar-container ${!canParticipate ? 'disabled' : ''} ${barLocked ? 'locked' : ''}`}
          onMouseDown={handleTapStart}
          onMouseUp={handleTapEnd}
          onMouseLeave={handleTapEnd}
          onMouseMove={tapping ? handleTap : undefined}
          onTouchStart={handleTapStart}
          onTouchEnd={handleTapEnd}
          onTouchMove={tapping ? handleTap : undefined}
          onClick={handleBarClick}
        >
          <div className="tapping-bar-track">
            <div 
              className="tapping-bar-fill" 
              style={{ width: `${barWidth}%` }}
            >
              <div className="tapping-bar-pulse"></div>
            </div>
          </div>
          <div className="stake-amount">
            {stakeAmount.toLocaleString()} {stakeType === 'STARS' ? 'Stars' : 'Points'}
          </div>
          {message && <div className="motivation-message">{message}</div>}
          
          {!isActive && (
            <div className="no-fight-message">
              No current fight available
            </div>
          )}
          
          {isActive && !canParticipate && (
            <div className="insufficient-balance">
              Minimum 200,000 points required to participate
            </div>
          )}
        </div>
        
        <button 
          className="stake-button"
          disabled={!canParticipate || stakeAmount <= 0 || !barLocked}
          onClick={submitStake}
        >
          Stake Now
        </button>
        
        <div className="stake-info">
          {stakeType === 'STARS' ? (
            <>
              <p>Win: {Math.floor(500000 + (stakeAmount / MAX_STARS * 500000)).toLocaleString()} points</p>
              <p>Loss/Draw: {Math.floor(stakeAmount / MAX_STARS * 500000).toLocaleString()} points</p>
            </>
          ) : (
            <>
              <p>Win: {(stakeAmount * 2).toLocaleString()} points</p>
              <p>Loss/Draw: 0 points</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}