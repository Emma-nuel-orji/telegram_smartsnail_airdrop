"use client"
import React, { useState, useEffect } from 'react';
import { Camera, User, Ruler, Weight, Trophy, Hash, DollarSign, Check, X, AlertCircle } from 'lucide-react';

const REGISTRATION_COST_STARS = 500;
const REGISTRATION_COST_SHELLS = 1000000;

const WEIGHT_CLASSES = [
  'Flyweight',
  'Bantamweight',
  'Featherweight',
  'Lightweight',
  'Welterweight',
  'Middleweight',
  'Light Heavyweight',
  'Heavyweight'
];

export default function FighterRegistration() {
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);

  // const [telegramId, setTelegramId] = useState(null);
  const [userShells, setUserShells] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    weightClass: '',
    telegramId: '',
    photo: null,
    photoPreview: null
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      
      if (webApp.initDataUnsafe?.user?.id) {
        const tgId = webApp.initDataUnsafe.user.id.toString();
        setTelegramId(tgId);
        setFormData(prev => ({ ...prev, telegramId: tgId }));
        
        // Fetch user's shell balance
        fetch(`/api/user/${tgId}`)
          .then(res => res.json())
          .then(data => setUserShells(data.points || 0))
          .catch(err => console.error('Failed to fetch user balance:', err));
      }
    }
  }, []);

  const steps = [
  {
    title: 'Full Name',
    icon: User,
    field: 'name',
    placeholder: 'e.g., Mike Tyson',
    validation: (val: string) => val.length >= 3,
    errorMsg: 'Name must be at least 3 characters',
  },
  {
    title: 'Age',
    icon: Hash,
    field: 'age',
    type: 'number',
    placeholder: 'e.g., 25',
    validation: (val: number) => val >= 18 && val <= 60,
    errorMsg: 'Age must be between 18 and 60',
  },
  {
    title: 'Gender',
    icon: User,
    field: 'gender',
    type: 'select',
    options: ['Male', 'Female', 'Other'],
    validation: (val: string) => val !== '',
    errorMsg: 'Please select a gender',
  },
  {
    title: 'Height (cm)',
    icon: Ruler,
    field: 'height',
    type: 'number',
    placeholder: 'e.g., 180',
    validation: (val: number) => val >= 140 && val <= 230,
    errorMsg: 'Height must be between 140–230 cm',
  },
  {
    title: 'Weight (kg)',
    icon: Weight,
    field: 'weight',
    type: 'number',
    placeholder: 'e.g., 75',
    validation: (val: number) => val >= 40 && val <= 200,
    errorMsg: 'Weight must be between 40–200 kg',
  },
  {
    title: 'Weight Class',
    icon: Trophy,
    field: 'weightClass',
    type: 'select',
    options: WEIGHT_CLASSES,
    validation: (val: string) => val !== '',
    errorMsg: 'Please select a weight class',
  },
  {
    title: 'Profile Photo',
    icon: Camera,
    field: 'photo',
    type: 'file',
    validation: (_val: File | null) => true, // optional, always valid
    errorMsg: '',
  },
];


  const currentStepData = steps[step];

 const handleInputChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  setError('');
};

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        photo: file,
        photoPreview: reader.result as string,
      }));
      setError('');
    };
    reader.readAsDataURL(file);
  }
};


  const handleNext = () => {
    const current = steps[step];
    const value = formData[current.field];
    
    if (!current.validation(value)) {
      setError(current.errorMsg);
      return;
    }
    
    if (step < steps.length - 1) {
      setStep(step + 1);
      setError('');
    } else {
      // Move to payment selection
      setStep(steps.length);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError('');
    }
  };

  const handlePaymentSelect = (method) => {
    setPaymentMethod(method);
  };

  const handleSubmit = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (paymentMethod === 'stars') {
        // Use the unified Stars API
        const response = await fetch('/api/telegram/stars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'FIGHTER_REGISTRATION',
            telegramId,
            formData: {
              name: formData.name,
              age: parseInt(formData.age),
              gender: formData.gender,
              height: parseFloat(formData.height),
              weight: parseFloat(formData.weight),
              weightClass: formData.weightClass,
              photoPath: formData.photoPreview, // Base64 or URL
            }
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment');
        }

        if (data.invoiceLink) {
          // Redirect to Telegram payment
          window.location.href = data.invoiceLink;
        }

      } else if (paymentMethod === 'shells') {
        // Handle shells payment
        const response = await fetch('/api/fighter/register/shells', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId,
            formData: {
              name: formData.name,
              age: parseInt(formData.age),
              gender: formData.gender,
              height: parseFloat(formData.height),
              weight: parseFloat(formData.weight),
              weightClass: formData.weightClass,
              photoPath: formData.photoPreview,
            }
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = ((step + 1) / (steps.length + 1)) * 100;

  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: "url('/images/bk.jpg')",
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backgroundBlendMode: 'darken'
        }}
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Registration Successful!</h2>
          <p className="text-gray-200 mb-6">
            Your fighter registration has been submitted for review. Our admins will verify your details and you'll receive a confirmation soon.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-4 bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "url('/images/bk.jpg')",
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backgroundBlendMode: 'darken'
      }}
    >
      <div className="max-w-2xl mx-auto pt-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/80 text-sm font-medium">
              Step {step + 1} of {steps.length + 1}
            </span>
            <span className="text-white/80 text-sm font-medium">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
          {step < steps.length ? (
            <>
              {/* Step Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
                  {React.createElement(currentStepData.icon, { className: "w-8 h-8 text-white" })}
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {currentStepData.title}
                </h2>
                <p className="text-gray-300">
                  Please provide your {currentStepData.title.toLowerCase()}
                </p>
              </div>

              {/* Input Field */}
              <div className="mb-6">
                {currentStepData.type === 'select' ? (
                  <div className="grid grid-cols-1 gap-3">
                    {currentStepData.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, [currentStepData.field]: option }));
                          setError('');
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData[currentStepData.field] === option
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-white/20 bg-white/5 text-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : currentStepData.type === 'file' ? (
                  <div className="text-center">
                    <input
                      type="file"
                      id="photo"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo"
                      className="cursor-pointer inline-block"
                    >
                      {formData.photoPreview ? (
                        <div className="relative">
                          <img
                            src={formData.photoPreview}
                            alt="Preview"
                            className="w-48 h-48 object-cover rounded-2xl mx-auto border-4 border-purple-500"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-white font-semibold">Change Photo</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-48 h-48 mx-auto border-4 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center hover:border-purple-500 transition-colors">
                          <Camera className="w-12 h-12 text-white/60 mb-2" />
                          <span className="text-white/80">Upload Photo</span>
                          <span className="text-white/50 text-sm mt-1">(Optional)</span>
                        </div>
                      )}
                    </label>
                  </div>
                ) : (
                  <input
                    type={currentStepData.type || 'text'}
                    name={currentStepData.field}
                    value={formData[currentStepData.field]}
                    onChange={handleInputChange}
                    placeholder={currentStepData.placeholder}
                    className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all text-lg"
                  />
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-200">{error}</span>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                {step > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 bg-white/10 text-white py-4 rounded-xl font-semibold hover:bg-white/20 transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  {step === steps.length - 1 ? 'Continue to Payment' : 'Next'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Payment Selection */}
              <div className="text-center mb-8">
                <DollarSign className="w-16 h-16 text-white mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">
                  Registration Fee
                </h2>
                <p className="text-gray-300">
                  Choose your payment method
                </p>
              </div>

              {/* Payment Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => handlePaymentSelect('stars')}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'stars'
                      ? 'border-yellow-500 bg-yellow-500/20'
                      : 'border-white/20 bg-white/5 hover:border-yellow-400'
                  }`}
                >
                  <div className="text-4xl mb-3">⭐</div>
                  <div className="text-white font-bold text-xl mb-2">
                    {REGISTRATION_COST_STARS} Stars
                  </div>
                  <div className="text-gray-300 text-sm">
                    Pay with Telegram Stars
                  </div>
                </button>

                <button
                  onClick={() => handlePaymentSelect('shells')}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'shells'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 bg-white/5 hover:border-purple-400'
                  }`}
                >
                  <div className="text-4xl mb-3">🐚</div>
                  <div className="text-white font-bold text-xl mb-2">
                    {REGISTRATION_COST_SHELLS.toLocaleString()} Shells
                  </div>
                  <div className="text-gray-300 text-sm">
                    Your balance: {userShells.toLocaleString()}
                  </div>
                  {userShells < REGISTRATION_COST_SHELLS && (
                    <div className="text-red-400 text-xs mt-2">
                      Insufficient balance
                    </div>
                  )}
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-200">{error}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleBack}
                  className="flex-1 bg-white/10 text-white py-4 rounded-xl font-semibold hover:bg-white/20 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (paymentMethod === 'shells' && userShells < REGISTRATION_COST_SHELLS)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Complete Registration'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Summary Card */}
        {step > 0 && step < steps.length && (
          <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-semibold mb-4">Your Information</h3>
            <div className="space-y-2">
              {Object.entries(formData).map(([key, value]) => {
                if (value && key !== 'photo' && key !== 'photoPreview' && key !== 'telegramId') {
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{key}:</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}