import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Sparkles, 
  Check, 
  Code, 
  PlayCircle, 
  Brain,
  Layers,
  HelpCircle,
  UploadCloud,
  ArrowRight,
  RefreshCw,
  FileText
} from 'lucide-react';

import { generateDynamicBookNode, StudyPlan, cleanBookTitle } from '../utils/customTextbookData';
import { SkillNode } from '../types';

interface TextbookConverterProps {
  onInjectNode: (node: SkillNode) => void;
  alreadyInjected: boolean;
  currentUser: any;
  nodes: SkillNode[];
  onDeleteBook: (bookId: string) => Promise<void>;
  onOpenAuth: () => void;
}

export default function TextbookConverter({ 
  onInjectNode, 
  alreadyInjected,
  currentUser,
  nodes,
  onDeleteBook,
  onOpenAuth
}: TextbookConverterProps) {
  const [bookTitle, setBookTitle] = useState<string>('فيزياء الصف العاشر.pdf');
  const [customText, setCustomText] = useState<string>('');
  
  // Applet state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [activeLevelTab, setActiveLevelTab] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [injectedNotification, setInjectedNotification] = useState(false);

  // File Upload and Text Extraction States
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string>("");
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Generated dynamic curriculum state
  const [generatedNode, setGeneratedNode] = useState<SkillNode | null>(null);
  const [generatedPlans, setGeneratedPlans] = useState<StudyPlan[]>([]);

  const ANALYSIS_STEPS = [
    "قراءة وفهرسة صفحات المنهج واستخراج هيكل المخطوطة التعليمية...",
    "استخلاص وتلخيص أطروحات المنهج وصياغة الركائز والمفاهيم الأساسية...",
    "تقسيم المجلد التعليمي إلى مستويات تدرجية (من الأساسيات إلى التقدم المعرفي)...",
    "توليد حزم تفاعلية لكل مستوى (صحيح وخطأ، خيارات متعددة، وتوجيهات)...",
    "صياغة وهندسة كود الـ JSON المتكامل والمطابق تماماً لنظام السند بقواعد بيانات سقراط..."
  ];

  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  // Load PDF.js from CDN dynamically on demand
  const loadPdfjs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        // Correctly initialize worker
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        resolve(pdfjs);
      };
      script.onerror = () => reject(new Error("حدث خطأ أثناء الاتصال بمكتبة تحليل ملفات PDF الفنية."));
      document.head.appendChild(script);
    });
  };

  // Perform client-side PDF text extraction to read actual textbook chapters
  const handleProcessPdfFile = async (file: File) => {
    setIsExtractingPdf(true);
    setExtractionError(null);
    setExtractedPdfText("");
    const friendlyName = file.name.replace(/\.[^/.]+$/, "");
    setBookTitle(friendlyName);
    setUploadedFileName(file.name);

    try {
      const pdfjs = await loadPdfjs();
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = "";
      const totalPages = pdf.numPages;
      // Read a rich sample of up to 45 pages to extract headers, tables of content, and deep passages
      const pagesToRead = Math.min(totalPages, 45);
      
      for (let i = 1; i <= pagesToRead; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n";
        } catch (pageErr) {
          console.warn(`Failed to parse page ${i}`, pageErr);
        }
      }
      
      const cleanedText = fullText.trim();
      if (cleanedText.length === 0) {
        throw new Error("لم نجد نصوصاً قابلة للقراءة في هذا الكتاب المرفق (قد يكون ملف صور ممسوحة ضوئياً فقط دون طبقة نصوص).");
      }
      
      setExtractedPdfText(cleanedText);
    } catch (err: any) {
      console.warn("PDF parsing failed client-side, proceeding with title-based analysis fallback:", err);
      setExtractionError(err?.message || "تعذر استخراج النصوص والكلمات من هذا الملف. سنقوم بتحليله بالكامل اعتماداً على عناوينه وتخمين هيكله المعرفي.");
    } finally {
      setIsExtractingPdf(false);
    }
  };

  // Run real AI analysis using Gemini SDK on the backend
  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisCompleted(false);
    setAnalysisProgress(0);
    setInfoBanner(null);
    setCurrentStepText(ANALYSIS_STEPS[0]);

    const finalTitle = bookTitle || uploadedFileName || "كتاب مخصص";
    const finalPayloadText = customText || extractedPdfText;

    // Start a visual timer for loading percentage
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += 1;
      if (simulatedProgress < 95) {
        setAnalysisProgress(simulatedProgress);
        const stepIndex = Math.min(
          Math.floor((simulatedProgress / 100) * ANALYSIS_STEPS.length),
          ANALYSIS_STEPS.length - 1
        );
        setCurrentStepText(ANALYSIS_STEPS[stepIndex]);
      }
    }, 150);

    try {
      const response = await fetch("/api/gemini/analyze-textbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookTitle: finalTitle, customText: finalPayloadText }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed API call");
      }

      const data = await response.json();
      
      // Assign a unique ID to the generated node and lessons so they don't overwrite each other
      const uniqueId = `custom_book_${Date.now()}`;
      const nodeWithUniqueId: SkillNode = {
        ...data.node,
        id: uniqueId,
        lessons: data.node.lessons.map((lesson: any, i: number) => ({
          ...lesson,
          id: `textbook_level_${uniqueId}_${i + 1}`
        }))
      };

      setGeneratedNode(nodeWithUniqueId);
      setGeneratedPlans(data.plans);
      
      // Complete progress smoothly
      setAnalysisProgress(100);
      setIsAnalyzing(false);
      setAnalysisCompleted(true);
      setInfoBanner("تم تحليل كتابك بنجاح وبناء المنهج وصياغة مستوياته وأسئلته بدقة تامة عبر ذكاء اصطناعي جيمناي (Gemini AI)! 🚀");
    } catch (err: any) {
      console.warn("Real Gemini analysis is currently offline or unconfigured. Triggering local backup generation gracefully...", err);
      clearInterval(progressInterval);

      // Graceful local backup fallback
      const { node, plans } = generateDynamicBookNode(finalTitle, finalPayloadText);
      const uniqueId = `custom_book_${Date.now()}`;
      const nodeWithUniqueId: SkillNode = {
        ...node,
        id: uniqueId,
        lessons: node.lessons.map((lesson: any, i: number) => ({
          ...lesson,
          id: `textbook_level_${uniqueId}_${i + 1}`
        }))
      };

      setGeneratedNode(nodeWithUniqueId);
      setGeneratedPlans(plans);
      
      setAnalysisProgress(100);
      setIsAnalyzing(false);
      setAnalysisCompleted(true);
      setInfoBanner("تم استخدام التوليد المعرفي الذكي السريع للتشغيل، تفحص وصمم ما تريد! 💡 (لتحليل نصوص كتابك الفعلي عبر جيمناي، يرجى ملء مفتاح GEMINI_API_KEY في الإعدادات)");
    }
  };

  // Copy full JSON to Clipboard
  const handleCopyJson = () => {
    if (!generatedNode) return;
    const jsonString = JSON.stringify(generatedNode, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }).catch(err => {
      console.error('Could not copy JSON', err);
    });
  };

  // Inject into user map
  const handleActivateCurriculum = () => {
    if (!generatedNode) return;
    onInjectNode(generatedNode);
    setInjectedNotification(true);
    setTimeout(() => {
      setInjectedNotification(false);
    }, 3000);
  };

  // Drag-and-drop file upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        handleProcessPdfFile(file);
      } else {
        alert("يرجى رفع ملف بصيغة PDF فقط رعايةً لقواعد الأنظمة العلمية.");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleProcessPdfFile(file);
    }
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 p-4 md:p-8 shadow-sm text-right" dir="rtl" id="textbook-converter-panel">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-6 flex-row-reverse">
        <div className="flex gap-3.5 items-center flex-row-reverse">
          <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-[0_4px_12px_rgba(245,158,11,0.2)]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-800">تحليل وتوليد المناهج الدراسية الخاصة بك</h2>
            <p className="text-xs text-gray-500 mt-1">ارفع أي كتاب مدرسي مخصص بصيغة PDF وسيقوم ذكاء سقراط بتفكيكه وتحليله وتصميم فصل ومستوى دراسي تفاعلي لكل وحدة من وحدات الكتاب الحقيقية!</p>
          </div>
        </div>
        
        {analysisCompleted && (
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 font-extrabold px-4 py-2 rounded-xl text-xs border border-emerald-100 self-start md:self-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span>المنهج المتولد مبرهن وجاهز ✓</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW 1: SELECTOR & INITIALIZER */}
        {!isAnalyzing && !analysisCompleted && (
          <motion.div
            key="initializer"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Textbook Inputs */}
              <div className="md:col-span-2 space-y-5">
                <label className="text-xs font-black text-gray-400 block uppercase tracking-wide">بيانات ترويح وتحميل كتابك المدرسي:</label>
                
                <div className="space-y-4">
                  {/* Book Title Input Field */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 block">اسم أو عنوان الكتاب المدرسي:</label>
                    <input 
                      type="text"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="امسح واكتب تاريخ الأندلس، أو كيمياء الصف العاشر، أو أساسيات جافا..."
                      className="w-full rounded-2xl border-2 border-gray-100 p-3.5 text-xs font-sans text-right focus:border-amber-400 outline-hidden focus:ring-0 leading-relaxed text-gray-700 font-bold"
                    />
                  </div>

                  {/* File Upload Area */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative ${
                      dragActive ? 'border-amber-500 bg-amber-50/10' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input 
                      type="file" 
                      id="pdf-upload" 
                      accept=".pdf" 
                      onChange={handleFileInputChange}
                      disabled={isExtractingPdf}
                      className="hidden" 
                    />
                    
                    <label htmlFor="pdf-upload" className={`flex flex-col items-center gap-2 ${isExtractingPdf ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {isExtractingPdf ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                          <p className="text-xs font-bold text-amber-600">جاري قراءة واستخراج نصوص كتابك المدرسي بدقة...</p>
                          <p className="text-[10px] text-gray-400">نقوم بفهرسة صفحات المادة وتصفيتها لمطابقتها للذكاء الاصطناعي...</p>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 bg-gray-50 rounded-full text-gray-400 border border-gray-100">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          {uploadedFileName ? (
                            <div>
                              <p className="text-xs font-bold text-amber-600 flex items-center gap-1 justify-center">
                                <span>{uploadedFileName}</span>
                                <span className="text-emerald-500">✓ جاهز للتحليـل</span>
                              </p>
                              {extractedPdfText && <p className="text-[9px] text-emerald-600 font-bold mt-1">✓ تم استخراج {extractedPdfText.split(/\s+/).length} كلمة بنجاح للتحليل الفيلسوفي الدقيق</p>}
                              <p className="text-[10px] text-gray-400 mt-1">انقر لإعادة رفع أو اختيار ملف PDF آخر</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-gray-700">اسحب وأفلت كتاب الـ PDF هنا أو انقر لتصفحه</p>
                              <p className="text-[10px] text-gray-400 mt-1">يدعم تصفية وعقد فهارس الكتب بذكاء واعد (PDF فقط)</p>
                            </div>
                          )}
                        </>
                      )}
                    </label>
                  </div>

                  {/* Extraction Error Alert */}
                  {extractionError && (
                    <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl text-[11px] text-amber-800 text-right leading-relaxed font-bold">
                      ⚠️ {extractionError}
                    </div>
                  )}

                  {/* Optional Text Content Paste Area */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-gray-400 block">أو الصق هنا ملخصات أو فصولاً نصية للتحويل المباشر (اختياري):</label>
                    <textarea 
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="امسح والصق فصوص المعرفة، أو رؤوس الأقلام، للحصول على صياغة بالغة التوافق ومحكمة البواعث..."
                      rows={4}
                      className="w-full rounded-2xl border-2 border-gray-100 p-4 text-xs font-sans text-right placeholder-gray-300 focus:border-amber-400 outline-hidden focus:ring-0 resize-none leading-relaxed text-gray-600"
                    />
                  </div>
                </div>

                {/* Execute Button */}
                <div className="pt-2">
                  <button
                    onClick={handleStartAnalysis}
                    disabled={!bookTitle.trim() && !uploadedFileName}
                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-[0_4px_0_0_#D97706] cursor-pointer ${
                      !bookTitle.trim() && !uploadedFileName
                        ? 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed border border-gray-100'
                        : 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-[1.01]'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 animate-pulse text-amber-100" />
                    <span>تفكيك الكتاب وبناء المنهج وسند الأسئلة التفاعلي بالفور</span>
                  </button>
                </div>

              </div>

              {/* Socratic Pedagogy Side Card */}
              <div className="bg-amber-50/25 border-2 border-dashed border-amber-200/50 rounded-2xl p-5 flex flex-col justify-between" id="socrates-wisdom-corner">
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🎓</span>
                  </div>
                  <h3 className="font-extrabold text-sm text-gray-800 text-right">فلسفة سقراط في رعاية المناهج</h3>
                  <p className="text-[11px] text-gray-500 antialiased leading-relaxed text-right">
                    الكتب الجامعية والمدرسية الجافة تحمل كمائن ثمينة من المعارف، هدفنا هو توليد منصة تفاعلية مبهرة ومسلية تترجم تلك النصوص إلى:
                  </p>
                  <ul className="text-[10px] text-gray-500 space-y-2 text-right">
                    <li className="flex items-start gap-1.5 flex-row-reverse">
                      <span className="text-amber-500 shrink-0">✦</span>
                      <span><strong>مستويات وفصول متعدة مخصصة</strong> تغطي كل وحدة أو قسم حقيقي في كتابك دون تقييد.</span>
                    </li>
                    <li className="flex items-start gap-1.5 flex-row-reverse">
                      <span className="text-amber-500 shrink-0">✦</span>
                      <span><strong>أسئلة ذكية متنوعة لكل فصل</strong> تفحص عقد الفهم المنهجي وترسخ الحقائق.</span>
                    </li>
                    <li className="flex items-start gap-1.5 flex-row-reverse">
                      <span className="text-amber-500 shrink-0">✦</span>
                      <span>توفير <strong>شروحات وتوجيهات</strong> لسقراط خلف كل هفوة تصحح عثار الدارس وتنمي الوعي.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="border-t border-amber-200/40 pt-4 mt-4 flex items-center justify-between flex-row-reverse text-[10px] text-gray-400">
                  <span>توليد ديكارتي-سند معرفي</span>
                  <span>V3.0</span>
                </div>
              </div>
            </div>

            {/* Cloud Library Bookshelf */}
            <div className="border-t border-gray-150 pt-8" id="socrates-cloud-library">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 flex-row-reverse text-right">
                <div>
                  <h3 className="text-sm md:text-base font-black text-gray-800 flex items-center gap-2 justify-end">
                    <span>رف كتبك ومناهجك السحابية</span>
                    <Layers className="w-5 h-5 text-amber-500" />
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1">هنا يتم مزامنة وحفظ المناهج التعليمية المخزنة على خوادم غوغل كلاود باسمك.</p>
                </div>
                
                {currentUser && (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-100/50">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span>مزامنة قواعد البيانات مفعلة</span>
                  </div>
                )}
              </div>

              {!currentUser ? (
                <div className="bg-amber-50/15 border border-dashed border-amber-200 p-6 rounded-2xl text-center space-y-3">
                  <span className="text-2xl block">🌐</span>
                  <h4 className="font-extrabold text-xs md:text-sm text-amber-800">الحفظ السحابي معطل حالياً</h4>
                  <p className="text-[10px] md:text-[11px] text-amber-950/70 leading-relaxed max-w-md mx-auto">
                    سجل دخولك الآن عبر حسابك لتتمكن من تخزين ومعاينة المناهج المحتوية وجداول الألعاب الخاصة بك في سحابة غوغل فوراً ومن أي جهاز.
                  </p>
                  <button
                    onClick={onOpenAuth}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] md:text-xs py-2 px-5 rounded-xl transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
                  >
                    تسجيل الدخول / إنشاء حساب مجاني
                  </button>
                </div>
              ) : (
                (() => {
                  const customBooks = nodes.filter(n => n.id.startsWith('custom_'));
                  if (customBooks.length === 0) {
                    return (
                      <div className="bg-gray-50/50 border-2 border-dashed border-gray-150 p-8 rounded-2xl text-center">
                        <span className="text-2xl block mb-2">📚</span>
                        <h4 className="font-extrabold text-xs text-gray-500">مكتبتك السحابية فارغة حالياً</h4>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-sm mx-auto">
                          لم تقم بتحويل أي كتب بعد. بمجرد رفع كتاب PDF أو ملخص وتوليده، سيتم حفظه تلقائياً هنا في قاعدة البيانات السحابية للوصول الدائم!
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customBooks.map((book) => (
                        <div 
                          key={book.id} 
                          className="bg-white border-2 border-gray-150/80 rounded-2xl p-4 hover:border-amber-400 hover:shadow-2xs transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-3 flex-row-reverse text-right">
                              <span className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100 shrink-0">
                                <BookOpen className="w-4 h-4" />
                              </span>
                              <div className="flex-1 text-right min-w-0">
                                <h4 className="font-extrabold text-xs text-gray-800 truncate leading-snug" title={book.title.replace('كتاب: ', '')}>
                                  {book.title.replace('كتاب: ', '')}
                                </h4>
                                <span className="text-[9px] text-gray-400 font-bold block mt-0.5">{book.levelCount || 5} مستويات دراسية</span>
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-gray-400 leading-relaxed text-right line-clamp-2 min-h-[30px]">
                              {book.description || 'فصل تفاعلي أوله محكم ومنتظم.'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-gray-100 mt-4 flex items-center justify-between flex-row-reverse gap-2">
                            <button
                              onClick={() => onInjectNode(book)}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center gap-1.5"
                            >
                              <PlayCircle className="w-3.5 h-3.5 fill-amber-100" />
                              <span>تفعيل المنهج ومذاكرته</span>
                            </button>
                            
                            <button
                              onClick={async () => {
                                if (confirm('هل أنت متأكد من حذف هذا المنهج المدرسي نهائياً من حسابك وقاعدة البيانات السحابية؟')) {
                                  await onDeleteBook(book.id);
                                }
                              }}
                              className="text-gray-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                              title="حذف المنهج نهائياً"
                            >
                              <span className="text-xs">🗑️</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>

          </motion.div>
        )}

        {/* VIEW 2: RUNNING AI COMPILER PROGRESS */}
        {isAnalyzing && (
          <motion.div
            key="parsing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center space-y-6"
          >
            {/* Pulsing Mascot Loader */}
            <div className="relative">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center animate-ping absolute top-0 left-0 opacity-20" />
              <div className="w-24 h-24 bg-amber-50 border-2 border-amber-300 rounded-full flex items-center justify-center relative shadow-xs">
                <Brain className="w-10 h-10 text-amber-500 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-lg">
              <h3 className="font-black text-lg text-gray-800 flex items-center gap-2 justify-center">
                <span>يقوم سقراط الآن بمطالعة المخطوطة وسبر فصولها...</span>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
              </h3>
              
              {/* Progress Slider */}
              <div className="w-72 md:w-96 bg-gray-100 h-2 rounded-full overflow-hidden mx-auto mt-2 relative">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-gray-400">{Math.round(analysisProgress)}% من صياغة هيكل السند</p>
            </div>

            {/* Dynamic Step Display */}
            <motion.div 
              key={currentStepText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50/50 border border-gray-100 rounded-xl px-5 py-3 text-xs text-gray-500 font-sans max-w-md antialiased shadow-2xs"
            >
              🚀 {currentStepText}
            </motion.div>

          </motion.div>
        )}

        {/* VIEW 3: CURRICULUM PREVIEW & INJECT SECTION */}
        {analysisCompleted && generatedNode && generatedPlans.length > 0 && (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Gemini API Status Banner */}
            {infoBanner && (
              <div className="bg-amber-50/70 border-2 border-amber-200/50 p-4 rounded-2xl text-xs font-black text-amber-900 flex items-center gap-2 flex-row-reverse text-right leading-relaxed animate-pulse">
                <span>✨</span>
                <span className="flex-1">{infoBanner}</span>
              </div>
            )}

            {/* Top Congratulatory Header */}
            <div className="bg-gradient-to-l from-amber-500/10 to-amber-500/0 border-r-4 border-amber-500 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 flex-row-reverse">
              <div className="space-y-1">
                <h3 className="font-black text-base text-gray-800">اكتمل التوليد المنهجي بنجاح وبصيرة!</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  تم تقسيم كتاب <strong className="text-amber-600">"{cleanBookTitle(bookTitle)}"</strong> بنجاح فائق إلى <strong>٥ مستويات تفاعلية متدرجة</strong> و <strong>{generatedNode.lessons?.reduce((sum, l) => sum + (l.questions?.length || 0), 0) || 20} سؤالاً تفاعلياً</strong> صيغت بلغة ترفيهية ذكية.
                </p>
              </div>

              {/* Action Buttons: Inject Live & Extract JSON */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Activate and Map Redirect Button */}
                <button
                  onClick={handleActivateCurriculum}
                  disabled={alreadyInjected}
                  className={`py-3 px-5 rounded-xl font-black text-xs md:text-sm flex items-center gap-2 cursor-pointer shadow-sm transition-all ${
                    alreadyInjected
                      ? 'bg-emerald-500 text-white shadow-none cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-[1.01] active:scale-[0.98]'
                  }`}
                >
                  <PlayCircle className="w-4 h-4 fill-amber-100" />
                  <span>{alreadyInjected ? "✓ المنهج دمج في شجرتك" : "حقن وإدماج المنهج المخصص لخارطة اللعب"}</span>
                </button>

                {/* Extract JSON */}
                <button
                  onClick={handleCopyJson}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 px-4 rounded-xl font-black text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  title="انسخ كود الـ JSON بالكامل المتوافق مع شجرة سقراط"
                >
                  {copiedNotification ? <Check className="w-4 h-4 text-emerald-500" /> : <Code className="w-4 h-4" />}
                  <span>{copiedNotification ? "تم النسخ!" : "استخراج كود JSON"}</span>
                </button>
              </div>
            </div>

            {/* Notification bubbles */}
            {injectedNotification && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500 text-white p-4 rounded-xl text-center text-xs font-bold shadow-md"
              >
                🎉 عظيم! تم حقن فصل "{cleanBookTitle(bookTitle)}" المكون من 5 مستويات و {generatedNode.lessons?.reduce((sum, l) => sum + (l.questions?.length || 0), 0) || 20} سؤالاً بنجاح في شجرتك التعليمية وتحديث شلال الفضائل! اذهب للتبويب الأول (الخريطة الفلسفية) لخوض الامتحان وتلقي الأوسمة!
              </motion.div>
            )}

            {/* Detailed Levels and Plans Explorer Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Level Tab Selectors */}
              <div className="lg:col-span-1 space-y-3">
                <span className="text-[10px] text-gray-400 font-extrabold block mb-2 uppercase tracking-wider">مستويات وفصول الدورة المخصصة ({generatedPlans.length} فصول)</span>
                
                {generatedPlans.map((plan, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveLevelTab(idx)}
                    className={`w-full p-4 rounded-xl text-right transition-all flex items-center gap-3.5 flex-row-reverse border-2 cursor-pointer ${
                      activeLevelTab === idx
                        ? 'border-amber-500 bg-amber-50/10 shadow-3xs font-black'
                        : 'border-gray-50 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      activeLevelTab === idx ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {plan.levelIndex}
                    </span>
                    <div className="flex-1 text-right">
                      <h4 className="text-xs text-gray-800 font-black truncate">{plan.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">{generatedNode?.lessons?.[idx]?.questions?.length || 4} أسئلة مدمجة كاشفة</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Study Plan Content & Question Display Area */}
              <div className="lg:col-span-2 bg-gray-50/50 border border-gray-100 rounded-2xl p-5 md:p-6 space-y-6">
                
                {/* Active Level Study Guide Card */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 flex-row-reverse">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <Layers className="w-5 h-5 text-amber-500" />
                      <h3 className="font-extrabold text-xs md:text-sm text-gray-800 text-right">
                        الخطة الدراسية التفصيلية: {generatedPlans[activeLevelTab]?.title}
                      </h3>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2.5 py-1 rounded-full shrink-0">
                      صعوبة تدريجية
                    </span>
                  </div>

                  {/* Summary text */}
                  <p className="text-xs text-gray-500 leading-relaxed text-right md:text-sm">
                    {generatedPlans[activeLevelTab]?.summary}
                  </p>

                  {/* Objectives bullets */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-2.5">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">الأهداف والمخرجات المستخلصة من هذا المستوى:</h4>
                    <ul className="text-xs text-gray-600 space-y-2 text-right">
                      {generatedPlans[activeLevelTab]?.objectives.map((obj, oIdx) => (
                        <li key={oIdx} className="flex items-start gap-2 flex-row-reverse">
                          <span className="text-amber-500 shrink-0 font-bold">✓</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Question samples showcase */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 flex-row-reverse text-gray-700">
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                    <h4 className="text-[11px] font-black text-gray-400">عينة من الأسئلة التفاعلية المتولدة للمستوى الحالي</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {generatedNode.lessons[activeLevelTab]?.questions.slice(0, 3).map((q, qIdx) => (
                      <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-100 space-y-2.5">
                        <div className="flex items-center justify-between flex-row-reverse gap-4">
                          <span className="text-xs font-black text-gray-800 text-right flex-1">
                            س{qIdx + 1}: {q.prompt}
                          </span>
                          <span className="text-[9px] bg-amber-50 text-amber-700 font-extrabold py-0.5 px-2 rounded-full capitalize shrink-0">
                            {q.type === 'multiple_choice' ? 'خيار متعدد' : 'صواب وخطأ'}
                          </span>
                        </div>
                        
                        {q.type === 'multiple_choice' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-right">
                            {q.options.map((opt, oIdx) => (
                              <div 
                                key={oIdx}
                                className={`p-2.5 rounded-lg text-[11px] border text-right truncate ${
                                  opt === q.correctAnswer
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold'
                                    : 'bg-gray-50/50 text-gray-500 border-gray-50'
                                }`}
                              >
                                {opt} {opt === q.correctAnswer && "✓"}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'true_false' && (
                          <div className="flex gap-2.5 pt-1 text-right flex-row-reverse">
                            <div className={`py-1.5 px-4 rounded-lg text-[10px] border ${q.correctAnswer === true ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>صحيح</div>
                            <div className={`py-1.5 px-4 rounded-lg text-[10px] border ${q.correctAnswer === false ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>خاطئ</div>
                          </div>
                        )}

                        {/* Hint box */}
                        {q.hint && (
                          <p className="text-[10px] text-gray-400 leading-relaxed italic text-right">
                            💡 <strong>توجيه سقراط:</strong> {q.hint}
                          </p>
                        )}
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <p className="text-[11px] text-gray-400">تم دمج الحزمة الكاملة المكونة من الأسئلة التفتيشية المخصصة في الدرس المباشر لخارطة اللعب للتحقق من عقد الفهم والاستمتاع بمسيرة العلم البهية.</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Back to selector button */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setAnalysisCompleted(false);
                  setUploadedFileName(null);
                  setCustomText('');
                }}
                className="text-xs text-gray-400 hover:text-amber-500 transition-colors flex items-center gap-1 flex-row-reverse cursor-pointer"
              >
                <span>تفكيك وتحليل كتاب مدرسي آخر</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
