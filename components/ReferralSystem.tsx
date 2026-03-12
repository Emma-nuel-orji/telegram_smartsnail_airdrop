"use client";

import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import Link from "next/link";
import { Users, Star, Clock, Send, Copy, Trophy, ChevronLeft, Info, UserCheck } from "lucide-react";

interface ReferralSystemProps { userId: string; }

const ReferralSystem: React.FC<ReferralSystemProps> = ({ userId }) => {
  const [referralData, setReferralData] = useState<any>({
    referrals: [],
    referrer: null,
    totalEarned: 0,
    pendingRewards: 0,
    referralRate: 20000,
  });
  const [isLoading, setIsLoading] = useState(true);
  const INVITE_URL = "https://t.me/SmartSnails_Bot";

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const response = await fetch(`/api/referrals?telegramId=${userId}`);
        const data = await response.json();
        setReferralData({
          referrals: data.referrals || [],
          referrer: data.referrer,
          totalEarned: (data.referrals?.length || 0) * 20000,
          pendingRewards: data.pendingRewards || 0,
          referralRate: data.referralRate || 20000,
          leaderboardPosition: data.leaderboardPosition
        });
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };
    fetchReferralData();
  }, [userId]);

  const handleInviteFriend = () => {
    const inviteLink = `${INVITE_URL}?start=${userId}`;
    const shareText = `Join me on SmartSnails and we both earn rewards!`;
    const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
    WebApp.openTelegramLink(fullUrl);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${INVITE_URL}?start=${userId}`);
    WebApp.HapticFeedback.notificationOccurred('success');
    WebApp.showPopup({ title: 'Copied!', message: 'Your link is ready to share.', buttons: [{ type: 'ok' }] });
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-[#0f021a] pb-20 text-white font-sans">
      {/* Header */}
      <div className="p-4 flex items-center justify-between sticky top-0 bg-[#0f021a]/80 backdrop-blur-md z-50 border-b border-white/5">
        <Link href="/" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-sm font-black italic tracking-widest uppercase">Referral Program</h1>
        <div className="w-10" />
      </div>

      <div className="p-6">
        {/* Hero Section */}
        <div className="text-center mb-8 pt-4">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full text-purple-400 text-[10px] font-black uppercase tracking-widest mb-4">
            <Star className="w-3 h-3 fill-purple-400" /> Multiplier Active
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter leading-none mb-2">INVITE FRIENDS,<br/>EARN <span className="text-purple-500">SHELLS</span></h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wide">Get {referralData.referralRate.toLocaleString()} Shells per friend</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Referrals', val: referralData.referrals.length, icon: Users, color: 'text-blue-400' },
            { label: 'Earned', val: referralData.totalEarned.toLocaleString(), icon: Star, color: 'text-yellow-400' },
            { label: 'Pending', val: referralData.pendingRewards, icon: Clock, color: 'text-zinc-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <stat.icon className={`w-4 h-4 mx-auto mb-2 ${stat.color}`} />
              <div className="text-lg font-black tracking-tighter">{stat.val}</div>
              <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action Section */}
        <div className="space-y-3 mb-8">
          <button onClick={handleInviteFriend} className="w-full h-16 bg-purple-600 hover:bg-purple-500 transition-all rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(147,51,234,0.3)]">
            <Send className="w-5 h-5" />
            <span className="font-black italic uppercase tracking-widest">Share Invite Link</span>
          </button>
          <button onClick={handleCopyLink} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3">
            <Copy className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold uppercase tracking-widest">Copy Link</span>
          </button>
        </div>

        {/* Referrer Info */}
        {referralData.referrer && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Invited By</p>
              <p className="text-sm font-black text-emerald-400 tracking-tight">
                @{referralData.referrer.username || `SnailUser_${referralData.referrer.telegramId.slice(0,4)}`}
              </p>
            </div>
          </div>
        )}

        {/* Referrals List */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Your Crew
            </h3>
            <span className="bg-white/5 px-3 py-1 rounded-lg text-[10px] font-bold text-zinc-400">{referralData.referrals.length} Joined</span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {referralData.referrals.length > 0 ? (
              <div className="divide-y divide-white/5">
                {referralData.referrals.map((ref: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-xs font-black uppercase">
                        {ref.username?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight">@{ref.username || 'Anonymous'}</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-purple-400 font-black text-xs">+{referralData.referralRate / 1000}K</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">No recruits yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;