import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Lightbulb, History, Lock, Milestone, CheckCircle2, ChevronLeft, Zap, Star, Atom, Award } from 'lucide-react';
import { SkillNode } from '../types';
import { getFailedQuestions } from '../utils/reviewStorage';

interface SkillMapProps {
  nodes: SkillNode[];
  completedNodes: string[];
  completedLessons: string[];
  currentNodeId: string;
  onSelectLesson: (nodeId: string, lessonId: string) => void;
}

const ICON_MAP: Record<string, any> = {
  Brain: Brain,
  Lightbulb: Lightbulb,
  History: History,
  philosophy_pill_icon: Brain,
  history_castle_icon: History,
  biology_dna_icon: Atom,
  religion_crescent_icon: Milestone,
  scientists_bulb_icon: Lightbulb,
  history_leader_icon: Award
};

const SOCRATES_IMAGE = "/src/assets/images/socrates_mascot_1779799311922.png";

export default function SkillMap({ nodes, completedNodes, completedLessons = [], currentNodeId, onSelectLesson }: SkillMapProps) {
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredPath, setHoveredPath] = useState<{ id: string; fromTitle: string; toTitle: string; progress: number; x: number; y: number } | null>(null);
  const [selectedPathLesson, setSelectedPathLesson] = useState<{
    nodeId: string;
    lesson: any;
    chapterTitle: string;
    isUnlocked: boolean;
    isCompleted: boolean;
  } | null>(null);
  const pathContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePositions = () => {
      if (!pathContainerRef.current) return;
      const containerRect = pathContainerRef.current.getBoundingClientRect();
      const newPositions: Record<string, { x: number; y: number }> = {};
      
      nodes.forEach(node => {
        const btn = document.getElementById(`node-btn-${node.id}`);
        if (btn) {
          const btnRect = btn.getBoundingClientRect();
          newPositions[node.id] = {
            x: btnRect.left + btnRect.width / 2 - containerRect.left,
            y: btnRect.top + btnRect.height / 2 - containerRect.top
          };
        }
      });
      setNodePositions(newPositions);
    };

    updatePositions();

    const t1 = setTimeout(updatePositions, 100);
    const t2 = setTimeout(updatePositions, 500);

    window.addEventListener('resize', updatePositions);
    
    let resizeObserver: ResizeObserver | null = null;
    if (pathContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updatePositions();
      });
      resizeObserver.observe(pathContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', updatePositions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [nodes]);

  const isUnlocked = (node: SkillNode) => {
    // A node is unlocked if it has no pre-reqs, or if all its prerequisites are completed
    if (node.requiredNodes.length === 0) return true;
    return node.requiredNodes.every((id) => completedNodes.includes(id));
  };

  const getNodeProgression = (node: SkillNode) => {
    if (completedNodes.includes(node.id)) return 100;
    const nodeLessons = node.lessons || [];
    if (nodeLessons.length === 0) return 0;
    const completedCount = nodeLessons.filter(l => completedLessons.includes(l.id)).length;
    return (completedCount / nodeLessons.length) * 100;
  };

  const handlePathClick = (fromNode: SkillNode, toNode: SkillNode) => {
    setSelectedNode(null);
    const targetLesson = toNode.lessons.find(l => !completedLessons.includes(l.id)) || toNode.lessons[0];
    const unlocked = isUnlocked(toNode);
    setSelectedPathLesson({
      nodeId: toNode.id,
      lesson: targetLesson,
      chapterTitle: toNode.title,
      isUnlocked: unlocked,
      isCompleted: completedNodes.includes(toNode.id)
    });
  };

  return (
    <div 
      ref={pathContainerRef}
      className="flex flex-col items-center bg-gray-50/50 min-h-[500px] py-10 px-4 relative rounded-3xl border-2 border-gray-100 shadow-inner overflow-hidden" 
      id="skillmap-path"
    >
      {/* Dynamic Background Symmetrical Patterns */}
      <div className="absolute inset-0 select-none opacity-[0.03] pointer-events-none bg-repeat" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.3 2.1c.3 0 .5.2.5.5V13c0 .3-.2.5-.5.5s-.5-.2-.5-.5V3.1L23 33.3c-.2.2-.5.2-.7 0s-.2-.5 0-.7L52.5 2.1h-10.4c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h12.2zM2.1 54.3c0-.3.2-.5.5-.5H13c.3 0 .5.2.5.5s-.2.5-.5.5H3.1l30.2-30.2c.2-.2.2-.5 0-.7s-.5-.2-.7 0L2.1 52.5V42.1c0-.3-.2-.5-.5-.5s-.5.2-.5.5v12.2z' fill='%239ca3af' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")` }}></div>

      <div className="flex flex-col items-center w-full max-w-md relative z-10">
        
        {/* Banner with Socrates Guide */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 mb-10 shadow-sm w-full flex items-center flex-row-reverse gap-4">
          <img 
            src={SOCRATES_IMAGE} 
            alt="Socrates Mascot Guide" 
            className="w-14 h-14 rounded-full border border-amber-100 object-cover bg-amber-50"
            referrerPolicy="no-referrer"
          />
          <div className="text-right flex-1 font-sans">
            <h4 className="font-extrabold text-sm text-amber-800">مرحباً بكل عقل يطلب المعرفة!</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              انقر فوق الدوائر الفلسفية أدناه لعرض مراحل وحصص الفصل. تقدّم وافتح قفل الحكمة والمهارات التالية!
            </p>
          </div>
        </div>

        {/* SVG Path Connector lines */}
        {Object.keys(nodePositions).length < nodes.length ? (
          <div className="absolute h-full w-2 bg-gray-200 left-1/2 -translate-x-1/2 top-10 pointer-events-none rounded-full select-none" style={{ height: '75%' }}></div>
        ) : (
          <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
            {nodes.slice(0, -1).map((node, i) => {
              const fromPos = nodePositions[node.id];
              const toPos = nodePositions[nodes[i + 1].id];
              if (!fromPos || !toPos) return null;

              const dy = toPos.y - fromPos.y;
              const dx = toPos.x - fromPos.x;
              const segmentLength = Math.sqrt(dx * dx + dy * dy) * 1.08;

              // Calculate active path fill progress based on standard node completion logic
              const isToCompleted = completedNodes.includes(nodes[i + 1].id);
              const isFromCompleted = completedNodes.includes(node.id);
              
              let progress = 0;
              if (isToCompleted || isFromCompleted) {
                progress = 100;
              } else {
                progress = getNodeProgression(node);
              }

              const strokeDasharray = segmentLength;
              const strokeDashoffset = segmentLength - (progress / 100) * segmentLength;

              const pathData = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x} ${fromPos.y + dy * 0.45}, ${toPos.x} ${toPos.y - dy * 0.45}, ${toPos.x} ${toPos.y}`;

              return (
                <g key={`path-segment-${node.id}`}>
                  {/* Background Path (Incompleted skeleton) */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Foreground Path (Completed progress) */}
                  <motion.path
                    d={pathData}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    initial={{ strokeDashoffset: segmentLength }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                  {/* Invisible Thicker Path for Hover Interaction */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="24"
                    strokeLinecap="round"
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => handlePathClick(node, nodes[i + 1])}
                    onMouseEnter={(e) => {
                      const rect = pathContainerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setHoveredPath({
                          id: `${node.id}-${nodes[i + 1].id}`,
                          fromTitle: node.title,
                          toTitle: nodes[i + 1].title,
                          progress,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        });
                      }
                    }}
                    onMouseMove={(e) => {
                      const rect = pathContainerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setHoveredPath({
                          id: `${node.id}-${nodes[i + 1].id}`,
                          fromTitle: node.title,
                          toTitle: nodes[i + 1].title,
                          progress,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredPath(null);
                    }}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Path List Rendering */}
        <div className="flex flex-col items-center gap-16 w-full relative z-10">
          {nodes.map((node, index) => {
            const unlocked = isUnlocked(node);
            const completed = completedNodes.includes(node.id);
            const active = node.id === currentNodeId;
            const progress = getNodeProgression(node);
            const NodeIcon = ICON_MAP[node.icon] || Brain;
            
            // Zigzag alignment calculations
            const alignClass = index % 2 === 0 ? 'translate-x-[40px]' : '-translate-x-[40px]';

            // Circular ring stroke dash
            const radius = 38;
            const strokeDash = 2 * Math.PI * radius;
            const strokeOffset = strokeDash - (progress / 100) * strokeDash;

            return (
              <div 
                key={node.id}
                className={`flex flex-col items-center transition-all relative ${alignClass}`}
              >
                {/* Node Button Wrapper with Circle Indicator */}
                <div className="relative">
                  {unlocked ? (
                    <div className="absolute inset-[-6px] rounded-full rotate-[-90deg]">
                      <svg className="w-[92px] h-[92px]">
                        <circle 
                          r={radius} 
                          cx="46" 
                          cy="46" 
                          fill="transparent" 
                          stroke="#E5E7EB" 
                          strokeWidth="6"
                        />
                        <circle 
                          r={radius} 
                          cx="46" 
                          cy="46" 
                          fill="transparent" 
                          stroke="#F59E0B" 
                          strokeWidth="6"
                          strokeDasharray={strokeDash}
                          strokeDashoffset={strokeOffset}
                        />
                      </svg>
                    </div>
                  ) : null}

                  {/* Core Interactive Circle */}
                  <button
                    id={`node-btn-${node.id}`}
                    disabled={!unlocked}
                    onClick={() => {
                      setSelectedPathLesson(null);
                      setSelectedNode(node);
                    }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer relative z-10 ${
                      completed 
                        ? 'bg-amber-500 border-4 border-amber-600 shadow-[0_6px_0_0_#D97706] hover:scale-105 active:scale-95' 
                        : active 
                        ? 'bg-amber-400 border-4 border-amber-500 shadow-[0_6px_0_0_#D97706] hover:scale-105 active:scale-95 animate-pulse'
                        : unlocked
                        ? 'bg-white border-4 border-amber-400 text-amber-500 shadow-[0_6px_0_0_#FBBF24] hover:scale-105 active:scale-95'
                        : 'bg-gray-200 border-4 border-gray-300 text-gray-400 cursor-not-allowed shadow-[0_6px_0_0_#9CA3AF]'
                    }`}
                  >
                    {!unlocked ? (
                      <Lock className="w-6 h-6" />
                    ) : completed ? (
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    ) : (
                      <NodeIcon className={`w-8 h-8 ${active ? 'text-amber-950' : completed ? 'text-white' : 'text-amber-500'}`} />
                    )}

                    {/* Cute notification crown for high activity */}
                    {active && unlocked && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 p-1 rounded-full shadow-md text-amber-950 border border-yellow-500">
                        <Star className="w-3 h-3 fill-yellow-600 border-none" />
                      </span>
                    )}
                  </button>
                </div>

                {/* Subject Title Label */}
                <div className="flex flex-col items-center gap-1">
                  <span className={`mt-3 py-1 px-3.5 rounded-full text-xs font-black shadow-xs font-sans tracking-tight text-center ${
                    completed ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                    active ? 'bg-amber-500 text-white' :
                    unlocked ? 'bg-white text-gray-800 border border-gray-100' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {node.title}
                  </span>
                  
                  {unlocked && (
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      {node.lessons.filter(l => completedLessons.includes(l.id)).length} / {node.lessons.length} مراحل
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Level Details Unit Popup (Duolingo Style Popup) */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-0 md:bottom-2 left-0 right-0 max-w-md mx-auto z-40 p-4"
          >
            <div className="bg-white rounded-2xl border-4 border-amber-500 shadow-2xl p-5 relative font-sans text-right max-h-[85vh] flex flex-col" dir="rtl">
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-3 left-3 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 font-bold hover:bg-gray-200 text-sm transition-all cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3.5 mb-2 border-b border-gray-100 pb-3 justify-end flex-row-reverse text-right">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-800">
                  {ICON_MAP[selectedNode.icon] ? (
                    (() => {
                      const NodeIconComponent = ICON_MAP[selectedNode.icon];
                      return <NodeIconComponent className="w-8 h-8" />;
                    })()
                  ) : <Brain className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-800">{selectedNode.title}</h3>
                  <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                    مراحل القسم: {selectedNode.lessons.length} مراحل متتالية
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                {selectedNode.description}
              </p>

              {/* Smart Review Card */}
              {(() => {
                const failedQuestions = getFailedQuestions(selectedNode.id);
                const hasFailed = failedQuestions.length > 0;
                
                return (
                  <div className={`mb-4 p-3.5 rounded-2xl border-2 flex flex-col gap-2 relative overflow-hidden transition-all ${
                    hasFailed 
                      ? 'bg-amber-50/50 border-amber-300 shadow-sm' 
                      : 'bg-green-50/20 border-gray-100 opacity-90'
                  }`}>
                    {/* Subtle decorative background light effect */}
                    {hasFailed && (
                      <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
                    )}
                    
                    <div className="flex items-center justify-between flex-row-reverse gap-3 text-right">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <span className="text-sm">🎯</span>
                        <span className="font-extrabold text-xs md:text-sm text-gray-800">وضع المراجعة الذكية</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        hasFailed ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      }`}>
                        {hasFailed ? `${failedQuestions.length} أسئلة خاطئة` : 'مكتمل بالكامل ✓'}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-gray-500 leading-relaxed text-right md:text-[12px]">
                      {hasFailed 
                        ? 'يقوم بجمع الأسئلة التي تعثرت بها سابقاً في هذا الفصل لإعادتها وتثبيت الفكرة بحكمة وسهولة.' 
                        : 'عقلك نير ومستوعب لجميع أطروحات هذا الفصل! تظهر هنا الأسئلة التي تعثرت بها سابقاً كفرصة للمراجعة.'}
                    </p>
                    
                    {hasFailed && (
                      <button
                        onClick={() => {
                          onSelectLesson(selectedNode.id, 'review_lesson');
                          setSelectedNode(null);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-4 rounded-xl text-xs md:text-sm shadow-[0_3px_0_0_#D97706] hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>ابدأ المراجعة الفورية وتثبيت الفهم</span>
                        <span>🧠🚀</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Lesson CTA buttons with progressive unlock system */}
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[350px] pr-1.5 scrollbar-thin scrollbar-thumb-amber-200">
                {selectedNode.lessons.map((lesson, idx) => {
                  const isCompleted = completedLessons?.includes(lesson.id);
                  const isPrevCompleted = idx === 0 || completedLessons?.includes(selectedNode.lessons[idx - 1].id);
                  const isLessonUnlocked = isPrevCompleted;
                  const isCurrent = isLessonUnlocked && !isCompleted;

                  return (
                    <button
                      key={lesson.id}
                      disabled={!isLessonUnlocked}
                      onClick={() => {
                        onSelectLesson(selectedNode.id, lesson.id);
                        setSelectedNode(null);
                      }}
                      className={`w-full font-sans font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-between flex-row-reverse gap-4 border text-right cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-[0_4px_0_0_#059669] hover:scale-[1.01]'
                          : isCurrent
                          ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500 shadow-[0_4px_0_0_#D97706] hover:scale-[1.01] font-black'
                          : isLessonUnlocked
                          ? 'bg-white hover:bg-gray-50 text-gray-800 border-amber-200 shadow-[0_4px_0_0_#FBBF24] hover:scale-[1.01]'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-70'
                      }`}
                    >
                      {/* Left Badge: XP reward & completion state */}
                      <span className="flex items-center gap-1.5 font-mono">
                        {isCompleted ? (
                          <span className="bg-emerald-600 text-[10px] text-white px-2 py-0.5 rounded-full font-sans font-extrabold">
                            مكتملة ✓
                          </span>
                        ) : isCurrent ? (
                          <span className="bg-amber-600 text-[10px] text-white px-2 py-0.5 rounded-full font-sans font-extrabold animate-pulse">
                            الحالية ⚡
                          </span>
                        ) : isLessonUnlocked ? (
                          <span className="bg-amber-100 text-[10px] text-amber-800 px-2 py-0.5 rounded-full font-sans font-extrabold">
                            متاحة
                          </span>
                        ) : (
                          <span className="bg-gray-200 text-[10px] text-gray-400 px-2 py-0.5 rounded-full font-sans font-bold">
                            مقفل 🔒
                          </span>
                        )}
                        <span className="text-xs font-bold font-mono">+{lesson.xpReward} XP</span>
                      </span>

                      {/* Right Section: Phase number & title */}
                      <div className="flex items-center gap-2 flex-row-reverse text-right flex-1 min-w-0">
                        <span className="text-xs bg-black/10 rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center font-mono font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-black truncate block">{lesson.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Absolute Side Drawer for Clicked Path */}
      <AnimatePresence>
        {selectedPathLesson && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="absolute top-0 right-0 h-full w-full sm:w-85 md:w-96 bg-white border-l border-amber-100 shadow-2xl z-40 flex flex-col font-sans"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-row-reverse text-right relative">
              <button
                onClick={() => setSelectedPathLesson(null)}
                className="w-7 h-7 bg-gray-50 text-gray-400 hover:text-gray-700 font-bold hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors text-xs cursor-pointer"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 flex-row-reverse text-right">
                <span className="text-lg">🧭</span>
                <span className="font-black text-sm text-gray-800">تفاصيل الدرس الموالي بالمسار</span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5 text-right flex flex-col justify-between">
              <div className="space-y-5">
                {/* Chapter metadata indicator */}
                <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 flex-row-reverse text-right">
                    <Milestone className="w-5 h-5 text-amber-500" />
                    <span className="text-[10px] text-amber-800 font-extrabold bg-amber-100/60 px-2 py-0.5 rounded-md">المحطة المستهدفة</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-800">{selectedPathLesson.chapterTitle}</h4>
                </div>

                {/* Main Lesson Info card */}
                <div className="bg-gray-50/50 border border-gray-150 p-4 rounded-2xl space-y-4 font-sans">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <span className="text-[10px] text-gray-400 font-black tracking-wider uppercase">بيانات الحصة التفاعلية</span>
                    <span className="font-mono text-xs text-amber-600 font-bold text-center leading-none">+{selectedPathLesson.lesson.xpReward} XP</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 font-medium">عنوان الدرس المقترح:</span>
                    <h5 className="font-black text-base text-gray-900 leading-snug">{selectedPathLesson.lesson.title}</h5>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {selectedPathLesson.isUnlocked 
                        ? "هذا الدرس هو مدخلك المعرفي المباشر لترسيخ غايات هذا القسم من المنهج وتجاوز صعوباته بتلقين نير."
                        : "يتطلب مسار الحكمة تسلسلاً منهجياً سليماً، أكمل الدروس والمراحل المعقودة لتصل إلى هذه المآثر النادرة."}
                    </p>
                  </div>

                  {/* Socrates Quote Box */}
                  <div className="border-r-2 border-amber-400 bg-amber-50/20 pr-3.5 py-2.5 rounded-l-xl text-right">
                    <span className="text-[10px] font-black text-amber-600 block mb-1">💡 الغاية السقراطية</span>
                    <p className="text-[11px] text-amber-900 leading-relaxed italic">
                      "المنهاج المتوازن يبنى بتعقب عُقد الصعوبة وحلها بالتفاعل المتدرج، الفوز ليس مجرد إجابة بل منهج وعقل منفتح."
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 space-y-2.5">
                {selectedPathLesson.isUnlocked ? (
                  <button
                    onClick={() => {
                      onSelectLesson(selectedPathLesson.nodeId, selectedPathLesson.lesson.id);
                      setSelectedPathLesson(null);
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-500"
                  >
                    <span>ابدأ الدرس المباشر الآن</span>
                    <Zap className="w-4 h-4 fill-white animate-pulse" />
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <button
                      disabled
                      className="w-full bg-gray-100 text-gray-400 font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm border border-gray-200 flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      <span>المسار مقفل حالياً</span>
                    </button>
                    <p className="text-[11px] text-gray-400 text-center leading-normal">
                      أكمل الفصول والمهارات السابقة لفتح هذا المسار مجدداً وتألق بالريادة!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Absolute Follow-Mouse Tooltip */}
      <AnimatePresence>
        {hoveredPath && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              left: hoveredPath.x,
              top: hoveredPath.y,
              transform: 'translate(-50%, -100%)',
            }}
            className="pointer-events-none z-50 bg-gray-950 text-white text-right p-3 rounded-xl shadow-xl border border-gray-800 text-xs w-60 flex flex-col gap-1 -mt-4 font-sans"
            dir="rtl"
          >
            {/* Tiny arrow pointing down */}
            <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-950 rotate-45 border-r border-b border-gray-800" />
            
            <div className="flex items-center justify-between gap-2 border-b border-gray-850 pb-1.5 mb-1 flex-row-reverse">
              <span className="font-extrabold text-[10px] text-amber-400 uppercase tracking-widest leading-none">اتجاه مسار التعلم</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-sm leading-none">
                {hoveredPath.progress.toFixed(0)}% مكتمل
              </span>
            </div>
            
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-400 font-medium">المرحلة التالية ممتدة إلى:</span>
              <span className="font-black text-xs text-white leading-tight truncate">{hoveredPath.toTitle}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
