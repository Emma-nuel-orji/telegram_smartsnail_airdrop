"use client";

import React, { useEffect, useState } from "react";
import { Dumbbell, MapPin, Star, Users, Clock, ChevronRight, Flame, Target } from "lucide-react";

const GYM_BACKGROUND = "/images/gymfit2.jpg";

interface Gym {
  id: number;
  name: string;
  location: string;
  rating: number;
  members: number;
  openTime: string;
  closeTime: string;
  amenities: string[];
  image: string;
  description: string;
  type: 'GYM' | 'COMBAT_SPORTS'; // Distinguish gym types
}

const PARTNER_GYMS: Gym[] = [
  {
    id: 1,
    name: "Lilburn Fitness Center",
    location: "Lilburn, GA",
    rating: 8.8,
    members: 1250,
    openTime: "7:00 AM",
    closeTime: "8:00 PM",
    amenities: ["Free Weights", "Cardio Equipment", "Group Classes", "Pool", "Sauna"],
    image: "/images/gyms/gymfit.jpg",
    description: "Premium fitness facility with state-of-the-art equipment and expert trainers.",
    type: 'GYM'
  },
  {
    id: 2,
    name: "Sage Combat",
    location: "Lilburn Gym",
    rating: 7.6,
    members: 20,
    openTime: "8:00 AM",
    closeTime: "10:00 PM",
    amenities: ["Boxing Fundamentals", "Self-defense Techniques", "Combat conditioning", "Private sessions"],
    image: "/images/gyms/powerhouse-gym.jpg",
    description: "Urban warrior meets mental discipline. Professional boxing and combat sports training for all ages.",
    type: 'COMBAT_SPORTS'
  },
  {
    id: 3,
    name: "Elite Fitness Studio",
    location: "Buckhead, GA",
    rating: 4.9,
    members: 850,
    openTime: "6:00 AM",
    closeTime: "10:00 PM",
    amenities: ["Yoga Studio", "Pilates", "Spin Classes", "Nutrition Counseling"],
    image: "/images/gyms/elite-fitness.jpg",
    description: "Boutique fitness studio focusing on holistic wellness and personalized training.",
    type: 'GYM'
  },
  {
    id: 4,
    name: "Iron Temple Gym",
    location: "Marietta, GA",
    rating: 4.7,
    members: 1600,
    openTime: "5:30 AM",
    closeTime: "11:30 PM",
    amenities: ["Olympic Lifting", "Powerlifting", "MMA Training", "Recovery Center"],
    image: "/images/gyms/iron-temple.jpg",
    description: "Hardcore training facility for serious athletes and fitness enthusiasts.",
    type: 'GYM'
  }
];

export default function GymListing() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [gyms, setGyms] = useState<Gym[]>(PARTNER_GYMS);

  useEffect(() => {
    const getTelegramId = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id.toString();
      }
      return null;
    };

    const userId = getTelegramId();
    
    if (!userId) {
      setError("This app must be opened through Telegram. Please access it via your Telegram bot.");
      setLoading(false);
      return;
    }

    setTelegramId(userId);
    
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const handleGymClick = (gym: Gym) => {
    if (gym.type === 'COMBAT_SPORTS') {
      // Navigate to combat sports training page
      window.location.href = `/gym/sagecombat?gymId=${gym.id}&gymName=${encodeURIComponent(gym.name)}`;
    } else {
      // Navigate to regular gym subscriptions
      window.location.href = `/gym/subscriptions?gymId=${gym.id}&gymName=${encodeURIComponent(gym.name)}`;
    }
  };

  if (error) {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
          style={{ backgroundImage: `url(${GYM_BACKGROUND})` }}
        />
        <div className="relative z-10 max-w-2xl mx-auto p-8">
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Gyms</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
          style={{ backgroundImage: `url(${GYM_BACKGROUND})` }}
        />
        <div className="relative z-10 text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl mb-6">Finding partner gyms near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${GYM_BACKGROUND})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
      
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
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
        <div className="text-center mb-12 pt-12">
          <button 
            onClick={() => window.location.href = '/'}
            className="absolute top-6 left-6"
          >
            <img
              src="/images/info/output-onlinepngtools (6).png"
              width={24}
              height={24}
              alt="back"
            />
          </button>
          
          <div className="flex items-center justify-center mb-6">
            <Dumbbell className="w-12 h-12 text-yellow-400 mr-4" />
            <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              PARTNER GYMS
            </h1>
          </div>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose from our premium partner gyms and start your fitness journey today
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {gyms.map((gym) => (
            <button
              key={gym.id}
              onClick={() => handleGymClick(gym)}
              className="group text-left w-full"
            >
              <div className={`relative backdrop-blur-sm border rounded-3xl p-6 transition-all duration-300 transform hover:scale-105 overflow-hidden ${
                gym.type === 'COMBAT_SPORTS'
                  ? 'bg-gradient-to-br from-red-900/80 to-orange-900/80 border-red-500/50 hover:border-red-400/80'
                  : 'bg-gradient-to-br from-gray-900/80 to-black/80 border-gray-700/50 hover:border-yellow-400/50'
              }`}>
                {/* Combat Sports Badge */}
                {gym.type === 'COMBAT_SPORTS' && (
                  <div className="absolute top-4 right-4 z-20">
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      COMBAT SPORTS
                    </div>
                  </div>
                )}

                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl ${
                  gym.type === 'COMBAT_SPORTS'
                    ? 'bg-gradient-to-r from-red-400/10 to-orange-500/10'
                    : 'bg-gradient-to-r from-yellow-400/10 to-red-500/10'
                }`} />
                
                <div className="relative z-10">
                  <div className={`w-full h-48 rounded-2xl mb-6 flex items-center justify-center overflow-hidden ${
                    gym.type === 'COMBAT_SPORTS'
                      ? 'bg-gradient-to-br from-red-800 to-orange-800'
                      : 'bg-gradient-to-br from-gray-700 to-gray-800'
                  }`}>
                    {gym.type === 'COMBAT_SPORTS' ? (
                      <Target className="w-16 h-16 text-red-300" />
                    ) : (
                      <Dumbbell className="w-16 h-16 text-gray-500" />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`text-2xl font-bold transition-colors ${
                          gym.type === 'COMBAT_SPORTS'
                            ? 'text-white group-hover:text-red-400'
                            : 'text-white group-hover:text-yellow-400'
                        }`}>
                          {gym.name}
                        </h3>
                        <div className="flex items-center text-gray-400 mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="text-sm">{gym.location}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-6 h-6 text-gray-400 transition-colors ${
                        gym.type === 'COMBAT_SPORTS'
                          ? 'group-hover:text-red-400'
                          : 'group-hover:text-yellow-400'
                      }`} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Star className={gym.type === 'COMBAT_SPORTS' ? 'w-5 h-5 text-red-400 mr-1' : 'w-5 h-5 text-yellow-400 mr-1'} />
                        <span className="text-white font-semibold">{gym.rating}</span>
                        <span className="text-gray-400 text-sm ml-1">rating</span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Users className="w-4 h-4 mr-1" />
                        <span className="text-sm">{gym.members.toLocaleString()} members</span>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-400">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        {gym.openTime === "24/7" ? "Open 24/7" : `${gym.openTime} - ${gym.closeTime}`}
                      </span>
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed">
                      {gym.description}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {gym.amenities.slice(0, 3).map((amenity, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 border rounded-full text-xs ${
                            gym.type === 'COMBAT_SPORTS'
                              ? 'bg-gradient-to-r from-red-600/20 to-orange-400/20 border-red-400/30 text-red-300'
                              : 'bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 border-yellow-400/30 text-yellow-300'
                          }`}
                        >
                          {amenity}
                        </span>
                      ))}
                      {gym.amenities.length > 3 && (
                        <span className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded-full text-xs text-gray-400">
                          +{gym.amenities.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="pt-4">
                      <div className={`w-full text-white py-3 px-6 rounded-xl font-bold text-center transition-all duration-300 ${
                        gym.type === 'COMBAT_SPORTS'
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 group-hover:from-red-500 group-hover:to-orange-500'
                          : 'bg-gradient-to-r from-yellow-600 to-red-600 group-hover:from-yellow-500 group-hover:to-red-500'
                      }`}>
                        {gym.type === 'COMBAT_SPORTS' ? 'View Training Programs' : 'View Memberships'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl px-6 py-4">
            <Dumbbell className="w-6 h-6 text-yellow-400 mr-3" />
            <span className="text-gray-300">
              More partner gyms coming soon! Stay tuned for updates.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}