import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, CheckCircle2, Trophy, HelpCircle, Lock, Sparkles } from 'lucide-react';
import { playSuccessSound, playClickSound } from '../utils/audio';

interface AchievementsGridProps {
  userXp: number;
  streak: number;
  completedNodes: string[];
  unlockedList: string[];
  onAchievementsUpdated?: (updatedList: string[]) => void;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  targetValue: number;
  getCurrentValue: (stats: { xp: number; streak: number; nodesCount: number }) => number;
  checkUnlocked: (stats: { xp: number; streak: number; nodesCount: number }) => boolean;
}

export const ACHIEVEMENTS_PRESETS: AchievementItem[] = [
  {
    id: 'consecutive_10_correct',
    title: 'العقل الوقّاد',
    description: 'إجابة 10 أسئلة متتالية بشكل صحيح دون ارتكاب أي أخطاء في مجالس الدروس الحية.',
    icon: '🧠',
    color: 'from-amber-400 to-orange-500',
    targetValue: 10,
    getCurrentValue: () => {
      const best = parseInt(localStorage.getItem('socrates_best_consecutive_correct') || '0', 10);
      return Math.min(10, best);
    },
    checkUnlocked: () => {
      const best = parseInt(localStorage.getItem('socrates_best_consecutive_correct') || '0', 10);
      return best >= 10;
    }
  },
  {
    id: 'perfect_lesson',
    title: 'الرداء الطاهر',
    description: 'إكمال فصل دراسي فكري كامل دون خسارة أي قلب من قلوب الفطرة الخمسة.',
    icon: '🛡️',
    color: 'from-emerald-400 to-teal-600',
    targetValue: 1,
    getCurrentValue: () => {
      const perf = localStorage.getItem('socrates_achievement_perfect_lesson_unlocked') === 'true';
      return perf ? 1 : 0;
    },
    checkUnlocked: () => {
      return localStorage.getItem('socrates_achievement_perfect_lesson_unlocked') === 'true';
    }
  },
  {
    id: 'xp_100',
    title: 'طالب العلم المبادر',
    description: 'تخطي حاجز 100 نقطة خبرة (XP) في شجرة وبراهين سقراط الفلسفية.',
    icon: '⚡',
    color: 'from-cyan-400 to-blue-500',
    targetValue: 100,
    getCurrentValue: (stats) => Math.min(100, stats.xp),
    checkUnlocked: (stats) => stats.xp >= 100
  },
  {
    id: 'xp_500',
    title: 'ساعي الرشد والأثر',
    description: 'بلغ حاجز 500 نقطة خبرة (XP) في بحر العلوم الفلسفية والمنطقة وعلم الكلام.',
    icon: '📚',
    color: 'from-indigo-400 to-indigo-600',
    targetValue: 500,
    getCurrentValue: (stats) => Math.min(500, stats.xp),
    checkUnlocked: (stats) => stats.xp >= 500
  },
  {
    id: 'xp_2000',
    title: 'فيلسوف الأكاديمية الأكبر',
    description: 'راكم أكثر من 2000 نقطة خبرة (XP) للتأهيل لترأس مجلس كبار الحكماء.',
    icon: '👑',
    color: 'from-yellow-400 to-amber-600',
    targetValue: 2000,
    getCurrentValue: (stats) => Math.min(2000, stats.xp),
    checkUnlocked: (stats) => stats.xp >= 2000
  },
  {
    id: 'streak_3',
    title: 'مواظب الكُتّاب',
    description: 'طلب المعرفة والمداومة على القراءات لمدّة 3 أيام متتالية أو أكثر لتثبيت الفضائل.',
    icon: '🔥',
    color: 'from-orange-500 to-rose-600',
    targetValue: 3,
    getCurrentValue: (stats) => Math.min(3, stats.streak),
    checkUnlocked: (stats) => stats.streak >= 3
  },
  {
    id: 'streak_7',
    title: 'القبس المتقد',
    description: 'المحافظة على سلسلة أيام متتالية حكيمة لمدّة 7 أيام كاملة دون انقطاع لتأصيل العادة العقلية.',
    icon: '✨',
    color: 'from-pink-500 to-rose-600',
    targetValue: 7,
    getCurrentValue: (stats) => Math.min(7, stats.streak),
    checkUnlocked: (stats) => stats.streak >= 7
  },
  {
    id: 'node_explorer',
    title: 'مستنير الفروع',
    description: 'إكمال عقدة رئيسية كاملة من شجرة الحكمة (تجاوز كافة دروسها).',
    icon: '🏛️',
    color: 'from-purple-500 to-indigo-600',
    targetValue: 1,
    getCurrentValue: (stats) => Math.min(1, stats.nodesCount),
    checkUnlocked: (stats) => stats.nodesCount >= 1
  },
  {
    id: 'multi_node_explorer',
    title: 'مهندس الميادين العقلية',
    description: 'فتح وإكمال 3 عقد رئيسية أو أكثر لتوسيع آفاق الحكمة والمعارف الدقيقة.',
    icon: '🌳',
    color: 'from-emerald-500 to-green-600',
    targetValue: 3,
    getCurrentValue: (stats) => Math.min(3, stats.nodesCount),
    checkUnlocked: (stats) => stats.nodesCount >= 3
  }
];

export default function AchievementsGrid({
  userXp,
  streak,
  completedNodes,
  unlockedList = [],
  onAchievementsUpdated
}: AchievementsGridProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);

  const stats = {
    xp: userXp,
    streak: streak,
    nodesCount: completedNodes.length
  };

  // Run checking loop on mount/updates to discover newly unlocked achievements
  useEffect(() => {
    let changed = false;
    const newList = [...unlockedList];

    ACHIEVEMENTS_PRESETS.forEach(ach => {
      const isMet = ach.checkUnlocked(stats);
      const isAlreadySaved = newList.includes(ach.id);

      if (isMet && !isAlreadySaved) {
        newList.push(ach.id);
        changed = true;
        
        // Save locally to safeguard
        localStorage.setItem(`socrates_achievement_unlocked_${ach.id}`, 'true');
        
        // Trigger micro-banner fanfare
        setJustUnlocked(ach.title);
        playSuccessSound();
        setTimeout(() => setJustUnlocked(null), 5000);
      }
    });

    if (changed && onAchievementsUpdated) {
      onAchievementsUpdated(newList);
    }
  }, [userXp, streak, completedNodes.length, unlockedList]);

  // Compute stats to display
  const processedAchievements = ACHIEVEMENTS_PRESETS.map(ach => {
    const isUnlocked = unlockedList.includes(ach.id) || ach.checkUnlocked(stats);
    const currentValue = ach.getCurrentValue(stats);
    const percent = Math.min(100, Math.round((currentValue / ach.targetValue) * 100));

    return {
      ...ach,
      isUnlocked,
      currentValue,
      percent
    };
  });

  const filteredAchievements = processedAchievements.filter(ach => {
    if (activeTab === 'unlocked') return ach.isUnlocked;
    if (activeTab === 'locked') return !ach.isUnlocked;
    return true;
  });

  const totalUnlockedCount = processedAchievements.filter(a => a.isUnlocked).length;

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-150 p-5 md:p-6 shadow-xs text-right space-y-5" dir="rtl" id="achievements-section">
      {/* Title & Stats summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3 flex-row-reverse">
        <div className="flex items-center gap-2 flex-row-reverse shrink-0">
          <div className="p-2 bg-amber-500 rounded-xl text-white shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900">أوسمة الإنجاز والفضائل</h3>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">أوسمة فخرية تخلّد مجهوداتك وطفراتك العقلية</p>
          </div>
        </div>

        {/* Counter pill */}
        <div className="bg-amber-50 text-amber-800 border border-amber-200/50 px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5">
          <span>مكتمل لحسابك:</span>
          <strong className="font-mono text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded-full">
            {totalUnlockedCount} / {ACHIEVEMENTS_PRESETS.length}
          </strong>
        </div>
      </div>

      {/* Fanfare Toast notification for immediate unlocks */}
      <AnimatePresence>
        {justUnlocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3 text-right"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">🏆</span>
              <div>
                <strong className="text-xs font-black block">تهانينا! فُتح وسام إنجاز جديد!</strong>
                <p className="text-[11px] text-emerald-50 mt-0.5">لقد نجحت في فتح حليّة الأثر: <strong className="font-sans text-yellow-300">{justUnlocked}</strong> في رداء المعرفة!</p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-yellow-300 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs flex-row justify-end">
        <button
          onClick={() => { setActiveTab('locked'); playClickSound(); }}
          className={`px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer font-bold ${
            activeTab === 'locked'
              ? 'bg-gray-150 border-gray-300 text-gray-800'
              : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
          }`}
        >
          أوسمة قيد السعي
        </button>
        <button
          onClick={() => { setActiveTab('unlocked'); playClickSound(); }}
          className={`px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer font-bold ${
            activeTab === 'unlocked'
              ? 'bg-amber-100 border-amber-300 text-amber-900'
              : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
          }`}
        >
          الأوسمة المفتوحة
        </button>
        <button
          onClick={() => { setActiveTab('all'); playClickSound(); }}
          className={`px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer font-bold ${
            activeTab === 'all'
              ? 'bg-gray-950 border-gray-950 text-white shadow-2xs'
              : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
          }`}
        >
          عرض الكل
        </button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredAchievements.map(ach => (
          <div
            key={ach.id}
            className={`p-4 rounded-3xl border-2 transition-all flex flex-col justify-between gap-3 relative overflow-hidden text-right select-none ${
              ach.isUnlocked
                ? 'bg-gradient-to-br from-white to-amber-50/5 border-amber-200 hover:shadow-xs hover:border-amber-300'
                : 'bg-gray-50/40 border-gray-150/60 opacity-80'
            }`}
          >
            {/* Stamp highlight or lock badge corner */}
            {ach.isUnlocked ? (
              <div className="absolute top-3 left-3 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs border border-white">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="absolute top-3 left-3 bg-gray-200 text-gray-400 p-1 rounded-lg">
                <Lock className="w-3 h-3" />
              </div>
            )}

            <div className="flex items-start gap-3 flex-row-reverse pb-1.5">
              {/* Emblem icon */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${ach.isUnlocked ? ach.color : 'from-gray-150 to-gray-200'} text-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-xs`}>
                <span className={ach.isUnlocked ? 'animate-pulse' : 'grayscale opacity-40'}>
                  {ach.icon}
                </span>
              </div>

              <div>
                <h4 className={`text-xs sm:text-sm font-extrabold ${ach.isUnlocked ? 'text-amber-950' : 'text-gray-500'}`}>
                  {ach.title}
                </h4>
                <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                  {ach.description}
                </p>
              </div>
            </div>

            {/* Custom Progress gauge */}
            <div className="space-y-1.5 pt-1.5 border-t border-gray-100/50 font-sans">
              <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 flex-row-reverse">
                <span>التقدم والمثابرة</span>
                <span className="font-mono text-gray-600 block">
                  <strong className={ach.isUnlocked ? 'text-amber-600' : 'text-gray-500'}>
                    {ach.currentValue}
                  </strong> / {ach.targetValue}
                </span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${ach.percent}%` }}
                  transition={{ duration: 0.6 }}
                  className={`h-full rounded-full ${
                    ach.isUnlocked 
                      ? 'bg-gradient-to-l from-amber-400 to-orange-500' 
                      : 'bg-gray-400'
                  }`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
