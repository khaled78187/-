import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Trophy, 
  Calendar, 
  MessageSquare, 
  FolderGit2, 
  Heart, 
  Zap, 
  Award,
  BookOpen,
  Volume2,
  LogIn,
  LogOut,
  RefreshCw,
  UserCheck
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
import SocratesChat from './components/SocratesChat';
import Leaderboard from './components/Leaderboard';
import ProgressCharts from './components/ProgressCharts';
import TechDocs from './components/TechDocs';
import TextbookConverter from './components/TextbookConverter';
import AuthModal from './components/AuthModal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'map' | 'leaderboard' | 'progress' | 'chat' | 'docs' | 'textbook'>('map');

  const handleTabChange = (tab: 'map' | 'leaderboard' | 'progress' | 'chat' | 'docs' | 'textbook') => {
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
              lastActiveDate: new Date().toISOString()
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
    await signOut(auth);
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
          lastActiveDate: new Date().toISOString()
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
        <div className="flex items-center gap-3 font-mono">
          {/* XP Badge */}
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 font-extrabold px-3 py-1.5 rounded-xl text-xs md:text-sm shadow-2xs border border-amber-100">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{userXp} XP</span>
          </div>

          {/* Streak Badge */}
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 font-extrabold px-3 py-1.5 rounded-xl text-xs md:text-sm shadow-2xs border border-orange-100 animate-pulse">
            <Award className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>{streak} أيام</span>
          </div>

          {/* Hearts Status */}
          <div 
            onClick={handleRefillHearts}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 px-3 py-1.5 rounded-xl text-xs md:text-sm shadow-2xs cursor-pointer transition-colors active:scale-95"
            title="انقر لإعادة ملء القلوب"
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span className="font-bold">{hearts}/5</span>
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
                <Calendar className="w-4 h-4" />
                <span>نشاطي الأسبوعي</span>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('chat')}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-between flex-row-reverse transition-all active:scale-[0.98] ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-white shadow-[0_4px_0_0_#D97706]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-row-reverse">
                <MessageSquare className="w-4 h-4" />
                <span>حوار سقراط الذكي</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] py-0.5 px-2 rounded-full font-sans">متصل</span>
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
            <TextbookConverter 
              onInjectNode={handleInjectNode} 
              alreadyInjected={nodes.some(n => n.id === 'custom_textbook_node')}
            />
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard 
              users={MOCK_LEADERBOARD} 
              currentUserXp={userXp} 
            />
          )}

          {activeTab === 'progress' && (
            <ProgressCharts 
              activityData={weeklyActivity} 
              totalXp={userXp} 
              streak={streak} 
            />
          )}

          {activeTab === 'chat' && (
            <SocratesChat />
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
            onClick={() => handleTabChange('chat')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-0.5 rounded-xl transition-all ${
              activeTab === 'chat' ? 'text-amber-500 font-black scale-105' : 'text-gray-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>حوار</span>
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
