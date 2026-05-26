import { motion } from 'motion/react';
import { Trophy, Shield, ArrowUp, Zap, HelpCircle } from 'lucide-react';
import { LeaderboardUser } from '../types';

interface LeaderboardProps {
  users: LeaderboardUser[];
  currentUserXp: number;
}

const LEAGUE_TABS = [
  { id: 'bronze', name: 'الدوري البرونزي', color: 'from-amber-600 to-amber-800' },
  { id: 'silver', name: 'الدوري الفضي', color: 'from-slate-300 to-slate-500' },
  { id: 'gold', name: 'الدوري الذهبي', color: 'from-yellow-400 to-amber-500' },
  { id: 'diamond', name: 'الدوري الماسي', color: 'from-cyan-400 to-blue-600' }
];

export default function Leaderboard({ users, currentUserXp }: LeaderboardProps) {
  // Sort user and assign dynamic rank mapping
  const updatedUsers: LeaderboardUser[] = users.map(u => {
    if (u.isCurrentUser) {
      return { ...u, xp: currentUserXp };
    }
    return u;
  }).sort((a, b) => b.xp - a.xp)
    .map((u, index) => ({ ...u, rank: index + 1 }));

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm font-sans" dir="rtl" id="leaderboard-block">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4 flex-row-reverse pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-800 text-right">لوحة الصدارة الأسبوعية</h3>
          <p className="text-xs text-gray-500 text-right mt-0.5">تبقّى 3 أيام على نهاية الدوري</p>
        </div>
        <Trophy className="w-6 h-6 text-amber-500 animate-pulse fill-amber-400" />
      </div>

      {/* Leagues Navigation */}
      <div className="grid grid-cols-4 gap-1.5 mb-5 text-[10px] md:text-xs">
        {LEAGUE_TABS.map((league) => (
          <div
            key={league.id}
            className={`py-2 px-1 rounded-xl text-center font-bold border-2 transition-all flex flex-col items-center justify-center gap-1 ${
              league.id === 'silver'
                ? 'bg-gradient-to-br from-slate-50 to-slate-100/50 text-slate-800 border-slate-300 shadow-xs'
                : 'bg-white text-gray-400 border-gray-100'
            }`}
          >
            <Shield className={`w-3.5 h-3.5 ${
              league.id === 'bronze' ? 'text-amber-800' :
              league.id === 'silver' ? 'text-slate-400' :
              league.id === 'gold' ? 'text-yellow-500' : 'text-cyan-500'
            }`} />
            <span className="truncate max-w-full">{league.name}</span>
          </div>
        ))}
      </div>

      {/* Leaderboard List grid */}
      <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
        {updatedUsers.map((user, index) => {
          const isWinnerCircle = user.rank <= 3;
          return (
            <motion.div
              layout
              key={user.name}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`p-3 rounded-xl flex items-center justify-between gap-3 border-2 transition-all text-right ${
                user.isCurrentUser
                  ? 'bg-amber-50/70 border-amber-400 text-amber-900 shadow-xs'
                  : 'bg-white border-gray-50 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {/* Leader Rank Numbering */}
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  user.rank === 1 ? 'bg-yellow-400 text-yellow-900 border border-yellow-500/20' :
                  user.rank === 2 ? 'bg-slate-200 text-slate-800' :
                  user.rank === 3 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100/60 text-gray-400'
                }`}>
                  {user.rank}
                </span>

                <div className="text-xl bg-gray-50 w-8 h-8 rounded-xl flex items-center justify-center border border-gray-100 shadow-2xs">
                  {user.avatar}
                </div>

                <div className="text-right">
                  <div className="text-xs md:text-sm font-bold flex items-center gap-1">
                    {user.name}
                    {user.isCurrentUser && (
                      <span className="bg-amber-500 text-white text-[9px] py-0.5 px-1.5 rounded-full font-sans">أنت</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">دوري الفلاسفة الصغار</span>
                </div>
              </div>

              {/* Dynamic XP count */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 py-0.5 px-2 rounded-lg text-xs font-mono font-bold">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {user.xp}
                </div>
                {user.rank < 5 && (
                  <ArrowUp className="w-3.5 h-3.5 text-green-500 animate-bounce" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2 text-xs flex-row justify-between">
        <div className="flex items-center gap-1.5 flex-row-reverse text-right">
          <span>🛡️</span>
          <span>منطقة الحماية مفعلة: حافظ على الصدارة للبقاء في الدوري الفضي</span>
        </div>
        <HelpCircle className="w-4 h-4 text-emerald-600 hover:scale-105 transition-transform" />
      </div>
    </div>
  );
}
