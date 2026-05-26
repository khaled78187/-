import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  updateProfile,
  signOut
} from 'firebase/auth';
import { Mail, Lock, User, LogIn, Sparkles, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { auth } from '../lib/firebase';
import { playClickSound } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    playClickSound();
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول عبر Google. حاول مجدداً.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsLoading(true);
    setError(null);

    if (isSignUp && !fullName.trim()) {
      setError('يرجى إدخال اسمك الكريم أولاً.');
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, {
          displayName: fullName
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل.');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور يجب أن لا تقل عن 6 أحرف.');
      } else {
        setError('حدث خرق فني أثناء المصادقة. يرجى مراجعة التفاصيل والمحاولة مجدداً.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl border-2 border-amber-100/50 shadow-2xl w-full max-w-md overflow-hidden relative font-sans text-right flex flex-col"
      >
        {/* Decorative Top Amber Accent Line */}
        <div className="h-2 bg-gradient-to-l from-amber-500 to-orange-500 w-full" />

        {/* Close Button */}
        <button 
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 left-4 p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 md:p-8 space-y-6">
          {/* Header Visual */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-amber-500 text-white rounded-2xl shadow-md mx-auto mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-xl text-gray-900 leading-tight">
              {isSignUp ? 'إنشاء حساب طالب حكيم' : 'موانئ تسجيل الدخول لسقراط'}
            </h3>
            <p className="text-xs text-gray-400">
              {isSignUp ? 'تفقه بعلوم الفكر بمسار سحابي آمن ومستمر لحفظ إنجازاتك' : 'عد لرحلتك المعرفية وزد من رصيد نقاطك ومراكز الصدارة مدمجاً بـ Cloud'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 block">الاسم الكريم</label>
                <div className="relative">
                  <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                  <input 
                    type="text" 
                    placeholder="مثل: عبد الرحمن الجزيري"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full pr-11 pl-4 py-3 rounded-xl border-2 border-gray-100 focus:border-amber-500 focus:outline-none transition-all text-xs text-right font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 block">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                <input 
                  type="email" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pr-11 pl-4 py-3 rounded-xl border-2 border-gray-100 focus:border-amber-500 focus:outline-none transition-all text-xs text-right font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 block">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-11 pl-4 py-3 rounded-xl border-2 border-gray-100 focus:border-amber-500 focus:outline-none transition-all text-xs text-right font-medium"
                />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-start gap-2 "
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:scale-[1.01] active:scale-[0.99] transition-all text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSignUp ? 'إنشاء الحساب والبدء' : 'تسجيل الدخول'}</span>
              <LogIn className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold">أو أكمل بلمسة واحدة</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white border-2 border-gray-150 hover:bg-gray-50 active:scale-[0.98] transition-all text-gray-700 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.567 0-6.46-2.893-6.46-6.46s2.893-6.46 6.46-6.46c1.624 0 3.1.6 4.243 1.586l3.078-3.078C19.124 2.112 15.86 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c5.783 0 10.613-4.173 11-9.715H12.24z"
              />
            </svg>
            <span>متابعة باستخدام حساب Google</span>
          </button>

          {/* Toggle Tab Footer */}
          <p className="text-center text-xs text-gray-400 font-medium">
            {isSignUp ? 'هل لديك حساب بالفعل؟' : 'ليس لديك عضوية بعد؟'}{' '}
            <button
              onClick={() => {
                playClickSound();
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              type="button"
              className="text-amber-600 hover:text-amber-700 font-extrabold cursor-pointer border-b border-dashed border-amber-600/40 hover:border-amber-700/60 pb-0.5"
            >
              {isSignUp ? 'سجل دخولك الآن' : 'قم بإنشاء حساب تفاعلي'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
