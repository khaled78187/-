import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Settings, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Check, 
  ShieldAlert, 
  Tv,
  PenTool, 
  RotateCcw,
  Sparkles,
  Database,
  UserCheck,
  Award,
  Copy,
  Crown,
  Shirt,
  ShoppingBag,
  Lock,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { updateProfile, signOut, User as FirebaseUser } from 'firebase/auth';
import { saveUserProgress, getUserProgress, resetUserProgress } from '../lib/userService';
import { playClickSound } from '../utils/audio';
import { UserProgress } from '../types';
import AchievementsGrid from './AchievementsGrid';

interface UserProfileProps {
  currentUser: FirebaseUser | null;
  userXp: number;
  hearts: number;
  streak: number;
  completedLessons: string[];
  completedNodes: string[];
  weeklyActivity: any[];
  achievements: string[];
  onProgressUpdated: (updates: {
    xp?: number;
    hearts?: number;
    streak?: number;
    completedLessons?: string[];
    completedNodes?: string[];
    achievements?: string[];
  }) => void;
  onOpenAuth: () => void;
  dailyXpGoal: number;
  onDailyXpGoalUpdated: (goal: number) => void;
  todayXpEarned: number;
  isPremium?: boolean;
}

// Preset Premium Avatars with nice background gradients
const PRESET_AVATARS = [
  { id: 'socrates', name: 'سقراط', desc: 'الفيلسوف المعلم', emoji: '🏛️', bg: 'from-amber-400 to-orange-500' },
  { id: 'hypatia', name: 'هيباتيا', desc: 'عالمة الفلك والرياضيات', emoji: '🌌', bg: 'from-purple-400 to-indigo-600' },
  { id: 'ibnsina', name: 'ابن سينا', desc: 'الشيخ الرئيس الحكيم', emoji: '📜', bg: 'from-emerald-400 to-teal-600' },
  { id: 'plato', name: 'أفلاطون', desc: 'مؤسس الأكاديمية الأولى', emoji: '⚖️', bg: 'from-blue-400 to-indigo-600' },
  { id: 'aristotle', name: 'أرسطو', desc: 'المعلم الأول للمنطق', emoji: '📖', bg: 'from-rose-400 to-pink-600' },
  { id: 'farabi', name: 'الفارابي', desc: 'المعلم الثاني وصاحب المدينة الفاضلة', emoji: '🕌', bg: 'from-violet-400 to-fuchsia-600' },
];

// Wardrobe Shop Items for Dressing Socrates
const SHOP_ROBES = [
  { id: 'classic', name: 'الرداء اليوناني البسيط 🏛️', desc: 'لباس سقراط التقليدي للتعليم في أثينا والأسواق العامة.', cost: 0, preview: '🏛️', premium: false },
  { id: 'gold', name: 'رداء سقراط بلس الذهبي 👑', desc: 'رداء ملكي ساطع ينبعث منه شرارات الحكمة السبرانية المضيئة.', cost: 0, preview: '👑', premium: true },
  { id: 'philosopher_purple', name: 'رداء الأرجوان السري 🔮', desc: 'رداء فخيم يرتديه كبار فلاسفة الأكاديمية الحكماء.', cost: 1200, preview: '🔮', premium: false },
  { id: 'logic_armor', name: 'درع الفكر الفولاذي ⚔️', desc: 'درع معدني لامع ومصقول لمبارزات الجدل العقلي الصامد.', cost: 1600, preview: '⚔️', premium: false },
];

const SHOP_HEADWEAR = [
  { id: 'none', name: 'شعر فيلسوف وقور 🦱', desc: 'مظهر سقراط الكلاسيكي الرزين بدون أي زينة إضافية.', cost: 0, preview: '🦱', premium: false },
  { id: 'laurel', name: 'إكليل الغار الزمردي 🌿', desc: 'رمز التتويج والنصر النقدي والفكري المظفر.', cost: 300, preview: '🌿', premium: false },
  { id: 'glasses', name: 'نظارات المعرفة الذكية 👓', desc: 'لتتبع براهين الحكمة وقراءة كتب الـ PDF بدقة وتحليل ذكي.', cost: 600, preview: '👓', premium: false },
  { id: 'crown', name: 'تاج الملك الفيلسوف 👑', desc: 'تاج ذهبي ملكي براق مخصص لمشتركي سقراط بلس الحكماء.', cost: 0, preview: '👑', premium: true },
];

const SHOP_HELD = [
  { id: 'none', name: 'شرح بسيط باليدين 🖐️', desc: 'تعبير حر باليدين لتوليد الأفكار وإيضاح المفاهيم المبهمة.', cost: 0, preview: '🖐️', premium: false },
  { id: 'scroll', name: 'لفافة المخطوطة القديمة 📜', desc: 'ورقة بردي أصيلة محفورة بخط اليد تحوي أسرار الأبجدية الأولى.', cost: 400, preview: '📜', premium: false },
  { id: 'hemlock', name: 'كأس كوريوسيتي البري (الشوكران) 🧪', desc: 'كأس الحقيقة والشجاعة الفكرية الذي واجه به سقراط محاكمته اليونانية.', cost: 1000, preview: '🧪', premium: false },
  { id: 'staff', name: 'عصا المعلم الأول المضيئة 🔱', desc: 'عصا براقة مرصعة بالبلور المشع لتوجيه براهين شجرة الفلسفة.', cost: 1800, preview: '🔱', premium: false },
];

export default function UserProfile({ 
  currentUser, 
  userXp, 
  hearts, 
  streak, 
  completedLessons, 
  completedNodes,
  weeklyActivity,
  achievements,
  onProgressUpdated,
  onOpenAuth,
  dailyXpGoal,
  onDailyXpGoalUpdated,
  todayXpEarned,
  isPremium = false
}: UserProfileProps) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || 'طالب متميز');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState('socrates');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visitorId, setVisitorId] = useState('');

  // Load sound & voice settings from localStorage
  useEffect(() => {
    const soundOpt = localStorage.getItem('socrates_sound_enabled');
    const voiceOpt = localStorage.getItem('socrates_voice_enabled');
    if (soundOpt !== null) setSoundEnabled(soundOpt === 'true');
    if (voiceOpt !== null) setVoiceEnabled(voiceOpt === 'true');

    // Retrieve selected avatar from Firestore metadata if any, or localstorage
    const savedAv = localStorage.getItem('socrates_avatar_id');
    if (savedAv) setSelectedAvatarId(savedAv);

    // Retrieve or initialize visitor unique ID
    let vid = localStorage.getItem('socrates_visitor_id');
    if (!vid) {
      vid = 'GST-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('socrates_visitor_id', vid);
    }
    setVisitorId(vid);
  }, []);

  // Sync state if user auth shifts
  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [currentUser]);

  // Hash unique membership code
  const getMembershipNumber = (uid: string) => {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 90000) + 10000; // 5 digit premium user number
  };

  const activeUserId = currentUser ? currentUser.uid : visitorId;
  const membershipNo = getMembershipNumber(activeUserId);

  const handleCopyUID = (uid: string) => {
    playClickSound();
    navigator.clipboard.writeText(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    const target = !soundEnabled;
    setSoundEnabled(target);
    localStorage.setItem('socrates_sound_enabled', String(target));
    if (target) playClickSound();
  };

  const toggleVoice = () => {
    playClickSound();
    const target = !voiceEnabled;
    setVoiceEnabled(target);
    localStorage.setItem('socrates_voice_enabled', String(target));
  };

  const handleSelectAvatar = (avId: string) => {
    playClickSound();
    setSelectedAvatarId(avId);
    localStorage.setItem('socrates_avatar_id', avId);
    setSuccessMsg('تم تحديث الشعار والرمز التعبيري بنجاح!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!displayName.trim()) {
      setErrorMsg('اسم المستخدم لا يمكن أن يكون فارغاً.');
      return;
    }

    setIsUpdating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (currentUser) {
        // 1. Update Firebase Auth display name
        await updateProfile(currentUser, { displayName: displayName });

        // 2. Refetch or update Firestore progress
        const updatedProgress: UserProgress = {
          hearts,
          streak,
          xp: userXp,
          currentNodeId: completedNodes[completedNodes.length - 1] || 'sec_philosophy',
          currentLessonId: '',
          completedLessons,
          completedNodes,
          weeklyActivity,
          league: 'Bronze',
          lastActiveDate: new Date().toISOString()
        };
        await saveUserProgress(currentUser.uid, updatedProgress);
        setSuccessMsg('تم تحديث اسمك الكريم ومكامن المزامنة السحابية بنجاح!');
      } else {
        setSuccessMsg('تم حفظ الاسم على المستوى المحلي (سجل دخولك للتثبيت السحابي).');
      }
      setIsEditingName(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء حفظ الاسم الشخصي. حاول مجدداً.');
    } finally {
      setIsUpdating(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleResetProgress = async () => {
    playClickSound();
    setIsUpdating(true);
    try {
      // Clear achievements localstorage triggers
      localStorage.removeItem('socrates_unlocked_achievements');
      localStorage.removeItem('socrates_consecutive_correct');
      localStorage.removeItem('socrates_best_consecutive_correct');
      localStorage.removeItem('socrates_achievement_perfect_lesson_unlocked');

      onProgressUpdated({
        xp: 1200,
        hearts: 5,
        streak: 3,
        completedLessons: [],
        completedNodes: [],
        achievements: []
      });

      if (currentUser) {
        await resetUserProgress(currentUser.uid);
      }

      setSuccessMsg('تم تصفير وإعادة تعيين شجرة الحكمة والتقدم بنجاح!');
      setShowConfirmReset(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('لم نتمكن من تصفير حسابك سحابياً، تواصل مع الدعم الفني.');
    } finally {
      setIsUpdating(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleSignOut = async () => {
    playClickSound();
    setIsUpdating(true);
    try {
      await signOut(auth);
      setSuccessMsg('تم تسجيل الخروج بنجاح! ننتقل الآن إلى وضع الزائر.');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      console.error("Logout failed:", err);
      setErrorMsg('لم نتمكن من تسجيل الخروج، يرجى المحاولة مرة أخرى.');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const activeAvatar = PRESET_AVATARS.find(a => a.id === selectedAvatarId) || PRESET_AVATARS[0];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* 1. Header Hero Card with Active Cover Photo, Avatar and User Name */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-xs relative overflow-hidden flex flex-col">
        {/* Simple non-interactive elegant background gradient banner */}
        <div className="h-32 w-full bg-gradient-to-l from-amber-100 via-orange-50 to-amber-50 border-b border-gray-100/60" />

        {/* Profile Info Details over the card (with avatar offsetting) */}
        <div className="px-6 pb-6 pt-2 relative">
          
          {/* Avatar floating overlapping the cover photo */}
          <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-6 -mt-12 md:-mt-14 relative z-10">
            
            {/* Main User Avatar Detail */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-4 text-center md:text-right">
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr ${activeAvatar.bg} flex items-center justify-center text-4xl shadow-md border-4 border-white shrink-0`}>
                {activeAvatar.emoji}
              </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-center md:justify-end flex-row-reverse">
                {isEditingName ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={40}
                      className="px-3 py-1.5 rounded-lg border-2 border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:border-amber-500"
                      disabled={isUpdating}
                    />
                    <button 
                      type="submit" 
                      className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                      disabled={isUpdating}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 className="font-extrabold text-xl text-gray-900">{displayName}</h2>
                    <button 
                      onClick={() => { playClickSound(); setIsEditingName(true); }}
                      className="p-1 rounded-md text-gray-400 hover:bg-gray-50 hover:text-amber-600 transition-all cursor-pointer"
                      title="تعديل اسم الحكيم"
                    >
                      <PenTool className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-amber-600 font-extrabold flex items-center gap-1 flex-row-reverse justify-center md:justify-end">
                <span>رتبة: {activeAvatar.name}</span>
                <span className="text-gray-400 font-normal">({activeAvatar.desc})</span>
              </p>
              
              <div className="flex flex-col gap-1.5 items-center md:items-end mt-1 font-mono">
                <p className="text-[10px] text-gray-400">
                  {currentUser ? `البريد الإلكتروني: ${currentUser.email}` : 'غير مسجل بالخادم السحابي (زائر)'}
                </p>

                {/* Membership Code Badge */}
                <div className="flex items-center gap-1.5 text-[10px] bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200/50">
                  <span className="font-bold">رقم العضوية: #{membershipNo}</span>
                </div>

                {/* Unique copyable user ID */}
                <button
                  type="button"
                  onClick={() => handleCopyUID(activeUserId)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-600 transition-colors bg-gray-50 hover:bg-amber-50 px-2 py-1 rounded-lg border border-gray-150/60 font-mono group cursor-pointer"
                  title="اضغط لنسخ المعرّف الفريد"
                >
                  {copied ? (
                    <span className="text-emerald-600 font-bold">تم نسخ المعرّف!</span>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5 text-gray-400 group-hover:text-amber-500" />
                      <span className="text-gray-500 max-w-[140px] truncate select-all" dir="ltr">{activeUserId}</span>
                      <span className="text-gray-400">:معرف الحساب (ID)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

            {/* Stat Trophies */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto font-mono text-center">
              <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-amber-600 font-black text-xs">مجموع الـ XP</span>
                <strong className="text-amber-800 text-lg">{userXp}</strong>
              </div>
              <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-orange-600 font-black text-xs">أيام الـ Streak</span>
                <strong className="text-orange-800 text-lg">{streak}</strong>
              </div>
              <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-rose-600 font-black text-xs">القلوب المتبقية</span>
                <strong className="text-rose-800 text-lg">{hearts}/5</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Message Notifications */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 flex-row-reverse"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 flex-row-reverse"
            >
              <UserCheck className="w-4 h-4 shrink-0 text-emerald-500 animate-bounce" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>



      {/* Achievements and Badges */}
      <AchievementsGrid
        userXp={userXp}
        streak={streak}
        completedNodes={completedNodes}
        unlockedList={achievements || []}
        onAchievementsUpdated={(updatedList) => {
          onProgressUpdated({ achievements: updatedList });
        }}
      />

      {/* 3. Database Diagnostics and Reset Status */}
      <div className="max-w-2xl mx-auto w-full">
        {/* Database diagnostics and resetting controls */}
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 flex-row-reverse">
              <Database className="w-4.5 h-4.5 text-amber-500" />
              <span>مستودع البيانات السحابي</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">تفقد صحة اتصال خوادم Google Cloud Firestore بموقعك</p>
          </div>

          <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-2xl space-y-3 font-sans">
            <div className="flex items-center justify-between text-xs flex-row-reverse">
              <span className="text-gray-400">حالة الخادم</span>
              <span className="font-black text-emerald-600 flex items-center gap-1">
                متصل جيداً
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </span>
            </div>

            <div className="flex items-center justify-between text-xs flex-row-reverse pt-1 border-t border-gray-100">
              <span className="text-gray-400">نوع قاعدة البيانات</span>
              <span className="font-mono text-gray-600">NoSQL Multi-Region</span>
            </div>

            <div className="flex items-center justify-between text-xs flex-row-reverse pt-1 border-t border-gray-100">
              <span className="text-gray-400">طريقة المصادقة</span>
              <span className="font-mono text-gray-600">
                {currentUser ? 'Firebase Secure Auth' : 'غير مسجل الدخول'}
              </span>
            </div>

            {!currentUser && (
              <div className="pt-2 space-y-2">
                <button
                  onClick={onOpenAuth}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  ربط السحاب وتسجيل الدخول عبر Google ↗
                </button>
                <div className="text-[10px] text-amber-800 font-extrabold text-center bg-amber-50/60 rounded-xl py-2 px-3 border border-amber-200/50 leading-relaxed">
                  👑 اشترك الآن في باقة "سقراط بلس" وتحصّل على قلوب غير محدودة والقدرة على رفع وتحليل كتب الـ PDF وغيرها الكثير!
                </div>
              </div>
            )}

            {currentUser && (
              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  disabled={isUpdating}
                  className="w-full bg-rose-50 hover:bg-rose-100/90 text-rose-700 border border-rose-200 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                >
                  <span>تسجيل الخروج من الحساب سحابياً 🚪</span>
                </button>
              </div>
            )}
          </div>

          {/* Dangerous Zone / Reset Progress */}
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
            {showConfirmReset ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-3">
                <h4 className="font-extrabold text-xs text-rose-800">هل أنت واثق تماماً من تصفير حسابك؟</h4>
                <p className="text-[10px] text-rose-700 leading-relaxed">بمجرد التأكيد، سيتم مسح كامل تاريخ شجرة الحكمة والـ XP والمراحل المنجزة، والتراجع غير ممكن.</p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleResetProgress}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2 rounded-xl text-xs cursor-pointer"
                  >
                    نعم، امسح تقدمي
                  </button>
                  <button 
                    onClick={() => { playClickSound(); setShowConfirmReset(false); }}
                    className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-extrabold py-2 rounded-xl text-xs cursor-pointer"
                  >
                    تراجع عن المسح
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { playClickSound(); setShowConfirmReset(true); }}
                className="w-full bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-150 rounded-xl py-3 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تصفير شجرة الحكمة والـ XP</span>
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
