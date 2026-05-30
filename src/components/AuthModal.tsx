import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { AlertCircle, X } from 'lucide-react';
import { auth } from '../lib/firebase';
import { playClickSound, playSuccessSound } from '../utils/audio';
import socratesAppIcon from '../assets/images/socrates_app_icon_1779976695367.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
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
      playSuccessSound();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('طريقة تسجيل الدخول باستخدام Google غير مفعّلة في مشروع الـ Firebase الخاص بك.');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول عبر Google. حاول مجدداً.');
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
        className="bg-white rounded-3xl border-2 border-amber-100/50 shadow-2xl w-full max-w-sm overflow-hidden relative font-sans text-right flex flex-col"
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
            <div className="inline-flex w-16 h-16 bg-amber-50 rounded-3xl overflow-hidden border-2 border-amber-400 shadow-md mx-auto mb-2 flex items-center justify-center transition-transform hover:scale-105 duration-300">
              <img src={socratesAppIcon} alt="سقراط الحكيم" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h3 className="font-extrabold text-base text-gray-900 leading-tight">
              تسجيل الدخول الآمن لسقراط 🏛️
            </h3>
            <p className="text-xs text-gray-400">
              احفظ تقدمك الفلسفي وموقع شجرة المعرفة مباشرةً على خوادم السحاب لمزاولتها من أي جهاز!
            </p>
          </div>

          {/* Premium Info Badge instead of Free claim */}
          <div className="bg-gradient-to-r from-amber-50/40 to-orange-50/30 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-2.5 flex-row-reverse text-right">
            <div className="text-lg shrink-0">👑</div>
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-[11px] text-amber-800">العضوية الممتازة بسقراط بلس</h4>
              <p className="text-[10px] text-amber-600 leading-normal">
                برنامج سقراط الفلسفي يتضمن باقة اشتراك مدفوعة ومميزة، حيث يتيح لك فتح سائر الأبواب الفكرية والقلوب اللانهائية وصانع الكتب المخصص.
              </p>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-start gap-2 relative overflow-hidden text-right"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-slate-950 hover:scale-[1.01] active:scale-[0.99] transition-all text-white font-black py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#FFFFFF"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.567 0-6.46-2.893-6.46-6.46s2.893-6.46 6.46-6.46c1.624 0 3.1.6 4.243 1.586l3.078-3.078C19.124 2.112 15.86 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c5.783 0 10.613-4.173 11-9.715H12.24z"
              />
            </svg>
            <span>{isLoading ? 'جاري الاتصال بالسحاب...' : 'متابعة باستخدام حساب Google'}</span>
          </button>

          <p className="text-center text-[10px] text-gray-400 font-medium">
            تأمين الحسابات مدمج ببروتوكولات المصادقة الرسمية لشركة Google.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
