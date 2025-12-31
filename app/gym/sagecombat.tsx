"use client";

import React, { useEffect, useState } from "react";
import { Clock, Users, User, Baby, Flame, Activity, Target, CheckCircle, Star, Heart, Trophy, Dumbbell, Zap, AlertCircle } from "lucide-react";

const GYM_BACKGROUND = "/images/bk.jpg";

interface TrainingOption {
  type: 'standard' | 'elite';
  name: string;
  description: string;
  benefits: string[];
  priceShells: number;
  priceStars: number;
}

interface TrainingPackage {
  id: string;
  category: 'adult' | 'youth' | 'children';
  sessionType: 'group' | 'private';
  duration: 'walk-in' | '3-months' | '6-months';
  categoryName: string;
  options: {
    standard: TrainingOption;
    elite: TrainingOption;
  };
}

interface ActiveSubscription {
  id: number;
  name: string;
  duration: string;
  priceShells: number;
  approvedAt?: string;
  status: 'PENDING' | 'APPROVED';
  active?: boolean;
  expiresAt?: string;
}

// Keep your existing trainingPackages array - shortened for brevity
const trainingPackages: TrainingPackage[] = [
  {
    id: 'adult-group-walkin',
    category: 'adult',
    sessionType: 'group',
    duration: 'walk-in',
    categoryName: 'Adult Group Training (18+)',
    options: {
      standard: {
        type: 'standard',
        name: 'Standard Boxing',
        description: 'Master boxing fundamentals with technique-focused training',
        benefits: ['Boxing technique training', 'Heavy bag & pad work', 'Shadow boxing drills', 'Basic footwork', 'Group sparring practice'],
        priceShells: 25000,
        priceStars: 135
      },
      elite: {
        type: 'elite',
        name: 'Elite Fighter Program',
        description: 'Transform your body with boxing + high-intensity conditioning',
        benefits: ['Everything in Standard', 'HIIT cardio circuits', 'Strength & conditioning', 'Fat burning workouts', 'Road work training', 'Weight loss focused'],
        priceShells: 35000,
        priceStars: 190
      }
    }
  },
  {
    id: 'adult-group-3m',
    category: 'adult',
    sessionType: 'group',
    duration: '3-months',
    categoryName: 'Adult Group Training (18+)',
    options: {
      standard: {
        type: 'standard',
        name: 'Standard Boxing',
        description: '3-month progression from fundamentals to advanced combinations',
        benefits: ['Technique mastery', 'Sparring preparation', 'Combination training', 'Defense skills', 'Monthly assessments'],
        priceShells: 250000,
        priceStars: 1350
      },
      elite: {
        type: 'elite',
        name: 'Elite Fighter Program',
        description: 'Complete 3-month body transformation with boxing mastery',
        benefits: ['Everything in Standard', 'Complete fitness transformation', 'Structured cardio program', 'Nutrition guidance', 'Body composition tracking', 'Plyometric training'],
        priceShells: 350000,
        priceStars: 1900
      }
    }
  },
  {
    id: 'adult-group-6m',
    category: 'adult',
    sessionType: 'group',
    duration: '6-months',
    categoryName: 'Adult Group Training (18+)',
    options: {
      standard: {
        type: 'standard',
        name: 'Standard Boxing',
        description: '6-month comprehensive program to advanced boxing proficiency',
        benefits: ['Advanced techniques', 'Controlled sparring', 'Defense mastery', 'Competition prep', 'Fighter mentality'],
        priceShells: 500000,
        priceStars: 2700
      },
      elite: {
        type: 'elite',
        name: 'Elite Fighter Program',
        description: '6-month total transformation: elite boxing + peak conditioning',
        benefits: ['Everything in Standard', 'Peak athletic performance', 'Advanced strength training', 'Endurance mastery', 'Complete lifestyle change', 'Competition-ready fitness'],
        priceShells: 700000,
        priceStars: 3800
      }
    }
  }
  // Add more packages as needed...
];

export default function sagecombat() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [shells, setShells] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<'adult' | 'youth' | 'children'>('adult');
  const [selectedSession, setSelectedSession] = useState<'group' | 'private'>('group');
  const [paymentMethod, setPaymentMethod] = useState<'shells' | 'stars'>('shells');
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [pendingSubscription, setPendingSubscription] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const getTelegramId = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
      }
      return null;
    };

    const userId = getTelegramId();
    if (!userId) {
      alert("Please open this app through Telegram");
      setLoading(false);
      return;
    }

    setTelegramId(userId);
  }, []);

  useEffect(() => {
    if (!telegramId) return;

    async function fetchUserData() {
      try {
        // Fetch user points
        const userRes = await fetch(`/api/user/${telegramId}`);
        const userData = await userRes.json();
        setShells(Number(userData.points));

        // Fetch combat sports services for this gym
        const gymId = new URLSearchParams(window.location.search).get('gymId');
        if (gymId) {
          const servicesRes = await fetch(`/api/services?partnerType=COMBAT_SPORTS&gymId=${gymId}`);
          const servicesData = await servicesRes.json();
          
          // Map services to training packages
          // You'll need to structure your database services to match the training packages
          console.log('Combat sports services:', servicesData);
        }

        // Fetch subscription status
        const subRes = await fetch(`/api/subscription/${telegramId}`);
        
        if (subRes.ok) {
          const subData = await subRes.json();
          
          if (subData) {
            if (subData.status === 'APPROVED' && subData.active) {
              setActiveSubscription(subData);
              setPendingSubscription(null);
            } else if (subData.status === 'PENDING') {
              setPendingSubscription(subData);
              setActiveSubscription(null);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [telegramId]);

  // Countdown timer for active subscription
  useEffect(() => {
    if (!activeSubscription?.expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(activeSubscription.expiresAt!);
      const remaining = expiry.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeLeft("Expired");
        setActiveSubscription(null);
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((remaining / (1000 * 60)) % 60);
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [activeSubscription]);

  const filteredPackages = trainingPackages.filter(
    pkg => pkg.category === selectedCategory && pkg.sessionType === selectedSession
  );

  const handleEnroll = async (packageId: string, optionType: 'standard' | 'elite', serviceId: number, price: number) => {
    if (!telegramId) return;

    if (paymentMethod === 'shells' && shells < price) {
      alert('Insufficient shells!');
      return;
    }

    if (activeSubscription || pendingSubscription) {
      alert(activeSubscription ? 'You already have an active subscription!' : 'You have a pending subscription request!');
      return;
    }

    setProcessingPackage(`${packageId}-${optionType}`);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          serviceId,
          paymentMethod
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to subscribe');
      }

      const result = await response.json();
      
      alert('✅ Subscription request submitted! Waiting for gym admin approval.');
      
      // Refresh subscription status
      const subRes = await fetch(`/api/subscription/${telegramId}`);
      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData?.status === 'PENDING') {
          setPendingSubscription(subData);
        }
      }

    } catch (error: any) {
      console.error('Enrollment error:', error);
      alert(error.message || 'Failed to process enrollment');
    } finally {
      setProcessingPackage(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!telegramId || !pendingSubscription) return;

    if (confirm('Are you sure you want to cancel your pending subscription request?')) {
      try {
        const response = await fetch(`/api/subscription/${telegramId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to cancel subscription');
        }

        alert('✅ Subscription request cancelled');
        setPendingSubscription(null);
        
        // Refresh user points
        const userRes = await fetch(`/api/user/${telegramId}`);
        const userData = await userRes.json();
        setShells(Number(userData.points));

      } catch (error) {
        console.error('Cancellation error:', error);
        alert('Failed to cancel subscription');
      }
    }
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case 'walk-in': return 'Single Day Pass';
      case '3-months': return '3 Month Plan';
      case '6-months': return '6 Month Plan';
      default: return duration;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'adult': return Users;
      case 'youth': return User;
      case 'children': return Baby;
      default: return Users;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'adult': return 'from-blue-500 to-blue-700';
      case 'youth': return 'from-green-500 to-green-700';
      case 'children': return 'from-purple-500 to-purple-700';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${GYM_BACKGROUND})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-black/90 to-black/95" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Target className="w-12 h-12 text-red-500 mr-3 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              COMBAT SPORTS TRAINING
            </h1>
          </div>
          
          <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
            Professional boxing training for all ages. Build strength, discipline, and confidence.
          </p>
          
          {/* Shells Display */}
          <div className="inline-flex items-center bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-2xl px-6 py-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mr-2 flex items-center justify-center">
              <span className="text-black font-bold text-sm">🐚</span>
            </div>
            <span className="text-2xl font-bold text-yellow-400">{shells.toLocaleString()}</span>
            <span className="text-yellow-300 ml-2">Shells</span>
          </div>
        </div>

        {/* Active Subscription */}
        {activeSubscription && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-green-400 mb-2">Active Subscription</h2>
                  <p className="text-xl text-white font-semibold">{activeSubscription.name}</p>
                  <div className="flex items-center mt-2">
                    <Clock className="w-5 h-5 text-green-400 mr-2" />
                    <span className="text-green-300">{timeLeft} remaining</span>
                  </div>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Subscription */}
        {pendingSubscription && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400 mb-2">Pending Approval</h2>
                  <p className="text-xl text-white font-semibold">{pendingSubscription.name}</p>
                  <div className="flex items-center mt-2">
                    <Clock className="w-5 h-5 text-yellow-400 mr-2 animate-pulse" />
                    <span className="text-yellow-300 mr-4">Waiting for gym admin approval...</span>
                    <button
                      onClick={handleCancelSubscription}
                      className="ml-4 px-4 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      Cancel Request
                    </button>
                  </div>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl flex items-center justify-center">
                  <Clock className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold mb-3 text-center text-gray-300">Select Age Group</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {(['adult', 'youth', 'children'] as const).map((cat) => {
                const Icon = getCategoryIcon(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg scale-105' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {cat === 'adult' ? 'Adults (18+)' : cat === 'youth' ? 'Youth (13-17)' : 'Kids (5-12)'}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-3 text-center text-gray-300">Training Format</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setSelectedSession('group')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  selectedSession === 'group'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Users className="w-5 h-5" />
                Group Classes
              </button>
              <button
                onClick={() => setSelectedSession('private')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  selectedSession === 'private'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <User className="w-5 h-5" />
                1-on-1 Private
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-3 text-center text-gray-300">Payment Method</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setPaymentMethod('shells')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  paymentMethod === 'shells'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                🐚 Pay with Shells
              </button>
              <button
                onClick={() => setPaymentMethod('stars')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  paymentMethod === 'stars'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                ⭐ Pay with Telegram Stars
              </button>
            </div>
          </div>
        </div>

        {/* Training Packages - Simplified for space */}
        <div className="space-y-6">
          {filteredPackages.map((pkg) => {
            const CategoryIcon = getCategoryIcon(pkg.category);
            
            return (
              <div
                key={pkg.id}
                className={`relative bg-gradient-to-br ${getCategoryColor(pkg.category)} p-1 rounded-3xl shadow-2xl`}
              >
                <div className="bg-black/95 backdrop-blur-sm rounded-3xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-14 h-14 bg-gradient-to-br ${getCategoryColor(pkg.category)} rounded-2xl flex items-center justify-center`}>
                      <CategoryIcon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{getDurationLabel(pkg.duration)}</h2>
                      <p className="text-gray-400">{pkg.categoryName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Standard & Elite options side by side */}
                    {(['standard', 'elite'] as const).map((type) => {
                      const option = pkg.options[type];
                      const isElite = type === 'elite';
                      const serviceId = 1; // You'll need to map this to actual service IDs from your database

                      return (
                        <div
                          key={type}
                          className={`relative rounded-2xl p-6 ${
                            isElite 
                              ? 'bg-gradient-to-br from-red-500/10 to-orange-500/10 border-2 border-orange-500/50' 
                              : 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30'
                          }`}
                        >
                          {isElite && (
                            <div className="absolute -top-2 -right-2">
                              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                ELITE
                              </div>
                            </div>
                          )}

                          <h3 className="text-xl font-bold text-white mb-2">{option.name}</h3>
                          <p className="text-gray-300 text-sm mb-4">{option.description}</p>

                          <div className="mb-4">
                            <div className="space-y-2">
                              {option.benefits.slice(0, 3).map((benefit, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isElite ? 'text-orange-400' : 'text-emerald-400'}`} />
                                  <span className="text-xs text-gray-300">{benefit}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className={`rounded-xl p-4 mb-4 ${isElite ? 'bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-orange-500/30' : 'bg-black/40'}`}>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 mb-1">
                                {paymentMethod === 'shells' ? 'Price in Shells' : 'Price in Stars'}
                              </p>
                              <p className={`text-3xl font-black ${isElite ? 'text-orange-400' : 'text-emerald-400'}`}>
                                {paymentMethod === 'shells' 
                                  ? option.priceShells.toLocaleString() 
                                  : `⭐ ${option.priceStars}`}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleEnroll(
                              pkg.id, 
                              type, 
                              serviceId,
                              paymentMethod === 'shells' ? option.priceShells : option.priceStars
                            )}
                            disabled={
                              processingPackage === `${pkg.id}-${type}` || 
                              (paymentMethod === 'shells' && shells < option.priceShells) ||
                              !!activeSubscription ||
                              !!pendingSubscription
                            }
                            className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                              processingPackage === `${pkg.id}-${type}`
                                ? 'bg-gray-600 text-gray-300 cursor-wait'
                                : (paymentMethod === 'shells' && shells < option.priceShells) || activeSubscription || pendingSubscription
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : isElite
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg transform hover:-translate-y-1'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg transform hover:-translate-y-1'
                            }`}
                          >
                            {processingPackage === `${pkg.id}-${type}` 
                              ? 'Processing...' 
                              : activeSubscription 
                              ? 'Already Subscribed'
                              : pendingSubscription
                              ? 'Pending Approval'
                              : 'Enroll Now'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-bold">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Choose Your Plan</h3>
              <p className="text-gray-400 text-sm">Select age group, session type, and training intensity</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-bold">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Submit Enrollment</h3>
              <p className="text-gray-400 text-sm">Pay with shells or Telegram stars - request sent to gym admin</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-bold">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Get Approved & Start</h3>
              <p className="text-gray-400 text-sm">Admin approves - you'll receive notification to begin training</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}