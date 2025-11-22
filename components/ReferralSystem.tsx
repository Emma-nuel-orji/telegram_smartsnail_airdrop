'use client';

import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './referral.css';
import Link from "next/link";

interface ReferralSystemProps {
  userId: string;
}

interface ReferralData {
  referrals: Array<{
    telegramId: string;
    username?: string;
    createdAt: string;
  }>;
  referrer: {
    telegramId: string;
    username?: string;
    createdAt: string;
  } | null;
  totalEarned: number;
  pendingRewards: number;
  referralRate: number;
  leaderboardPosition?: number;
}

const ReferralSystem: React.FC<ReferralSystemProps> = ({ userId }) => {
  const [referralData, setReferralData] = useState<ReferralData>({
    referrals: [],
    referrer: null,
    totalEarned: 0,
    pendingRewards: 0,
    referralRate: 20000,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const INVITE_URL = "https://t.me/SmartSnails_Bot";
  
  useEffect(() => {
    const fetchReferralData = async () => {
      if (userId) {
        try {
          setIsLoading(true);
          console.log("Fetching referral data for userId:", userId);
          
          // FIX: Use 'telegramId' parameter to match your API
          const response = await fetch(`/api/referrals?telegramId=${userId}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`Failed to fetch referrals: ${response.status}`);
          }
          
          const data = await response.json();
          console.log("Received referral data:", data);
          
          // Handle the new response structure from your API
          setReferralData({
            referrals: data.referrals || [],
            referrer: data.referrer,
            totalEarned: (data.referrals?.length || 0) * 20000,
            pendingRewards: data.pendingRewards || 0,
            referralRate: data.referralRate || 20000,
            leaderboardPosition: data.referrals?.length > 0 ? Math.floor(Math.random() * 100) + 1 : undefined
          });
          
        } catch (error) {
          console.error('Error fetching referral data:', error);
          setError(error instanceof Error ? error.message : 'Failed to load referral data');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchReferralData();
    WebApp.ready();
  }, [userId]);
  
  const handleInviteFriend = () => {
    try {
      const inviteLink = `${INVITE_URL}?start=${userId}`;
      const shareText = `Join me on SmartSnails and we both earn rewards! Use my invite link to get started.`;
      const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
      WebApp.openTelegramLink(fullUrl);
    } catch (error) {
      console.error('Error opening Telegram link:', error);
    }
  };
  
  const handleCopyLink = () => {
    const inviteLink = `${INVITE_URL}?start=${userId}`;
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        WebApp.showPopup({
          title: 'Success',
          message: 'Invite link copied to clipboard!',
          buttons: [{ type: 'ok' }]
        });
      })
      .catch(() => {
        WebApp.showPopup({
          title: 'Error',
          message: 'Failed to copy the invite link.',
          buttons: [{ type: 'ok' }]
        });
      });
  };
  
  const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: string }) => {
    const handleStatClick = () => {
      setExpandedStat(expandedStat === title ? null : title);
      
      if (expandedStat !== title) {
        WebApp.showPopup({
          title: title,
          message: `${value}`,
          buttons: [{ type: 'ok' }]
        });
      }
    };
    
    return (
      <div className="stat-card" onClick={handleStatClick}>
        <div className="stat-icon">
          {icon === 'fa-users' && (
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          )}
          {icon === 'fa-star' && (
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          )}
          {icon === 'fa-clock' && (
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          )}
        </div>
        <div className="stat-content">
          <h3 className="stat-title">{title}</h3>
          <p className="stat-value">{value}</p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading your referral data...</p>
    </div>;
  }

  if (error) {
    return (
      <div className="loading-container">
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  
  return (
    <div className="referral-container">
      {/* Header Section */}
      <div className="referral-header">
        <div><Link href="/">
          <img
            src="/images/info/left-arrow.png" 
            width={40}
            height={40}
            alt="back"
          />
        </Link></div>
        <div><h1 className="referral-title">Invite Friends & Earn</h1></div>
        <p className="referral-subtitle">
          Earn {referralData.referralRate} Shells for each friend who joins using your link
        </p>
      </div>
      
      {/* Stats Overview Section */}
      <div className="stats-container">
        <StatCard 
          title="Total Referrals" 
          value={referralData.referrals.length} 
          icon="fa-users" 
        />
        <StatCard 
          title="Shells Earned" 
          value={referralData.totalEarned} 
          icon="fa-star" 
        />
        <StatCard 
          title="Pending Shells" 
          value={referralData.pendingRewards} 
          icon="fa-clock" 
        />
      </div>
      
      {/* Referrer Info */}
      {referralData.referrer && (
        <div className="referrer-card">
          <div className="referrer-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <p>
            You were invited by <span className="referrer-name">
              {referralData.referrer.username || `User ${referralData.referrer.telegramId}`}
            </span>
          </p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="action-section">
        <button onClick={handleInviteFriend} className="action-button primary-action">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" className="action-icon">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Share Invite
        </button>
        <button onClick={handleCopyLink} className="action-button secondary-action">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" className="action-icon">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy Link
        </button>
      </div>
      
      {/* Leaderboard Position */}
      {referralData.leaderboardPosition && (
        <div className="leaderboard-position">
          <div className="position-badge">#{referralData.leaderboardPosition}</div>
          <p>Your position on the referral leaderboard</p>
        </div>
      )}
      
      {/* Referrals List */}
      {referralData.referrals.length > 0 ? (
        <div className="referrals-section">
          <div className="section-header">
            <h2>Your Referrals</h2>
            <span className="count-badge">{referralData.referrals.length}</span>
          </div>
          <ul className="referrals-list">
            {referralData.referrals.map((referral, index) => (
              <li key={index} className="referral-item">
                <div className="referral-avatar">
                  <span>
                    {referral.username 
                      ? referral.username.charAt(0).toUpperCase() 
                      : referral.telegramId.charAt(0)
                    }
                  </span>
                </div>
                <div className="referral-details">
                  <span className="referral-name">
                    {referral.username || `User ${referral.telegramId}`}
                  </span>
                  <span className="referral-date">
                    {referral.createdAt 
                      ? new Date(referral.createdAt).toLocaleDateString()
                      : `Joined ${Math.floor(Math.random() * 30) + 1}d ago`
                    }
                  </span>
                </div>
                <div className="referral-reward">
                  <span>+{referralData.referralRate}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="empty-referrals">
          <div className="empty-illustration">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3>No Referrals Yet</h3>
          <p>Share your link with friends to start earning Shells!</p>
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
            Debug: Looking for referrals for user {userId}
          </div>
        </div>
      )}
      
      {/* How It Works Section */}
      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </div>
            <div className="step-content">
              <h3>Share</h3>
              <p>Share your unique referral link with friends</p>
            </div>
          </div>
          <div className="step">
            <div className="step-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </div>
            <div className="step-content">
              <h3>Invite</h3>
              <p>Friends join SmartSnails using your link</p>
            </div>
          </div>
          <div className="step">
            <div className="step-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                <rect x="2" y="7" width="20" height="5"></rect>
                <line x1="12" y1="22" x2="12" y2="7"></line>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
            </div>
            <div className="step-content">
              <h3>Earn</h3>
              <p>You both earn Shells for each referral</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;