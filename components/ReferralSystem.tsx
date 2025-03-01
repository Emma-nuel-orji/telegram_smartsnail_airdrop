'use client';

import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './referral.css';

interface ReferralSystemProps {
  userId: string;
}

interface ReferralData {
  referrals: string[];
  referrer: string | null;
  totalEarned: number;
  pendingRewards: number;
  referralRate: number; // Points earned per referral
  leaderboardPosition?: number;
}

const ReferralSystem: React.FC<ReferralSystemProps> = ({ userId }) => {
  const [referralData, setReferralData] = useState<ReferralData>({
    referrals: [],
    referrer: null,
    totalEarned: 0,
    pendingRewards: 0,
    referralRate: 50,
  });
  const [isLoading, setIsLoading] = useState(true);
  const INVITE_URL = "https://t.me/SmartSnails_Bot";
  
  useEffect(() => {
    const fetchReferralData = async () => {
      if (userId) {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/referrals?userId=${userId}`);
          if (!response.ok) throw new Error('Failed to fetch referrals');
          const data = await response.json();
          
          // Extend with dummy data for earnings (replace with real data)
          setReferralData({
            referrals: data.referrals || [],
            referrer: data.referrer,
            totalEarned: data.totalEarned || data.referrals?.length * 50 || 0,
            pendingRewards: data.pendingRewards || 25,
            referralRate: data.referralRate || 50,
            leaderboardPosition: data.leaderboardPosition || (data.referrals?.length > 0 ? Math.floor(Math.random() * 100) + 1 : undefined)
          });
        } catch (error) {
          console.error('Error fetching referral data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchReferralData();
    WebApp.ready(); // Notify Telegram that the app is ready
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
  
  const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: string }) => (
    <div className="stat-card">
      <div className="stat-icon">
        <i className={`fa ${icon}`}></i>
      </div>
      <div className="stat-content">
        <h3 className="stat-title">{title}</h3>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading your referral data...</p>
    </div>;
  }
  
  return (
    <div className="referral-container">
      {/* Header Section */}
      <div className="referral-header">
        <h1 className="referral-title">Invite Friends & Earn</h1>
        <p className="referral-subtitle">
          Earn {referralData.referralRate} points for each friend who joins using your link
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
          title="Points Earned" 
          value={referralData.totalEarned} 
          icon="fa-star" 
        />
        <StatCard 
          title="Pending Points" 
          value={referralData.pendingRewards} 
          icon="fa-clock" 
        />
      </div>
      
      {/* Referrer Info */}
      {referralData.referrer && (
        <div className="referrer-card">
          <i className="fa fa-user-circle referrer-icon"></i>
          <p>
            You were invited by <span className="referrer-name">{referralData.referrer}</span>
          </p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="action-section">
        <button onClick={handleInviteFriend} className="action-button primary-action">
          <i className="fa fa-paper-plane"></i>
          Share Invite
        </button>
        <button onClick={handleCopyLink} className="action-button secondary-action">
          <i className="fa fa-copy"></i>
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
                  <span>{referral.charAt(0).toUpperCase()}</span>
                </div>
                <div className="referral-details">
                  <span className="referral-name">User {referral}</span>
                  <span className="referral-date">Joined {Math.floor(Math.random() * 30) + 1}d ago</span>
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
            <i className="fa fa-users"></i>
          </div>
          <h3>No Referrals Yet</h3>
          <p>Share your link with friends to start earning rewards!</p>
        </div>
      )}
      
      {/* How It Works Section */}
      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-icon">
              <i className="fa fa-share-alt"></i>
            </div>
            <div className="step-content">
              <h3>Share</h3>
              <p>Share your unique referral link with friends</p>
            </div>
          </div>
          <div className="step">
            <div className="step-icon">
              <i className="fa fa-user-plus"></i>
            </div>
            <div className="step-content">
              <h3>Invite</h3>
              <p>Friends join SmartSnails using your link</p>
            </div>
          </div>
          <div className="step">
            <div className="step-icon">
              <i className="fa fa-gift"></i>
            </div>
            <div className="step-content">
              <h3>Earn</h3>
              <p>You both earn {referralData.referralRate} points for each referral</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
};

export default ReferralSystem;