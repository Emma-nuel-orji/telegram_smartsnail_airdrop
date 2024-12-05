'use client';

import { useState, useEffect } from 'react';
import { initUtils } from '@telegram-apps/sdk';
import './referral.css';

interface ReferralSystemProps {
  initData: string;
  userId: string;
  startParam: string;
}

const ReferralSystem: React.FC<ReferralSystemProps> = ({ initData, userId, startParam }) => {
  const [referrals, setReferrals] = useState<string[]>([]);
  const [referrer, setReferrer] = useState<string | null>(null);
  const INVITE_URL = "https://t.me/SmartSnails_Bot";

  useEffect(() => {
    // Check if the user is referred via the 'start' parameter and save the referral
    const checkReferral = async () => {
      if (startParam && userId) {
        try {
          const response = await fetch('/api/referrals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, referralId: startParam }), // Sending the user and referral ID to backend
          });
          if (!response.ok) throw new Error('Failed to save referral');
        } catch (error) {
          console.error('Error saving referral:', error);
        }
      }
    };

    // Fetch the user's referral list and the referrer information
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

    checkReferral(); // Execute referral saving on mount
    fetchReferrals(); // Fetch referral data on mount
  }, [userId, startParam]);

  // Generate the invite link and open Telegram
  const handleInviteFriend = () => {
    const utils = initUtils();
    const inviteLink = `${INVITE_URL}?startapp=${userId}`; // Construct invite link with the user's ID
    const shareText = `Join me on this awesome Telegram mini app!`;
    const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
    utils.openTelegramLink(fullUrl); // Open the Telegram link for sharing
  };

  // Copy the invite link to the clipboard
  const handleCopyLink = () => {
    const inviteLink = `${INVITE_URL}?startapp=${userId}`;
    navigator.clipboard.writeText(inviteLink);
    alert('Invite link copied to clipboard!'); // Inform the user that the link has been copied
  };

  return (
    <div className="referral-container">
      {/* Images for referral system */}
      <div className="ref">
        <img className="imag" src="/images/tasks/invite_a_telegram_premium_friend.png" alt="Invite a friend" />
      </div>
      <div className="ref">
        <img className="imag" src="/images/tasks/invite_friend.png" alt="Invite friend" />
      </div>
      <br />

      {/* Display referrer if available */}
      {referrer && (
        <div className="referral-invite-box">
          <p className="referrer-message">
            You were referred by <span className="referrer-name">{referrer}</span>
          </p>
        </div>
      )}

      {/* Buttons for inviting or copying the referral link */}
      <div className="referral-actions">
        <button onClick={handleInviteFriend} className="invite-button">
          <i className="fa fa-user-plus"></i> Invite Friend
        </button>
        <button onClick={handleCopyLink} className="copy-button">
          <i className="fa fa-link"></i> Copy Invite Link
        </button>
      </div>

      {/* Display the list of referrals */}
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