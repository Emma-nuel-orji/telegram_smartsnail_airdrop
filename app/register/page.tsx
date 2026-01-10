"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, Ruler, Weight, Trophy, Hash, Check, ChevronLeft, AlertCircle, Zap, ShieldCheck, Download, Share2, X } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import Link from 'next/link';
// --- CONSTANTS ---
const REGISTRATION_COST_STARS = 1362;
const REWARD_SHELLS = 250000;
const REGISTRATION_COST_SHELLS = 1000000;

const WEIGHT_CLASSES = [
  'Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight',
  'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight'
];

// --- TYPES ---
type PaymentMethod = "stars" | "shells";
type HeightUnit = "cm" | "ft";

interface FighterFormData {
  name: string; age: string; gender: string; height: string; weight: string;
  weightClass: string; telegramId: string; photo: File | null; photoPreview: string | null;
  team?: string;
}

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

export default function FighterRegistration() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [userShells, setUserShells] = useState(0);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [ftValue, setFtValue] = useState('');
  const [inValue, setInValue] = useState('');

  const [formData, setFormData] = useState<FighterFormData>({
    name: '', age: '', gender: '', height: '', weight: '',
    weightClass: '', telegramId: '', photo: null, photoPreview: null,
  });

  // --- STEPS CONFIGURATION ---
  const steps: Step[] = [
    { title: 'Ring Name', icon: User, field: 'name', placeholder: 'e.g., IRON MIKE', validation: (val: string) => val.length >= 3, errorMsg: 'Name must be at least 3 characters' },
    { title: 'Fighter Age', icon: Hash, field: 'age', type: 'number', placeholder: '18-60', validation: (val: any) => Number(val) >= 18 && Number(val) <= 60, errorMsg: 'Age must be between 18 and 60' },
    { title: 'Gender', icon: User, field: 'gender', type: 'select', options: ['Male', 'Female'], validation: (val: any) => val !== '', errorMsg: 'Please select a gender' },
    { title: `Height`, icon: Ruler, field: 'height', type: 'height', placeholder: '140-230', validation: (val: any) => Number(val) >= 140 && Number(val) <= 230, errorMsg: 'Height must be 140-230cm' },
    { title: 'Weight (kg)', icon: Weight, field: 'weight', type: 'number', placeholder: '40-200', validation: (val: any) => Number(val) >= 40 && Number(val) <= 200, errorMsg: 'Weight must be 40-200kg' },
    { title: 'Weight Class', icon: Trophy, field: 'weightClass', type: 'select', options: WEIGHT_CLASSES, validation: (val: any) => val !== '', errorMsg: 'Select weight class' },
    { title: 'Battle Entry Photo', icon: Camera, field: 'photo', type: 'file', validation: () => formData.photo !== null, errorMsg: 'A photo is required' },
  ];

  const currentStepData = steps[step];
  const progressPercentage = ((step + 1) / (steps.length + 1)) * 100;

  // --- INITIALIZATION ---
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const webApp = (window as any).Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      if (webApp.initDataUnsafe?.user?.id) {
        const tgId = webApp.initDataUnsafe.user.id.toString();
        setTelegramId(tgId);
        setFormData(prev => ({ ...prev, telegramId: tgId }));
        
        fetch(`/api/user/${tgId}`)
          .then(res => res.json())
          .then(data => {
            setUserShells(data.points || 0);
            if (data.fighter?.team) setFormData(p => ({...p, team: data.fighter.team}));
          })
          .catch(() => {});
      }
    }
  }, []);

  // --- HEIGHT CONVERSION ---
  const convertFtInToCm = (ft: string, inches: string): number => {
    const feet = Number(ft) || 0;
    const inch = Number(inches) || 0;
    return Math.round((feet * 30.48) + (inch * 2.54));
  };

  useEffect(() => {
    if (heightUnit === 'ft' && (ftValue || inValue)) {
      const cm = convertFtInToCm(ftValue, inValue);
      setFormData(prev => ({ ...prev, height: cm.toString() }));
    }
  }, [ftValue, inValue, heightUnit]);

  // --- HANDLERS ---
  const handleCancel = () => {
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.close();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be smaller than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: file, photoPreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    const currentValue = formData[currentStepData.field];
    if (!currentStepData.validation(currentValue)) {
      setError(currentStepData.errorMsg);
      return;
    }
    setStep(s => s + 1);
    setError('');
  };

  const shareToStory = async () => {
    if (!cardRef.current) return;
    setIsSubmitting(true);
    try {
      const dataUrl = await toJpeg(cardRef.current, { quality: 0.95 });
      const uploadRes = await fetch('/api/fighter/upload-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, telegramId })
      });
      const { publicUrl } = await uploadRes.json();
      const webApp = (window as any).Telegram?.WebApp;
      if (webApp?.shareToStory) {
        webApp.shareToStory(publicUrl, {
          text: `🥊 I just signed my contract with PolyCombat!`,
          widget_link: { url: `https://t.me/SmartSnailsBot/app?startapp=ref_${telegramId}`, name: "Join My League" }
        });
      }
    } catch (err) { setError("Failed to share."); } 
    finally { setIsSubmitting(false); }
  };

  const downloadCard = async () => {
    if (cardRef.current === null) return;
    const dataUrl = await toJpeg(cardRef.current, { quality: 0.95 });
    const link = document.createElement('a');
    link.download = `POLYCOMBAT-${formData.name}.jpeg`;
    link.href = dataUrl;
    link.click();
  };

  const handleSubmit = async () => {
    if (!paymentMethod) return setError('Select payment method');
    setIsSubmitting(true);
    try {
      const cardImageBase64 = cardRef.current ? await toJpeg(cardRef.current, { quality: 0.7 }) : null;
      const endpoint = paymentMethod === 'stars' ? '/api/telegram/stars' : '/api/fighter/register/shells';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'FIGHTER_REGISTRATION', 
          telegramId, 
          cardImage: cardImageBase64,
          formData: { ...formData, age: Number(formData.age), height: Number(formData.height), weight: Number(formData.weight) } 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      
      if (data.invoiceLink) {
        (window as any).Telegram.WebApp.openInvoice(data.invoiceLink, (status: string) => {
          if (status === 'paid') setSuccess(true);
        });
      } else {
        setSuccess(true);
      }
    } catch (err: any) { setError(err.message); } 
    finally { setIsSubmitting(false); }
  };

  // --- RENDER SUCCESS ---
  if (success) return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center space-y-6">
      <div className="text-center">
        <ShieldCheck className="w-12 h-12 text-purple-400 mx-auto mb-2" />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Verified Fighter</h2>
        <p className="text-[12px] text-purple-400 font-bold uppercase tracking-widest animate-pulse">+{REWARD_SHELLS.toLocaleString()} Shells Credited</p>
      </div>
      <div ref={cardRef} className="relative w-72 h-[440px] bg-[#050505] border-2 border-purple-600 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.4)]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,_#a855f7_0%,_transparent_70%)]" />
        <div className="absolute top-4 right-4 z-20">
          {formData.team ? <div className="bg-white text-black text-[9px] font-black px-2 py-1 uppercase italic rounded-sm border-l-4 border-purple-600">{formData.team}</div> : <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest bg-black/50 px-2 py-1 rounded-full border border-white/10 backdrop-blur-md">Pending...</div>}
        </div>
        <div className="relative z-10 p-4 flex justify-between items-center">
          <div className="bg-purple-600 text-white text-[8px] font-black px-2 py-0.5 italic uppercase skew-x-[-10deg]">POLYCOMBAT</div>
           <Zap className="w-4 h-4 text-purple-400 fill-current" />
        </div>
        <div className="h-52 w-full bg-zinc-900 mt-2 overflow-hidden relative">
          {formData.photoPreview && <img src={formData.photoPreview} className="w-full h-full object-cover grayscale contrast-125" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        </div>
        <div className="p-5 text-center relative z-10">
          <h3 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-1">{formData.name}</h3>
          <p className="text-purple-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">{formData.weightClass}</p>
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div><span className="block text-[7px] text-zinc-500 uppercase font-black tracking-widest">Height</span><span className="text-sm font-black italic">{formData.height} CM</span></div>
            <div><span className="block text-[7px] text-zinc-500 uppercase font-black tracking-widest">Weight</span><span className="text-sm font-black italic">{formData.weight} KG</span></div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={shareToStory} className="w-full bg-purple-600 text-white p-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-purple-500 transition-colors"><Share2 className="w-4 h-4" /> Share to Story</button>
        <button onClick={downloadCard} className="w-full bg-white text-black p-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"><Download className="w-4 h-4" /> Save Contract</button>
      </div>
    </div>
  );

  // --- RENDER FORM ---
  return (
     <div className="min-h-screen bg-[#070707] text-zinc-100 p-4 selection:bg-purple-500">
      <div className="relative z-10 max-w-xl mx-auto pt-4 pb-20">
        {/* <Link href="/"><ChevronLeft size={28} /></Link> */}
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-8">
             <Link href="/"><ChevronLeft size={28} /></Link>
            <div className="bg-purple-600/20 border border-purple-500/40 px-4 py-2 rounded-full animate-pulse">
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Refistration Reward: {REWARD_SHELLS.toLocaleString()} Shells</span>
            </div>
        </div>

        <div className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none text-white">Registration</h1>
          <p className="text-purple-500 text-[11px] font-bold uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
            <Zap className="w-4 h-4 fill-current" /> Become a Polycombat fighter
          </p>
          </div>
          <div className="text-right">
            <span className="text-xl font-black italic text-zinc-300 tracking-tighter">{Math.round(progressPercentage)}%</span>
          </div>
        </div>

        {formData.name && step < steps.length && (
          <div className="mb-8 p-4 bg-zinc-900 border-l-4 border-purple-600 rounded-r-xl animate-in slide-in-from-right">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center overflow-hidden border border-purple-500/20">
                {formData.photoPreview ? <img src={formData.photoPreview} className="object-cover h-full w-full" /> : <User className="text-zinc-600 w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-black italic uppercase tracking-tighter text-sm">{formData.name}</h4>
                <p className="text-[10px] font-bold text-zinc-500 uppercase">{formData.weightClass || 'Awaiting Specs...'}</p>
              </div>
            </div>
          </div>
        )}

        {step < steps.length ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-600 rounded-lg">
                <currentStepData.icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-black uppercase italic text-zinc-200">{currentStepData.title}</h2>
            </div>
            {currentStepData.type === 'select' ? (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {currentStepData.options?.map((opt) => (
                  <button key={opt} onClick={() => setFormData(p => ({...p, [currentStepData.field]: opt}))} className={`py-5 px-2 text-xs font-black uppercase tracking-widest border-2 transition-all rounded-xl ${formData[currentStepData.field] === opt ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>{opt}</button>
                ))}
              </div>
            ) : currentStepData.type === 'file' ? (
               <label className="mt-4 flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-purple-900/50 rounded-3xl bg-zinc-900/30 cursor-pointer overflow-hidden group">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                {formData.photoPreview ? <img src={formData.photoPreview} className="h-full w-full object-cover" /> : <Camera className="w-16 h-16 text-purple-600 group-hover:scale-110 transition-transform" />}
              </label>
            ) : currentStepData.type === 'height' ? (
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setHeightUnit('cm')} className={`px-6 py-2 rounded-xl font-black uppercase text-xs transition-all ${heightUnit === 'cm' ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>CM</button>
                  <button onClick={() => setHeightUnit('ft')} className={`px-6 py-2 rounded-xl font-black uppercase text-xs transition-all ${heightUnit === 'ft' ? 'bg-purple-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>FT/IN</button>
                </div>
                {heightUnit === 'cm' ? (
                  <input autoFocus type="number" name="height" value={formData.height} onChange={handleInputChange} placeholder="e.g., 175" className="w-full bg-transparent border-b-4 border-zinc-800 p-4 text-3xl font-black italic uppercase focus:border-purple-600 outline-none transition-all placeholder:text-zinc-900 text-white" />
                ) : (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-zinc-500 font-black uppercase mb-2 block">Feet</label>
                      <input autoFocus type="number" value={ftValue} onChange={(e) => setFtValue(e.target.value)} placeholder="6" className="w-full bg-transparent border-b-4 border-zinc-800 p-4 text-3xl font-black italic uppercase focus:border-purple-600 outline-none transition-all placeholder:text-zinc-900 text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-zinc-500 font-black uppercase mb-2 block">Inches</label>
                      <input type="number" value={inValue} onChange={(e) => setInValue(e.target.value)} placeholder="5" className="w-full bg-transparent border-b-4 border-zinc-800 p-4 text-3xl font-black italic uppercase focus:border-purple-600 outline-none transition-all placeholder:text-zinc-900 text-white" />
                    </div>
                  </div>
                )}
                {heightUnit === 'ft' && formData.height && (
                  <p className="text-xs text-purple-400 font-bold">≈ {formData.height} cm</p>
                )}
              </div>
            ) : (
               <input autoFocus type={currentStepData.type || 'text'} name={currentStepData.field} value={(formData[currentStepData.field] as string) || ''} onChange={handleInputChange} placeholder={currentStepData.placeholder} className="w-full bg-transparent border-b-4 border-zinc-800 p-4 text-3xl font-black italic uppercase focus:border-purple-600 outline-none transition-all placeholder:text-zinc-900 text-white" />
            )}
            
            {error && <div className="text-red-500 text-[11px] font-black uppercase flex items-center gap-2 animate-bounce"><AlertCircle className="w-4 h-4" /> {error}</div>}
            
            <div className="flex gap-4 pt-10">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} className="p-5 bg-zinc-900 text-zinc-500 rounded-2xl hover:text-white transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <button onClick={handleNext} className="w-full bg-white text-black font-black uppercase italic text-xl p-6 rounded-2xl flex justify-between items-center active:scale-95 transition-all shadow-xl">
                {step === steps.length - 1 ? 'Finalize Profile' : 'Next Phase'} <Zap className="w-6 h-6 fill-purple-600 text-purple-600" />
            </button>
            </div>
          </div>
        ) : (
          /* Payment Screen with Reward Reminder */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="text-center p-6 bg-purple-950/20 border border-purple-500/30 rounded-3xl">
                <h2 className="text-3xl font-black italic uppercase text-white mb-2">Sanctioning Fee</h2>
                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Pay to unlock your {REWARD_SHELLS.toLocaleString()} shells reward</p>
            </div>
            
            <div className="grid gap-4">
               <button onClick={() => setPaymentMethod('stars')} className={`w-full flex items-center justify-between p-7 rounded-3xl border-2 transition-all ${paymentMethod === 'stars' ? 'border-purple-500 bg-purple-600/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-zinc-800 bg-zinc-900/50'}`}>
                <div className="flex items-center gap-4"><div className="text-3xl">⭐</div><div className="text-left"><span className="block font-black italic uppercase text-2xl text-white">{REGISTRATION_COST_STARS} Stars</span><span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Immediate Approval</span></div></div>
                {paymentMethod === 'stars' && <Check className="w-8 h-8 text-purple-500" strokeWidth={4} />}
            </button>
            </div>

            <div className="flex gap-4 pt-10">
                <button onClick={() => setStep(steps.length - 1)} className="p-5 bg-zinc-900 text-zinc-500 rounded-2xl">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting || !paymentMethod} className="w-full bg-purple-600 text-white font-black uppercase italic text-2xl p-6 rounded-2xl disabled:opacity-50 shadow-2xl active:scale-95 transition-all">
                {isSubmitting ? 'Verifying...' : 'Authorize & Join'}
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}