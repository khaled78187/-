import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  Search, 
  RefreshCw, 
  Mail, 
  User, 
  Trophy, 
  Calendar, 
  Check, 
  X, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { getAllUsersProgress, updateUserSubscription } from '../lib/userService';
import { UserProgress } from '../types';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface AdminDashboardProps {
  onBackToMap?: () => void;
}

interface DBUser extends UserProgress {
  id: string;
}

export default function AdminDashboard({ onBackToMap }: AdminDashboardProps) {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'premium' | 'regular'>('all');

  // Load all users from Firestore
  const fetchUsersData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllUsersProgress();
      setUsers(data as DBUser[]);
    } catch (err: any) {
      console.error("Error fetching admin users list:", err);
      setError("فشل تحميل قائمة المشتركين من الخادم السحابي. يرجى التحقق من اتصال قاعدة البيانات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Handle premium upgrade or downgrade
  const handleTogglePremium = async (userId: string, currentPremium: boolean, type: 'monthly' | 'yearly' = 'yearly') => {
    playClickSound();
    setUpdatingId(userId);
    setError(null);
    try {
      const nextPremium = !currentPremium;
      // Write directly to Firestore
      await updateUserSubscription(userId, nextPremium, type);
      
      // Update local state smoothly
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            isPremium: nextPremium,
            subscriptionType: nextPremium ? type : undefined,
            subscriptionExpiry: nextPremium 
              ? new Date(Date.now() + (type === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString()
              : undefined
          };
        }
        return u;
      }));
      
      playSuccessSound();
      setSuccessMessage(nextPremium ? "تم تفعيل الاشتراك الفاخر للعضو بنجاح! 👑" : "تم إلغاء سريان رداء العضوية الكلي.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Failed to update user subscription status:", err);
      setError("حصل خطأ أثناء مزامنة رخصة الاشتراك مع السحابة.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Calculations
  const totalUsersCount = users.length;
  const premiumCount = users.filter(u => u.isPremium).length;
  const regularCount = totalUsersCount - premiumCount;
  const avgXp = totalUsersCount > 0 
    ? Math.round(users.reduce((acc, u) => acc + (u.xp || 0), 0) / totalUsersCount) 
    : 0;

  // Filter and Search logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.displayName || 'طالب علم').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'premium') return matchesSearch && u.isPremium;
    if (filterType === 'regular') return matchesSearch && !u.isPremium;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16" dir="rtl">
      
      {/* Upper Breadcrumbs / Header area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-3xs">
        <div className="space-y-1 text-right">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <span>لوحة تحكم المشرف الفلسفي (المالك)</span>
          </div>
          <h2 className="text-xl font-black text-gray-900 font-sans tracking-tight">إدارة اشتراكات سقراط بلس</h2>
          <p className="text-xs text-gray-400 font-normal">تحكّم مطلق في تراخيص التطبيق، وتفعيل حسابات تليجرام/واتساب المشتركين</p>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => { playClickSound(); fetchUsersData(); }}
            disabled={loading}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 transition-all cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {onBackToMap && (
            <button
              onClick={() => { playClickSound(); onBackToMap(); }}
              className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              العودة إلى شجرة المعرفة 🌳
            </button>
          )}
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 font-bold text-xs animate-bounce shadow-3xs">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-905 rounded-2xl flex items-center gap-2.5 font-bold text-xs shadow-3xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Stat Widgets (Bento Grid Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col text-right justify-between min-h-[90px]">
          <span className="text-[11px] text-gray-400 font-bold block">إجمالي طلاب العلم</span>
          <div className="flex items-baseline justify-between mt-1">
            <strong className="text-2xl font-black text-slate-800 font-mono leading-none">{totalUsersCount}</strong>
            <span className="text-[10px] text-gray-300">عضو دائم</span>
          </div>
        </div>

        <div className="bg-amber-50/50 border-2 border-amber-100 p-4 rounded-2xl flex flex-col text-right justify-between min-h-[90px]">
          <span className="text-[11px] text-amber-700 font-bold block flex items-center gap-1 flex-row-reverse justify-end">
            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-305/40" />
            <span>المشتركون بالتاج الفاخر</span>
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <strong className="text-2xl font-black text-amber-800 font-mono leading-none">{premiumCount}</strong>
            <span className="text-[10px] text-amber-600 font-bold bg-amber-100/60 px-2 py-0.5 rounded-md">سقراط بلس</span>
          </div>
        </div>

        <div className="bg-gray-50/40 border-2 border-gray-150 p-4 rounded-2xl flex flex-col text-right justify-between min-h-[90px]">
          <span className="text-[11px] text-gray-500 font-bold block">الأعضاء العاديون</span>
          <div className="flex items-baseline justify-between mt-1">
            <strong className="text-2xl font-black text-gray-700 font-mono leading-none">{regularCount}</strong>
            <span className="text-[10px] text-gray-400 font-medium">باقة أساسية</span>
          </div>
        </div>

        <div className="bg-purple-50/20 border-2 border-purple-100 p-4 rounded-2xl flex flex-col text-right justify-between min-h-[90px]">
          <span className="text-[11px] text-purple-700 font-bold block">متوسط الـ XP</span>
          <div className="flex items-baseline justify-between mt-1">
            <strong className="text-2xl font-black text-purple-800 font-mono leading-none">{avgXp}</strong>
            <span className="text-[10px] text-purple-500 font-bold">خبرة / طالب</span>
          </div>
        </div>
      </div>

      {/* Control Filters and Search Bar Container */}
      <div className="bg-white p-4 rounded-3xl border-2 border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search Field */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="ابحث بالاسم، البريد أو المعرّف السحابي..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-gray-200 rounded-2xl py-2 pr-9 pl-3 text-xs text-right focus:bg-white focus:outline-none transition-all font-sans"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 left-3 flex items-center text-gray-450 hover:text-gray-650 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Selectors */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => { playClickSound(); setFilterType('all'); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filterType === 'all' 
                ? 'bg-white text-gray-900 shadow-xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            الكل ({totalUsersCount})
          </button>
          
          <button
            onClick={() => { playClickSound(); setFilterType('premium'); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 justify-center ${
              filterType === 'premium' 
                ? 'bg-amber-500 text-white shadow-xs' 
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            الملكيون ({premiumCount})
          </button>
          
          <button
            onClick={() => { playClickSound(); setFilterType('regular'); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filterType === 'regular' 
                ? 'bg-white text-gray-800 shadow-xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            الأساسيون ({regularCount})
          </button>
        </div>

      </div>

      {/* Main Users Registry List / Table */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 font-extrabold leading-loose">جاري التخاطب والمزامنة مع قاعدة بيانات Firestore الموحدة...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="text-3xl">👥</div>
            <h4 className="text-sm font-bold text-gray-700">لم يتم العثور على طلاب علم متوافقين</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              تأكّد من معايير البحث أو دعوة بعض الأصدقاء لإنشاء حسابات سحابية في التطبيق للاختبار والظهور هنا!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            
            {filteredUsers.map((user, idx) => (
              <div 
                key={user.id} 
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                
                {/* User Identity block */}
                <div className="flex items-start gap-3 text-right">
                  <div className="w-11 h-11 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center shrink-0 text-xl font-black shadow-3xs">
                    {user.avatar || '🏛️'}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-gray-800">{user.displayName || 'طالب علم'}</h4>
                      {user.isPremium ? (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-200">
                          <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-750" />
                          <span>سقراط بلس</span>
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
                          عضو أساسي
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1 flex-row-reverse justify-end font-mono select-all">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{user.email || 'غير مسجل (حساب محلي)'}</span>
                      </span>
                      <span className="font-mono text-[9px] text-gray-300">ID: {user.id}</span>
                    </div>
                  </div>
                </div>

                {/* Score Stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-black max-w-xs w-full md:w-auto self-center md:self-auto">
                  <div className="bg-amber-50/40 p-2 rounded-xl border border-amber-100/50 min-w-[70px]">
                    <span className="text-[9px] text-gray-400 block font-sans font-medium">النقاط XP</span>
                    <span className="text-amber-700 text-xs sm:text-sm">{user.xp ?? 0}</span>
                  </div>
                  
                  <div className="bg-orange-50/45 p-2 rounded-xl border border-orange-100/50 min-w-[70px]">
                    <span className="text-[9px] text-gray-400 block font-sans font-medium">الأيام</span>
                    <span className="text-orange-700 text-xs sm:text-sm">{user.streak ?? 0}🔥</span>
                  </div>

                  <div className="bg-rose-50/45 p-2 rounded-xl border border-rose-100/50 min-w-[70px]">
                    <span className="text-[9px] text-gray-400 block font-sans font-medium">القلوب</span>
                    <span className="text-rose-700 text-xs sm:text-sm">{user.hearts ?? 5}/5</span>
                  </div>
                </div>

                {/* Subscription Action & Control switches */}
                <div className="flex items-center gap-2 justify-end shrink-0 self-end md:self-auto">
                  {user.isPremium ? (
                    <div className="flex flex-col items-end gap-1.5 text-right">
                      {user.subscriptionExpiry && (
                        <span className="text-[9px] text-gray-400 flex items-center gap-1 flex-row-reverse justify-end">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>انتهاء: {new Date(user.subscriptionExpiry).toLocaleDateString('ar-EG')}</span>
                        </span>
                      )}
                      
                      <button
                        onClick={() => handleTogglePremium(user.id, true)}
                        disabled={updatingId === user.id}
                        className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black text-[11px] px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        {updatingId === user.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        <span>إلغاء التفعيل ✕</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {/* Activate Custom Subscription packages */}
                      <button
                        onClick={() => handleTogglePremium(user.id, false, 'yearly')}
                        disabled={updatingId === user.id}
                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-[11px] px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        {updatingId === user.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Crown className="w-3.5 h-3.5 fill-white text-amber-500" />
                        )}
                        <span>تفعيل سنوي 👑</span>
                      </button>

                      <button
                        onClick={() => handleTogglePremium(user.id, false, 'monthly')}
                        disabled={updatingId === user.id}
                        className="bg-slate-100 hover:bg-slate-200 text-gray-700 disabled:opacity-50 font-black text-[10px] px-3 py-2 rounded-xl border border-gray-200 transition-all cursor-pointer"
                      >
                        {updatingId === user.id ? 'جاري...' : 'تفعيل شهري'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}

          </div>
        )}
      </div>

    </div>
  );
}
