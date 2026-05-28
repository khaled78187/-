import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, ShieldAlert, Award, Zap, Trophy, RotateCcw, Volume2, CheckCircle2 } from 'lucide-react';
import { Lesson, Question, SocratesMood } from '../types';
import { playCorrectSound, playIncorrectSound, playSuccessSound, playGameOverSound, playClickSound } from '../utils/audio';
import { SKILL_NODES } from '../data';
import { addFailedQuestion } from '../utils/reviewStorage';

const SOCRATES_IMAGE = "/src/assets/images/socrates_mascot_1779799311922.png";

interface LessonModalProps {
  lesson: Lesson;
  onClose: () => void;
  onFinishLesson: (xpEarned: number, heartsRemaining: number) => void;
  isPremium?: boolean;
}

export default function LessonModal({ lesson, onClose, onFinishLesson, isPremium = false }: LessonModalProps) {
  // Try to load any previously saved state for this specific lesson
  const getSavedState = () => {
    try {
      const saved = localStorage.getItem(`socrates_active_lesson_state_${lesson.id}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading saved lesson state", e);
    }
    return null;
  };

  const savedState = getSavedState();

  const getLessonNodeId = () => {
    if (lesson.id.startsWith('review_')) {
      return lesson.id.replace('review_', '');
    }
    const parentNode = SKILL_NODES.find(node => node.lessons.some(l => l.id === lesson.id));
    return parentNode ? parentNode.id : '';
  };

  const [currentQIndex, setCurrentQIndex] = useState<number>(() => {
    if (savedState && typeof savedState.currentQIndex === 'number' && savedState.currentQIndex < lesson.questions.length) {
      return savedState.currentQIndex;
    }
    return 0;
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedBool, setSelectedBool] = useState<boolean | null>(null);
  
  // Scramble order states
  const [scramblePicks, setScramblePicks] = useState<string[]>([]);
  
  // Image match states
  const [matchSelection, setMatchSelection] = useState<Record<string, string>>({});
  const [activeMatchWord, setActiveMatchWord] = useState<string | null>(null);

  const [hasChecked, setHasChecked] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

  const [hearts, setHearts] = useState<number>(() => {
    if (savedState && typeof savedState.hearts === 'number') {
      return savedState.hearts;
    }
    return 5;
  });

  const [xpEarned, setXpEarned] = useState<number>(() => {
    if (savedState && typeof savedState.xpEarned === 'number') {
      return savedState.xpEarned;
    }
    return 0;
  });

  const [isGameOver, setIsGameOver] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [mascotMood, setMascotMood] = useState<SocratesMood>('neutral');
  const [bubbleText, setBubbleText] = useState<string>('تأمل هذا السؤال بعمق يا بني، فالعقل المتسائل في طليعة الفضيلة العظمى!');
  const [hasShownResumeMessage, setHasShownResumeMessage] = useState(false);

  const currentQ = lesson.questions[currentQIndex];
  const progressPercent = ((currentQIndex) / lesson.questions.length) * 100;

  // Mascot quotes database
  const WELCOME_QUOTES = [
    'المعرفة زاد الروح، وهيكلك الأخلاقي اليوم رائع!',
    'كل خطأ تقع فيه ليس عاراً، بل هو خطوة للأمام في فك لغز الجهل متبوعاً بالحكمة.',
    'هل قلبك عازم على مناقشة التاريخ والعلوم اليوم؟ واصل التركيز!',
    'البحث المستمر هو ما يصنع الأبطال الحقيقيين.'
  ];

  // Auto-save lesson progress to LocalStorage or clean up upon completion/failure
  useEffect(() => {
    if (isFinished || isGameOver || hearts <= 0) {
      localStorage.removeItem(`socrates_active_lesson_state_${lesson.id}`);
    } else {
      const state = {
        currentQIndex,
        hearts,
        xpEarned
      };
      localStorage.setItem(`socrates_active_lesson_state_${lesson.id}`, JSON.stringify(state));
    }
  }, [lesson.id, currentQIndex, hearts, xpEarned, isFinished, isGameOver]);

  useEffect(() => {
    // Generate happy mascot quote on question load
    setMascotMood('neutral');
    
    // Check if we resumed a lesson and should greet them warmly
    if (currentQIndex > 0 && !hasShownResumeMessage) {
      setBubbleText('أهلاً بك مجدداً يا تلميذ المعرفة الصدوق! يسعدني عودتك لتكمل مسيرتك الفكرية من حيث توقفت. لنكمل السير معاً!');
      setHasShownResumeMessage(true);
    } else {
      setBubbleText(WELCOME_QUOTES[Math.floor(Math.random() * WELCOME_QUOTES.length)]);
    }
    
    // Reset specific answers
    setSelectedOption(null);
    setSelectedBool(null);
    setScramblePicks([]);
    setMatchSelection({});
    setActiveMatchWord(null);
    setHasChecked(false);
  }, [currentQIndex]);

  // Voice Speech synthesis trigger
  const triggerVoice = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMCQOptionSelect = (option: string) => {
    if (hasChecked) return;
    playClickSound();
    setSelectedOption(option);
    setMascotMood('thinking');
    setBubbleText('ممتاز! اخترت فكرة. هل أنت موقن بالدليل حول هذا الطرح؟ انقر على زر التحقق لمعرفة النتيجة!');
  };

  const handleBoolSelect = (val: boolean) => {
    if (hasChecked) return;
    playClickSound();
    setSelectedBool(val);
    setMascotMood('thinking');
    setBubbleText(`قررت القول بأن العبارة ${val ? 'صواب' : 'خطأ'}، هل الحجة الفكرية معك بالكامل؟ دعنا نتحقق!`);
  };

  // Scramble block behavior
  const handleScramblePick = (item: string) => {
    if (hasChecked) return;
    playClickSound();
    if (scramblePicks.includes(item)) {
      setScramblePicks(prev => prev.filter(i => i !== item));
    } else {
      setScramblePicks(prev => [...prev, item]);
    }
  };

  // Icon matching behavior
  const handleMatchWord = (word: string) => {
    if (hasChecked) return;
    playClickSound();
    setActiveMatchWord(word);
  };

  const handleMatchImage = (img: string) => {
    if (hasChecked || !activeMatchWord) return;
    playClickSound();
    setMatchSelection(prev => ({
      ...prev,
      [activeMatchWord]: img
    }));
    setActiveMatchWord(null);
  };

  // Verify answer logic
  const handleCheckAnswer = () => {
    if (hasChecked) return;

    let correct = false;

    if (currentQ.type === 'multiple_choice') {
      correct = selectedOption === currentQ.correctAnswer;
    } else if (currentQ.type === 'true_false') {
      correct = selectedBool === currentQ.correctAnswer;
    } else if (currentQ.type === 'scramble_order') {
      correct = JSON.stringify(scramblePicks) === JSON.stringify(currentQ.correctOrder);
    } else if (currentQ.type === 'image_match') {
      // Check count of matched pairs
      let correctMatches = 0;
      currentQ.pairs.forEach(pair => {
        if (matchSelection[pair.word] === pair.image) {
          correctMatches++;
        }
      });
      correct = correctMatches === currentQ.pairs.length;
    }

    setHasChecked(true);
    setIsAnswerCorrect(correct);

    if (correct) {
      playCorrectSound();
      setXpEarned(prev => prev + 5);
      setMascotMood('happy');
      const happyDialogue = currentQ.explanation || 'بوركت خطاك! العقل الممتد وراء الفلسفة والحقيقة يرى النور تلقائياً!';
      setBubbleText(happyDialogue);
      triggerVoice(happyDialogue);
    } else {
      setShouldShake(true);
      const nextHearts = isPremium ? hearts : hearts - 1;
      if (!isPremium) {
        setHearts(nextHearts);
      }
      setMascotMood('sad');
      
      const sadDialogue = `عذراً يا صديقي، الفكرة بحاجة إلى إعادة نظر. التفسير: ${currentQ.explanation || 'أعد تنقيح المبادئ، فالعلم يحتاج إلى التمحيص والتعرف على الحق.'}`;
      setBubbleText(sadDialogue);
      triggerVoice(sadDialogue);

      // Track failed question for Smart Review
      const activeNodeId = getLessonNodeId();
      if (activeNodeId) {
        addFailedQuestion(activeNodeId, currentQ);
      }

      if (!isPremium && nextHearts <= 0) {
        playGameOverSound();
        setTimeout(() => setIsGameOver(true), 1500);
      } else {
        playIncorrectSound();
      }
    }
  };

  const handleContinue = () => {
    playClickSound();
    if (isAnswerCorrect) {
      // If the answer is correct, we proceed to the next question
      if (currentQIndex < lesson.questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        playSuccessSound();
      }
    } else {
      // If the answer is incorrect, the question is returned to them again to answer correctly!
      // We reset all selections for the current question so they can answer again.
      setSelectedOption(null);
      setSelectedBool(null);
      setScramblePicks([]);
      setMatchSelection({});
      setActiveMatchWord(null);
      setHasChecked(false);
      
      // Socrates encourages them and resets the mood
      setMascotMood('neutral');
      setBubbleText('أعد مراجعة السؤال يا بني، فالعقل الصابر يدرك المعرفة بالتمحيص. ابحث عن الدليل الصائب!');
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col font-sans overflow-hidden md:max-w-4xl md:mx-auto md:border-x-4 md:border-gray-100 placeholder-transparent block-lesson" dir="rtl">
      
      {/* Immersive Game Header */}
      <div className="p-4 bg-white border-b-2 border-gray-100 flex items-center justify-between gap-4 flex-row">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Custom Progress Bar */}
        <div className="flex-1 flex items-center gap-2">
          {savedState && currentQIndex > 0 && (
            <span className="text-[10px] bg-amber-500 text-white font-extrabold px-1.5 md:px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-xs border border-amber-400">
              <span className="hidden xs:inline">مستأنف</span>
              <span>🔄</span>
            </span>
          )}
          <div className="flex-1 bg-gray-100 h-4 rounded-full overflow-hidden relative border border-gray-200 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
            />
          </div>
        </div>

        {/* Hearts and XP Trackers */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl text-xs font-mono">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{xpEarned} XP</span>
          </div>

          {isPremium ? (
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-sm border border-amber-400">
              <span>👑 لا نهائي ∞</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`w-5 h-5 ${i < hearts ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-gray-300'}`} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Study Core Canvas */}
      <div className="flex-1 overflow-y-auto p-5 md:p-8 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {!isGameOver && !isFinished ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ 
                opacity: 1, 
                x: shouldShake ? [0, -8, 8, -8, 8, -4, 4, 0] : 0 
              }}
              transition={{
                x: shouldShake ? { duration: 0.4, ease: "easeInOut" } : { duration: 0.3 }
              }}
              onAnimationComplete={() => {
                if (shouldShake) setShouldShake(false);
              }}
              className="flex flex-col gap-6"
            >
              {/* Wise Socrates Speech Bubble and Portrait Mascot Layout */}
              <div className="flex items-start gap-4 flex-row-reverse text-right bg-gradient-to-br from-amber-50/50 to-orange-50/20 p-4 rounded-3xl border border-amber-100">
                <div className="relative flex-shrink-0">
                  <motion.img 
                    animate={{ 
                      y: mascotMood === 'happy' ? [0, -10, 0] : mascotMood === 'sad' ? [0, 4, 0] : [0, 0],
                      scale: mascotMood === 'thinking' ? [1, 1.05, 1] : 1
                    }}
                    transition={{ repeat: mascotMood === 'happy' ? Infinity : 0, duration: 0.6 }}
                    src={SOCRATES_IMAGE} 
                    alt="Socrates Portrait Mascot" 
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-amber-300 object-cover bg-white shadow-md cursor-pointer"
                    onClick={() => triggerVoice(bubbleText)}
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1 -left-1 bg-amber-500 border border-white text-white p-1 rounded-full text-[10px] shadow-sm flex items-center justify-center">
                    <Volume2 className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="flex-1 relative font-sans text-right">
                  {/* Decorative Speach bubble beak */}
                  <div className="absolute top-6 right-[-24px] w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-12 border-l-amber-100"></div>
                  
                  <div className="bg-white border-2 border-amber-100/80 rounded-2xl p-3.5 shadow-xs">
                    <div className="flex items-center justify-between mb-1 text-right flex-row-reverse gap-4">
                      <span className="text-xs text-amber-800 font-extrabold">الحكيم سقراط ينصحك:</span>
                      {currentQ.hint && (
                        <button
                          onClick={() => {
                            playClickSound();
                            setMascotMood('thinking');
                            setBubbleText(`💡 تلميح: ${currentQ.hint}`);
                            triggerVoice(currentQ.hint || '');
                          }}
                          className="text-[10px] md:text-xs font-bold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-all flex items-center gap-1 cursor-pointer"
                          title="عرض تلميح للمساعدة"
                        >
                          <span>تلميح للمساعدة</span>
                          <span>💡</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-gray-700 leading-relaxed font-sans">{bubbleText}</p>
                  </div>
                </div>
              </div>

              {/* Question Headline Prompt */}
              <div>
                <span className="text-[10px] md:text-xs text-amber-700 font-extrabold uppercase bg-amber-50 py-1 px-3 rounded-full border border-amber-200">
                  {currentQ.type === 'multiple_choice' ? 'اختيار من متعدد' :
                   currentQ.type === 'true_false' ? 'تمرين صواب وخطأ' :
                   currentQ.type === 'scramble_order' ? 'ترتيب الأحداث التاريخية' : 'مطابقة المعرفة بالأيقونات'}
                </span>
                <h3 className="text-base md:text-xl font-black text-gray-800 tracking-tight text-right mt-3 font-sans leading-relaxed">
                  {currentQ.prompt}
                </h3>
              </div>

              {/* Multiple Answer layouts Router */}
              <div className="w-full mt-2 font-sans">
                {/* 1. Multiple Choice layout */}
                {currentQ.type === 'multiple_choice' && (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQ.options.map((option, idx) => {
                      const isSelected = selectedOption === option;
                      return (
                        <button
                          key={idx}
                          disabled={hasChecked}
                          onClick={() => handleMCQOptionSelect(option)}
                          className={`p-4 border-2 rounded-2xl text-right font-extrabold text-xs md:text-sm transition-all flex items-center gap-4 flex-row justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-[0_4px_0_0_#D97706] scale-[1.01]' 
                              : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50/50 shadow-[0_4px_0_0_#E5E7EB]'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {['أ', 'ب', 'ج', 'د'][idx]}
                          </span>
                          <span className="font-sans text-right leading-relaxed flex-1 pr-3">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. True / False Layout */}
                {currentQ.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      disabled={hasChecked}
                      onClick={() => handleBoolSelect(true)}
                      className={`p-6 border-2 rounded-2xl text-center font-extrabold text-sm transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                        selectedBool === true
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-[0_4px_0_0_#059669]'
                          : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 shadow-[0_4px_0_0_#E5E7EB]'
                      }`}
                    >
                      <span className="text-2xl">✔️</span>
                      <span className="font-bold text-base font-sans">عبارة صائبة</span>
                    </button>

                    <button
                      disabled={hasChecked}
                      onClick={() => handleBoolSelect(false)}
                      className={`p-6 border-2 rounded-2xl text-center font-extrabold text-sm transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                        selectedBool === false
                          ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-[0_4px_0_0_#E11D48]'
                          : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 shadow-[0_4px_0_0_#E5E7EB]'
                      }`}
                    >
                      <span className="text-2xl">❌</span>
                      <span className="font-bold text-base font-sans">عبارة خاطئة</span>
                    </button>
                  </div>
                )}

                {/* 3. Scramble order list */}
                {currentQ.type === 'scramble_order' && (
                  <div className="flex flex-col gap-5">
                    {/* User picks slots */}
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 min-h-[140px] flex flex-col gap-2.5">
                      <span className="text-[10px] text-gray-400 font-bold block mb-1">الترتيب الزمني أو الحواري المختار:</span>
                      {scramblePicks.length === 0 ? (
                        <div className="text-xs text-gray-400 text-center h-20 flex items-center justify-center">انقر فوق الكتل بالأسفل لتبديل الترتيب المناسب...</div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {scramblePicks.map((pick, i) => (
                            <motion.div
                              layout
                              key={pick}
                              onClick={() => handleScramblePick(pick)}
                              className="bg-amber-50 border-2 border-amber-400 p-2.5 rounded-xl text-amber-900 text-xs md:text-sm font-bold flex items-center justify-between cursor-pointer active:scale-95"
                            >
                              <span className="bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono">{i + 1}</span>
                              <span className="font-sans leading-relaxed">{pick}</span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unselected Pool options */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-gray-400 font-bold block mb-1">الخيارات المتاحة للترتيب:</span>
                      {currentQ.items.map((item) => {
                        const isPicked = scramblePicks.includes(item);
                        return (
                          <button
                            key={item}
                            disabled={hasChecked || isPicked}
                            onClick={() => handleScramblePick(item)}
                            className={`p-3 border-2 rounded-xl text-right text-xs md:text-sm font-extrabold transition-all duration-150 cursor-pointer ${
                              isPicked 
                                ? 'opacity-30 bg-gray-50 border-gray-200 text-gray-400' 
                                : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50 shadow-xs'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Tap-to-match word-picture pairs */}
                {currentQ.type === 'image_match' && (
                  <div className="grid grid-cols-2 gap-6 leading-relaxed">
                    {/* Words column */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] text-gray-400 font-black mb-1">المصطلحات الفلسفية:</span>
                      {currentQ.pairs.map((pair) => {
                        const matched = matchSelection[pair.word];
                        const isSelected = activeMatchWord === pair.word;
                        return (
                          <button
                            key={pair.word}
                            disabled={hasChecked}
                            onClick={() => handleMatchWord(pair.word)}
                            className={`p-3 border-2 rounded-xl text-right text-xs font-extrabold transition-all cursor-pointer ${
                              matched ? 'bg-emerald-50 border-emerald-400 text-emerald-800' :
                              isSelected ? 'bg-amber-100 border-amber-500 text-amber-900' : 'bg-white border-gray-100 text-gray-700'
                            }`}
                          >
                            <span>{pair.word}</span>
                            {matched && <span className="mr-2 text-[10px] bg-emerald-500 text-white py-0.5 px-1.5 rounded-full">√ طُوبق</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Icons column */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] text-gray-400 font-black mb-1">الأيقونات والرموز المناسبة:</span>
                      {currentQ.pairs.map((pair) => {
                        // Check if this image has been selected anywhere
                        const matchingWord = Object.keys(matchSelection).find(key => matchSelection[key] === pair.image);
                        const isMatched = !!matchingWord;
                        return (
                          <button
                            key={pair.image}
                            disabled={hasChecked || isMatched || !activeMatchWord}
                            onClick={() => handleMatchImage(pair.image)}
                            className={`p-3.5 border-2 rounded-xl text-center text-xl transition-all h-12 flex items-center justify-center cursor-pointer ${
                              isMatched ? 'bg-emerald-100 border-emerald-400 opacity-60' :
                              activeMatchWord ? 'bg-amber-50 border-amber-300 hover:bg-amber-100 animate-pulse' : 'bg-white border-gray-100'
                            }`}
                          >
                            <span>{pair.image}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : isGameOver ? (
            /* Game over screen if hearts run out */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center gap-6 py-10 font-sans"
            >
              <div className="bg-rose-100 p-4 rounded-full text-rose-600 animate-bounce">
                <ShieldAlert className="w-16 h-16" />
              </div>
              <h2 className="text-2xl font-black text-rose-950">نفدت منك القلوب المعرفية!</h2>
              <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                لا تحزن يا بطل! الحكمة القديمة تقول: "المعرفة الحقيقية تبدأ بالاعتراف بجهلنا". دعنا نتعافى ونستجمع قوانا ونراجع معلوماتنا للعودة للمنافسة!
              </p>

              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 w-full max-w-sm text-right flex items-center gap-3 flex-row-reverse shadow-2xs">
                <img 
                  src={SOCRATES_IMAGE} 
                  alt="Comforting socrates" 
                  className="w-12 h-12 rounded-full border border-rose-200 object-cover bg-white shadow-xs"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 text-xs text-rose-800 leading-relaxed font-sans">
                  <strong>سقراط يعزّيك:</strong> "يا صديقي المدافع عن الفضيلة، الخطأ ليس نهاية الطريق بل هو بداية التمحيص والوعي بالحجة. سأنتظرك في المحاورة القادمة!"
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-sm mt-4">
                <button
                  onClick={onClose}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-[0_4px_0_0_#be123c] active:translate-y-1 active:shadow-none cursor-pointer"
                >
                  العودة للرئيسية ومراجعة الدرس
                </button>
              </div>
            </motion.div>
          ) : (
            /* Celebrating Finish panel */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center gap-6 py-8 font-sans"
            >
              <div className="bg-amber-100 p-5 rounded-full text-amber-500 shadow-lg animate-pulse">
                <Trophy className="w-16 h-16 fill-amber-300" />
              </div>

              <div>
                <span className="text-xs text-amber-800 font-extrabold bg-amber-50 py-1 px-3.5 border border-amber-200 rounded-full">الدرس مكتمل بنجاح!</span>
                <h2 className="text-2xl font-black text-amber-950 mt-3 font-sans">رائع! أكملت الدرس وحوارات سقراط!</h2>
                <p className="text-xs text-gray-500 mt-1.5">الحكمة ترحب بفضول المبدعين الصغار</p>
              </div>

              {/* Statistics Scoreboards */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm text-right font-sans">
                <div className="bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-amber-800 font-extrabold">مكافأة المعركة</span>
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <p className="text-xl font-bold font-mono text-amber-900">{xpEarned + 20} XP</p>
                  <span className="text-[10px] text-amber-600">+20 مكافأة انهاء الدرس</span>
                </div>

                <div className="bg-emerald-50/75 border border-emerald-200/65 p-4 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-emerald-800 font-extrabold">القلوب المتبقية</span>
                    <Heart className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  </div>
                  <p className="text-xl font-bold font-mono text-emerald-900">{hearts} / 5</p>
                  <span className="text-[10px] text-emerald-600">تقدير ممتاز وذكاء عالٍ</span>
                </div>
              </div>

              {/* Wisdom socrates endorsement */}
              <div className="bg-amber-500 text-white rounded-2xl p-4 w-full max-w-sm text-right flex items-center gap-3.5 shadow-md flex-row-reverse mt-2">
                <img 
                  src={SOCRATES_IMAGE} 
                  alt="Endorsing Socrates" 
                  className="w-12 h-12 rounded-full border border-white object-cover bg-white shadow-sm flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 text-xs leading-relaxed font-sans text-amber-50">
                  <strong>سقراط مغتبط بك:</strong> "يا لك من باهض علم! لقد واجهت الفكر بالحجة العقلية الصواب، واكتسبت فضائل الفلاسفة. الحفاظ على هذا الشغف ثروتك الكبرى!"
                </div>
              </div>

              <div className="w-full max-w-sm mt-3">
                <button
                  onClick={() => onFinishLesson(xpEarned + 20, hearts)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-sm transition-all shadow-[0_5px_0_0_#059669] active:translate-y-1 active:shadow-none cursor-pointer font-sans"
                >
                  حفظ نقاطي ومواصلة التحدي الأسبوعي
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Persistence Duolingo Action Tray Bar */}
      {!isGameOver && !isFinished && (
        <div className={`p-5 border-t-2 border-gray-100 flex items-center justify-between flex-row-reverse transition-all gap-4 font-sans ${
          hasChecked 
            ? isAnswerCorrect 
              ? 'bg-emerald-50 border-emerald-200 animate-slide-up' 
              : 'bg-rose-50 border-rose-200 animate-slide-up'
            : 'bg-white'
        }`}>
          {/* Check verification content indicator */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {hasChecked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-right flex items-start gap-2 flex-row-reverse"
                >
                  <span className="text-xl">{isAnswerCorrect ? '🎉' : '⚠️'}</span>
                  <div>
                    <h4 className={`text-xs md:text-sm font-black ${isAnswerCorrect ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {isAnswerCorrect ? 'إجابة فائقة الصواب يا بطل!' : 'الفكرة المقابلة هي الصواب!'}
                    </h4>
                    <p className="text-[10px] md:text-xs text-gray-500 mt-1 max-w-md leading-relaxed">
                      {isAnswerCorrect ? 'سقراط مسرور بالحس النقدي السليم.' : 'أعد مراجعة التفسير بالفضاء الفكري.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            {!hasChecked && currentQ.hint && (
              <button
                onClick={() => {
                  playClickSound();
                  setMascotMood('thinking');
                  setBubbleText(`💡 تلميح: ${currentQ.hint}`);
                  triggerVoice(currentQ.hint || '');
                }}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border-2 border-amber-300 px-4 py-3.5 rounded-xl font-extrabold text-xs md:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="احصل على تلميح مفيد"
              >
                <span>تلميح</span>
                <span>💡</span>
              </button>
            )}

            {hasChecked ? (
              <button
                onClick={handleContinue}
                className={`px-8 py-3.5 rounded-xl font-extrabold text-xs md:text-sm transition-all cursor-pointer ${
                  isAnswerCorrect 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_0_0_#047857]' 
                    : 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_4px_0_0_#b91c1c]'
                }`}
              >
                متابعة الدرس
              </button>
            ) : (
              <button
                onClick={handleCheckAnswer}
                disabled={
                  (currentQ.type === 'multiple_choice' && selectedOption === null) ||
                  (currentQ.type === 'true_false' && selectedBool === null) ||
                  (currentQ.type === 'scramble_order' && scramblePicks.length === 0) ||
                  (currentQ.type === 'image_match' && Object.keys(matchSelection).length < currentQ.pairs.length)
                }
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none text-white px-8 py-3.5 rounded-xl font-extrabold text-xs md:text-sm transition-all shadow-[0_4px_0_0_#D97706] active:translate-y-1 active:shadow-none duration-150 cursor-pointer"
              >
                التحقق من الإجابة
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
