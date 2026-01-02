import { useState } from "react";
import { CheckCircle, Flame, User, Calendar } from "lucide-react";

export default function sagecombat() {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Combat Sports Training</h1>
        <p className="text-gray-400">Structured boxing programs inside Telegram</p>
      </div>

      {/* Age Groups */}
      <div className="flex justify-center gap-3 flex-wrap">
        {['Adults (18+)', 'Youths (13–17)', 'Children (5–12)'].map(tab => (
          <button
            key={tab}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Training Type */}
      <div className="flex justify-center gap-4">
        <button className="px-6 py-3 rounded-2xl bg-blue-600 font-semibold">Group</button>
        <button className="px-6 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700">1‑on‑1</button>
      </div>

      {/* Training Intensity */}
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <CheckCircle className="text-green-400" /> Regular Training
          </h2>
          <p className="text-gray-400 mb-4">
            Boxing routines, pads, bags, footwork and controlled conditioning.
          </p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Technical foundation</li>
            <li>• Moderate cardio</li>
            <li>• Skill-focused</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-red-600/20 to-orange-600/10 rounded-2xl p-6 border border-red-600/30">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Flame className="text-red-400" /> Intensive Training
          </h2>
          <p className="text-gray-300 mb-4">
            HIIT, roadwork, advanced cardio, weight loss and mental conditioning.
          </p>
          <ul className="text-sm text-gray-200 space-y-1">
            <li>• Fat‑burn & stamina</li>
            <li>• High‑intensity drills</li>
            <li>• Athlete‑level training</li>
          </ul>
        </div>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {[{
          title: 'Walk‑In',
          price: '25,000 Shells / 135 Stars',
          sessions: '1 session'
        }, {
          title: '3 Months',
          price: '250,000 Shells / 1,350 Stars',
          sessions: '36 sessions'
        }, {
          title: '6 Months',
          price: '500,000 Shells / 13,500 Stars',
          sessions: '72 sessions'
        }].map(plan => (
          <div key={plan.title} className="bg-gray-900 rounded-2xl p-6 text-center border border-gray-800">
            <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
            <p className="text-2xl font-extrabold mb-1">{plan.price}</p>
            <p className="text-gray-400 mb-4">{plan.sessions}</p>
            <button
              onClick={() => setShowPayment(true)}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold"
            >
              Enroll
            </button>
          </div>
        ))}
      </div>

      {/* Attendance Section */}
      <div className="max-w-4xl mx-auto bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="text-yellow-400" /> My Attendance
        </h2>
        <div className="grid grid-cols-6 gap-2">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg flex items-center justify-center bg-green-600/80 text-xs font-bold"
            >
              ✓
            </div>
          ))}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg flex items-center justify-center bg-gray-700 text-xs"
            >
              —
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-4">18 of 24 sessions completed</p>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Choose Payment Method</h3>
            <div className="space-y-3">
              <button className="w-full py-3 rounded-xl bg-yellow-600 font-semibold">🐚 Pay with Shells</button>
              <button className="w-full py-3 rounded-xl bg-blue-600 font-semibold">⭐ Pay with Telegram Stars</button>
              <button
                onClick={() => setShowPayment(false)}
                className="w-full py-2 text-sm text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
