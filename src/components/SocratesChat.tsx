import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Volume2, Sparkles, HelpCircle, RefreshCw } from 'lucide-react';

const SOCRATES_IMAGE = "/src/assets/images/socrates_mascot_1779799311922.png";

interface Message {
  role: 'user' | 'assistant';
  id: string;
  text: string;
}

interface MoodParams {
  moodName: string; // "حماسي" | "تأملي عميق" | "متزن" | "هادئ حكيم"
  rate: number;
  pitch: number;
  colorClass: string;
  emoji: string;
}

const analyzeMoodOfText = (text: string): MoodParams => {
  const lowercaseText = text.toLowerCase();
  
  // Happy/Excited markers
  const positiveKeywords = ['رائع', 'ممتاز', 'مرحى', 'بوركت', 'سعيد', 'فضيلة', 'جميل', 'أهلاً', 'المعرفة', 'شغف', 'بطل', 'خطاك', 'ذكاء', 'فوز', 'ممتد'];
  // Sad/Apologetic/Solumn markers
  const submissiveKeywords = ['أعتذر', 'اضطراب', 'عذراً', 'جهل', 'حزين', 'أسف', 'عاصفة', 'فقد', 'محاكمة', 'اعدام', 'اضطراب'];
  // Analytical / Deep markers
  const thinkingKeywords = ['لماذا', 'كيف', 'تأمل', 'فكرة', 'دليل', 'سؤال', 'منهج', 'ابحث', 'عقل', 'حجة', 'برهان', 'أدوات', 'منطق', 'فيلسوف', 'بحث'];

  let posCount = positiveKeywords.filter(k => lowercaseText.includes(k)).length;
  let subCount = submissiveKeywords.filter(k => lowercaseText.includes(k)).length;
  let thinkCount = thinkingKeywords.filter(k => lowercaseText.includes(k)).length;

  if (posCount > subCount && posCount > thinkCount) {
    return {
      moodName: "حماسي مشجع",
      rate: 1.15,
      pitch: 1.2,
      colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
      emoji: "🌟"
    };
  } else if (subCount > posCount && subCount > thinkCount) {
    return {
      moodName: "هادئ حزين متأسف",
      rate: 0.85,
      pitch: 0.85,
      colorClass: "text-rose-700 bg-rose-50 border-rose-200",
      emoji: "🍂"
    };
  } else if (thinkCount > 0) {
    return {
      moodName: "تأملي فلسفي عميق",
      rate: 0.8,
      pitch: 1.0,
      colorClass: "text-amber-800 bg-amber-50 border-amber-200",
      emoji: "🧠"
    };
  }

  // Default neutral/balanced
  return {
    moodName: "متزن معقول",
    rate: 1.0,
    pitch: 1.1,
    colorClass: "text-blue-700 bg-blue-50 border-blue-200",
    emoji: "⚖️"
  };
};

const SAMPLE_PROMPTS = [
  'لماذا حُكم عليك بالإعدام؟',
  'كيف أسأل بـ "الأسلوب السقراطي" الحواري؟',
  'ما رأيك في المخترع نيكولا تسلا وتياره المتردد؟',
  'هل المعرفة موروثة أم نتعلمها بالتجربة والخطأ؟'
];

export default function SocratesChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'أهلاً بك يا رفيقي الفضولي! أنا سقراط العجوز. إن العقل غير المختبر لا يستحق العيش. اسألني عن أي حكمة أو فيلسوف، أو تحدّ تفكيري بأي سؤال، ولنبحث معاً عن الحقيقة بالمنطق والوعي. ما الذي يجول في ذهنك الصافي اليوم؟'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [activeSpeakingMood, setActiveSpeakingMood] = useState<MoodParams | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      // Clean up speech when component unmounts
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Create history list
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        text: msg.text
      }));

      const response = await fetch('/api/socrates/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatHistory
        })
      });

      const data = await response.json();
      
      const assistantMsg: Message = {
        id: `s-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'أوه يا باحث المعرفة، لقد كدت أفقد توازني الفكري. هلا أعدت صياغة السؤال بلطف؟'
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Socrates AI error:", error);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: 'أعتذر منك يا بني، يبدو أن صلتي المعرفية بالخادم والإنترنت عانت من اضطراب بسيط كعاصفة في بحر إيجة. دعنا نحاول مجدداً!'
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (text: string, messageId: string) => {
    if ('speechSynthesis' in window) {
      if (speakingMessageId === messageId) {
        // Toggle off if clicking the same one
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
        setActiveSpeakingMood(null);
        return;
      }

      window.speechSynthesis.cancel();
      
      const mood = analyzeMoodOfText(text);
      setActiveSpeakingMood(mood);
      setSpeakingMessageId(messageId);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      // Apply custom rate and pitch based on Socrates' mood
      utterance.rate = mood.rate;
      utterance.pitch = mood.pitch;

      utterance.onend = () => {
        setSpeakingMessageId(null);
        setActiveSpeakingMood(null);
      };

      utterance.onerror = () => {
        setSpeakingMessageId(null);
        setActiveSpeakingMood(null);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        text: 'مرحى! لقد جددنا طاولتنا الفلسفية من جديد للبحث عن الحقيقة دون أحكام مسبقة. اسأل وسأجيبك بأدوات العقل والجدل والود، ما موضوع حوارنا اليوم؟'
      }
    ]);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm flex flex-col h-[520px] font-sans overflow-hidden" id="socrates-chat-block">
      {/* Header Panel */}
      <div className="bg-gradient-to-l from-amber-500 to-amber-600/90 text-white p-4 flex items-center justify-between flex-row-reverse shadow-md">
        <div className="flex items-center gap-2.5 flex-row-reverse">
          <div className="relative">
            <img 
              src={SOCRATES_IMAGE} 
              alt="Wisdom Socrates Mascot" 
              className="w-10 h-10 rounded-full border-2 border-white bg-white shadow-sm object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
          </div>
          <div className="text-right">
            <h3 className="font-bold text-sm tracking-tight">محاور الذكاء الاصطناعي مع سقراط</h3>
            <p className="text-[10px] text-amber-100 flex items-center gap-1 flex-row-reverse justify-end mt-0.5">
              <Sparkles className="w-2.5 h-2.5 animate-pulse" />
              منهج الجدل العقلاني المباشر (Gemini AI Active)
            </p>
          </div>
        </div>

        <button 
          onClick={handleReset}
          className="text-amber-100 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-all"
          title="مسح وطاولة حوار جديدة"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3 scrollbar-thin">
        {messages.map((message) => {
          const isSpeaking = speakingMessageId === message.id;
          return (
            <div 
              key={message.id}
              className={`flex items-end gap-2.5 ${message.role === 'user' ? 'flex-row' : 'flex-row-reverse text-right'}`}
            >
              {message.role === 'assistant' && (
                <div className="relative flex-shrink-0">
                  <img 
                    src={SOCRATES_IMAGE} 
                    alt="Socrates Portrait" 
                    className={`w-8 h-8 rounded-full border border-gray-200 bg-white shadow-xs object-cover mb-1 ${
                      isSpeaking ? 'ring-2 ring-amber-400 animate-pulse scale-105' : ''
                    }`}
                    referrerPolicy="no-referrer"
                  />
                  {isSpeaking && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                </div>
              )}
              
              <div className="group relative max-w-[80%] flex flex-col">
                <div 
                  className={`p-3.5 rounded-2xl text-xs md:text-sm shadow-xs leading-relaxed transition-all duration-300 ${
                    message.role === 'user' 
                      ? 'bg-amber-500 text-white rounded-bl-none' 
                      : isSpeaking
                        ? 'bg-amber-50/90 text-amber-950 border-2 border-amber-300 rounded-br-none text-right shadow-md'
                        : 'bg-white text-gray-800 border-2 border-gray-100 rounded-br-none text-right'
                  }`}
                  style={{ direction: 'rtl' }}
                >
                  {message.text}
                </div>

                {/* Speech parameters indicator */}
                {isSpeaking && activeSpeakingMood && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`mt-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 self-end flex-row ${activeSpeakingMood.colorClass}`}
                  >
                    <span className="animate-bounce">{activeSpeakingMood.emoji}</span>
                    <span>نبرة {activeSpeakingMood.moodName}</span>
                    <span className="text-gray-400">|</span>
                    <span className="font-mono">سرعة: {activeSpeakingMood.rate}x</span>
                    <span className="text-gray-400">|</span>
                    <span className="font-mono">نغمة: {activeSpeakingMood.pitch}</span>
                  </motion.div>
                )}

                {/* Speak Dialog option for Socratic voice guidance */}
                {message.role === 'assistant' && (
                  <button
                    onClick={() => speakText(message.text, message.id)}
                    className={`absolute left-[-28px] bottom-1 p-1 bg-white rounded-full shadow-xs border transition-all active:scale-90 ${
                      isSpeaking 
                        ? 'opacity-100 text-amber-600 border-amber-300 bg-amber-50 scale-105' 
                        : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-amber-600 hover:border-gray-200'
                    }`}
                    title={isSpeaking ? "إيقاف الصوت" : "استمع إلى حكمة سقراط"}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce fill-amber-300/55' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-end gap-2.5 flex-row-reverse text-right">
            <img 
              src={SOCRATES_IMAGE} 
              alt="Thinking Socrates" 
              className="w-8 h-8 rounded-full border border-gray-200 bg-white animate-bounce object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="bg-white p-3.5 rounded-2xl rounded-br-none border-2 border-amber-100 text-xs text-amber-800 flex items-center gap-1.5 shadow-sm" style={{ direction: 'rtl' }}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
              </div>
              <span>سقراط يدقق ويتأمل في جوهر منطقك...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="p-3 bg-white border-t border-gray-100 flex flex-wrap gap-1.5 justify-end" dir="rtl">
        {SAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 py-1 px-2.5 rounded-full text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 duration-200 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3 text-amber-500" />
            {prompt}
          </button>
        ))}
      </div>

      {/* Inputs Form Section */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputText);
        }}
        className="p-3 bg-white border-t-2 border-gray-50 flex items-center gap-2 flex-row-reverse font-sans"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="تحدَّ سقراط العجوز بالحجة أو استفسر عن حكمة..."
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs md:text-sm text-right focus:outline-none focus:border-amber-400 placeholder-gray-400 transition-all font-sans"
          dir="rtl"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center active:scale-95 duration-150 cursor-pointer"
        >
          <Send className="w-4 h-4 transform rotate-180" />
        </button>
      </form>
    </div>
  );
}
