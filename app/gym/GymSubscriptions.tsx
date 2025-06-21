"use client";

import React, { useEffect, useState } from "react";
import { Clock, Zap, Star, Trophy, Crown, Dumbbell } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const GYM_BACKGROUND = "/images/bk.jpg";

// const GYM_BACKGROUND = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";

function parseDuration(duration: string): number {
  const mapping: Record<string, number> = {
    "1 Week": 7,
    "2 Weeks": 14,
    "1 Month": 30,
    "3 Months": 90,
    "6 Months": 180,
    "1 Year": 365,
  };
  return mapping[duration] || 0;
}

// Icon mapping for different subscription types
const getSubscriptionIcon = (name: string) => {
  if (name.toLowerCase().includes("starter")) return Zap;
  if (name.toLowerCase().includes("power") || name.toLowerCase().includes("boost")) return Star;
  if (name.toLowerCase().includes("monthly") || name.toLowerCase().includes("grind")) return Dumbbell;
  if (name.toLowerCase().includes("quarterly") || name.toLowerCase().includes("beast")) return Trophy;
  if (name.toLowerCase().includes("annual") || name.toLowerCase().includes("pro") || name.toLowerCase().includes("champion")) return Crown;
  return Dumbbell; // default
};

// Mock data for demonstration
const MOCK_SUBSCRIPTIONS = [
  {
    id: 1,
    name: "Starter Boost",
    duration: "1 Week",
    priceShells: 500,
  },
  {
    id: 2,
    name: "Power Grind",
    duration: "1 Month",
    priceShells: 1500,
  },
  {
    id: 3,
    name: "Beast Mode",
    duration: "3 Months",
    priceShells: 4000,
  },
  {
    id: 4,
    name: "Champion Pro",
    duration: "1 Year",
    priceShells: 12000,
  }
];

export default function GymSubscriptions() {
  // Mock telegramId for demo - in real app this would come from URL params
  const telegramId = "demo_user";
  const [shells, setShells] = useState(2500);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [expiredSubs, setExpiredSubs] = useState([]);
  const [timeLeft, setTimeLeft] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Simulate API calls with mock data
  useEffect(() => {
    if (!telegramId) {
      addDebugInfo("No telegramId found");
      setError("No telegram ID provided");
      setLoading(false);
      return;
    }

    async function fetchUserData() {
      try {
        setLoading(true);
        addDebugInfo("Starting data fetch...");
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock user data fetch
        addDebugInfo("Fetching user shells...");
        setShells(2500);
        addDebugInfo("User shells loaded: 2500");

        // Mock subscriptions fetch
        addDebugInfo("Fetching available subscriptions...");
        setSubscriptions(MOCK_SUBSCRIPTIONS);
        addDebugInfo(`Loaded ${MOCK_SUBSCRIPTIONS.length} subscriptions`);

        // Mock active subscription check
        addDebugInfo("Checking for active subscription...");
        // Uncomment the line below to test with an active subscription
        // setActiveSub({ id: 999, name: "Current Plan", duration: "1 Month", approvedAt: new Date().toISOString() });
        addDebugInfo("No active subscription found");

        addDebugInfo("All data loaded successfully");
      } catch (error) {
        console.error("Error fetching data:", error);
        addDebugInfo(`Error: ${error.message}`);
        setError(`Failed to load data: ${error.message}`);
      } finally {
        setLoading(false);
        addDebugInfo("Loading complete");
      }
    }

    fetchUserData();
  }, [telegramId]);

  useEffect(() => {
    if (!activeSub) return;

    const durationDays = parseDuration(activeSub.duration);
    const approvedAt = new Date(activeSub.approvedAt);
    const expiry = new Date(approvedAt.getTime() + durationDays * 86400000);

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = expiry.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeLeft("Expired");
        setExpiredSubs([...expiredSubs, activeSub]);
        setActiveSub(null);
        clearInterval(interval);
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((remaining / (1000 * 60)) % 60);
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [activeSub, expiredSubs]);

  const handlePurchase = async (sub) => {
    if (!telegramId || shells < sub.priceShells || selectedPlan === sub.id) return;
    
    // Check if user already has an active subscription
    if (activeSub) {
      alert("You already have an active subscription!");
      return;
    }
    
    setSelectedPlan(sub.id);
    addDebugInfo(`Purchasing subscription: ${sub.name}`);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful purchase
      setShells(prev => prev - sub.priceShells);
      addDebugInfo(`Purchase successful! Deducted ${sub.priceShells} shells`);
      alert("Subscription request submitted for approval!");
    } catch (error) {
      console.error("Purchase error:", error);
      addDebugInfo(`Purchase error: ${error.message}`);
      alert("Failed to process subscription");
    } finally {
      setSelectedPlan(null);
    }
  };

  const getPlanIcon = (sub) => {
    const IconComponent = getSubscriptionIcon(sub.name);
    return <IconComponent className="w-8 h-8" />;
  };

  const getPlanColor = (duration) => {
    switch (duration) {
      case "1 Week":
        return "from-blue-500 to-blue-700";
      case "2 Weeks":
        return "from-green-500 to-green-700";
      case "1 Month":
        return "from-purple-500 to-purple-700";
      case "3 Months":
        return "from-orange-500 to-orange-700";
      case "6 Months":
        return "from-red-500 to-red-700";
      case "1 Year":
        return "from-yellow-500 to-yellow-700";
      default:
        return "from-gray-500 to-gray-700";
    }
  };

  const isPopularPlan = (duration) => {
    return duration === "1 Month" || duration === "3 Months";
  };

  const isSubscriptionDisabled = (sub) => {
    if (shells < sub.priceShells) return true;
    if (activeSub) return true;
    if (selectedPlan === sub.id) return true;
    return false;
  };

  const getButtonText = (sub) => {
    if (selectedPlan === sub.id) return "Processing...";
    if (activeSub) return "Already Subscribed";
    if (shells < sub.priceShells) return "Insufficient Shells";
    return "Subscribe Now";
  };

  const getButtonStyle = (sub) => {
    if (isSubscriptionDisabled(sub)) {
      return 'bg-gray-600 text-gray-400 cursor-not-allowed';
    }
    return `bg-gradient-to-r ${getPlanColor(sub.duration)} text-white hover:shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-1`;
  };

  // Error state
  if (error) {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
          style={{ backgroundImage: `url(${GYM_BACKGROUND})` }}
        />
        <div className="relative z-10 max-w-2xl mx-auto p-8">
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Subscriptions</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
          
          {/* Debug Information */}
          <div className="bg-gray-900/50 border border-gray-600/50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Debug Information:</h3>
            <div className="text-sm text-gray-400 space-y-1 max-h-40 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index}>{info}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
          style={{ backgroundImage: `url(${GYM_BACKGROUND})` }}
        />
        <div className="relative z-10 text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl mb-6">Loading your gym subscriptions...</p>
          
          {/* Debug Information */}
          <div className="bg-black/50 border border-gray-600/50 rounded-xl p-4 text-left">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Loading Progress:</h3>
            <div className="text-xs text-gray-400 space-y-1 max-h-32 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index}>{info}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${GYM_BACKGROUND})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
      
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/10 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Dumbbell className="w-12 h-12 text-yellow-400 mr-4" />
            <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              GYM MEMBERSHIPS
            </h1>
          </div>
          
          {/* Shells Display */}
          <div className="inline-flex items-center bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 rounded-2xl px-8 py-4 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mr-3 flex items-center justify-center">
              <span className="text-black font-bold text-sm">🐚</span>
            </div>
            <span className="text-2xl font-bold text-yellow-400">{shells.toLocaleString()}</span>
            <span className="text-yellow-300 ml-2">Shells</span>
          </div>
        </div>

        {/* Active Subscription */}
        {activeSub && (
          <div className="mb-12">
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/10 to-transparent rounded-full -translate-y-8 translate-x-8" />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-green-400 mb-2">Active Subscription</h2>
                    <p className="text-xl text-white font-semibold">{activeSub.name}</p>
                    <div className="flex items-center mt-2">
                      <Clock className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-green-300">{timeLeft} remaining</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Plans */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Choose Your Plan
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className={`relative group transition-all duration-300 transform hover:scale-105 ${
                  selectedPlan === sub.id ? 'scale-105' : ''
                }`}
              >
                {/* Popular Badge */}
                {isPopularPlan(sub.duration) && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold">
                      POPULAR
                    </div>
                  </div>
                )}

                <div className={`relative bg-gradient-to-br ${getPlanColor(sub.duration)} p-1 rounded-3xl shadow-2xl overflow-hidden`}>
                  <div className="bg-black/90 backdrop-blur-sm rounded-3xl p-6 h-full">
                    {/* Loading overlay */}
                    {selectedPlan === sub.id && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}

                    <div className="text-center">
                      {/* Icon */}
                      <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${getPlanColor(sub.duration)} rounded-2xl mb-4`}>
                        {getPlanIcon(sub)}
                      </div>

                      {/* Plan Name */}
                      <h3 className="text-xl font-bold text-white mb-2">{sub.name}</h3>
                      
                      {/* Duration */}
                      <div className="text-lg text-gray-300 mb-4">{sub.duration}</div>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="text-3xl font-black text-white">{sub.priceShells}</div>
                        <div className="text-yellow-400 text-sm">Shells</div>
                      </div>

                      {/* Purchase Button */}
                      <button
                        onClick={() => handlePurchase(sub)}
                        disabled={isSubscriptionDisabled(sub)}
                        className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 ${getButtonStyle(sub)}`}
                      >
                        {getButtonText(sub)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expired Subscriptions */}
        {expiredSubs.length > 0 && (
          <div className="bg-gradient-to-r from-red-600/20 to-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-3xl p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Expired Subscriptions</h2>
            <div className="space-y-2">
              {expiredSubs.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between bg-red-900/20 rounded-xl p-3">
                  <span className="text-white">{ex.name}</span>
                  <span className="text-red-400 text-sm">({ex.duration})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Panel (remove in production) */}
        <div className="mt-8 bg-black/50 border border-gray-600/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Debug Information:</h3>
          <div className="text-sm text-gray-400 space-y-1 max-h-40 overflow-y-auto">
            {debugInfo.map((info, index) => (
              <div key={index}>{info}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}