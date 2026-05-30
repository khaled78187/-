import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Crown, Flame, BookOpen, CreditCard, ShieldCheck, Sparkles, Send, Phone } from 'lucide-react';
import { playSuccessSound, playClickSound } from '../utils/audio';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (planType: 'monthly' | 'yearly') => void;
}

export default function SubscriptionModal({ isOpen, onClose, onActivate }: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRealStripeCheckout = async () => {
    playClickSound();
    setStripeLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: selectedPlan,
          userId: localStorage.getItem('socrates_user_uid') || 'anonymous',
        }),
      });

      const data = await response.json();

      if (data.error === 'STRIPE_NOT_CONFIGURED') {
        setErrorMessage(
          'تنبيه: بوابة الدفع الحقيقية بحاجة لربط مفتاح Stripe السرّي (STRIPE_SECRET_KEY) في إعدادات البيئة لتعمل بشكل كامل. يمكنك المتابعة عبر التفعيل الافتراضي المجاني أدناه!'
        );
        setStripeLoading(false);
        return;
      }

      if (data.url) {
        // Redirect to safe payment gateway hosted by Stripe
        window.location.href = data.url;
      } else {
        throw new Error(data.message || 'فشل الاتصال بخادم Stripe');
      }
    } catch (err: any) {
      console.error('Error initiating stripe checkout:', err);
      setErrorMessage(err.message || 'حدث خطأ غير متوقع أثناء الانتقال لبوابة الدفع.');
      setStripeLoading(false);
    }
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsProcessing(true);

    // Simulate safe API gateway delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      playSuccessSound();
      
      setTimeout(() => {
        onActivate(selectedPlan);
        onClose();
        // Reset states
        setIsSuccess(false);
        setCardNumber('');
        setCardName('');
        setCardExpiry('');
        setCardCvv('');
      }, 2000);
    }, 1800);
  };

  const instantSandboxActivate = () => {
    playClickSound();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      playSuccessSound();
      
      setTimeout(() => {
        onActivate(selectedPlan);
        onClose();
        setIsSuccess(false);
      }, 1500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-right" dir="rtl" id="subscription-modal-wrapper">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden border border-amber-200 shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-2 left-2">
            <button 
              onClick={onClose}
              className="text-white bg-white/15 hover:bg-white/25 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <Crown className="w-48 h-48" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
              <span>الترقية الحكيمة الفائقة</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black">اشتراك "سقراط بلس 👑"</h2>
            <p className="text-xs text-amber-100 font-sans">افتح جميع آفاق الحكمة والمعرفة الذكية بدون قيود</p>
          </div>
        </div>

        {/* Scrollable Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl animate-bounce">
                👑
              </div>
              <h3 className="text-xl font-extrabold text-emerald-800">مبارك عليكم الانضمام لنخبة الحكماء!</h3>
              <p className="text-sm text-emerald-600 max-w-md mx-auto leading-relaxed">
                تم تفعيل باقة اشتراك "سقراط بلس" بنجاح! تم فتح ميزة تحليل الكتب السحابية والقلوب اللانهائية لخوض رحلة فكرية وتفقه فلسفي مميز.
              </p>
              <div className="w-12 h-1 bg-emerald-500 rounded-full animate-pulse mx-auto mt-2" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Features Comparison */}
              <div className="space-y-5">
                <h3 className="font-extrabold text-sm text-gray-800 border-b pb-2">مزايا العضوية المتميزة</h3>
                
                <ul className="space-y-3.5 text-xs text-gray-700 font-bold">
                  <li className="flex items-center gap-3 justify-start">
                    <span className="bg-emerald-100 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                    <span>🗺️ اللعب مجاناً وحرية الملاحة في خريطة الحكمة</span>
                  </li>
                  <li className="flex items-center gap-3 justify-start">
                    <span className="bg-amber-100 text-amber-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      👑
                    </span>
                    <span className="text-amber-700 font-black">❤️ قلوب لانهائية في جميع دروسك ومراجعاتك</span>
                  </li>
                  <li className="flex items-center gap-3 justify-start">
                    <span className="bg-amber-100 text-amber-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      <BookOpen className="w-3 h-3" />
                    </span>
                    <span className="text-blue-900 font-black">📚 تشغيل ميزة تحليل كتب الـ PDF وتحويلها تلقائياً لفصول تفاعلية</span>
                  </li>
                  <li className="flex items-center gap-3 justify-start">
                    <span className="bg-amber-100 text-amber-700 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      💡
                    </span>
                    <span>🤖 استجابات سريعة وأدوات تحليل جدلية غير محدودة مع سقراط</span>
                  </li>
                </ul>

                {/* Plan Selection Buttons */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs text-gray-400 font-black">اختر باقة الاشتراك المناسبة:</h4>
                  <div className="grid grid-cols-2 gap-3" id="plan-selection">
                    
                    {/* Monthly */}
                    <button
                      type="button"
                      onClick={() => { playClickSound(); setSelectedPlan('monthly'); }}
                      className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        selectedPlan === 'monthly'
                          ? 'border-amber-500 bg-amber-50/50 text-amber-900 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="block text-[10px] text-gray-400 font-black">الاشتراك الشهري</span>
                      <strong className="block text-base font-extrabold text-gray-800 mt-1">29 ريال <span className="text-xs font-normal">/شهر</span></strong>
                      <span className="text-[9px] text-emerald-600 block mt-1 font-sans">تذكرة دراسة مرنة</span>
                    </button>

                    {/* Yearly */}
                    <button
                      type="button"
                      onClick={() => { playClickSound(); setSelectedPlan('yearly'); }}
                      className={`p-3.5 rounded-2xl border-2 text-center relative transition-all cursor-pointer ${
                        selectedPlan === 'yearly'
                          ? 'border-amber-500 bg-amber-50 hover:bg-amber-50 text-amber-900 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="absolute -top-2.5 right-1/2 translate-x-1/2 bg-rose-500 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                        خصم %40 🔥
                      </span>
                      <span className="block text-[10px] text-gray-400 font-black mt-1">الاشتراك السنوي</span>
                      <strong className="block text-base font-extrabold text-gray-800 mt-1">199 ريال <span className="text-xs font-normal">/سنة</span></strong>
                      <span className="text-[9px] text-rose-600 block mt-1 font-bold">يكافئ 16 ريال شهرياً!</span>
                    </button>

                  </div>
                </div>
              </div>

              {/* Direct Dev Contact section */}
              <div className="bg-amber-50/30 p-5 rounded-2xl border-2 border-dashed border-amber-200/80 space-y-4">
                {errorMessage && (
                  <div className="bg-amber-50 text-amber-900 border border-amber-300 p-3 rounded-xl text-[11px] font-bold leading-relaxed text-right">
                    ⚠️ {errorMessage}
                  </div>
                )}

                {/* Real Payment Trigger */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-start font-bold text-gray-700 text-xs shadow-2xs bg-white p-2.5 rounded-xl border border-amber-200">
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-amber-900 font-black">للاشتراك تواصل مع المطور شخصياً 💬</span>
                  </div>

                  <p className="text-[10px] text-gray-400 leading-normal">
                    الرجاء التواصل مع المطور لتفعيل اشتراكك الفلسفي الفردي وتجهيز حسابك لباقة "سقراط بلس" الملكية فوراً:
                  </p>

                  <div className="space-y-3 pt-1">
                    <a
                      href="https://t.me/Kiki40100"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playClickSound();
                      }}
                      className="flex items-center justify-between p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all cursor-pointer text-sky-900 group"
                    >
                      <div className="flex items-center gap-2.5 flex-row-reverse text-right">
                        <div className="p-1.5 bg-sky-500 text-white rounded-lg">
                          <Send className="w-4 h-4" />
                        </div>
                        <div className="text-right flex-1 min-w-[120px]">
                          <span className="block text-[10px] text-sky-705 font-black">حساب التليجرام</span>
                          <strong className="block text-xs font-mono">@Kiki40100</strong>
                        </div>
                      </div>
                      <span className="text-[10px] bg-sky-500 text-white px-2.5 py-1 rounded-full font-black group-hover:scale-105 transition-transform">مراسلتي</span>
                    </a>

                    <a
                      href="https://wa.me/967781772478"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playClickSound();
                      }}
                      className="flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer text-emerald-900 group"
                    >
                      <div className="flex items-center gap-2.5 flex-row-reverse text-right">
                        <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="text-right flex-1 min-w-[120px]">
                          <span className="block text-[10px] text-emerald-705 font-black">رقم الواتساب</span>
                          <strong className="block text-xs font-mono">781772478</strong>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-full font-black group-hover:scale-105 transition-transform font-bold">تواصل واتس</span>
                    </a>
                  </div>

                  <button
                    style={{ display: 'none' }}
                    type="button"
                    onClick={handleRealStripeCheckout}
                    disabled={stripeLoading || isProcessing}
                    className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-55 flex items-center justify-center gap-1.5"
                  >
                    {stripeLoading ? 'جاري التحضير لبوابة Stripe...' : `تشغيل الدفع الحقيقي (${selectedPlan === 'monthly' ? '29 ريال / شهر' : '199 ريال / سنة'}) 👑`}
                  </button>
                </div>

              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between text-[10px] text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>نظام تعاقد تعليمي آمن وخير علمي عام</span>
          </div>
          <span>مؤسسة سقراط الدولية</span>
        </div>
      </motion.div>
    </div>
  );
}
