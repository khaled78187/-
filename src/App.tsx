import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Trophy, 
  Calendar, 
  FolderGit2, 
  Heart, 
  Zap, 
  Award,
  BookOpen,
  Volume2,
  LogIn,
  LogOut,
  RefreshCw,
  UserCheck,
  User as UserIcon,
  Flame,
  Crown
} from 'lucide-react';

import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { testConnection, getUserProgress, saveUserProgress, saveCustomBook, getUserCustomBooks } from './lib/userService';

import { SKILL_NODES, MOCK_LEADERBOARD, MOCK_WEEKLY_ACTIVITY } from './data';
import { UserProgress, Lesson, LeaderboardUser, DailyActivity, SkillNode } from './types';
import { playClickSound } from './utils/audio';
import { getFailedQuestions, clearFailedQuestions } from './utils/reviewStorage';

// Importing our newly created modular components
import SkillMap from './components/SkillMap';
import LessonModal from './components/LessonModal';
import UserProfile from './components/UserProfile';
import Leaderboard from './components/Leaderboard';
import ProgressCharts from './components/ProgressCharts';
import TechDocs from './components/TechDocs';
import TextbookConverter from './components/TextbookConverter';
import AuthModal from './components/AuthModal';
import SubscriptionModal from './components/SubscriptionModal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'map' | 'leaderboard' | 'progress' | 'profile' | 'docs' | 'textbook'>('map');

  const handleTabChange = (tab: 'map' | 'leaderboard' | 'progress' | 'profile' | 'docs' | 'textbook') => {
    playClickSound();
    setActiveTab(tab);
  };

  // Dynamic set of nodes state
  const [nodes, setNodes] = useState<SkillNode[]>(SKILL_NODES);

  // Gamified User Progress States (saves in memory, acts exactly like persistent state)
  const [userXp, setUserXp] = useState(1200);
  const [hearts, setHearts] = useState(5);
  const [streak, setStreak] = useState(3);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState(SKILL_NODES[0]?.id || 'sec_philosophy');
  const [weeklyActivity, setWeeklyActivity] = useState<DailyActivity[]>(MOCK_WEEKLY_ACTIVITY);
  
  // Authentication & Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscription States (Premium Access)
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('socrates_is_premium') === 'true';
  });
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'yearly' | null>(() => {
    return localStorage.getItem('socrates_sub_type') as 'monthly' | 'yearly' | null;
  });
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  // Daily XP Goal & Today's XP Progress
  const [dailyXpGoal, setDailyXpGoal] = useState<number>(() => {
    const saved = localStorage.getItem('socrates_daily_xp_goal');
    return saved ? parseInt(saved, 10) : 50;
  });
  const [todayXpEarned, setTodayXpEarned] = useState<number>(() => {
    const d = new Date();
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const saved = localStorage.getItem(`socrates_xp_earned_${dateKey}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Streak Micro-Interaction Animations
  const [prevStreak, setPrevStreak] = useState(3);
  const [streakFlicker, setStreakFlicker] = useState(false);
  const [showFlameBurst, setShowFlameBurst] = useState(false);

  useEffect(() => {
    if (streak > prevStreak) {
      setStreakFlicker(true);
      setShowFlameBurst(true);
      const timer = setTimeout(() => {
        setStreakFlicker(false);
      }, 1500);
      const burstTimer = setTimeout(() => {
        setShowFlameBurst(false);
      }, 2500);
      setPrevStreak(streak);
      return () => {
        clearTimeout(timer);
        clearTimeout(burstTimer);
      };
    } else {
      setPrevStreak(streak);
    }
  }, [streak, prevStreak]);

  // Test connection & Listen to auth state
  useEffect(() => {
    // 1. Validate connection with Firebase on boot as constraint
    testConnection();

    // 2. React to auth changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncing(true);
        try {
          // Fetch existing user progress from firestore
          const progress = await getUserProgress(user.uid);
          if (progress) {
            setUserXp(progress.xp);
            setHearts(progress.hearts);
            setStreak(progress.streak);
            setCompletedLessons(progress.completedLessons);
            setCompletedNodes(progress.completedNodes);
            if (progress.currentNodeId) {
              setCurrentNodeId(progress.currentNodeId);
            }
            if (progress.weeklyActivity) {
              setWeeklyActivity(progress.weeklyActivity);
            }
            if (progress.dailyXpGoal) {
              setDailyXpGoal(progress.dailyXpGoal);
              localStorage.setItem('socrates_daily_xp_goal', String(progress.dailyXpGoal));
            }
            
            // Populate premium attributes
            const hasPrem = !!progress.isPremium;
            setIsPremium(hasPrem);
            setSubscriptionType(progress.subscriptionType || null);
            if (hasPrem) {
              localStorage.setItem('socrates_is_premium', 'true');
              localStorage.setItem('socrates_sub_type', progress.subscriptionType || 'yearly');
            } else {
              localStorage.removeItem('socrates_is_premium');
              localStorage.removeItem('socrates_sub_type');
            }
          } else {
            // First time login: seed default progress template to Firestore
            const initialProgress: UserProgress = {
              hearts: 5,
              streak: 3,
              xp: 1200,
              currentNodeId: SKILL_NODES[0]?.id || 'sec_philosophy',
              currentLessonId: '',
              completedLessons: [],
              completedNodes: [],
              weeklyActivity: MOCK_WEEKLY_ACTIVITY,
              league: 'Bronze',
              lastActiveDate: new Date().toISOString(),
              isPremium: false,
              subscriptionType: undefined,
              dailyXpGoal: dailyXpGoal
            };
            await saveUserProgress(user.uid, initialProgress);
            
            // Sync default back to local
            setUserXp(1200);
            setHearts(5);
            setStreak(3);
            setCompletedLessons([]);
            setCompletedNodes([]);
            setCurrentNodeId(SKILL_NODES[0]?.id || 'sec_philosophy');
            setWeeklyActivity(MOCK_WEEKLY_ACTIVITY);
            setIsPremium(false);
            setSubscriptionType(null);
            localStorage.removeItem('socrates_is_premium');
            localStorage.removeItem('socrates_sub_type');
          }

          // Fetch user-uploaded books from firestore
          const books = await getUserCustomBooks(user.uid);
          if (books && books.length > 0) {
            setNodes(prev => {
              const combined = [...prev];
              books.forEach(b => {
                if (!combined.some(c => c.id === b.id)) {
                  combined.unshift(b);
                }
              });
              return combined;
            });
          }
        } catch (e) {
          console.error("Error loading user session from Firestore:", e);
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Reset custom nodes to default when logged out
        setNodes(SKILL_NODES);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    playClickSound();
    setIsPremium(false);
    setSubscriptionType(null);
    localStorage.removeItem('socrates_is_premium');
    localStorage.removeItem('socrates_sub_type');
    localStorage.removeItem('socrates_sub_type_purchased');
    await signOut(auth);
  };

  const [awardedPremiumFromLeaderboard, setAwardedPremiumFromLeaderboard] = useState<boolean>(() => {
    return localStorage.getItem('socrates_premium_rewarded') === 'true';
  });

  const handleAwardPremium = async (active: boolean) => {
    if (active === awardedPremiumFromLeaderboard) return;
    setAwardedPremiumFromLeaderboard(active);
    
    if (active) {
      if (!isPremium) {
        setIsPremium(true);
        setSubscriptionType('monthly');
        localStorage.setItem('socrates_is_premium', 'true');
        localStorage.setItem('socrates_sub_type', 'monthly');
        localStorage.setItem('socrates_premium_rewarded', 'true');
        
        if (currentUser) {
          setIsSyncing(true);
          try {
            await saveUserProgress(currentUser.uid, {
              hearts,
              streak,
              xp: userXp,
              currentNodeId,
              currentLessonId: '',
              completedLessons,
              completedNodes,
              weeklyActivity,
              league: 'Bronze',
              lastActiveDate: new Date().toISOString(),
              isPremium: true,
              subscriptionType: 'monthly',
              dailyXpGoal: dailyXpGoal
            });
          } catch (err) {
            console.error("Error saving rewarded subscriber profile to Firestore:", err);
          } finally {
            setIsSyncing(false);
          }
        }
      }
    } else {
      const wasRewarded = localStorage.getItem('socrates_premium_rewarded') === 'true';
      if (wasRewarded && !localStorage.getItem('socrates_sub_type_purchased')) {
        setIsPremium(false);
        setSubscriptionType(null);
        localStorage.removeItem('socrates_is_premium');
        localStorage.removeItem('socrates_sub_type');
        localStorage.removeItem('socrates_premium_rewarded');
        
        if (currentUser) {
          setIsSyncing(true);
          try {
            await saveUserProgress(currentUser.uid, {
              hearts,
              streak,
              xp: userXp,
              currentNodeId,
              currentLessonId: '',
              completedLessons,
              completedNodes,
              weeklyActivity,
              league: 'Bronze',
              lastActiveDate: new Date().toISOString(),
              isPremium: false,
              subscriptionType: undefined,
              dailyXpGoal: dailyXpGoal
            });
          } catch (err) {
            console.error("Error removing rewarded subscriber status from Firestore:", err);
          } finally {
            setIsSyncing(false);
          }
        }
      }
    }
  };

  const handleActivatePremium = async (type: 'monthly' | 'yearly') => {
    setIsPremium(true);
    setSubscriptionType(type);
    localStorage.setItem('socrates_is_premium', 'true');
    localStorage.setItem('socrates_sub_type', type);
    localStorage.setItem('socrates_sub_type_purchased', 'true');

    if (currentUser) {
      setIsSyncing(true);
      try {
        await saveUserProgress(currentUser.uid, {
          hearts,
          streak,
          xp: userXp,
          currentNodeId,
          currentLessonId: '',
          completedLessons,
          completedNodes,
          weeklyActivity,
          league: 'Bronze',
          lastActiveDate: new Date().toISOString(),
          isPremium: true,
          subscriptionType: type,
          subscriptionExpiry: new Date(Date.now() + (type === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
          dailyXpGoal: dailyXpGoal
        });
      } catch (err) {
        console.error("Error saving subscriber profile to Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleCancelPremium = async () => {
    playClickSound();
    setIsPremium(false);
    setSubscriptionType(null);
    localStorage.removeItem('socrates_is_premium');
    localStorage.removeItem('socrates_sub_type');
    localStorage.removeItem('socrates_sub_type_purchased');
    localStorage.removeItem('socrates_premium_rewarded');

    if (currentUser) {
      setIsSyncing(true);
      try {
        await saveUserProgress(currentUser.uid, {
          hearts,
          streak,
          xp: userXp,
          currentNodeId,
          currentLessonId: '',
          completedLessons,
          completedNodes,
          weeklyActivity,
          league: 'Bronze',
          lastActiveDate: new Date().toISOString(),
          isPremium: false,
          subscriptionType: undefined,
          subscriptionExpiry: undefined,
          dailyXpGoal: dailyXpGoal
        });
      } catch (err) {
        console.error("Error removing subscription state from Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Custom injection of new chapters generated from Textbook PDFs
  const handleInjectNode = async (customNode: SkillNode) => {
    if (nodes.some(n => n.id === customNode.id)) {
      setCurrentNodeId(customNode.id);
      setActiveTab('map');
      return;
    }
    setNodes(prev => [customNode, ...prev]);
    setCurrentNodeId(customNode.id);
    setActiveTab('map');

    if (currentUser) {
      setIsSyncing(true);
      try {
        await saveCustomBook(currentUser.uid, customNode);
      } catch (err) {
        console.error("Error saving dynamic textbook node to Cloud Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };
  
  // Active immersive lesson
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  // Trigger Socratic speech for quick welcome
  const triggerVoiceGreeting = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('أهلاً بك يا رفيقي الفضولي! أنا سقراط، شريكك في فك مغاليق الجهل واكتساب فضائل العقل.');
      utterance.lang = 'ar-SA';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Launching a specific lesson
  const handleSelectLesson = (nodeId: string, lessonId: string) => {
    playClickSound();

    if (lessonId === 'review_lesson') {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const failed = getFailedQuestions(nodeId);
      if (failed.length === 0) return;

      const reviewLesson: Lesson = {
        id: `review_${nodeId}`,
        title: `وضع المراجعة الذكية - ${node.title}`,
        questions: failed,
        xpReward: 30
      };

      setActiveLesson(reviewLesson);
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const lesson = node.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    
    // Mount the modal
    setActiveLesson(lesson);
  };

  // Callback on finishing a lesson
  const handleFinishLesson = async (xpEarned: number, heartsRemaining: number) => {
    if (!activeLesson) return;

    // 1. Calculate future states local variables
    const nextXp = userXp + xpEarned;
    const nextLessons = [...completedLessons, activeLesson.id];
    const nextHearts = heartsRemaining;
    const nextStreak = streak + 1;
    let nextNodes = [...completedNodes];
    let nextCurrentNodeId = currentNodeId;

    // 2. Update completion nodes
    const currentActiveNode = nodes.find(n => n.lessons.some(l => l.id === activeLesson.id));
    if (currentActiveNode) {
      const allCompleted = currentActiveNode.lessons.every(l => nextLessons.includes(l.id));
      if (allCompleted && !nextNodes.includes(currentActiveNode.id)) {
        nextNodes.push(currentActiveNode.id);

        // Advance current node to the next in order
        const currentIndex = nodes.findIndex(n => n.id === currentActiveNode.id);
        if (currentIndex < nodes.length - 1) {
          nextCurrentNodeId = nodes[currentIndex + 1].id;
        }
      }
    }

    // 3. Clear reviewed incorrect questions when Smart Review is completed
    if (activeLesson.id.startsWith('review_')) {
      const nid = activeLesson.id.replace('review_', '');
      clearFailedQuestions(nid);
    }

    // 4. Update weekly dynamic activity logs
    const todayStr = 'الجمعة'; 
    const nextWeekly = weeklyActivity.map(activity => {
      if (activity.day === todayStr) {
        return { ...activity, xp: activity.xp + xpEarned };
      }
      return activity;
    });

    // 5. Update local React states
    setUserXp(nextXp);
    setCompletedLessons(nextLessons);
    setHearts(nextHearts);
    setCompletedNodes(nextNodes);
    setCurrentNodeId(nextCurrentNodeId);
    setWeeklyActivity(nextWeekly);
    setStreak(nextStreak);

    // Update daily XP progress tracking
    const todayD = new Date();
    const dateKey = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
    const nextTodayXp = todayXpEarned + xpEarned;
    setTodayXpEarned(nextTodayXp);
    localStorage.setItem(`socrates_xp_earned_${dateKey}`, String(nextTodayXp));

    // 6. Persist to Firestore if user log is active
    if (currentUser) {
      setIsSyncing(true);
      try {
        await saveUserProgress(currentUser.uid, {
          hearts: nextHearts,
          streak: nextStreak,
          xp: nextXp,
          currentNodeId: nextCurrentNodeId,
          currentLessonId: '',
          completedLessons: nextLessons,
          completedNodes: nextNodes,
          weeklyActivity: nextWeekly,
          league: 'Bronze',
          lastActiveDate: new Date().toISOString(),
          isPremium: isPremium,
          subscriptionType: subscriptionType || undefined,
          dailyXpGoal: dailyXpGoal
        });
      } catch (err) {
        console.error("Error syncing completed lesson data to Firebase Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }

    // Unmount modal and reset active lesson
    setActiveLesson(null);
  };

  const handleRefillHearts = async () => {
    playClickSound();
    setHearts(5);
    
    if (currentUser) {
      setIsSyncing(true);
      try {
        await saveUserProgress(currentUser.uid, {
          hearts: 5,
          streak,
          xp: userXp,
          currentNodeId,
          currentLessonId: '',
          completedLessons,
          completedNodes,
          weeklyActivity,
          league: 'Bronze',
          lastActiveDate: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error syncing heart refill to Firebase Firestore:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };


  return (
    <div className="min-h-screen bg-gray-50/20 text-gray-800 flex flex-col font-sans relative antialiased" dir="rtl">
      
      {/* Top Universal Progress Header for Smartphone Screens */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-gray-100 px-4 py-3 md:px-8 shadow-xs flex items-center justify-between flex-row-reverse">
        
        {/* Brand/Socrates Title */}
        <div className="flex items-center gap-2 flex-row-reverse" onClick={triggerVoiceGreeting}>
          <div className="bg-amber-500 text-white p-2 rounded-xl shadow-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer">
            <Brain className="w-5 h-5 fill-amber-100" />
          </div>
          <div className="text-right">
            <h1 className="font-extrabold text-sm md:text-base text-gray-800 flex items-center gap-1 flex-row-reverse">
              سقراط الحكيم
              <Volume2 className="w-3.5 h-3.5 text-amber-500 cursor-pointer animate-pulse" />
            </h1>
            <p className="text-[10px] text-gray-400">تطبيق معارف الثقافة العامة والجدل</p>
          </div>
        </div>

        {/* Global Stats Trays */}
        <div className="flex items-center gap-2 sm:gap-3 font-mono">
          {/* Daily XP Goal Progress Bar */}
          <div 
            className="flex flex-col gap-0.5 items-end min-w-[70px] sm:min-w-[125px] bg-amber-500/5 hover:bg-amber-500/10 transition-colors border border-amber-500/10 rounded-xl px-2.5 py-1 text-right select-none cursor-help" 
            title={`هدفك اليومي: تحقيق ${dailyXpGoal} XP. اليوم أنجزت: ${todayXpEarned} XP`}
          >
            <div className="flex justify-between w-full text-[9px] font-black font-sans text-amber-800">
              <span className="font-mono">{Math.min(100, Math.round((todayXpEarned / dailyXpGoal) * 100))}%</span>
              <span className="hidden sm:inline">الهدف اليومي</span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden border border-amber-200/20">
              <motion.div 
                className="bg-gradient-to-l from-amber-500 to-orange-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.round((todayXpEarned / dailyXpGoal) * 100))}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          {/* XP Badge */}
          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 font-extrabold px-2 sm:px-3 py-1.5 rounded-xl text-xs md:text-sm shadow-2xs border border-amber-100">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500" />
            <span>{userXp} XP</span>
          </div>

          {/* Streak Badge with micro-interaction flame flicker or scale pulse */}
          <motion.div 
            animate={streakFlicker ? {
              scale: [1, 1.25, 1.1, 1.2, 1],
              rotate: [0, -6, 6, -3, 3, 0],
              boxShadow: ["0px 0px 0px rgba(249, 115, 22, 0)", "0px 0px 14px rgba(249, 115, 22, 0.4)", "0px 0px 4px rgba(249, 115, 22, 0.1)"]
            } : { scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className={`relative flex items-center gap-1.5 ${
              streakFlicker 
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400" 
                : "bg-orange-50 text-orange-700 border-orange-100"
            } font-extrabold px-2 sm:px-3 py-1.5 rounded-xl text-xs md:text-sm shadow-2xs border transition-colors`}
          >
            {/* Flame/Flicker Sparkle Particle */}
            <AnimatePresence>
              {showFlameBurst && (
                <>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.3, y: 0 }}
                    animate={{ opacity: 1, scale: 1.3, y: -25 }}
                    exit={{ opacity: 0, scale: 0.5, y: -45 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute text-base pointer-events-none"
                    style={{ left: '20%' }}
                  >
                    🔥
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.3, y: 0 }}
                    animate={{ opacity: 0.8, scale: 1.1, y: -30, x: 15 }}
                    exit={{ opacity: 0, scale: 0.4, y: -40 }}
                    transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                    className="absolute text-[10px] pointer-events-none"
                    style={{ right: '10%' }}
                  >
                    ✨
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.3, y: 0 }}
                    animate={{ opacity: 0.9, scale: 1, y: -28, x: -15 }}
                    exit={{ opacity: 0, scale: 0.4, y: -38 }}
                    transition={{ duration: 1.3, delay: 0.1, ease: "easeOut" }}
                    className="absolute text-xs pointer-events-none"
                    style={{ left: '10%' }}
                  >
                    ⚡
                  </motion.span>
                </>
              )}
            </AnimatePresence>

            {/* Flickering Flame Icon or pulsing icon */}
            <motion.div
              animate={streakFlicker || streak > 0 ? {
                scale: [1, 1.15, 0.95, 1.05, 1],
              } : {}}
              transition={{ 
                repeat: streakFlicker ? 0 : Infinity, 
                repeatType: "reverse", 
                duration: streakFlicker ? 0.8 : 3, 
                ease: "easeInOut" 
              }}
              className="relative flex items-center justify-center"
            >
              <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                streakFlicker ? "text-white fill-amber-100" : "text-orange-500 fill-orange-500 animate-pulse"
              }`} />
            </motion.div>
            
            <span>{streak} ي</span>
          </motion.div>

          {/* Hearts Status */}
          <div 
            onClick={() => {
              playClickSound();
              if (isPremium) {
                setSubscriptionModalOpen(true);
              } else {
                handleRefillHearts();
              }
            }}
            className={`flex items-center gap-1.5 ${
              isPremium 
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 hover:from-amber-600 hover:to-orange-600" 
                : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-100"
            } px-2 sm:px-3 py-1.5 rounded-xl text-xs md:text-sm shadow-2xs cursor-pointer transition-colors active:scale-95 border`}
            title={isPremium ? "أنت في العضوية الحكيمة الفائقة - اضغط لإدارة باقة سقراط بلس" : "انقر لإعادة ملء القلوب"}
          >
            {isPremium ? (
              <>
                <Crown className="w-3.5 h-3.5 text-amber-100 fill-amber-100/50" />
                <span className="font-extrabold">لانهائي ∞</span>
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 fill-rose-500" />
                <span className="font-bold">{hearts}/5</span>
              </>
            )}
          </div>

          {/* Cloud Integration Status / Authentication Button */}
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2">
              {isSyncing ? (
                <div className="flex items-center justify-center p-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse" title="جاري رفع البيانات تلقائياً لسحابة غوغل...">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-xl border border-emerald-100 font-bold" title="تم حفظ كامل تقدمك بالكامل في Firestore">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden md:inline">محفوظ سحابياً</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <div className="hidden lg:flex flex-col text-right leading-none mr-1">
                  <span className="text-[10px] font-black text-gray-700 max-w-[80px] truncate">{currentUser.displayName || 'طالب علم'}</span>
                  <span className="text-[8px] text-emerald-600 font-sans">مزامنة سحابية</span>
                </div>
                <button 
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="p-1.5 rounded-xl bg-gray-50 text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                playClickSound();
                setAuthModalOpen(true);
              }}
              title="سجل دخولك لحفظ درجاتك في السحابة"
              className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 hover:scale-[1.02] active:scale-[0.98] text-white font-black px-2.5 py-1.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer border border-amber-500/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">حفظ السحابي</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Dual-Layout Responsive Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8 grid grid-cols-1 lg:grid-cols-4 gap-6 mb-20 md:mb-6">
        
        {/* TAB NAVIGATION: Sidebar (Large Screens) */}
        <aside className="hidden lg:flex lg:col-span-1 flex-col gap-2.5 text-right font-sans" dir="rtl">
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-xs sticky top-24 flex flex-col gap-2">
            <span className="text-[10px] text-gray-400 font-bold px-3 uppercase mb-2 block">القوائم والأقسام</span>

            <button
              onClick={() => handleTabChange('map')}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-between flex-row-reverse transition-all active:scale-[0.98] ${
                activeTab === 'map'
                  ? 'bg-amber-500 text-white shadow-[0_4px_0_0_#D97706]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-row-reverse">
                <Brain className="w-4 h-4" />
                <span>شجرة الحكمة (الخريطة)</span>
              </div>
              {completedNodes.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-sans">نشط</span>
              )}
            </button>

            {/* NEW: Textbook PDF Analyzer Tab */}
            <button
              onClick={() => handleTabChange('textbook')}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-between flex-row-reverse transition-all active:scale-[0.98] ${
                activeTab === 'textbook'
                  ? 'bg-amber-500 text-white shadow-[0_4px_0_0_#D97706]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 flex-row-reverse">
                <BookOpen className="w-4 h-4 text-amber-500 fill-amber-100/30" />
                <span>تحليل كتاب مدرسي (جديد)</span>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">ذكاء تربوي</span>
            </button>

            <button
              onClick={() => handleTabChange('leaderboard')}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-between flex-row-reverse transition-all active:scale-[0.98] ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-white shadow-[0_4px_0_0_#D97706]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-row-reverse">
                <Trophy className="w-4 h-4" />
                <span>لوحة الصدارة (المنافسة)</span>
              </div>
              <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">#5</span>
            </button>

            <button
              onClick={() => handleTabChange('progress')}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-between flex-row-reverse transition-all active:scale-[0.98] ${
                activeTab === 'progress'
                  ? 'bg-amber-500 text-white shadow-[0_4px_0_0_#D97706]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-row-reverse">
                <Calendar className="w-4 h-4" />
                <span>نشاطي الأسبوعي</span>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-between flex-row-reverse transition-all active:scale-[0.98] ${
                activeTab === 'profile'
                  ? 'bg-amber-500 text-white shadow-[0_4px_0_0_#D97706]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-row-reverse">
                <UserIcon className="w-4 h-4" />
                <span>حسابي وإعداداتي</span>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[10px] py-0.5 px-2 rounded-full font-sans">الحساب</span>
            </button>

            <button
              onClick={() => handleTabChange('docs')}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-between flex-row-reverse transition-all active:scale-[0.98] ${
                activeTab === 'docs'
                  ? 'bg-amber-500 text-white shadow-[0_4px_0_0_#D97706]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-row-reverse">
                <FolderGit2 className="w-4 h-4" />
                <span>حقيبة فلوتر للمطور</span>
              </div>
            </button>
          </div>

          {/* Dynamic Cloud Registration Slot */}
          <div className="mt-2 text-right">
            {currentUser ? (
              <div className="bg-white rounded-2xl border-2 border-amber-100/50 p-4 shadow-xs space-y-3 relative overflow-hidden flex flex-col text-right">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-500 to-orange-400" />
                
                <div className="flex items-center gap-2.5 flex-row-reverse justify-end">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-black text-amber-700 text-sm border-2 border-amber-200 shrink-0">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : '👤'}
                  </div>
                  <div className="text-right flex-1 min-w-0">
                    <h4 className="font-extrabold text-xs text-gray-800 truncate">{currentUser.displayName || 'طالب علم'}</h4>
                    <p className="text-[9px] text-gray-400 truncate font-mono">{currentUser.email}</p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100 grid grid-cols-2 gap-2 text-center text-xs font-mono font-black">
                  <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                    <span className="text-[9px] text-gray-400 block font-sans">قاعدة البيانات</span>
                    <span className="text-emerald-600 text-[10px] sm:text-[11px]">Firestore</span>
                  </div>
                  <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                    <span className="text-[9px] text-gray-400 block font-sans">مزامنة سحابية</span>
                    <span className="text-amber-600 text-[10px] sm:text-[11px]">تلقائي</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                  <span>حالة الاتصال</span>
                  <span className="font-bold text-emerald-500">مزمّن ●</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/20 rounded-2xl border-2 border-dashed border-amber-200/60 p-4 shadow-2xs space-y-2.5 text-center">
                <h4 className="font-extrabold text-xs text-amber-800">احفظ رصيد تقدمك الآن! 🚀</h4>
                <p className="text-[10px] text-amber-900/75 leading-relaxed">
                  أنشئ حساباً مجانياً لحفظ الـ XP، والـ Streak، والكتب التي ترفعها بسحابة غوغل ومواصلة التعلم من أي جهاز.
                </p>
                <button
                  onClick={() => {
                    playClickSound();
                    setAuthModalOpen(true);
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 hover:scale-[1.01] active:scale-[0.99] transition-all text-white font-black py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  حفظ في السحابة
                </button>
              </div>
            )}
          </div>

          {/* Premium Subscription Summary Slot */}
          <div className="mt-2 text-right">
            {isPremium ? (
              <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-600/10 rounded-2xl border-2 border-amber-300 p-4 shadow-xs relative overflow-hidden flex flex-col text-right">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-500 to-orange-400 animate-pulse" />
                <div className="flex items-center justify-between flex-row-reverse mb-2">
                  <div className="bg-amber-100 text-amber-700 font-extrabold text-[9px] px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                    <span>👑 سقراط بلس نشط</span>
                  </div>
                  <Crown className="w-5 h-5 text-amber-500 fill-amber-300/60" />
                </div>
                <p className="text-[11px] text-amber-900 font-bold leading-relaxed">أنت الآن في الباقة {subscriptionType === 'monthly' ? 'الشهرية' : 'السنوية'} الممتازة.</p>
                <button
                  type="button"
                  onClick={handleCancelPremium}
                  className="mt-3 w-full bg-white/65 hover:bg-rose-50 text-[10px] text-gray-500 hover:text-rose-600 border border-gray-200 rounded-xl py-1.5 font-bold transition-all cursor-pointer"
                >
                  إلغاء الاشتراك الافتراضي ✕
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/20 rounded-2xl border-2 border-amber-200/60 p-4 shadow-sm space-y-2 text-center">
                <div className="flex justify-center text-xl">👑</div>
                <h4 className="font-extrabold text-xs text-amber-800">اشترك في سقراط بلس!</h4>
                <p className="text-[10px] text-amber-950/75 leading-relaxed">
                  افتح قلوباً لا نهائية وميزة تفكيك المناهج السحابية للكتب المدرسية تلقائياً مجاناً %100!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSubscriptionModalOpen(true);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition-all text-white font-black py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/15 cursor-pointer"
                >
                  تفعيل مجاني كامل 👑
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN VIEW CONTROLLER (3 Cols on Desktop, Full on Mobile) */}
        <main className="col-span-1 lg:col-span-3 col-reverse">
          {activeTab === 'map' && (
            <SkillMap 
              nodes={nodes} 
              completedNodes={completedNodes} 
              completedLessons={completedLessons}
              currentNodeId={currentNodeId} 
              onSelectLesson={handleSelectLesson} 
            />
          )}

          {activeTab === 'textbook' && (
            isPremium ? (
              <TextbookConverter 
                onInjectNode={handleInjectNode} 
                alreadyInjected={nodes.some(n => n.id === 'custom_textbook_node')}
              />
            ) : (
              <div className="bg-white rounded-3xl border-2 border-gray-150 p-6 md:p-8 shadow-xs text-center space-y-6 max-w-xl mx-auto" dir="rtl">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto border border-amber-200">
                  👑
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg md:text-xl font-extrabold text-gray-800">تحليل وتفكيك الكتب ميزة للمشتركين فقط 👑</h3>
                  <p className="text-xs md:text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
                    ميزة <strong>تحليل الكتب المدرسية والـ PDFs وتحويلها لفصول وشروحات تفاعلية ذكية</strong> هي جزء من اشتراك "سقراط بلس".
                  </p>
                </div>

                <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-2xl flex items-center gap-3 text-right">
                  <div className="text-lg">🎁</div>
                  <div className="text-[11px] text-amber-900 leading-relaxed font-bold">
                    <strong>تفعيل فوري مجاني:</strong> يمكنك الاشتراك بالباقة الشهرية أو السنوية مجاناً تماماً %100 والبدء الفوري بتحليل مناهجك السحابية. لا يتطلب منك دفع أي مبالغ مالية!
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="border border-gray-150 p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">باقة سقراط السنوية</span>
                    <strong className="text-sm font-black text-gray-700 block mt-0.5">199 ريال / سنة</strong>
                    <span className="text-[9px] text-rose-500 font-bold block mt-0.5">%40 خصم مؤقت</span>
                  </div>
                  <div className="border border-gray-150 p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">باقة سقراط الشهرية</span>
                    <strong className="text-sm font-black text-gray-700 block mt-0.5">29 ريال / شهر</strong>
                    <span className="text-[9px] text-gray-400 block mt-0.5">للدراسة المرنة</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSubscriptionModalOpen(true);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-3 rounded-2xl text-xs sm:text-sm shadow-md shadow-amber-500/15 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 text-amber-200 fill-amber-200" />
                  <span>انضم إلى سقراط بلس وافتح ميزات المناهج مجاناً ↗</span>
                </button>
              </div>
            )
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard 
              currentUserXp={userXp} 
              isPremium={isPremium}
              onAwardPremium={handleAwardPremium}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressCharts 
              activityData={weeklyActivity} 
              totalXp={userXp} 
              streak={streak} 
            />
          )}

          {activeTab === 'profile' && (
            <UserProfile 
              currentUser={currentUser}
              userXp={userXp}
              hearts={hearts}
              streak={streak}
              completedLessons={completedLessons}
              completedNodes={completedNodes}
              weeklyActivity={weeklyActivity}
              onProgressUpdated={(updates) => {
                if (updates.xp !== undefined) setUserXp(updates.xp);
                if (updates.hearts !== undefined) setHearts(updates.hearts);
                if (updates.streak !== undefined) setStreak(updates.streak);
                if (updates.completedLessons !== undefined) setCompletedLessons(updates.completedLessons);
                if (updates.completedNodes !== undefined) setCompletedNodes(updates.completedNodes);
              }}
              onOpenAuth={() => {
                setAuthModalOpen(true);
              }}
              dailyXpGoal={dailyXpGoal}
              todayXpEarned={todayXpEarned}
              onDailyXpGoalUpdated={async (goal) => {
                setDailyXpGoal(goal);
                localStorage.setItem('socrates_daily_xp_goal', String(goal));
                if (currentUser) {
                  setIsSyncing(true);
                  try {
                    await saveUserProgress(currentUser.uid, {
                      hearts,
                      streak,
                      xp: userXp,
                      currentNodeId,
                      currentLessonId: '',
                      completedLessons,
                      completedNodes,
                      weeklyActivity,
                      league: 'Bronze',
                      lastActiveDate: new Date().toISOString(),
                      isPremium,
                      subscriptionType: subscriptionType || undefined,
                      dailyXpGoal: goal
                    });
                  } catch (err) {
                    console.error("Error updating daily XP goal on Firestore:", err);
                  } finally {
                    setIsSyncing(false);
                  }
                }
              }}
            />
          )}

          {activeTab === 'docs' && (
            <TechDocs />
          )}
        </main>
      </div>

      {/* TAB NAVIGATION: Bottom Mobile Bar Icons (Smartphone Screen sizes) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-gray-100 lg:hidden py-2 px-4 shadow-2xl">
        <div className="flex items-center justify-between gap-1 text-[10px] font-sans" dir="rtl">
          <button
            onClick={() => handleTabChange('map')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-0.5 rounded-xl transition-all ${
              activeTab === 'map' ? 'text-amber-500 font-black scale-105' : 'text-gray-400'
            }`}
          >
            <Brain className="w-5 h-5" />
            <span>الخريطة</span>
          </button>

          <button
            onClick={() => handleTabChange('textbook')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-0.5 rounded-xl transition-all ${
              activeTab === 'textbook' ? 'text-amber-500 font-black scale-105' : 'text-gray-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>الكتاب</span>
          </button>

          <button
            onClick={() => handleTabChange('leaderboard')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-0.5 rounded-xl transition-all ${
              activeTab === 'leaderboard' ? 'text-amber-500 font-black scale-105' : 'text-gray-400'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span>المتصدرين</span>
          </button>

          <button
            onClick={() => handleTabChange('progress')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-0.5 rounded-xl transition-all ${
              activeTab === 'progress' ? 'text-amber-500 font-black scale-105' : 'text-gray-400'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>نشاطي</span>
          </button>

          <button
            onClick={() => handleTabChange('profile')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-0.5 rounded-xl transition-all ${
              activeTab === 'profile' ? 'text-amber-500 font-black scale-105' : 'text-gray-400'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span>حسابي</span>
          </button>
        </div>
      </nav>

      {/* Full cover Screen Lesson Mode override */}
      <AnimatePresence>
        {activeLesson && (
          <LessonModal 
            lesson={activeLesson}
            onClose={() => setActiveLesson(null)}
            onFinishLesson={handleFinishLesson}
            isPremium={isPremium}
          />
        )}
        {authModalOpen && (
          <AuthModal 
            isOpen={authModalOpen} 
            onClose={() => setAuthModalOpen(false)} 
          />
        )}
        {subscriptionModalOpen && (
          <SubscriptionModal 
            isOpen={subscriptionModalOpen}
            onClose={() => setSubscriptionModalOpen(false)}
            onActivate={handleActivatePremium}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
