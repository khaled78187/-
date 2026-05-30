import React, { useState } from 'react';
import { Sparkles, Brain, Layers, Trash, CheckCircle, PlayCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lesson, SkillNode } from '../types';

interface ConceptConverterProps {
  onInjectNode: (node: SkillNode) => void;
  currentUser: any;
  nodes: SkillNode[];
  onDeleteBook: (bookId: string) => Promise<void>;
  onOpenAuth: () => void;
  isPremium?: boolean;
  hasUsedFreeSmartPath?: boolean;
  onGenerationSuccess?: () => void;
  onOpenSubscription?: () => void;
}

const quickConcepts = [
  { title: 'النسبية الخاصة', icon: '🌌' },
  { title: 'البلوكشين وعقود الإيثيريوم', icon: '🔗' },
  { title: 'خوارزميات فرز البيانات', icon: '⚡' },
  { title: 'التمثيل الضوئي', icon: '🌿' },
  { title: 'علم المحاسبة المزدوجة', icon: '📈' }
];

export default function ConceptConverter({
  onInjectNode,
  currentUser,
  nodes,
  onDeleteBook,
  onOpenAuth,
  isPremium = false,
  hasUsedFreeSmartPath = false,
  onGenerationSuccess,
  onOpenSubscription
}: ConceptConverterProps) {
  const [conceptTitle, setConceptTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [generatedNode, setGeneratedNode] = useState<SkillNode | null>(null);
  const [infoBanner, setInfoBanner] = useState('');

  const handleStartAnalysis = async () => {
    if (!conceptTitle.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisCompleted(false);
    setGeneratedNode(null);

    const steps = [
      'استدعاء الفكر السقراطي وتحديد ماهية المعرفة المطلوبة...',
      'تفكيك المفهوم إلى 5 مراحل متتالية متدرجة الصعوبة خطوة بخطوة...',
      'صياغة خطة دراسية مركزة وتحديد أهداف كل مستوى بعناية...',
      'توليد حزمة من الأسئلة السقراطية الذكية لاختبار الفهم الحقيقي...',
      'تنظيم سند الدعم، وتلميحات سقراط الحكيمة، وتفاسير تصحيح العِثار...',
      'حبك المنهج الدراسي وصياغته على هيئة مراحل تفاعلية جاهزة للعب!'
    ];

    let currentStepIndex = 0;
    setLoadingStep(steps[0]);

    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        
        // Advance steps periodically
        const nextProgress = prev + Math.floor(Math.random() * 8) + 4;
        const stepTrigger = Math.floor((nextProgress / 100) * steps.length);
        if (stepTrigger > currentStepIndex && stepTrigger < steps.length) {
          currentStepIndex = stepTrigger;
          setLoadingStep(steps[currentStepIndex]);
        }
        return nextProgress;
      });
    }, 400);

    try {
      console.log('Starting AI Socratic Analysis for:', conceptTitle);
      
      const response = await fetch("/api/gemini/generate-concept-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptTitle: conceptTitle.trim() }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed API call");
      }

      const data = await response.json();
      const uniqueId = `custom_concept_${Date.now()}`;
      
      // Re-map IDs to prevent conflict in multiple maps
      const nodeWithUniqueId: SkillNode = {
        ...data.node,
        id: uniqueId,
        lessons: data.node.lessons.map((lesson: any, i: number) => ({
          ...lesson,
          id: `textbook_level_${uniqueId}_${i + 1}`,
          questions: (lesson.questions || []).map((q: any, qIdx: number) => ({
            ...q,
            id: `concept_q_${uniqueId}_${i + 1}_${qIdx + 1}`
          }))
        }))
      };

      setGeneratedNode(nodeWithUniqueId);
      
      setAnalysisProgress(100);
      setIsAnalyzing(false);
      setAnalysisCompleted(true);
      setInfoBanner(`تم صياغة مسار التعلم التدرجي لـ "${conceptTitle}" بنجاح فائق وتوليد المستويات سقراطياً بدقة 100% عبر ذكاء جيمناي (Gemini AI)! 🚀`);
      if (onGenerationSuccess) {
        onGenerationSuccess();
      }
    } catch (err: any) {
      console.warn("Real Gemini concept parsing is currently offline or unconfigured. Triggering local backup generation gracefully...", err);
      clearInterval(progressInterval);

      try {
        // Perform local fallback curriculum generation based on the concept requested
        const uniqueId = `custom_concept_${Date.now()}`;
        const plansCount = 5;
        const lessonTitles = [
          `المرحلة الأولى: ركائز المدخل وأوليات الفهم لـ ${conceptTitle}`,
          `المرحلة الثانية: صياغة المفاهيم وبناء الأساسيات العميقة لـ ${conceptTitle}`,
          `المرحلة الثالثة: تمحيص الآليات والعقد الوظيفية للـ ${conceptTitle}`,
          `المرحلة الرابعة: المهارات المتقدمة والتتبع المعرفي لحالات ${conceptTitle}`,
          `المرحلة الخامسة: ذروة التمكين وتطبيقات الموازنة الحكيمة في ${conceptTitle}`
        ];

        const lessons: Lesson[] = [];
        for (let i = 1; i <= plansCount; i++) {
          lessons.push({
            id: `textbook_level_${uniqueId}_${i}`,
            title: lessonTitles[i - 1],
            xpReward: 30 + (i * 10),
            questions: [
              {
                id: `concept_q_${uniqueId}_${i}_1`,
                type: 'multiple_choice',
                prompt: `بناءً على أول نقاش عقلي لـ ${conceptTitle} في المستوى (${i})، ما هو المنظور التأسيسي الأكثر رصانة؟`,
                options: [
                  "تفكيك المكونات وبناؤها تدرجياً من القاعدة للقمة",
                  "التحزب المسبق للأمور قبل اختبار الحجج والبراهين",
                  "الجمود عند المعطيات الأولية دون غوص عقلي",
                  "افتراض عدم الحاجة للتمحيص العلمي المقارن"
                ],
                correctAnswer: "تفكيك المكونات وبناؤها تدرجياً من القاعدة للقمة",
                hint: "يبدأ الفكر السليم دائماً بتفكيك القضايا ثم عودتها إلى جذورها اليقينية الأسهل تدرجاً.",
                explanation: "يقول سقراط: المعرفة هي فضيلة الفهم، والفضيلة تتطلب رصانة البناء على صخرة الحقائق الواضحة والخطوات المحكمة خطوة بخطوة."
              },
              {
                id: `concept_q_${uniqueId}_${i}_2`,
                type: 'true_false',
                prompt: `هل يصح القول بأن التفكير التدرجي التفكيكي هو الباعث الأهم للمكاشفة السقراطية لـ ${conceptTitle}؟`,
                correctAnswer: true,
                hint: "ركز في فلسفة التفكير من تحت لأعلى.",
                explanation: "أجل، فالفكر المعقد يستلزم بالضرورة تبسيطاً معيارياً يحلل التفاصيل الدقيقة كفصوص مستقلة قبل معالجتها الكلية."
              },
              {
                id: `concept_q_${uniqueId}_${i}_3`,
                type: 'multiple_choice',
                prompt: `عند بلوغنا عمق المعيار السلوكي لـ ${conceptTitle} في المستوى (${i})، يتضح أن الهدف الأسمى للدارس الحكيم هو:`,
                options: [
                  "تطبيقات عقلية وحلول واقعية ترتقي بالمجتمعات والعلوم",
                  "تخزين المصطلحات الجافة لأجل المكاسب اللحظية فقط",
                  "التسليم الأعمى للسطوح المعرفية دون نقد",
                  "الابتعاد الكامل عن غمار التمحيص المعرفي"
                ],
                correctAnswer: "تطبيقات عقلية وحلول واقعية ترتقي بالمجتمعات والعلوم",
                hint: "دائماً ما يربط سقراط المعرفة بالمنفعة الفاضلة والتطبيق الأخلاقي والعلمي الحقيقي.",
                explanation: "العلم والتحليل الحقيقي للـ " + conceptTitle + " لا يقتصران على الفهم الجاف، بل السعي لتسييله في حلول وتطبيقات تبهر العالم."
              },
              {
                id: `concept_q_${uniqueId}_${i}_4`,
                type: 'scramble_order',
                prompt: "أعد ترتيب هذه الحكمة السقراطية البليغة حول فهم القضايا الصعبة وتذويب عثارها وعقدها:",
                items: ["تدرج خطوة بخطوة", "يفتح لك", "مغاليق العلوم", "كلها بالتبصير"],
                correctOrder: ["تدرج خطوة بخطوة", "يفتح لك", "مغاليق العلوم", "كلها بالتبصير"],
                hint: "البداية بالتدرج الهادئ والمنظم.",
                explanation: "الحكمة العميقة تتجلى في الصبر المعرفي وبناء الأسس الأيسر فالأيسر."
              }
            ]
          });
        }

        const nodeWithUniqueId: SkillNode = {
          id: uniqueId,
          title: `مسار إتقان تدرجي لـ ${conceptTitle}`,
          description: `خطة دراسية سقراطية مكثفة ومفككة لمعالجة كافة جوانب ومغازي ${conceptTitle} في ${plansCount} مستويات تدرجية.`,
          levelCount: plansCount,
          icon: '🏛️',
          lessons: lessons,
          requiredNodes: []
        };

        setGeneratedNode(nodeWithUniqueId);
        setAnalysisProgress(100);
        setIsAnalyzing(false);
        setAnalysisCompleted(true);
        setInfoBanner("تم استخدام التوليد المعرفي الذكي السريع للتشغيل، تفحص وصمم ما تريد! 💡 (لتفكيك المسار بدقة لا نهائية عبر جيمناي، يرجى ملء مفتاح GEMINI_API_KEY في الإعدادات)");
        if (onGenerationSuccess) {
          onGenerationSuccess();
        }
      } catch (fallbackErr: any) {
        console.warn("Error inside fallback generation", fallbackErr);
        clearInterval(progressInterval);
        setIsAnalyzing(false);
      }
    }
  };

  const myConcepts = nodes.filter(n => n.id.startsWith('custom_concept_'));

  const handleActiveGenerated = () => {
    if (generatedNode) {
      onInjectNode(generatedNode);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8" dir="rtl">
      {/* Top Title Banner */}
      <div className="bg-gradient-to-l from-amber-500 to-orange-500 rounded-3xl p-6 md:p-8 text-white text-right space-y-2 relative overflow-hidden shadow-md shadow-amber-500/15" id="socratic-study-map-banner">
        <div className="absolute -left-10 -bottom-10 opacity-15">
          <Brain className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-2 flex-row-reverse justify-end">
          <span className="text-xl md:text-2xl">🏛️</span>
          <h2 className="text-lg md:text-2xl font-black">منشئ الخرائط ومسارات الدراسة الذكية (سقراط الذكي)</h2>
        </div>
        <p className="text-xs md:text-sm text-amber-50 leading-relaxed max-w-2xl font-medium">
          اكتب هنا أي فكرة أو علم أو درس عسير على الفهم، وسيقوم ذكاء "سقراط تالاس" بتفتيتها لك إلى مستويات لعب، وحبكة تدريجية غامرة بالأسئلة السقراطية التفاعلية فوراً!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Panel */}
        {!isPremium && hasUsedFreeSmartPath ? (
          <div className="lg:col-span-2 bg-gradient-to-br from-amber-50/40 via-orange-50/10 to-transparent border-2 border-dashed border-amber-300 p-6 md:p-8 rounded-3xl text-center space-y-5 flex flex-col justify-center items-center shadow-xs" id="concept-generator-locked">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center text-3xl border border-amber-200">
              👑
            </div>
            <div className="space-y-2">
              <h3 className="text-sm md:text-base font-extrabold text-gray-800">لقد استثمرت تجربتك المجانية في تفكيك المفاهيم! 🏛️</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
                لقد قمت بتجربة <strong>منشئ خرائط ومسارات الدراسة الذكية</strong> لمرة واحدة كعضو مرن. لمواصلة تفكيك وصياغة مسارات لانهائية لأي درس أو مفهوم، يرجى بالانضمام إلى باقة <strong>"سقراط بلس (Socrates Plus)"</strong> ليتسع لك الأفق العقلي الكامل.
              </p>
            </div>
            <button
              onClick={onOpenSubscription}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-3 px-6 rounded-2xl text-xs shadow-md shadow-amber-500/15 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-1.5"
            >
              👑 <span>انضم إلى سقراط بلس وافتح الميزات بالكامل</span>
            </button>
          </div>
        ) : (
          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 block">ما هو الدرس أو المفهوم الذي تود دراسته اللحظة؟</label>
              <div className="relative">
                <input
                  type="text"
                  value={conceptTitle}
                  onChange={(e) => setConceptTitle(e.target.value)}
                  placeholder="مثال: نظرية الكوانتم، الحرب الباردة، خوارزميات البحث، الكيمياء العضوية..."
                  className="w-full rounded-2xl border-2 border-gray-150 p-4 pl-12 text-xs md:text-sm font-sans focus:border-amber-400 outline-hidden focus:ring-0 leading-relaxed text-gray-700 font-bold placeholder-gray-300 shadow-3xs"
                  disabled={isAnalyzing}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Quick recommendations */}
            <div className="space-y-2">
              <label className="text-[10px] md:text-xs font-black text-gray-400 block">أفكار ومفاهيم ممتعة نقترحها لك لبدء التفحص:</label>
              <div className="flex flex-wrap gap-2 justify-start">
                {quickConcepts.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => setConceptTitle(item.title)}
                    disabled={isAnalyzing}
                    className="bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-gray-600 hover:text-amber-800 text-[11px] font-bold py-1.5 px-3 rounded-full transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                  >
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt action button */}
            <button
              onClick={handleStartAnalysis}
              disabled={!conceptTitle.trim() || isAnalyzing}
              className={`w-full py-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_0_0_#D97706] cursor-pointer ${
                !conceptTitle.trim() || isAnalyzing
                  ? 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed border-2 border-gray-100'
                  : 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-[1.01]'
              }`}
            >
              <Sparkles className="w-5 h-5 text-amber-100 animate-pulse" />
              <span>تفكيك المفهوم وصياغته لمراحل لعب فورا</span>
            </button>

            {/* Analysis indicator and loader state UI */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-amber-50/30 border-2 border-dashed border-amber-200 p-5 rounded-2xl space-y-4"
                >
                  <div className="flex items-center justify-between flex-row-reverse">
                    <span className="text-xs font-black text-amber-800">جاري وضع الفروض وتفصيل المستويات...</span>
                    <span className="text-xs font-mono font-bold text-amber-600">{analysisProgress}%</span>
                  </div>
                  
                  {/* Visual Arabic progress bar */}
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${analysisProgress}%` }}
                      transition={{ ease: "easeOut", duration: 0.3 }}
                    />
                  </div>

                  <p className="text-[11px] text-gray-500 text-center animate-pulse leading-relaxed font-black">
                    💬 "{loadingStep}"
                  </p>
                </motion.div>
              )}

              {analysisCompleted && generatedNode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50/20 border-2 border-emerald-200 p-5 rounded-2xl space-y-4"
                >
                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs md:text-sm text-emerald-800">جاهز ومتاح للمذاكرة خطوة بخطوة</h4>
                      <p className="text-[11px] text-emerald-950/70 leading-relaxed mt-1">{infoBanner}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between flex-row-reverse">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold">اسم المسار الجديد</span>
                      <h5 className="font-black text-xs md:text-sm text-gray-800 mt-0.5">{generatedNode.title}</h5>
                    </div>
                    <button
                      onClick={handleActiveGenerated}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      تفقد خريطة اللعب وباشر التعلم
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Socratic Pedagogy Info banner */}
        <div className="bg-amber-50/30 border-2 border-dashed border-amber-200/50 rounded-2xl p-5 flex flex-col justify-between" id="socratic-conceptual-wisdom">
          <div className="space-y-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">🏛️</span>
            </div>
            <h3 className="font-black text-sm text-gray-800 text-right">مدرسة سقراط للتعلم التدرجي</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed antialiased">
              يقول سقراط: "إن تجميع الشذرات العقلية دون نظام رصين يثير الغبش في البصيرة".
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed antialiased">
              عندما تطلب فهماً لدرس أو مفهوم، يجهود ذكاءنا الاصطناعي لتجزئة الفكرة لعقد واضحة:
            </p>
            <ul className="text-[10px] text-gray-500 space-y-2">
              <li className="flex items-start gap-1.5 flex-row-reverse">
                <span className="text-amber-500 shrink-0">✦</span>
                <span><strong>التدرج الصديق للمخ</strong>: نبدأ معك بـ (بسيط فمتوسط فعميق) وليس جرعة واحدة ثقيلة.</span>
              </li>
              <li className="flex items-start gap-1.5 flex-row-reverse">
                <span className="text-amber-500 shrink-0">✦</span>
                <span><strong>تحديات الألعاب</strong>: يتم تجهيز أسئلة بليغة لفحص فهمك على امتداد المراحل وتحث العقل لتوليد الأفكار.</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-amber-200/30 pt-4 mt-6 flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>تفكيك المعارف V3.2</span>
            <span>ذكاء سقراط</span>
          </div>
        </div>
      </div>

      {/* Cloud bookshelf of generated concept roadmaps */}
      <div className="border-t border-gray-150 pt-8 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 flex-row-reverse">
          <div className="text-right">
            <h3 className="text-sm md:text-base font-black text-gray-800 flex items-center gap-2 justify-end">
              <span>مسارات دراستك ومفاهيمك المخلقة</span>
              <Layers className="w-5 h-5 text-amber-500" />
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">المناهج والمسارات التعليمية التي تم معالجتها وتأليفها خصيصاً بمحبتك.</p>
          </div>
          
          {currentUser && (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-100/50">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>الحفظ السحابي مفعل ومحمي</span>
            </div>
          )}
        </div>

        {!currentUser ? (
          <div className="bg-amber-50/15 border border-dashed border-amber-200 p-6 rounded-2xl text-center space-y-3">
            <span className="text-2xl block">🌐</span>
            <h4 className="font-extrabold text-xs text-amber-800">تريد مزامنة مفاهيمك عبر الأجهزة؟</h4>
            <p className="text-[10px] md:text-[11px] text-amber-950/70 leading-relaxed max-w-md mx-auto">
              سجل حسابك السقراطي المجاني لتضمن حفظ وتحميل أي مفهوم تقوم بإنشائه في خوادم Google Cloud بأمان دون فقدان البيانات نهائياً.
            </p>
            <button
              onClick={onOpenAuth}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] md:text-xs py-2 px-5 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              تسجيل الدخول / إنشاء حساب مجاني
            </button>
          </div>
        ) : (
          myConcepts.length === 0 ? (
            <div className="bg-gray-50/50 border-2 border-dashed border-gray-150 p-8 rounded-2xl text-center">
              <span className="text-3xl block filter grayscale">📚</span>
              <h4 className="font-extrabold text-xs text-gray-400 mt-2">رفك الدراسي خالٍ حتى اللحظة</h4>
              <p className="text-[10px] text-gray-405/80 leading-relaxed max-w-xs mx-auto mt-1">
                اكتب مفهوماً أو درساً تروم دراسته بالأعلى وسنسعى لصياغته لك فوراً وتخزينه في رفك المعرفي.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myConcepts.map((node) => (
                <div
                  key={node.id}
                  className="bg-white border border-gray-150 p-5 rounded-2xl shadow-3xs flex flex-col justify-between hover:border-amber-300 transition-all hover:shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex gap-2.5 items-start flex-row-reverse text-right">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-200 flex items-center justify-center text-lg shrink-0">
                        {node.icon || '🏛️'}
                      </div>
                      <div>
                        <h4 className="font-black text-xs md:text-sm text-gray-800 tracking-tight leading-snug">
                          {node.title}
                        </h4>
                        <span className="text-[9px] text-gray-400 font-bold block mt-0.5">{node.levelCount} مستويات تدرجية</span>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-gray-400 leading-relaxed text-right line-clamp-2 min-h-[30px]">
                      {node.description || 'منهج مخصص ومفكك خطوة بخطوة.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 mt-4 flex items-center justify-between flex-row-reverse gap-2">
                    <button
                      onClick={() => onInjectNode(node)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] py-1.5 px-3 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center gap-1.5"
                    >
                      <PlayCircle className="w-3.5 h-3.5 fill-amber-100" />
                      <span>دراسة هذا المفهوم</span>
                    </button>
                    
                    <button
                      onClick={async () => {
                        if (confirm('هل أنت متأكد من حذف هذا المسار الدراسي نهائياً من حسابك السحابي وقاعدة البيانات؟')) {
                          await onDeleteBook(node.id);
                        }
                      }}
                      className="text-gray-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                      title="حذف المسار"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
