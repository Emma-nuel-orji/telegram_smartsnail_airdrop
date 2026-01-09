"use client";

import React, { useEffect, useState } from "react";
import { Dumbbell, MapPin, Star, Users, Clock, ChevronRight, Flame, Target, Loader2, Info } from "lucide-react";

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
  type: 'GYM' | 'COMBAT_SPORTS';
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
    description: "Urban warrior meets mental discipline. Professional boxing and combat sports training.",
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for Telegram WebApp environment
    const WebApp = (window as any).Telegram?.WebApp;
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
    }
    
    setTimeout(() => setLoading(false), 1200);
  }, []);

  const handleGymClick = (gym: Gym) => {
    const route = gym.type === 'COMBAT_SPORTS' ? 'sagecombat' : 'subscriptions';
    window.location.href = `/gym/${route}?gymId=${gym.id}&gymName=${encodeURIComponent(gym.name)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
        <h2 className="text-white font-black italic tracking-tighter text-xl">SCANNING PARTNERS...</h2>
        <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] mt-2">Locating elite facilities</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(234,179,8,0.08)_0%,_rgba(0,0,0,0)_50%)]" />
        <div className="absolute inset-0 bg-cover bg-center opacity-20 grayscale" style={{ backgroundImage: `url(${GYM_BACKGROUND})` }} />
      </div>

      <div className="relative z-10">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
          <button onClick={() => window.location.href = '/'} className="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-transform">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black italic tracking-tighter leading-none">PARTNER GYMS</h1>
            <p className="text-[9px] text-yellow-500 font-bold uppercase tracking-[0.3em]">SmartSnail Network</p>
          </div>
          <div className="w-9" />
        </div>

        <div className="p-4 space-y-6 max-w-2xl mx-auto pb-24">
          <div className="space-y-2 pt-4">
            <h2 className="text-3xl font-black italic tracking-tighter leading-tight">CHOOSE YOUR<br/>BATTLEGROUND</h2>
            <p className="text-zinc-500 text-xs font-medium max-w-[80%]">Select a facility to view membership tiers and exclusive SmartSnail rewards.</p>
          </div>

          <div className="grid gap-5">
            {PARTNER_GYMS.map((gym) => (
              <button
                key={gym.id}
                onClick={() => handleGymClick(gym)}
                className={`group relative w-full text-left rounded-[2rem] border overflow-hidden transition-all duration-300 active:scale-[0.98] ${
                  gym.type === 'COMBAT_SPORTS' 
                  ? 'bg-gradient-to-br from-red-950/40 to-black border-red-500/20' 
                  : 'bg-gradient-to-br from-zinc-900/40 to-black border-white/10'
                }`}
              >
                {/* Image Area */}
                <div className="relative h-40 w-full bg-zinc-800 overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                   <div className="absolute top-4 left-4 z-20 flex gap-2">
                     {gym.type === 'COMBAT_SPORTS' && (
                       <span className="bg-red-600 text-[9px] font-black px-2 py-1 rounded-md flex items-center gap-1 uppercase tracking-tighter">
                         <Flame className="w-3 h-3" /> Combat Elite
                       </span>
                     )}
                     <span className="bg-black/60 backdrop-blur-md text-[9px] font-black px-2 py-1 rounded-md flex items-center gap-1 uppercase tracking-tighter border border-white/10">
                       <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {gym.rating}
                     </span>
                   </div>
                   <div className="w-full h-full flex items-center justify-center opacity-30">
                      {gym.type === 'COMBAT_SPORTS' ? <Target className="w-12 h-12" /> : <Dumbbell className="w-12 h-12" />}
                   </div>
                </div>

                {/* Content Area */}
                <div className="p-5 relative">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-black italic tracking-tight">{gym.name}</h3>
                        <div className="flex items-center text-zinc-500 gap-1 mt-0.5">
                           <MapPin className="w-3 h-3" />
                           <span className="text-[10px] font-bold uppercase tracking-wider">{gym.location}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-2 rounded-xl group-hover:bg-yellow-500 transition-colors">
                        <ChevronRight className="w-4 h-4 group-hover:text-black" />
                      </div>
                   </div>

                   <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                     {gym.description}
                   </p>

                   {/* Amenities & Stats */}
                   <div className="flex flex-wrap gap-2 mb-4">
                      {gym.amenities.slice(0, 3).map((a, i) => (
                        <span key={i} className="text-[9px] font-black uppercase tracking-tighter bg-white/5 border border-white/5 px-2 py-1 rounded-md text-zinc-400">
                          {a}
                        </span>
                      ))}
                   </div>

                   <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-black">{gym.members}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">{gym.openTime} - {gym.closeTime}</span>
                      </div>
                   </div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white/5 rounded-2xl p-4 flex items-start gap-3 border border-dashed border-white/10 opacity-60">
            <Info className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-[10px] font-bold leading-normal text-zinc-400 uppercase tracking-wide">
              We are expanding! New partner gyms in the Atlanta area are being added monthly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}