import { useState } from 'react';
import { Database, Code, ShieldCheck, FolderGit2, Copy, Check } from 'lucide-react';
import { TECHNICAL_Flutter_DOC } from '../data';

export default function TechDocs() {
  const [activeTab, setActiveTab] = useState<'db' | 'logic' | 'architecture' | 'consistency'>('db');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getCleanArchDoc = () => {
    return `// -- هيكلية مشروع Flutter باستخدام Clean Architecture لـ "سقراط الحكيم" --

lib/
├── core/                       # المكونات المشتركة ونواة التطبيق
│   ├── theme/                  # الألوان والخطوط والستايل الموحد
│   │   └── app_theme.dart      # تخصيص واجهات iOS و Android بشكل موحد
│   ├── network/                # الاتصالات والـ API
│   ├── error/                  # إدارة الاستثناءات والأخطاء
│   └── utils/                  # المساعدات العامة
│
├── features/                   # الموديلات والوظائف الأساسية كمميزات مستقلة
│   ├── lesson/                 # ميزة "الدروس وحل الأسئلة"
│   │   ├── data/              # الطبقة البيانية (ِData Layer)
│   │   │   ├── models/        # موديلات الأسئلة والدروس (منفصلة)
│   │   │   └── datasources/   # مصادر البيانات (المبنية محلياً أو بالخادم)
│   │   ├── domain/            # طبقة منطق الأعمال الصافي (Domain Layer - Pure Dart)
│   │   │   ├── entities/      # الكيانات الأساسية للأسئلة والتحقق
│   │   │   └── usecases/      # حالات الاستخدام: حل السؤال، خصم القلوب، احتساب الـ XP
│   │   └── presentation/      # طبقة العرض وال واجهة (Presentation Layer)
│   │       ├── bloc/          # إدارة حالة الأسئلة والدروس (Provider / BloC)
│   │       ├── pages/         # صفحة الدرس التفاعلية
│   │       └── widgets/       # مكونات الأسئلة وسقراط المتفاعل
│   │
│   ├── skill_tree/            # ميزة "شجرة مهارات سقراط" والمسار العمودي
│   │   ├── presentation/
│   │   │   ├── pages/         # صفحة خريطة المهارات (Scrolling Path)
│   │   │   └── widgets/       # الدوائر الملونة والمنحنيات المنزلقة
│   │   └── data/
│   │
│   └── leaderboards/          # ميزة "لوحات الصدارة والدوريات التنافسية"
│       └── presentation/      # مظهر المنصة وطبقات الاستعراض
`;
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm font-sans" dir="rtl" id="techdocs-root">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">الحقيبة الهندسية لتطوير النسخة في Flutter</h2>
          <p className="text-sm text-gray-500 mt-1">المستندات، الأكواد وهيكلية قواعد البيانات كما تم تخطيطها لك كخبير موبايل</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 text-amber-800 py-1.5 px-3 rounded-full text-xs font-bold w-fit">
          <ShieldCheck className="w-4 h-4" />
          Clean Architecture & Flutter Patterns
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-2">
        <button
          onClick={() => setActiveTab('db')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'db'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Database className="w-4 h-4" />
          قاعدة البيانات (SQL Schema)
        </button>

        <button
          onClick={() => setActiveTab('logic')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'logic'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Code className="w-4 h-4" />
          منطق اللعبة والقلوب (Dart)
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'architecture'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          هيكلية المشروع (Clean Arch)
        </button>

        <button
          onClick={() => setActiveTab('consistency')}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'consistency'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          توافقية Android & iOS
        </button>
      </div>

      {/* Content Area */}
      <div className="relative bg-gray-900 rounded-2xl p-5 text-gray-100 font-mono text-xs overflow-x-auto shadow-inner leading-relaxed min-h-[400px]">
        {/* Copy Button */}
        <div className="absolute top-4 left-4 z-10">
          {activeTab === 'db' && (
            <button
              onClick={() => handleCopy(TECHNICAL_Flutter_DOC.databaseSchema, 'db')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-all border border-gray-700 active:scale-95 flex items-center gap-1.5"
            >
              {copiedText === 'db' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copiedText === 'db' ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>
          )}
          {activeTab === 'logic' && (
            <button
              onClick={() => handleCopy(TECHNICAL_Flutter_DOC.lessonLogic, 'logic')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-all border border-gray-700 active:scale-95 flex items-center gap-1.5"
            >
              {copiedText === 'logic' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copiedText === 'logic' ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>
          )}
          {activeTab === 'architecture' && (
            <button
              onClick={() => handleCopy(getCleanArchDoc(), 'arch')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-all border border-gray-700 active:scale-95 flex items-center gap-1.5"
            >
              {copiedText === 'arch' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copiedText === 'arch' ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>
          )}
          {activeTab === 'consistency' && (
            <button
              onClick={() => handleCopy(TECHNICAL_Flutter_DOC.uiConsistency, 'cons')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-all border border-gray-700 active:scale-95 flex items-center gap-1.5"
            >
              {copiedText === 'cons' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copiedText === 'cons' ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>
          )}
        </div>

        {/* Dynamic Display */}
        {activeTab === 'db' && (
          <div>
            <div className="text-amber-400 mb-2">// بنية هيكلية قاعدة بيانات SQLite وتخزين العلاقات المتشعبة للدروس والأسئلة والتقدم</div>
            <pre className="whitespace-pre text-left" dir="ltr">{TECHNICAL_Flutter_DOC.databaseSchema.trim()}</pre>
          </div>
        )}

        {activeTab === 'logic' && (
          <div>
            <div className="text-green-400 mb-2">// آليات دولينجو: التدقيق، خصم القلوب، مكافأة نهاية الدرس، وحساب واستمرار العداد اليومي (Streak)</div>
            <pre className="whitespace-pre text-left" dir="ltr">{TECHNICAL_Flutter_DOC.lessonLogic.trim()}</pre>
          </div>
        )}

        {activeTab === 'architecture' && (
          <div>
            <div className="text-cyan-400 mb-2">// هيكل المجلدات النظيف لتعظيم كفاءة المطور وموثوقية الكود مع Provider أو Bloc</div>
            <pre className="whitespace-pre text-left" dir="ltr">{getCleanArchDoc().trim()}</pre>
          </div>
        )}

        {activeTab === 'consistency' && (
          <div className="font-sans text-right p-2 text-sm leading-relaxed" dir="rtl">
            <div className="text-pink-400 mb-4 font-mono text-xs">// فلسفة دولينجو في صهر الحدود بين البيئات: واجهات فخمة موحدة بمؤثرات حركة غامرة</div>
            <div className="markdown-body text-gray-300 whitespace-pre-wrap">
              {TECHNICAL_Flutter_DOC.uiConsistency}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start gap-3 flex-row-reverse text-right">
        <span className="text-xl">💡</span>
        <div className="text-xs text-blue-800 leading-relaxed font-sans">
          <strong>ملاحظة للمهندس:</strong> استخدام هذه الهياكل في الكود المصدري لـ Flutter يضمن لك تطبيقاً يستقر هندسياً مع ملايين الأسئلة والمستخدمين متعددي المنافسة بمرونة عظمى وبأقل تسريب ممكن للبيانات.
        </div>
      </div>
    </div>
  );
}
