'use client';

import { useState, useEffect } from 'react';
import { initUtils } from '@telegram-apps/sdk';


interface ReferralSystemProps {
  initData: string;
  userId: string;
  startParam: string;
}

const ReferralSystem: React.FC<ReferralSystemProps> = ({ initData, userId, startParam }) => {
  const [referrals, setReferrals] = useState<string[]>([]);
  const [referrer, setReferrer] = useState<string | null>(null);
  const INVITE_URL = "https://t.me/referral_showcase_bot/start";

  useEffect(() => {
    const checkReferral = async () => {
      if (startParam && userId) {
        try {
          const response = await fetch('/api/referrals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, referrerId: startParam }),
          });
          if (!response.ok) throw new Error('Failed to save referral');
        } catch (error) {
          console.error('Error saving referral:', error);
        }
      }
    };

    const fetchReferrals = async () => {
      if (userId) {
        try {
          const response = await fetch(`/api/referrals?userId=${userId}`);
          if (!response.ok) throw new Error('Failed to fetch referrals');
          const data = await response.json();
          setReferrals(data.referrals);
          setReferrer(data.referrer);
        } catch (error) {
          console.error('Error fetching referrals:', error);
        }
      }
    };

    checkReferral();
    fetchReferrals();
  }, [userId, startParam]);

  const handleInviteFriend = () => {
    const utils = initUtils();
    const inviteLink = `${INVITE_URL}?startapp=${userId}`;
    const shareText = `Join me on this awesome Telegram mini app!`;
    const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
    utils.openTelegramLink(fullUrl);
  };

  const handleCopyLink = () => {
    const inviteLink = `${INVITE_URL}?startapp=${userId}`;
    navigator.clipboard.writeText(inviteLink);
    alert('Invite link copied to clipboard!');
  };

  return (
    <div className="referral-container">
      <div className="referral-invite-box">
        <img src="/images/daily.png" width={44} height={44} />
        <div>
          <p >Invite a friend to our airdrop</p>
          <div className="coin flex">
            <img src="/images/coin.png" width={24} height={24} />
            <span className="ml-1">+10,000 for you and your friend</span>
          </div>
        </div>
        
        {/* <img src={coin} width={44} height={44} /> */}
      </div>
      {referrer && (
        <div className="referral-invite-box">
        <p className="referrer-message">You were referred by user {referrer}</p>
        </div>
      )}
      <div className="referral-invite-botton">
        <button onClick={handleInviteFriend} className="invite-button">
          Invite Friend
        </button>
        <button onClick={handleCopyLink} className="copy-button">
          Copy Invite Link
        </button>
      </div>
      {referrals.length > 0 && (
        <div className="referrals-list">
          <h2 className="referrals-title">Your Referrals</h2>
          <ul>
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

