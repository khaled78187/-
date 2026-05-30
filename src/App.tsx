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
  Crown,
  ShieldCheck
} from 'lucide-react';

import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { testConnection, getUserProgress, saveUserProgress, saveCustomBook, getUserCustomBooks, deleteCustomBook, subscribeToUserProgress } from './lib/userService';

import { SKILL_NODES, MOCK_LEADERBOARD, MOCK_WEEKLY_ACTIVITY } from './data';
import { UserProgress, Lesson, LeaderboardUser, DailyActivity, SkillNode } from './types';
import { playClickSound, playSuccessSound } from './utils/audio';
import { getFailedQuestions, clearFailedQuestions } from './utils/reviewStorage';

// Importing our newly created modular components
import SkillMap from './components/SkillMap';
import LessonModal from './components/LessonModal';
import UserProfile from './components/UserProfile';
import Leaderboard from './components/Leaderboard';
import ConceptConverter from './components/ConceptConverter';
import TechDocs from './components/TechDocs';
import TextbookConverter from './components/TextbookConverter';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import SubscriptionModal from './components/SubscriptionModal';
import socratesAppIcon from './assets/images/socrates_app_icon_1779976695367.png';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'map' | 'leaderboard' | 'progress' | 'profile' | 'docs' | 'textbook' | 'admin'>('map');

  const handleTabChange = (tab: 'map' | 'leaderboard' | 'progress' | 'profile' | 'docs' | 'textbook' | 'admin') => {
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
  const [achievements, setAchievements] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('socrates_unlocked_achievements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Authentication & Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscription States (Premium Access)
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('socrates_is_premium') === 'true';
  });
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'yearly' | 'lifetime' | null>(() => {
    return localStorage.getItem('socrates_sub_type') as 'monthly' | 'yearly' | 'lifetime' | null;
  });
  const [hasUsedFreeSmartPath, setHasUsedFreeSmartPath] = useState<boolean>(() => {
    return localStorage.getItem('socrates_has_used_free_smartpath') === 'true';
  });
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [stripeVerificationState, setStripeVerificationState] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle');

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
  
  // Streak expiration check warning states
  const [showStreakWarning, setShowStreakWarning] = useState<boolean>(false);

  useEffect(() => {
    // We only trigger this warning pop-up once per browser tab session
    const alreadyWarnedThisSession = sessionStorage.getItem('socrates_streak_warned_session');
    
    if (streak > 0 && todayXpEarned === 0 && !alreadyWarnedThisSession) {
      const warningTimer = setTimeout(() => {
        setShowStreakWarning(true);
        sessionStorage.setItem('socrates_streak_warned_session', 'true');
      }, 2500); // 2.5 seconds delay after load for great feedback feel
      return () => clearTimeout(warningTimer);
    } else if (todayXpEarned > 0) {
      // If they earn XP, we can hide the warning immediately as they are now safe!
      setShowStreakWarning(false);
    }
  }, [streak, todayXpEarned]);

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

  // Handle Stripe Checkout redirects: Check success or cancel callback parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('stripe_session_id');
    const cancel = params.get('stripe_cancel');

    if (cancel) {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('تم إلغاء عملية الدفع. نرحب بزيارتك لبوابة الترقية في أي وقت!');
    } else if (sessionId) {
      const verifyStripePayment = async () => {
        setStripeVerificationState('verifying');
        playClickSound();
        try {
          const res = await fetch('/api/stripe/verify-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await res.json();
          if (data.success) {
            setStripeVerificationState('success');
            playSuccessSound();
            setIsPremium(true);
            setSubscriptionType(data.planType || 'yearly');
            localStorage.setItem('socrates_is_premium', 'true');
            localStorage.setItem('socrates_sub_type', data.planType || 'yearly');
            localStorage.setItem('socrates_sub_type_purchased', 'true');

            // Sync user states immediately with Firestore if logged in
            if (currentUser) {
              await saveUserProgress(currentUser.uid, {
                hearts: hearts || 5,
                streak: streak || 3,
                xp: userXp || 1200,
                currentNodeId,
                currentLessonId: '',
                completedLessons,
                completedNodes,
                weeklyActivity,
                league: 'Bronze',
                lastActiveDate: new Date().toISOString(),
                isPremium: true,
                subscriptionType: data.planType || 'yearly',
                subscriptionExpiry: new Date(Date.now() + (data.planType === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
                dailyXpGoal,
                achievements
              });
            }
          } else {
            setStripeVerificationState('failure');
          }
        } catch (err) {
          console.error("Stripe verification failed:", err);
          setStripeVerificationState('failure');
        } finally {
          // Clean the URL queries nicely
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      verifyStripePayment();
    }
  }, [currentUser]);

  // Test connection & Listen to auth state
  useEffect(() => {
    // 1. Validate connection with Firebase on boot as constraint
    testConnection();

    // 2. React to auth changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        // Logged out: reset to guest defaults to avoid carrying over previous user stats
        setUserXp(1200);
        setHearts(5);
        setStreak(3);
        setCompletedLessons([]);
        setCompletedNodes([]);
        setCurrentNodeId(SKILL_NODES[0]?.id || 'sec_philosophy');
        setWeeklyActivity(MOCK_WEEKLY_ACTIVITY);
        setAchievements([]);
        setIsPremium(false);
        setSubscriptionType(null);
        setNodes(SKILL_NODES);
        setHasUsedFreeSmartPath(localStorage.getItem('socrates_has_used_free_smartpath') === 'true');
        localStorage.removeItem('socrates_is_premium');
        localStorage.removeItem('socrates_sub_type');
        localStorage.removeItem('socrates_sub_type_purchased');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 3. Real-time Firestore Stream synchronization
  useEffect(() => {
    if (!currentUser) return;

    setIsSyncing(true);
    const unsubscribeProgress = subscribeToUserProgress(
      currentUser.uid,
      async (progress) => {
        setIsSyncing(false);
        if (progress) {
          // Sync with the incoming real-time document
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
          if (progress.achievements) {
            setAchievements(progress.achievements);
            localStorage.setItem('socrates_unlocked_achievements', JSON.stringify(progress.achievements));
          }
          if (progress.dailyXpGoal) {
            setDailyXpGoal(progress.dailyXpGoal);
            localStorage.setItem('socrates_daily_xp_goal', String(progress.dailyXpGoal));
          }
          
          // Load free smart path usage tracker
          const usedFreePath = !!progress.hasUsedFreeSmartPath;
          setHasUsedFreeSmartPath(usedFreePath);
          if (usedFreePath) {
            localStorage.setItem('socrates_has_used_free_smartpath', 'true');
          } else {
            localStorage.removeItem('socrates_has_used_free_smartpath');
          }

          // Populate premium attributes and verify if unsubscribed or expired
          let hasPrem = !!progress.isPremium;
          if (currentUser && currentUser.email === 'khaledany333@gmail.com') {
            hasPrem = true;
            if (!progress.isPremium || progress.subscriptionType !== 'lifetime') {
              try {
                await saveUserProgress(currentUser.uid, {
                  ...progress,
                  isPremium: true,
                  subscriptionType: 'lifetime',
                  subscriptionExpiry: '2100-01-01T00:00:00.000Z'
                });
              } catch (err) {
                console.error("Failed to sync admin premium status to Firestore:", err);
              }
            }
          } else if (hasPrem && progress.subscriptionExpiry) {
            const expiryTime = new Date(progress.subscriptionExpiry).getTime();
            if (expiryTime < Date.now()) {
              hasPrem = false;
              // Update Firestore quietly to make sure expiration is persisted
              try {
                await saveUserProgress(currentUser.uid, {
                  ...progress,
                  isPremium: false,
                  subscriptionType: undefined,
                  subscriptionExpiry: undefined
                });
              } catch (err) {
                console.error("Expired subscription cleanup failed on streaming update:", err);
              }
            }
          }

          setIsPremium(hasPrem);
          setSubscriptionType(hasPrem ? (progress.subscriptionType || 'yearly') : null);
          if (hasPrem) {
            localStorage.setItem('socrates_is_premium', 'true');
            localStorage.setItem('socrates_sub_type', (currentUser && currentUser.email === 'khaledany333@gmail.com') ? 'lifetime' : (progress.subscriptionType || 'yearly'));
          } else {
            localStorage.removeItem('socrates_is_premium');
            localStorage.removeItem('socrates_sub_type');
          }
        } else {
          // Document does not exist: User registering for the first time via Firebase Auth
          const isAdmin = currentUser && currentUser.email === 'khaledany333@gmail.com';
          const localHasUsed = localStorage.getItem('socrates_has_used_free_smartpath') === 'true';
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
            isPremium: !!isAdmin,
            hasUsedFreeSmartPath: localHasUsed,
            subscriptionType: isAdmin ? 'lifetime' : undefined,
            subscriptionExpiry: isAdmin ? '2100-01-01T00:00:00.000Z' : undefined,
            dailyXpGoal: dailyXpGoal,
            achievements: achievements
          };
          try {
            await saveUserProgress(currentUser.uid, initialProgress);
          } catch (e) {
            console.error("Error saving initial progress for new UID:", e);
          }
        }
      },
      (error) => {
        console.error("Error with real-time progress subscription of Firestore stream:", error);
      }
    );

    // Fetch user-uploaded custom books/nodes from Firestore
    getUserCustomBooks(currentUser.uid).then((books) => {
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
    }).catch(err => {
      console.error("Error loaded custom textbooks on auth sync:", err);
    });

    return () => {
      unsubscribeProgress();
    };
  }, [currentUser]);

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

  // Custom deletion of converted textbook PDFs
  const handleDeleteBook = async (bookId: string) => {
    playClickSound();
    
    // Remove the book from the active nodes map
    setNodes(prev => prev.filter(n => n.id !== bookId));
    
    // If the active node was this book, reset to default node
    if (currentNodeId === bookId) {
      setCurrentNodeId(SKILL_NODES[0]?.id || 'sec_philosophy');
    }

    if (currentUser) {
      setIsSyncing(true);
      try {
        await deleteCustomBook(currentUser.uid, bookId);
      } catch (err) {
        console.error("Error deleting book from Cloud Firestore:", err);
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

    // 5.5 Check newly met achievements
    const newList = [...achievements];
    if (nextHearts === 5) {
      localStorage.setItem('socrates_achievement_perfect_lesson_unlocked', 'true');
      if (!newList.includes('perfect_lesson')) newList.push('perfect_lesson');
    }
    if (nextXp >= 100 && !newList.includes('xp_100')) {
      newList.push('xp_100');
    }
    if (nextStreak >= 3 && !newList.includes('streak_3')) {
      newList.push('streak_3');
    }
    if (nextNodes.length >= 1 && !newList.includes('node_explorer')) {
      newList.push('node_explorer');
    }
    const bestStreak = parseInt(localStorage.getItem('socrates_best_consecutive_correct') || '0', 10);
    if (bestStreak >= 10 && !newList.includes('consecutive_10_correct')) {
      newList.push('consecutive_10_correct');
    }

    if (newList.length !== achievements.length) {
      setAchievements(newList);
      localStorage.setItem('socrates_unlocked_achievements', JSON.stringify(newList));
    }

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
          dailyXpGoal: dailyXpGoal,
          achievements: newList
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
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50/20 text-gray-800 flex flex-col font-sans relative antialiased" dir="rtl">
      
      {/* Top Universal Progress Header for Screens */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-gray-100 px-4 py-3 md:px-8 shadow-sm flex items-center justify-between w-full overflow-hidden select-none">
        
        {/* RIGHT SIDE: Wise Socrates Icon Only */}
        <div 
          className="w-11 h-11 bg-[#FDF8EE] rounded-2xl overflow-hidden border-2 border-amber-400 shadow-3xs flex items-center justify-center shrink-0 cursor-pointer select-none transition-transform hover:scale-105 active:scale-95" 
          onClick={triggerVoiceGreeting} 
          title="انقر لسماع تفاعلات سقراط الحكيم"
        >
          <img src={socratesAppIcon} alt="سقراط" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>

        {/* LEFT SIDE: Global Stats Trays */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isPremium ? (
            <>
              {/* Unlimited Membership Badge - Elegant & Wider */}
              <div 
                onClick={() => setSubscriptionModalOpen(true)}
                className="hidden sm:flex bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl px-6 sm:px-8 py-1.5 md:py-2 items-center justify-center gap-3 border border-amber-400/30 shadow-xs cursor-pointer select-none active:scale-95 transition-all text-right shrink-0 min-w-[140px] sm:min-w-[160px]"
                title="إدارة اشتراك سقراط"
              >
                <div className="flex flex-col leading-tight">
                  <span className="text-[9px] font-black text-amber-100">العضوية</span>
                  <span className="text-[11px] font-black text-white">اللانهاية</span>
                </div>
                <span className="text-base font-bold text-white select-none">∞</span>
              </div>

              <div 
                onClick={() => setSubscriptionModalOpen(true)}
                className="flex sm:hidden bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl px-4 py-1.5 items-center justify-center gap-1 border border-amber-400/30 shadow-3xs cursor-pointer shrink-0 min-w-[100px]"
                title="إدارة اشتراك سقراط"
              >
                <span className="text-[11px] font-black leading-none">اللانهائية ∞</span>
              </div>
            </>
          ) : (
            /* Hearts Tracker Badge - Shown for non-premium to track their 5 hearts */
            <div 
              onClick={handleRefillHearts}
              className="flex bg-[#FFF5F5] hover:bg-rose-50 border border-rose-200/60 rounded-2xl px-3 sm:px-4 py-1 md:py-1.5 items-center justify-center gap-2 shadow-xs cursor-pointer select-none active:scale-95 transition-all shrink-0 min-w-[70px] sm:min-w-[85px] text-right"
              title="انقر لإعادة ملء القلوب لـ 5 قلوب كاملاً 💖"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse shrink-0" />
              <div className="flex flex-col leading-none items-center">
                <span className="font-extrabold text-xs sm:text-sm text-rose-700 font-sans leading-none">{hearts}</span>
                <span className="text-[8px] text-rose-500 font-black leading-none mt-1">قلوب</span>
              </div>
            </div>
          )}

          {/* XP Badge */}
          <div className="flex flex-col items-center justify-center bg-[#FDF8EE] hover:bg-amber-50 border border-amber-200/60 rounded-2xl px-2.5 sm:px-3.5 py-1 text-center min-w-[50px] sm:min-w-[60px] cursor-help select-none shrink-0" title={`نقاط الخبرة الكلية: ${userXp} XP - اليوم: ${todayXpEarned} XP`}>
            <span className="font-black text-xs sm:text-sm text-amber-800 font-mono leading-none">{userXp}</span>
            <span className="text-[9px] text-amber-600 font-black leading-none mt-1">XP</span>
          </div>

          {/* Elegant Snapchat-style Streak Badge */}
          <div 
            className="flex flex-col items-center justify-center bg-[#FCF5F2] hover:bg-orange-50 border border-orange-200/60 rounded-2xl px-2.5 sm:px-3.5 py-1 text-center min-w-[50px] sm:min-w-[60px] cursor-pointer select-none shrink-0 relative"
            onClick={() => {
              playClickSound();
              setShowFlameBurst(true);
              setTimeout(() => setShowFlameBurst(false), 1500);
            }}
          >
            <AnimatePresence>
              {showFlameBurst && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5, y: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: 1.4, y: -15 }}
                  transition={{ duration: 0.8 }}
                  className="absolute text-xs pointer-events-none top-0"
                >
                  ✨
                </motion.span>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-0.5 justify-center leading-none">
              <span className="text-xs sm:text-sm">🔥</span>
              <span className="font-black text-xs sm:text-sm text-orange-700 font-sans">{streak}</span>
            </div>
            <span className="text-[9px] text-orange-500 font-black leading-none mt-1">يوم</span>
          </div>

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
                <Brain className="w-4 h-4" />
                <span>منشئ الخرائط (دراسة مفهوم)</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] py-0.5 px-2 rounded-full font-sans">جديد</span>
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

            {currentUser?.email === 'khaledany333@gmail.com' && (
              <button
                onClick={() => handleTabChange('admin')}
                className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-between flex-row-reverse transition-all active:scale-[0.98] ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-[0_4px_0_0_#4c1d95]'
                    : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <div className="flex items-center gap-2.5 flex-row-reverse font-sans">
                  <ShieldCheck className="w-4 h-4 text-purple-600 group-hover:text-purple-800" />
                  <span>لوحة تحكم الأدمن 👑</span>
                </div>
              </button>
            )}
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
                  <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed font-bold">كل قنوات المعرفة وتفكيك المناهج متاحة لك بلا حدود عقلي أو مادي.</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/20 rounded-2xl border-2 border-amber-200/60 p-4 shadow-sm space-y-2 text-center">
                <div className="flex justify-center text-xl">👑</div>
                <h4 className="font-extrabold text-xs text-amber-800">اشترك في سقراط بلس!</h4>
                <p className="text-[10px] text-amber-950/75 leading-relaxed">
                  افتح قلوباً لا نهائية وميزة تفكيك المناهج السحابية للكتب المدرسية تلقائياً بلا قيود!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSubscriptionModalOpen(true);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition-all text-white font-black py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/15 cursor-pointer"
                >
                  تفعيل عِنان الحكمة 👑
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
                alreadyInjected={false}
                currentUser={currentUser}
                nodes={nodes}
                onDeleteBook={handleDeleteBook}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            ) : (
              <div className="bg-white rounded-3xl border-2 border-gray-150 p-6 md:p-8 shadow-xs text-center space-y-6 max-w-xl mx-auto" dir="rtl">
                <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto border border-amber-200">
                  👑
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg md:text-xl font-extrabold text-gray-800">تفتيت وتحليل الكتب المدرسية (المناهج)</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
                    ارفع أي كتاب مدرسي بصيغة PDF وسيتولى الذكاء الاصطناعي تفصيل فصوله وأبوابه إلى خرائط دراسية سقراطية تفاعلية مذهلة! هذه الميزة حصرية للأعضاء المميزين.
                  </p>
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
                  <span>انضم إلى سقراط بلس وافتح ميزات المناهج ↗</span>
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
            <ConceptConverter 
              onInjectNode={handleInjectNode}
              currentUser={currentUser}
              nodes={nodes}
              onDeleteBook={handleDeleteBook}
              onOpenAuth={() => setAuthModalOpen(true)}
              isPremium={isPremium}
              hasUsedFreeSmartPath={hasUsedFreeSmartPath}
              onOpenSubscription={() => setSubscriptionModalOpen(true)}
              onGenerationSuccess={async () => {
                setHasUsedFreeSmartPath(true);
                localStorage.setItem('socrates_has_used_free_smartpath', 'true');
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
                      hasUsedFreeSmartPath: true,
                      dailyXpGoal,
                      achievements
                    });
                  } catch (err) {
                    console.error("Error saving hasUsedFreeSmartPath progress to Firestore:", err);
                  } finally {
                    setIsSyncing(false);
                  }
                }
              }}
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
              achievements={achievements}
              isPremium={isPremium}
              onProgressUpdated={(updates) => {
                const nextXp = updates.xp !== undefined ? updates.xp : userXp;
                const nextHearts = updates.hearts !== undefined ? updates.hearts : hearts;
                const nextStreak = updates.streak !== undefined ? updates.streak : streak;
                const nextLessons = updates.completedLessons !== undefined ? updates.completedLessons : completedLessons;
                const nextNodes = updates.completedNodes !== undefined ? updates.completedNodes : completedNodes;
                const nextAchievements = updates.achievements !== undefined ? updates.achievements : achievements;

                if (updates.xp !== undefined) setUserXp(updates.xp);
                if (updates.hearts !== undefined) setHearts(updates.hearts);
                if (updates.streak !== undefined) setStreak(updates.streak);
                if (updates.completedLessons !== undefined) setCompletedLessons(updates.completedLessons);
                if (updates.completedNodes !== undefined) setCompletedNodes(updates.completedNodes);
                if (updates.achievements !== undefined) {
                  setAchievements(updates.achievements);
                  localStorage.setItem('socrates_unlocked_achievements', JSON.stringify(updates.achievements));
                }

                if (currentUser) {
                  saveUserProgress(currentUser.uid, {
                    hearts: nextHearts,
                    streak: nextStreak,
                    xp: nextXp,
                    currentNodeId,
                    currentLessonId: '',
                    completedLessons: nextLessons,
                    completedNodes: nextNodes,
                    weeklyActivity,
                    league: 'Bronze',
                    lastActiveDate: new Date().toISOString(),
                    isPremium: isPremium,
                    subscriptionType: subscriptionType || undefined,
                    dailyXpGoal: dailyXpGoal,
                    achievements: nextAchievements
                  }).catch(err => console.error("Error syncing progress updates to Firestore:", err));
                }
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

          {activeTab === 'admin' && (
            <AdminDashboard onBackToMap={() => handleTabChange('map')} />
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
            <Brain className="w-5 h-5" />
            <span>مسار ذكي</span>
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

          {currentUser?.email === 'khaledany333@gmail.com' && (
            <button
              onClick={() => handleTabChange('admin')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-0.5 rounded-xl transition-all ${
                activeTab === 'admin' ? 'text-purple-600 font-black scale-105' : 'text-gray-400'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>الأدمن</span>
            </button>
          )}
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

        {showStreakWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs text-right animate-fade-in" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border-2 border-orange-200 shadow-2xl space-y-4 text-center relative overflow-hidden"
            >
              {/* Decorative top orange bar */}
              <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-550 animate-pulse" />
              
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto border-2 border-orange-100 relative mt-2 animate-bounce">
                <Flame className="w-9 h-9 text-orange-500 fill-orange-500" />
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white">
                  تنبيه!
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800 leading-tight">
                  الـ Streak على وشك الانتهاء اليوم! 🔥
                </h3>
                <p className="text-xs text-gray-400 font-bold">
                  سلسلة أيامك الحالية: {streak} {streak === 1 ? 'يوم واحد' : streak === 2 ? 'يومين متتاليين' : `${streak} أيام`} ✨
                </p>
              </div>

              <div className="bg-amber-50/55 border border-amber-100/70 p-3.5 rounded-2xl text-[11px] text-amber-900 leading-relaxed text-right font-medium">
                تنبّه يا حكيم! لقد بقيت متواصلاً لـ <strong>{streak}</strong> {streak === 1 ? 'يوم' : 'أيام'} دون انقطاع، ولكنك لم تكسب أي نقاط خبرة (XP) اليوم بعد.
                <div className="mt-1.5 font-bold text-orange-850">
                  ⚠️ إذا لم تدرس اليوم، ستفقد هذه السلسلة المتتالية الفريدة غداً!
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setShowStreakWarning(false);
                    setActiveTab('map');
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md shadow-orange-500/10 cursor-pointer"
                >
                  افتح الخريطة وابدأ الدرس الآن 🧠
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setShowStreakWarning(false);
                  }}
                  className="w-full bg-slate-105 hover:bg-slate-200 text-gray-700 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  فهمت، سأحافظ على الشعلة لاحقاً 👍
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {stripeVerificationState !== 'idle' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border-2 border-amber-250 shadow-2xl space-y-5 text-center"
            >
              {stripeVerificationState === 'verifying' && (
                <div className="space-y-4 py-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl animate-spin mx-auto">
                    🌀
                  </div>
                  <h3 className="text-lg font-black text-gray-900">جاري تأكيد عملية الدفع...</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    نقوم بالاتصال الآمن ببوابة Stripe للتحقق من العضوية الحكيمة. نرجو عدم إغلاق المتصفّح.
                  </p>
                </div>
              )}

              {stripeVerificationState === 'success' && (
                <div className="space-y-4 py-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl animate-bounce mx-auto">
                    👑
                  </div>
                  <h3 className="text-lg font-black text-emerald-800">مبارك عليكم سقراط بلس!</h3>
                  <p className="text-xs text-emerald-600 leading-relaxed">
                    تم التحقق من عملية الشراء وتفعيل باقة اشتراكك الممتازة بنجاح!
                  </p>
                  <button
                    onClick={() => setStripeVerificationState('idle')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    دخول مجالس الحكماء 🏛️
                  </button>
                </div>
              )}

              {stripeVerificationState === 'failure' && (
                <div className="space-y-4 py-4">
                  <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-3xl mx-auto">
                    ❌
                  </div>
                  <h3 className="text-lg font-black text-rose-800">فشل التحقق من الدفع</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    لم يكتمل تأكيد المعاملة من خوادم Stripe. إذا تم خصم المبلغ أو واجهت مشكلة، يرجى تشغيل التفعيل الفوري مجانًا، وسيرتقي حسابك فورًا!
                  </p>
                  <button
                    onClick={() => setStripeVerificationState('idle')}
                    className="w-full bg-gray-950 hover:bg-gray-800 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    إغلاق ومتابعة
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
