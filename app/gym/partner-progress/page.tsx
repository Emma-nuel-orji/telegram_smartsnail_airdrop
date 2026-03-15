// "use client";
// import React from 'react';
// import { CheckCircle2, Calendar } from 'lucide-react';

// // 1. Define the Interface for the subscription object
// interface GymSub {
//   duration: string;
//   approvedAt: string;
//   name: string;
// }

// export default function PartnerProgress({ sub }: { sub: GymSub }) {
  
//   // 2. Define parseDuration inside the component or import it
//   const parseDuration = (duration: string): number => {
//     const mapping: Record<string, number> = {
//       "1 Week": 7,
//       "2 Weeks": 14,
//       "1 Month": 30,
//       "3 Months": 90,
//       "6 Months": 180,
//       "1 Year": 365,
//     };
//     return mapping[duration] || 0;
//   };

//   const calculateDaysPassed = (approvedAt: string) => {
//     const start = new Date(approvedAt);
//     const now = new Date();
//     // Use Math.floor to only count full 24-hour periods passed
//     const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
//     return Math.max(0, diff);
//   };

//   const daysInPlan = parseDuration(sub.duration);
//   const daysPassed = calculateDaysPassed(sub.approvedAt);

//   return (
//     <div className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800 shadow-xl">
//       <div className="flex items-center gap-2 mb-6">
//         <Calendar size={18} className="text-blue-400" />
//         <h3 className="text-sm font-black uppercase italic tracking-widest text-white">
//           Access Calendar
//         </h3>
//       </div>
      
//       <div className="grid grid-cols-7 gap-2">
//         {[...Array(daysInPlan)].map((_, i) => {
//           const isPast = i < daysPassed;
//           const isToday = i === daysPassed;

//           return (
//             <div 
//               key={i} 
//               className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${
//                 isPast ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 
//                 isToday ? 'bg-white/10 border-white text-white animate-pulse' : 
//                 'bg-black/40 border-zinc-800 text-zinc-700'
//               }`}
//             >
//               {isPast ? <CheckCircle2 size={12} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
//             </div>
//           );
//         })}
//       </div>
      
//       <p className="mt-6 text-[9px] text-zinc-500 text-center uppercase font-black tracking-[0.2em]">
//         Daily access automatically verified
//       </p>
//     </div>
//   );
// }