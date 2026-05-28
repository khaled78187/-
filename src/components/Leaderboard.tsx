import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Shield, ArrowUp, Zap, HelpCircle, Gift, Crown, Sparkles, RefreshCw } from 'lucide-react';
import { LeaderboardUser } from '../types';
import { getAllUsersProgress } from '../lib/userService';
import { auth } from '../lib/firebase';
import { playSuccessSound, playClickSound } from '../utils/audio';

interface LeaderboardProps {
  currentUserXp: number;
  isPremium: boolean;
  onAwardPremium: (active: boolean) => void;
}

export default function Leaderboard({ currentUserXp, isPremium, onAwardPremium }: LeaderboardProps) {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load/compile real weekly leaderboard from Firestore
  const fetchLeaderboardData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setIsRefreshing(true);
    
    setErrorMsg(null);
    try {
      const dbUsers = await getAllUsersProgress();
      const currentUserId = auth.currentUser?.uid;

      // 1. Format downloaded Firestore user profiles
      const formattedRealUsers: LeaderboardUser[] = dbUsers.map(u => {
        const isCurrent = currentUserId === u.id;
        return {
          rank: 0, // Computed below
          name: u.displayName || (isCurrent ? (auth.currentUser?.displayName || 'طالب متميز') : 'طالب علم'),
          xp: isCurrent ? currentUserXp : (u.xp !== undefined ? u.xp : 120),
          avatar: u.avatar || '👤',
          isCurrentUser: isCurrent
        };
      });

      // 2. Ensure current logged-in user is ALWAYS in list with latest XP
      const currentExists = formattedRealUsers.some(u => u.isCurrentUser);
      if (!currentExists && auth.currentUser) {
        formattedRealUsers.push({
          rank: 0,
          name: auth.currentUser.displayName || 'أنت (طالب العلم)',
          xp: currentUserXp,
          avatar: localStorage.getItem('socrates_avatar_id') ? '🏛️' : '👤',
          isCurrentUser: true
        });
      }

      // 3. Fallback legendary philosophers to populate and create a lively, gamified context
      const fallbackCompetitors: LeaderboardUser[] = [
        { rank: 0, name: 'أفلاطون المتميز', xp: 2450, avatar: '⚖️', isCurrentUser: false },
        { rank: 0, name: 'ابن الهيثم المُنظر', xp: 2120, avatar: '🌌', isCurrentUser: false },
        { rank: 0, name: 'ماري كوري المشعة', xp: 1890, avatar: '🔬', isCurrentUser: false },
        { rank: 0, name: 'المعلم ابن سينا', xp: 1420, avatar: '📜', isCurrentUser: false },
        { rank: 0, name: 'أرسطو المعلم الأول', xp: 980, avatar: '📖', isCurrentUser: false },
        { rank: 0, name: 'فاطمة الفهرية المعمارية', xp: 750, avatar: '🏰', isCurrentUser: false },
        { rank: 0, name: 'ابن خلدون الاجتماعي', xp: 600, avatar: '🕌', isCurrentUser: false }
      ];

      // Remove fallback names if they duplicate real people's names
      const realNames = new Set(formattedRealUsers.map(u => u.name));
      const filteredFallbacks = fallbackCompetitors.filter(fb => !realNames.has(fb.name));

      // Combine real registry and filtered scholars
      const combined = [...formattedRealUsers, ...filteredFallbacks];

      // Sort by XP descending and apply dynamic ranks
      const sorted = combined
        .sort((a, b) => b.xp - a.xp)
        .map((u, idx) => ({ ...u, rank: idx + 1 }));

      setUsers(sorted);

      // 4. Verify Reward Condition: Top 3 get free monthly premium
      const currentUserRankObject = sorted.find(u => u.isCurrentUser);
      if (currentUserRankObject && currentUserRankObject.rank <= 3) {
        onAwardPremium(true);
        if (!rewardClaimed) {
          setRewardClaimed(true);
          playSuccessSound();
        }
      } else {
        onAwardPremium(false);
        setRewardClaimed(false);
      }
    } catch (err) {
      console.error("Error setting up Firestore Leaderboard:", err);
      setErrorMsg("حدث عطل أثناء استقاء بيانات الصدارة من السحابة.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [currentUserXp]);

  const handleManualRefresh = () => {
    playClickSound();
    fetchLeaderboardData(true);
  };

  const currentUserRankObj = users.find(u => u.isCurrentUser);
  const currentUserRank = currentUserRankObj ? currentUserRankObj.rank : 0;
  const isTopThree = currentUserRank > 0 && currentUserRank <= 3;

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-150 p-5 md:p-6 shadow-xs font-sans text-right" dir="rtl" id="leaderboard-block">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-2 flex-row pb-3 border-b border-gray-100">
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-xl text-[10px] font-bold transition-all border border-gray-200/50 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>تحديث الصدارة</span>
        </button>
        <div className="flex items-center gap-2 flex-row-reverse text-right">
          <Trophy className="w-5 h-5 text-amber-500 fill-amber-300/40" />
          <div>
            <h3 className="text-sm sm:text-base font-black text-gray-800">مجلس الحكماء والعلماء</h3>
            <p className="text-[10px] text-gray-400">مزامنة سحابية حيّة لحفظ الترتيب الفعلي</p>
          </div>
        </div>
      </div>

      {/* Rewards System Info Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-600/15 border-2 border-amber-300 rounded-2xl p-3.5 mb-4 text-right relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-l from-amber-400 to-orange-400 animate-pulse" />
        <div className="flex items-start gap-2.5 flex-row-reverse">
          <div className="p-1.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
            <Gift className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-amber-950 flex items-center justify-start flex-row-reverse gap-1">
              <span>👑 نظام مكافآت مجلس الصدارة الشهري!</span>
            </h4>
            <p className="text-[10px] leading-relaxed text-amber-900 font-medium">
              نافس عقول الصدارة بكل قوتك! <strong>المراكز الثلاثة الأولى</strong> يحصلون تلقائياً على اشتراك <strong>"سقراط بلس (Socrates Plus)" مجاني بالكامل %100</strong> يفتح لهم المناهج السحابية الفائقة فوراً دون دفع أي مبالغ مالية!
            </p>
          </div>
        </div>
      </div>

      {/* High-Contrast Live Standing Status */}
      <AnimatePresence mode="wait">
        {currentUserRank > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`p-3.5 rounded-2xl mb-4 text-center border font-bold text-xs ${
              isTopThree 
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50/50 border-amber-200 text-amber-900'
            }`}
          >
            {isTopThree ? (
              <div className="flex items-center justify-center gap-1.5 flex-row-reverse">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>تهانينا الحارة! أنت في المركز <strong>({currentUserRank})</strong>. اشتراك بلس مفعّل لك مجاناً بالكامل! 🎉</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 flex-row-reverse">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>أنت حالياً بالمركز الثاني عشر أو <strong>({currentUserRank})</strong>. اكسب <strong className="font-mono text-amber-600">{users[2] ? Math.max(0, users[2].xp - currentUserXp + 15) : 100} XP</strong> إضافي لتعتلي المركز الـ 3 وتفتح سقراط بلس مجاناً! 🚀</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wisdom Cup Unified Banner */}
      <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/40 border-2 border-amber-200 rounded-2xl p-3 mb-4 text-center shadow-3xs flex items-center justify-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl shadow-sm shrink-0">
          <Trophy className="w-5 h-5 text-yellow-100" />
        </div>
        <div className="text-right">
          <h4 className="text-xs font-black text-amber-950">🏆 ساحة المنافسة: كأس الحكمة الكبرى</h4>
          <p className="text-[10px] text-amber-900/80 mt-0.5 leading-normal">
            تم دمج كافة الفئات واللوائح في سباق فلسفي واحد عظيم! يتنافس جميع طلاب العلم بلا حواجز للفوز بفرص الصدارة وحصد المعرفة.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl text-center my-3">
          {errorMsg}
        </div>
      )}

      {/* Leaderboard List Grid with Skeletons */}
      {loading ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-4 border-amber-300 border-t-amber-600 animate-spin mx-auto" />
          <p className="text-[11px] text-gray-400">جاري استدعاء قائمة المتصدرين الفلسفية وتنسيق اللوائح...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
          {users.map((user) => {
            const isWinnerCircle = user.rank <= 3;
            return (
              <motion.div
                layout
                key={user.name + '-' + user.rank}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`p-3 rounded-2xl flex items-center justify-between gap-3 border-2 transition-all text-right relative overflow-hidden ${
                  user.isCurrentUser
                    ? 'bg-amber-50/70 border-amber-400 text-amber-900 shadow-2xs'
                    : isWinnerCircle
                      ? 'bg-amber-50/10 border-amber-200/40 hover:bg-amber-50/20 text-gray-700'
                      : 'bg-white border-gray-100/70 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {/* Winner's highlight shine */}
                {isWinnerCircle && (
                  <div className="absolute top-0 right-0 h-full w-1 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                )}

                {/* Leader Rank Numbering */}
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    user.rank === 1 ? 'bg-yellow-400 text-yellow-900 border border-yellow-500/20 font-black' :
                    user.rank === 2 ? 'bg-slate-200 text-slate-800' :
                    user.rank === 3 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100/65 text-gray-400 font-mono'
                  }`}>
                    {user.rank}
                  </span>

                  <div className={`text-xl w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs shrink-0 ${
                    isWinnerCircle ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
                  }`}>
                    {user.avatar}
                  </div>

                  <div className="text-right">
                    <div className="text-xs md:text-sm font-bold flex items-center gap-1.5">
                      <span className="truncate max-w-[120px] md:max-w-[180px]">{user.name}</span>
                      {user.isCurrentUser && (
                        <span className="bg-amber-500 text-white text-[8px] py-0.5 px-1.5 rounded-full font-sans font-bold">أنت</span>
                      )}
                      {isWinnerCircle && (
                        <div className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-amber-200 shrink-0">
                          <Crown className="w-2 h-2 text-amber-600 fill-amber-600" />
                          <span>سقراط بلس 👑</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-400">
                      {isWinnerCircle ? 'مكافأة اشتراك الصدارة نشطة' : 'متنافس في كأس الحكمة'}
                    </span>
                  </div>
                </div>

                {/* Dynamic XP count */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 py-0.5 px-2 rounded-lg text-xs font-mono font-bold">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {user.xp}
                  </div>
                  {user.rank < 5 && (
                    <ArrowUp className="w-3.5 h-3.5 text-green-500 animate-bounce shrink-0" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-4 bg-emerald-50 text-emerald-800 p-2.5 rounded-2xl border border-emerald-100 flex items-center gap-2 text-xs flex-col sm:flex-row justify-between">
        <div className="flex items-center gap-1.5 flex-row text-right">
          <span>🛡️</span>
          <span>منطقة حماية الترتيب نشطة: تعلو بمجلس الفلاسفة السحابي بدراستك اليومية</span>
        </div>
        <HelpCircle className="w-4 h-4 text-emerald-600 cursor-pointer hover:scale-105 transition-transform" />
      </div>
    </div>
  );
}
