"use client";
import React, { useState, useEffect } from 'react';
import { Camera, User, Ruler, Weight, Trophy, Hash, DollarSign, Check, ChevronLeft, AlertCircle, Zap, ShieldCheck } from 'lucide-react';

const REGISTRATION_COST_STARS = 500;
const REGISTRATION_COST_SHELLS = 1000000;

const WEIGHT_CLASSES = [
  'Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight',
  'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight'
];

type PaymentMethod = "stars" | "shells";

interface Step {
  title: string;
  icon: any;
  field: keyof FighterFormData;
  type?: string;
  placeholder?: string;
  options?: string[];
  validation: (val: any) => boolean;
  errorMsg: string;
}

interface FighterFormData {
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  weightClass: string;
  telegramId: string;
  photo: File | null;
  photoPreview: string | null;
}

export default function FighterRegistration() {
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [userShells, setUserShells] = useState(0);

  const [formData, setFormData] = useState<FighterFormData>({
    name: '', age: '', gender: '', height: '', weight: '',
    weightClass: '', telegramId: '', photo: null, photoPreview: null,
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
        fetch(`/api/user/${tgId}`).then(res => res.json()).then(data => setUserShells(data.points || 0));
      }
    }
  }, []);

  const steps: Step[] = [
    { title: 'Ring Name', icon: User, field: 'name', placeholder: 'e.g., IRON MIKE', validation: (val: string) => val.length >= 3, errorMsg: 'Name must be at least 3 characters' },
    { title: 'Fighter Age', icon: Hash, field: 'age', type: 'number', placeholder: '18-60', validation: (val: number) => val >= 18 && val <= 60, errorMsg: 'Age must be 18-60' },
    { title: 'Gender', icon: User, field: 'gender', type: 'select', options: ['Male', 'Female'], validation: (val: string) => val !== '', errorMsg: 'Select gender' },
    { title: 'Height (cm)', icon: Ruler, field: 'height', type: 'number', placeholder: '140-230', validation: (val: number) => val >= 140 && val <= 230, errorMsg: 'Range 140-230 cm' },
    { title: 'Weight (kg)', icon: Weight, field: 'weight', type: 'number', placeholder: '40-200', validation: (val: number) => val >= 40 && val <= 200, errorMsg: 'Range 40-200 kg' },
    { title: 'Weight Class', icon: Trophy, field: 'weightClass', type: 'select', options: WEIGHT_CLASSES, validation: (val: string) => val !== '', errorMsg: 'Select class' },
    { title: 'Battle Entry Photo', icon: Camera, field: 'photo', type: 'file', validation: () => true, errorMsg: '' },
  ];

  const currentStepData = steps[step];
  const progressPercentage = ((step + 1) / (steps.length + 1)) * 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSelectOption = (field: keyof FighterFormData, option: string) => {
    setFormData(prev => ({ ...prev, [field]: option }));
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size < 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photo: file, photoPreview: reader.result as string }));
      reader.readAsDataURL(file);
    } else {
      setError('Photo must be < 5MB');
    }
  };

  const handleNext = () => {
    if (!steps[step].validation(formData[steps[step].field])) {
      setError(steps[step].errorMsg);
      return;
    }
    setStep(s => s + 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!paymentMethod) return setError('Select payment method');
    setIsSubmitting(true);
    try {
      const endpoint = paymentMethod === 'stars' ? '/api/telegram/stars' : '/api/fighter/register/shells';
      const body = { type: 'FIGHTER_REGISTRATION', telegramId, formData: { ...formData, age: Number(formData.age), height: Number(formData.height), weight: Number(formData.weight) } };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (data.invoiceLink) window.location.href = data.invoiceLink; else setSuccess(true);
    } catch (err: any) { setError(err.message); } finally { setIsSubmitting(false); }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <div className="text-center animate-in zoom-in duration-300">
        <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
          <ShieldCheck className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-4xl font-black italic mb-4 tracking-tighter uppercase">Fighter Verified</h2>
        <p className="text-zinc-400 max-w-xs mx-auto mb-8 uppercase tracking-widest text-xs">Awaiting official sanctioning by the high table.</p>
        <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-white text-black font-black uppercase skew-x-[-10deg] hover:bg-red-600 hover:text-white transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-red-600">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(220,38,38,0.15)_0%,_rgba(0,0,0,0)_50%)]" />
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 pt-10 pb-20">
        {/* Header */}
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Registration</h1>
            <p className="text-red-600 text-[10px] font-bold uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
              <Zap className="w-3 h-3 fill-current" /> Sage Combat League
            </p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Progress</span>
            <span className="text-xl font-black italic text-zinc-300 tracking-tighter">{Math.round(progressPercentage)}%</span>
          </div>
        </div>

        {/* Dynamic Fighter Preview (Shows once name is entered) */}
        {formData.name && step < steps.length && (
            <div className="mb-8 p-4 bg-zinc-900 border-l-4 border-red-600 rounded-r-xl animate-in slide-in-from-right duration-500">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
                        {formData.photoPreview ? <img src={formData.photoPreview} className="object-cover" /> : <User className="text-zinc-600" />}
                    </div>
                    <div>
                        <h4 className="font-black italic uppercase tracking-tighter text-sm">{formData.name || 'Unknown Fighter'}</h4>
                        <div className="flex gap-3 text-[10px] font-bold text-zinc-500 uppercase">
                            <span>{formData.weightClass || 'Unclassed'}</span>
                            <span className="text-red-600">•</span>
                            <span>{formData.age ? `${formData.age} YRS` : '--'}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Form Container */}
        <div className="min-h-[400px]">
          {step < steps.length ? (
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <currentStepData.icon className="w-5 h-5 text-red-600" />
                   <h2 className="text-lg font-black uppercase tracking-widest italic text-zinc-400">{currentStepData.title}</h2>
                </div>
                
                {currentStepData.type === 'select' ? (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {currentStepData.options?.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleSelectOption(currentStepData.field, opt)}
                        className={`py-4 px-2 text-xs font-black uppercase tracking-widest border transition-all ${
                          formData[currentStepData.field] === opt 
                          ? 'bg-red-600 border-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                          : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : currentStepData.type === 'file' ? (
                  <label className="mt-4 flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50 hover:bg-zinc-900 transition-all cursor-pointer group">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    {formData.photoPreview ? (
                        <img src={formData.photoPreview} className="h-full w-full object-cover rounded-[1.4rem]" />
                    ) : (
                        <>
                            <Camera className="w-12 h-12 text-zinc-700 group-hover:text-red-600 transition-colors mb-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Deploy Combat Image</span>
                        </>
                    )}
                  </label>
                ) : (
                  <input
                    autoFocus
                    type={currentStepData.type || 'text'}
                    name={currentStepData.field}
                    value={(formData[currentStepData.field] as string) || ''}
                    onChange={(e: any) => handleInputChange(e)}
                    placeholder={currentStepData.placeholder}
                    className="w-full bg-zinc-900 border-b-2 border-zinc-800 p-6 text-2xl font-black italic tracking-tighter uppercase focus:outline-none focus:border-red-600 transition-all placeholder:text-zinc-800"
                  />
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              {/* Nav */}
              <div className="flex gap-4 pt-10">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)} className="p-5 bg-zinc-900 text-zinc-500 rounded-2xl hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                <button onClick={handleNext} className="flex-1 bg-white text-black font-black uppercase italic tracking-tighter text-xl p-5 shadow-xl active:scale-[0.98] transition-transform flex justify-between items-center group">
                  {step === steps.length - 1 ? 'Finalize' : 'Next Phase'}
                  <Zap className="w-5 h-5 fill-black group-hover:animate-bounce" />
                </button>
              </div>
            </div>
          ) : (
            /* Payment Phase */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
                <div className="text-center">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Sanctioning Fee</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Select your currency of choice</p>
                </div>

                <div className="grid gap-4">
                    <button 
                        onClick={() => setPaymentMethod('stars')}
                        className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'stars' ? 'border-yellow-500 bg-yellow-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-2xl">⭐</div>
                            <div className="text-left leading-none">
                                <span className="block font-black italic uppercase tracking-tighter text-xl">{REGISTRATION_COST_STARS} Stars</span>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">Telegram Direct</span>
                            </div>
                        </div>
                        {paymentMethod === 'stars' && <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"><Check className="w-4 h-4 text-black" /></div>}
                    </button>

                    <button 
                        disabled={userShells < REGISTRATION_COST_SHELLS}
                        onClick={() => setPaymentMethod('shells')}
                        className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'shells' ? 'border-red-600 bg-red-600/5' : 'border-zinc-800 bg-zinc-900/50'} disabled:opacity-40`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-2xl">🐚</div>
                            <div className="text-left leading-none">
                                <span className="block font-black italic uppercase tracking-tighter text-xl">{REGISTRATION_COST_SHELLS.toLocaleString()} Shells</span>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">Balance: {userShells.toLocaleString()}</span>
                            </div>
                        </div>
                        {paymentMethod === 'shells' && <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>}
                    </button>
                </div>

                <div className="flex gap-4 pt-10">
                    <button onClick={() => setStep(steps.length - 1)} className="p-5 bg-zinc-900 text-zinc-500 rounded-2xl">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !paymentMethod}
                        className="flex-1 bg-red-600 text-white font-black uppercase italic tracking-tighter text-xl p-5 shadow-[0_0_30px_rgba(220,38,38,0.2)] active:scale-[0.98] transition-all disabled:grayscale"
                    >
                        {isSubmitting ? 'Verifying...' : 'Authorize Registration'}
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}