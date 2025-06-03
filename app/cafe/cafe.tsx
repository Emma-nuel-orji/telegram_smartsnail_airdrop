"use client"
import { useEffect, useState } from "react"
import Image from "next/image"

// TypeScript interfaces
interface Service {
  id: string
  name: string
  priceShells: bigint | number
}

interface User {
  points: number
  telegramId: string
}

interface CustomButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  className?: string
}

// Simple SVG Icons
const UtensilsIcon = () => (
  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l1.664 9.98A1 1 0 0 0 5.64 14h12.72a1 1 0 0 0 .976-1.02L21 3" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
)

const MapPinIcon = () => (
  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const ShoppingCartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5H17M7 13v5a2 2 0 002 2h6a2 2 0 002-2v-5" />
  </svg>
)

const WalletIcon = () => (
  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/>
    <path d="m16 6 4 6-4 6"/>
    <circle cx="11" cy="9.5" r="1"/>
  </svg>
)

// Custom Button Component
const CustomButton: React.FC<CustomButtonProps> = ({ children, onClick, disabled, className = "" }) => (
  <button
    className={`relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${className}`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
  </button>
)

export default function cafe() {
  const [services, setServices] = useState<Service[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [telegramId, setTelegramId] = useState<string>("")

  useEffect(() => {
    // Get Telegram user ID (replace with your method of getting it)
    const getTelegramId = () => {
      // Example: Get from Telegram WebApp API or localStorage
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        return window.Telegram.WebApp.initDataUnsafe.user.id.toString()
      }
      return "demo_user" // Fallback for demo
    }

    const userId = getTelegramId()
    setTelegramId(userId)

    // Fetch services
    const fetchServices = async () => {
      try {
        const response = await fetch("/api/services?type=ONE_TIME")
        if (response.ok) {
          const data = await response.json()
          setServices(data)
        }
      } catch (error) {
        console.error("Error fetching services:", error)
        // Mock data for demo
        setServices([
          { id: '1', name: 'Gourmet Burger', priceShells: 25 },
          { id: '2', name: 'Caesar Salad', priceShells: 18 },
          { id: '3', name: 'Margherita Pizza', priceShells: 30 },
          { id: '4', name: 'Grilled Salmon', priceShells: 45 },
        ])
      }
    }

    // Fetch user data
    const fetchUser = async () => {
      try {
        const userResponse = await fetch(`/api/user/${userId}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setUser(userData)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        // Mock user data for demo
        setUser({ points: 150, telegramId: userId })
      }
    }

    fetchServices()
    fetchUser()
  }, [])

  const handlePurchase = async (serviceId: string) => {
    setLoading(true)
    setPurchasingId(serviceId)
    try {
      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serviceId }),
      })

      if (response.ok) {
        alert("Purchase successful!")
        // Refresh user data to update points
        const userResponse = await fetch(`/api/user/${telegramId}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setUser(userData)
        }
      } else {
        alert("Error during purchase")
      }
    } catch (err) {
      console.error("Purchase error:", err)
      alert("Error during purchase")
    }
    setLoading(false)
    setPurchasingId(null)
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <Image
          src="/images/bk.jpg"
          alt="Background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-pink-900/70 to-orange-900/80" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-yellow-400 rounded-full animate-pulse opacity-70" />
      <div className="absolute top-40 right-8 w-6 h-6 bg-pink-400 rounded-full animate-bounce opacity-50" />
      <div className="absolute bottom-32 left-6 w-5 h-5 bg-blue-400 rounded-full animate-ping opacity-60" />

      {/* Content */}
      <div className="relative z-20 p-6">
        {/* Header with User Points */}
        <div className="text-center mb-8 pt-8">
          {/* User Points Display */}
          {user && (
            <div className="mb-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-2xl border border-yellow-400/30 p-4 max-w-sm mx-auto">
              <div className="flex items-center justify-center gap-2">
                <WalletIcon />
                <span className="text-white text-lg font-semibold">Your Balance:</span>
                <span className="text-yellow-400 text-xl font-bold">{user.points}</span>
                <span className="text-yellow-300 font-medium">Shells</span>
              </div>
            </div>
          )}

          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full mb-4 shadow-2xl">
            <UtensilsIcon />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">
            Restaurant Menu
          </h1>
          <p className="text-gray-300 text-lg">Delicious meals, paid with Shells</p>
          
          {/* Stats Bar */}
          <div className="flex justify-center items-center gap-6 mt-4 text-sm text-gray-300">
            <div className="flex items-center gap-1">
              <StarIcon />
              <span>4.8 Rating</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockIcon />
              <span>15-30 min</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPinIcon />
              <span>2.1 km</span>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="space-y-4 max-w-md mx-auto">
          {services.map((service, index) => {
            const canAfford = user ? user.points >= Number(service.priceShells) : true
            
            return (
              <div
                key={service.id}
                className={`group relative overflow-hidden backdrop-blur-lg rounded-2xl shadow-2xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-purple-500/25 ${
                  canAfford 
                    ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                    : 'bg-red-900/20 border-red-500/30'
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'slideInUp 0.6s ease-out forwards'
                }}
              >
                {/* Gradient Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Content */}
                <div className="relative p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${canAfford ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-red-500'}`} />
                      <h3 className="text-xl font-bold text-white group-hover:text-yellow-200 transition-colors">
                        {service.name}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-300">
                      <SparklesIcon />
                      <span className="text-lg font-semibold">
                        {Number(service.priceShells)} 
                      </span>
                      <span className="text-yellow-400 font-medium">Shells</span>
                      {!canAfford && (
                        <span className="text-red-400 text-sm ml-2">(Insufficient funds)</span>
                      )}
                    </div>
                  </div>

                  <CustomButton
                    onClick={() => handlePurchase(service.id)}
                    disabled={loading || !canAfford}
                    className={!canAfford ? "from-gray-500 to-gray-600 hover:from-gray-500 hover:to-gray-600" : ""}
                  >
                    <div className="flex items-center gap-2">
                      {purchasingId === service.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCartIcon />
                          <span>{canAfford ? 'Buy Now' : 'No Funds'}</span>
                        </>
                      )}
                    </div>
                  </CustomButton>
                </div>

                {/* Bottom glow effect */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  canAfford 
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500' 
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                }`} />
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {services.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UtensilsIcon />
            </div>
            <p className="text-gray-400 text-lg">No menu items available</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}