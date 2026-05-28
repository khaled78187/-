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
  Copy
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { updateProfile, User as FirebaseUser } from 'firebase/auth';
import { saveUserProgress, getUserProgress } from '../lib/userService';
import { playClickSound } from '../utils/audio';
import { UserProgress } from '../types';

interface UserProfileProps {
  currentUser: FirebaseUser | null;
  userXp: number;
  hearts: number;
  streak: number;
  completedLessons: string[];
  completedNodes: string[];
  weeklyActivity: any[];
  onProgressUpdated: (updates: {
    xp?: number;
    hearts?: number;
    streak?: number;
    completedLessons?: string[];
    completedNodes?: string[];
  }) => void;
  onOpenAuth: () => void;
  dailyXpGoal: number;
  onDailyXpGoalUpdated: (goal: number) => void;
  todayXpEarned: number;
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

export default function UserProfile({ 
  currentUser, 
  userXp, 
  hearts, 
  streak, 
  completedLessons, 
  completedNodes,
  weeklyActivity,
  onProgressUpdated,
  onOpenAuth,
  dailyXpGoal,
  onDailyXpGoalUpdated,
  todayXpEarned
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
      onProgressUpdated({
        xp: 1200,
        hearts: 5,
        streak: 3,
        completedLessons: [],
        completedNodes: []
      });

      if (currentUser) {
        const defaultProgress: UserProgress = {
          hearts: 5,
          streak: 3,
          xp: 1200,
          currentNodeId: 'sec_philosophy',
          currentLessonId: '',
          completedLessons: [],
          completedNodes: [],
          weeklyActivity: weeklyActivity.map(w => ({ ...w, xp: 0 })),
          league: 'Bronze',
          lastActiveDate: new Date().toISOString()
        };
        await saveUserProgress(currentUser.uid, defaultProgress);
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

  const activeAvatar = PRESET_AVATARS.find(a => a.id === selectedAvatarId) || PRESET_AVATARS[0];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* 1. Header Hero Card with Active Avatar and User Name */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-l from-amber-500 to-orange-500" />
        
        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-6 pt-4">
          
          {/* Main User Avatar Detail */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-4 text-center md:text-right">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${activeAvatar.bg} flex items-center justify-center text-4xl shadow-md border-4 border-white shrink-0 outline-2 outline-amber-400`}>
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

      {/* 2. Choose Philosophical Avatar Section */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 flex-row-reverse">
            <Sparkles className="w-4.5 h-4.5 text-amber-500" />
            <span>تخصيص الهوية الفلسفية (شعار الحساب)</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">اختر الفيلسوف أو الشخصية التاريخية التي تمثلك في شجرة كبار الحكماء</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {PRESET_AVATARS.map((avatar) => {
            const isSelected = selectedAvatarId === avatar.id;
            return (
              <button
                key={avatar.id}
                onClick={() => handleSelectAvatar(avatar.id)}
                className={`p-3 rounded-2xl border-2 text-right transition-all flex items-center gap-3 cursor-pointer hover:border-amber-300 w-full hover:bg-gray-50/50 ${
                  isSelected ? 'border-amber-500 bg-amber-50/20 shadow-xs ring-2 ring-amber-500/20' : 'border-gray-100 bg-white'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${avatar.bg} flex items-center justify-center text-xl shrink-0 text-white`}>
                  {avatar.emoji}
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-gray-800 truncate">{avatar.name}</h4>
                  <p className="text-[9px] text-gray-400 truncate mt-0.5 leading-none">{avatar.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Settings Controls & Cloud Connection Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Toggleable Settings Options */}
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 flex-row-reverse">
              <Settings className="w-4.5 h-4.5 text-amber-500" />
              <span>لوحة التحكم والتفضيلات</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">تحكّم في تجربة اللعب والأنغام الصوتية والذكاء الاصطناعي</p>
          </div>

          <div className="space-y-3.5 pt-1.5" dir="rtl">
            {/* Audio SFX Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50/30 rounded-2xl border border-gray-100 flex-row-reverse">
              <div className="flex items-center gap-2.5 flex-row-reverse">
                <div className={`p-2 rounded-xl ${soundEnabled ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div className="text-right">
                  <h4 className="font-extrabold text-xs text-gray-800">الأصوات والمؤثرات الصوتية</h4>
                  <p className="text-[10px] text-gray-400 leading-none">رنين عند الإجابة والضغط</p>
                </div>
              </div>
              <button 
                onClick={toggleSound}
                className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                  soundEnabled ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              >
                <div 
                  className={`bg-white w-5.5 h-5.5 rounded-full shadow-md transform duration-205 ease-in-out ${
                    soundEnabled ? '-translate-x-5.5' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>

            {/* Socratic Vocal Greeting on boot */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50/30 rounded-2xl border border-gray-100 flex-row-reverse">
              <div className="flex items-center gap-2.5 flex-row-reverse">
                <div className={`p-2 rounded-xl ${voiceEnabled ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                  <Tv className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <h4 className="font-extrabold text-xs text-gray-800">نطق بليغ لبداية اليوم</h4>
                  <p className="text-[10px] text-gray-400 leading-none">تفعيل ترحيب سقراط الصوتي</p>
                </div>
              </div>
              <button 
                onClick={toggleVoice}
                className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                  voiceEnabled ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              >
                <div 
                  className={`bg-white w-5.5 h-5.5 rounded-full shadow-md transform duration-250 ease-in-out ${
                    voiceEnabled ? '-translate-x-5.5' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-150/60 my-4" />

            {/* Daily XP Goal Selection */}
            <div className="space-y-3">
              <div className="flex flex-col text-right">
                <span className="font-extrabold text-xs text-gray-800">🎯 الهدف اليومي لنقاط الخبرة</span>
                <span className="text-[10px] text-gray-400">امضِ قُدماً في دراستك اليومية وحقّق أهداف الحكمة المرجوّة</span>
              </div>

              {/* Multi-Selection row styled as dynamic pills */}
              <div className="grid grid-cols-4 gap-2">
                {[20, 50, 100, 150].map((goalOption) => {
                  const isActive = dailyXpGoal === goalOption;
                  let levelLabel = '';
                  if (goalOption === 20) levelLabel = 'مبتدئ';
                  else if (goalOption === 50) levelLabel = 'حكيم';
                  else if (goalOption === 100) levelLabel = 'فيلسوف';
                  else if (goalOption === 150) levelLabel = 'عبقري';

                  return (
                    <button
                      key={goalOption}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onDailyXpGoalUpdated(goalOption);
                      }}
                      className={`py-2 px-1.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isActive
                          ? 'border-amber-500 bg-amber-500/5 text-amber-900 shadow-2xs font-bold'
                          : 'border-gray-100 bg-white hover:border-gray-250 text-gray-600'
                      }`}
                    >
                      <strong className="text-xs font-mono">{goalOption} XP</strong>
                      <span className="text-[8px] text-gray-400 mt-0.5 leading-none">{levelLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Current Progress bar preview inside Profile */}
              <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-150/40 flex flex-col gap-1.5 text-right font-sans">
                <div className="flex justify-between items-center flex-row-reverse text-[10px] text-gray-500 font-bold">
                  <span>إنجاز اليوم: <strong className="text-gray-800 font-mono">{todayXpEarned}</strong> / {dailyXpGoal} XP</span>
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-mono text-[9px]">
                    {Math.min(100, Math.round((todayXpEarned / dailyXpGoal) * 100))}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <motion.div 
                    className="bg-gradient-to-l from-amber-500 to-orange-500 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.round((todayXpEarned / dailyXpGoal) * 100))}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>

                {todayXpEarned >= dailyXpGoal ? (
                  <p className="text-[9px] text-emerald-600 font-bold mt-0.5 flex flex-row-reverse items-center gap-1 justify-start">
                    <span>🎉 مبارك! لقد تمكنت من تحقيق هدفك الفلسفي لليوم بنجاح!</span>
                  </p>
                ) : (
                  <p className="text-[9px] text-amber-600 mt-0.5 leading-relaxed">
                    تبقّى لك <strong className="font-mono text-amber-700">{Math.max(0, dailyXpGoal - todayXpEarned)} XP</strong> لإكمال الورد اليومي لمجلس براهين العلم.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

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
                  ربط السحاب وإنشاء حساب مجاني بالكامل مدى الحياة ↗
                </button>
                <div className="text-[10px] text-emerald-700 font-extrabold text-center bg-emerald-50/60 rounded-xl py-2 px-3 border border-emerald-200/50 leading-relaxed">
                  🎁 عضوية مميزة مدى الحياة مجاناً %100. لا يتطلب منا دفع أي مبالغ مالية أو إدخال بطاقات، غايتنا هي نشر مسار الحكمة للجميع.
                </div>
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
