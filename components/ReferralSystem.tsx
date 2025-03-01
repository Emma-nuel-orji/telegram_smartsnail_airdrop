'use client';

import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './referral.css';

interface ReferralSystemProps {
  userId: string;
}

const ReferralSystem: React.FC<ReferralSystemProps> = ({ userId }) => {
  const [referrals, setReferrals] = useState<string[]>([]);
  const [referrer, setReferrer] = useState<string | null>(null);
  const INVITE_URL = "https://t.me/SmartSnails_Bot";

  useEffect(() => {
    const fetchReferralData = async () => {
      if (userId) {
        try {
          const response = await fetch(`/api/referrals?userId=${userId}`);
          if (!response.ok) throw new Error('Failed to fetch referrals');
          const data = await response.json();
          setReferrals(data.referrals);
          setReferrer(data.referrer);
        } catch (error) {
          console.error('Error fetching referral data:', error);
        }
      }
    };

    fetchReferralData();
    WebApp.ready(); // Notify Telegram that the app is ready
  }, [userId]);

  const handleInviteFriend = () => {
    try {
      const inviteLink = `${INVITE_URL}?start=${userId}`;
      const shareText = `Join me on this awesome Telegram mini app!`;
      const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
      WebApp.openTelegramLink(fullUrl);
    } catch (error) {
      console.error('Error opening Telegram link:', error);
    }
  };

  const handleCopyLink = () => {
    const inviteLink = `${INVITE_URL}?start=${userId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert('Invite link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy the invite link.');
    });
  };

  return (
    <div className="referral-container">
  <div className="ref">
    <img 
      className="imag" 
      src="/images/tasks/invite a telegram premium friend.png" 
      alt="Invite a friend" 
    />
  </div>
  <div className="ref">
    <img 
      className="imag" 
      src="/images/tasks/invite friend.png" 
      alt="Invite friend" 
    />
  </div>


      <br />

      {referrer && (
        <div className="referral-invite-box">
          <p className="referrer-message">
            You were referred by <span className="referrer-name">{referrer}</span>
          </p>
        </div>
      )}

      <div className="referral-actions">
        <button onClick={handleInviteFriend} className="invite-button">
          <i className="fa fa-user-plus"></i> Invite Friend
        </button>
        <button onClick={handleCopyLink} className="copy-button">
          <i className="fa fa-link"></i> Copy Invite Link
        </button>
      </div>

      {referrals.length > 0 && (
        <div className="referrals-box">
          <h2 className="referrals-title">Your Referrals</h2>
          <ul className="referrals-list">
            {referrals.map((referral, index) => (
              <li key={index} className="referral-item">
                User {referral}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ReferralSystem;