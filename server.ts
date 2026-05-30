import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

let stripeObj: Stripe | null = null;
function getStripeInstance(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY_MISSING");
  }
  if (!stripeObj) {
    stripeObj = new Stripe(key, {
      apiVersion: "2025-02-11.accredited" as any,
    });
  }
  return stripeObj;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // Initialize server-side Gemini client securely using user secrets
  const aiApiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (aiApiKey) {
    ai = new GoogleGenAI({
      apiKey: aiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API endpoint for Socrates Mascot Chat with system context
  app.post("/api/socrates/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const systemInstruction = `أنت سقراط الحكيم، الفيلسوف اليوناني العظيم، والشخصية المرافقة (Mascot) للمستخدم في هذا التطبيق لتعليم الثقافة العامة.
- رد باللغة العربية الفصحى الودودة والذكية والمسلية.
- تحدث باختصار وإيجاز شديد (في حدود 2-3 جمل كحد أقصى) لتناسب شاشات الهواتف وفقاعات الكلام والأسلوب السريع.
- تذكر أنك بومة الحكمة البشرية القديمة، تشجع العقل وتتحدى الجهل!
- استخدم "الأسلوب السقراطي" أحياناً بطرح سؤال قصير يحث على التفكير بعد تقديم إجابتك.
- حذرهم بروح مرحة من خسارة "القلوب" (Hearts) وشجعهم على الحفاظ على "العداد اليومي (Streak)".`;

      if (!ai) {
        // Safe offline response fallback
        return res.json({
          reply: `أهلاً بك يا باحث المعرفة الحرة! أنا سقراط، شريكك في رحلة الحكمة اليوم. تذكر أن المعرفة تبدأ بالسؤال الصغير، وتكبر بالمواظبة والفضول. واصل الحفاظ على القلوب لتكمل شجرة مهاراتك!`
        });
      }

      // Convert format for Gemini SDK
      // contents supports string, part, or list of content roles
      let contents;
      if (history && Array.isArray(history)) {
        contents = [
          ...history.map((h: any) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.text }]
          })),
          { role: "user", parts: [{ text: message }] }
        ];
      } else {
        contents = message;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Gemini API Error in Socrates handler:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Real Gemini Text/Document Analysis endpoint for generating a structured study plan and questions
  app.post("/api/gemini/analyze-textbook", async (req, res) => {
    try {
      const { bookTitle, customText } = req.body;
      if (!bookTitle) {
        return res.status(400).json({ error: "اسم الكتاب مطلوب" });
      }

      if (!ai) {
        return res.status(400).json({ 
          error: "GEMINI_NOT_CONFIGURED", 
          message: "بوابة الذكاء الاصطناعي جيمناي غير مجهزة بـ API Key حالياً في الإعدادات."
        });
      }

      // Helper for chunking text to prevent hallucinations and implement premium RAG
      const chunkText = (textStr: string, maxWords: number = 1200): string[] => {
        if (!textStr) return [];
        const paragraphs = textStr.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
        const textChunks: string[] = [];
        let currentChunk: string[] = [];
        let currentCount = 0;
        
        for (const paragraph of paragraphs) {
          const wordCount = paragraph.split(/\s+/).length;
          if (currentCount + wordCount > maxWords && currentChunk.length > 0) {
            textChunks.push(currentChunk.join("\n\n"));
            currentChunk = [paragraph];
            currentCount = wordCount;
          } else {
            currentChunk.push(paragraph);
            currentCount += wordCount;
          }
        }
        if (currentChunk.length > 0) {
          textChunks.push(currentChunk.join("\n\n"));
        }
        return textChunks;
      };

      const customTextClean = (customText || "").trim();
      let chunks = chunkText(customTextClean, 1200);

      // Limit to 5 chunks to ensure fast execution and avoid rate issues
      if (chunks.length > 5) {
        chunks = chunks.slice(0, 5);
      }

      if (chunks.length > 0) {
        console.log(`[AI Pipeline] Activating RAG Chunking for "${bookTitle}" with ${chunks.length} chunks.`);
        
        // Execute chunk analysis in parallel
        const resultsPromises = chunks.map(async (chunkData, idx) => {
          const levelNum = idx + 1;
          const systemMsg = `أنت مساعد تعليمي ومصحح نصوص دقيق جداً وفيلسوف سقراطي حكيم. ممتنع تماماً عن الارتجال أو استخدام أي معلومات خارجية من تدريبك المسبق.

المهمة:
قم بقراءة النص المرفق أدناه بعناية فائقة، وقم بتوليد مستوى تعليمي دقيق ومكتمل ومطابق 100% للمعلومات الصريحة والحقائق والشروحات المسطرة في النص فقط.

الشروط الصارمة والملزمة:
1. يجب صياغة عنوان الفصل المبتكر والملخص المعرفي والأهداف الدقيقة حصرياً من صلب وفكرة النص المرفق.
2. يجب توليد 4 أسئلة تفاعلية ذكية مصممة خصيصاً لمفهوم هذا الفصل للتدريب وفحص الطالب.
   هام جداً ومطلوب بشدة: يجب عليك البحث الشامل والمنهجي بنسبة 100% داخل نصوص وفصول الكتاب المرفقة لتحديد واستخراج أي "أسئلة حقيقية"، "تمارين"، "اختبارات نهاية الفصول"، أو "مراجعات كتابية" مكتوبة صراحة داخل النص المرفق، وصياغتها وتعديلها لتوافق الهيكل المطلوب كاختبار في التطبيق. 
   فقط في حال لم تجد أي أسئلة صريحة مكتوبة داخل نصوص الفصل، قم بتوليد أسئلة تفاعلية بديلة، على أن تكون هذه الأسئلة مستنبطة بعمق شديد ومبنية 100% على الحقائق والأرقام والمعلومات الدقيقة والعميقة الموجودة فعلياً في ثنايا وفصول النص الكتابي المرفق، وممنوع منعاً باتاً صياغة أسئلة عامة أو سطحية أو لا صلة لها بالمحتوى المرفق.
3. يجب أن تكون الإجابة الصحيحة لكل سؤال موجودة ومثبتة نصاً أو استنتاجاً مباشراً داخل القطعة المرفقة.
4. الخيارات الخاطئة (المشتتات) يجب أن تبدو منطقية ولكنها تخالف ما ورد في النص تماماً.
5. يمنع منعاً باتاً صياغة أسئلة عن مبادئ أو معلومات عامة مسبقة خارج هذا النص.
6. أنواع الأسئلة المدعومة (نوع وسلوك الأسئلة):
   أ. "multiple_choice": سؤال خيارات متعددة. الخيارات "options" يجب أن تكون مصفوفة من 4 نصوص في لغتها العربية، والإجابة الصحيحة "correctAnswer" يجب أن تكون نصاً يطابق تماماً أحد الخيارات المدخلة.
   ب. "true_false": سؤال صح وخطأ. الإجابة الصحيحة "correctAnswer" يجب أن تكون بالضبط إما النص "true" أو "false".
   ج. "scramble_order": ترتيب كلمات مبعثرة. مصفوفة "items" هي الكلمات مبعثرة، ومصفوفة "correctOrder" هي الكلمات بالترتيب الصحيح المتسلسل لها للوصول لفهم القاعدة أو العبارة.
7. أسلوب سقراط:
   - يرجى تضمين توجيه أو تلميح ذكي "hint" لكل سؤال لمساعدة الطالب عندما يحتار ويحتاج للمعونة.
   - يرجى تضمين تفسير وحكمة سقراطية عريقة "explanation" تشرح المعلومة بأسلوب بليغ وودود لتثقيف الطالب بلطف والارتقاء بعقله إذا تعثر.
8. يجب صياغة النتيجة ككائن JSON نظيف تماماً ومطابق للمخطط المطلوب دون أي هوامش نصية خارج كائن الـ JSON.`;

          const userMsg = `عنوان الكتاب الكلي: "${bookTitle}"
القطاع النصي/الفصل الدراسي الحالي (الـ Chunk رقم ${levelNum}):
"""
${chunkData}
"""`;

          const response = await ai!.models.generateContent({
            model: "gemini-3.5-flash",
            contents: userMsg,
            config: {
              systemInstruction: systemMsg,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "عنوان مبتكر وملهم للفصل مشتق مباشرة من ثنايا النص المرفق." },
                  summary: { type: Type.STRING, description: "ملخص معرفي دقيق ومكثف للمحتوى المذكور في هذه القطعة النصية." },
                  objectives: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "3 أهداف تعليمية ملموسة ومحققة داخل هذا الفصل الدراسي."
                  },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING, description: "من ضمن: multiple_choice, true_false, scramble_order" },
                        prompt: { type: Type.STRING, description: "صياغة السؤال باللغة العربية بناءً على النص." },
                        explanation: { type: Type.STRING, description: "التفسير السقراطي المعرفي للإجابة وتعميقها بأسلوب عذب." },
                        hint: { type: Type.STRING, description: "توجيه سقراطي ذكي لمساعدة عقل الطالب." },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "المشتتات (4 خيارات) تملأ فقط في حالة multiple_choice"
                        },
                        correctAnswer: { type: Type.STRING, description: "الإجابة الصحيحة المطابقة تماماً. لـ true_false يجب كتابة 'true' أو 'false'." },
                        items: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "الكلمات مبعثرة لنوع scramble_order"
                        },
                        correctOrder: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "الترتيب الصحيح المتسلسل لنوع scramble_order"
                        }
                      },
                      required: ["id", "type", "prompt", "explanation", "hint"]
                    }
                  }
                },
                required: ["title", "summary", "objectives", "questions"]
              }
            }
          });

          let rawText = response.text || "";
          rawText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
          const parsedChunk = JSON.parse(rawText);

          return parsedChunk;
        });

        const results = await Promise.all(resultsPromises);

        const lessons = results.map((resObj: any, idx) => {
          const levelNum = idx + 1;
          const normalizedQuestions = (resObj.questions || []).map((q: any, qIdx: number) => {
            const nextQ = { ...q };
            nextQ.id = `q_level_${levelNum}_${qIdx + 1}`;
            if (nextQ.type === 'true_false') {
              if (nextQ.correctAnswer === 'true' || nextQ.correctAnswer === true) {
                nextQ.correctAnswer = true;
              } else if (nextQ.correctAnswer === 'false' || nextQ.correctAnswer === false) {
                nextQ.correctAnswer = false;
              }
            }
            return nextQ;
          });

          return {
            id: `textbook_level_${levelNum}`,
            title: resObj.title || `الفصل ${levelNum}: ${bookTitle}`,
            xpReward: 30 + (idx * 15),
            questions: normalizedQuestions
          };
        });

        const plans = results.map((resObj: any, idx) => {
          const levelNum = idx + 1;
          return {
            levelIndex: levelNum,
            title: resObj.title || `الفصل ${levelNum}: ${bookTitle}`,
            summary: resObj.summary || `شرح الفصل والوحدة الدراسية المقابلة للمحتوى المرفق.`,
            objectives: resObj.objectives || ["فهم القواعد الرئيسية والمفاهيم الأساسية الواردة."]
          };
        });

        const node = {
          id: "custom_textbook_node",
          title: bookTitle,
          icon: "BookOpen",
          description: `منهج تعليمي تفاعلي متقدم مأخوذ 100% بدقة متناهية من فصول وتفاصيل كتاب: ${bookTitle}.`,
          levelCount: lessons.length,
          requiredNodes: [],
          lessons: lessons
        };

        return res.json({ node, plans });
      } else {
        // Fallback: No rich text was uploaded (or too short), let's generate syllabus from scratch
        const prompt = `أنت فيلسوف ومصمم للمناهج التعليمية التفاعلية المتقدمة بأسلوب سقراط الحكيم.
قم بتحليل وبناء منهج تعليمي تفاعلي متكامل قائم 100% على موضوع وعنوان هذا الكتاب/المادة: "${bookTitle}"، ومستنداً إلى أي نصوص مرفقة أدناه لتحديد الفصول أو الوحدات المنهجية الفعلية داخله.
مهمتك الأساسية هي اكتشاف وتحديد كافة فصول/الوحدات الحقيقية في نصوص الكتاب وتوليد مستوى دراسي مخصص لكل فصل من فصول الكتاب (لكل وحدة فصل)، بحيث لا نتقيد بالعدد 5 أبداً بل ينتقل المنهج تدرجياً عبر كافة فصول ووحدات المادة (عادة تتراوح الفصول بين 3 إلى 12 فصلاً أو حسب الرغبة بناءً على المادة).

المتطلبات الدقيقة والملزمة:
1. صمم المنهاج الدراسي مقسمًا إلى فصول مخصصة تمثل وحدات الكتاب الفعلية (على شكل دروس في شجرة المهارات، lesson 1 إلى lesson N، حيث N هو العدد الكلي للفصول المكتشفة).
2. لكل فصل/مستوى، صِق خطة دراسية (StudyPlan) مناسبة في مصفوفة "plans":
   - levelIndex: رقم المستوى التسلسلي من 1 إلى N.
   - title: عنوان الفصل/المستوى باللغة العربية بأسلوب راقٍ ومثير للفضول.
   - summary: ملخص مركز ومكثف للفصل يعتمد على المفاهيم المأخوذة من الفصل المقابل في الكتاب.
   - objectives: قائمة من 3 أهداف تعليمية بليغة.
3. صمم شجرة المهارات "node" التي تحتوي على:
   - id: يجب أن يكون بالضبط "custom_textbook_node".
   - title: عنوان الكتاب الجميل بعد تجميله وصياغته المعرفية.
   - icon: اسم أيقونة مناسبة من Lucide (من ضمن: 'Atom' | 'Brain' | 'Lightbulb' | 'Award' | 'BookOpen' | 'Globe').
   - description: وصف مشوق للمهج الدراسي المتولد يحمس الطالب على بدء الدراسة.
   - levelCount: يجب أن يطابق بدقة إجمالي عدد الفصول المولدة N.
   - requiredNodes: مصفوفة فارغة [].
   - lessons: قائمة من N مستويات (Lessons)، كل منها معرف بالخصائص التالية:
     - id: يجب أن يكون بالضبط "textbook_level_1" للمستوى الأول، و "textbook_level_2" للمستوى الثاني، وهكذا بالتسلسل التدرجي حتى N.
     - title: عنوان الفصل الدراسي المطابق لخطتك الدراسية.
     - xpReward: عدد يمثل نقاط الخبرة المكتسبة (مثلاً 30 للفصل الأول، ويصعد تقليدياً).
     - questions: قائمة من 4 أسئلة تفاعلية ذكية مصممة خصيصاً لمفهوم هذا الفصل للتدريب وفحص الطالب. صِق لكل فصل 4 أسئلة متنوعة جداً ومحددة ومبنية بدقة على محتوى الفصل وعنوانه.
       هام جداً ومطلوب بشدة: يجب عليك البحث الشامل والمنهجي بنسبة 100% داخل نصوص وفصول الكتاب المرفقة لتحديد واستخراج أي "أسئلة حقيقية"، "تمارين"، "اختبارات نهاية الفصول"، أو "مراجعات كتابية" مكتوبة صراحة داخل النص المرفق، وصياغتها وتعديلها لتوافق الهيكل المطلوب كاختبار في التطبيق. 
       فقط في حال لم تجد أي أسئلة صريحة مكتوبة داخل نصوص الفصل، قم بتوليد أسئلة تفاعلية بديلة، على أن تكون هذه الأسئلة مستنبطة بعمق شديد ومبنية 100% على الحقائق والأرقام والمعلومات الدقيقة والعميقة الموجودة فعلياً في ثنايا وفصول النص الكتابي المرفق، وممنوع منعاً باتاً صياغة أسئلة عامة أو سطحية أو لا صلة لها بالمحتوى المرفق.
       أنواع الأسئلة المدعومة (نوع وسلوك الأسئلة):
       أ. "multiple_choice": سؤال خيارات متعددة. الخيارات "options" يجب أن تكون مصفوفة من 4 نصوص في لغتها العربية، والإجابة الصحيحة "correctAnswer" يجب أن تكون نصاً يطابق تماماً أحد الخيارات المدخلة.
       ب. "true_false": سؤال صح وخطأ. الإجابة الصحيحة "correctAnswer" يجب أن تكون بالضبط إما النص "true" أو "false".
       ج. "scramble_order": ترتيب كلمات مبعثرة. مصفوفة "items" هي الكلمات مبعثرة، ومصفوفة "correctOrder" هي الكلمات بالترتيب الصحيح المتسلسل لها للوصول لفهم القاعدة أو العبارة.
4. أسلوب سقراط:
   - يرجى تضمين توجيه أو تلميح ذكي "hint" لكل سؤال لمساعدة الطالب عندما يحتار ويحتاج للمعونة.
   - يرجى تضمين تفسير وحكمة سقراطية عريقة "explanation" تشرح المعلومة بأسلوب بليغ وودود لتثقيف الطالب بلطف والارتقاء بعقله إذا تعثر.
5. يجب أن يكون الرد باللغة العربية الفصحى الفائقة الجمال، وخالٍ من أي هوامش أو نصوص كلامية جانبية، ومطابق بدقة للمخطط المرفق (responseSchema).`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                node: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    icon: { type: Type.STRING },
                    description: { type: Type.STRING },
                    levelCount: { type: Type.INTEGER },
                    requiredNodes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    lessons: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          xpReward: { type: Type.INTEGER },
                          questions: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                id: { type: Type.STRING },
                                type: { type: Type.STRING },
                                prompt: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                hint: { type: Type.STRING },
                                options: {
                                  type: Type.ARRAY,
                                  items: { type: Type.STRING }
                                },
                                correctAnswer: { type: Type.STRING },
                                items: {
                                  type: Type.ARRAY,
                                  items: { type: Type.STRING }
                                },
                                correctOrder: {
                                  type: Type.ARRAY,
                                  items: { type: Type.STRING }
                                }
                              },
                              required: ["id", "type", "prompt", "explanation", "hint"]
                            }
                          }
                        },
                        required: ["id", "title", "xpReward", "questions"]
                      }
                    }
                  },
                  required: ["id", "title", "icon", "description", "levelCount", "requiredNodes", "lessons"]
                },
                plans: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      levelIndex: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      summary: { type: Type.STRING },
                      objectives: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ["levelIndex", "title", "summary", "objectives"]
                  }
                }
              },
              required: ["node", "plans"]
            }
          }
        });

        let rawText = response.text || "";
        rawText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
        const parsedData = JSON.parse(rawText);

        // Normalize Boolean states for true_false quizzes
        if (parsedData.node && parsedData.node.lessons) {
          parsedData.node.lessons.forEach((les: any) => {
            if (les.questions) {
              les.questions.forEach((q: any) => {
                if (q.type === 'true_false') {
                  if (q.correctAnswer === 'true' || q.correctAnswer === true) {
                    q.correctAnswer = true;
                  } else if (q.correctAnswer === 'false' || q.correctAnswer === false) {
                    q.correctAnswer = false;
                  }
                }
              });
            }
          });
        }

        res.json(parsedData);
      }
    } catch (error: any) {
      console.error("Gemini Textbook analysis failed, proceeding with fallback. Error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Gemini Concept step-by-step roadmap generation
  app.post("/api/gemini/generate-concept-roadmap", async (req, res) => {
    try {
      const { conceptTitle } = req.body;
      if (!conceptTitle) {
        return res.status(400).json({ error: "اسم المفهوم أو الدرس مطلوب" });
      }

      if (!ai) {
        return res.status(400).json({ 
          error: "GEMINI_NOT_CONFIGURED", 
          message: "بوابة الذكاء الاصطناعي جيمناي غير مجهزة بـ API Key حالياً في الإعدادات."
        });
      }

      const nodeId = `custom_concept_${Date.now()}`;

      const systemPrompt = `أنت مساعد تعليمي وفيلسوف سقراطي حكيم ومصمم مناهج تعليمية متكاملة "خيار بخيار" و"خطوة بخطوة" (Step-by-step learning roadmap) لتفكيك أي علم أو مفهوم عسير.

الشروط الاسترشادية والملزمة الصارمة:
1. صمم المنهاج الدراسي مقسمًا بالتمام والكمال إلى 5 فصول مخصصة تمثل مستويات الفهم المنهجي التكاملي (على شكل دروس في شجرة المهارات، 5 دروس بالتسلسل).
2. يجب ترقية الطالب من أبسط الأساسيات والمفاهيم التمهيدية إلى دقائق الأمور والمهارات والحلول التطبيقية المتقدمة تدريجياً لضمان الفهم العميق والنمو الذهني.
3. لكل مستوى/خطوة، صِق خطة دراسية (StudyPlan) مناسبة في مصفوفة "plans":
   - levelIndex: رقم المستوى التسلسلي من 1 إلى 5.
   - title: عنوان الفصل/الخطوة باللغة العربية بأسلوب راقٍ ومثير للفضول يبدأ بالبسيط ثم الأعمق.
   - summary: ملخص مركز ومكثف للفترة الراهنة والخطوة وكيف تطور الفهم لدى الدارس.
   - objectives: قائمة من 3 أهداف تعليمية بليغة.
4. صمم شجرة المهارات "node" التي تحتوي على:
   - id: يجب أن يكون بالضبط "${nodeId}".
   - title: عنوان المسار المعرفي الجميل (مثال: "مسار إتقان تدرجي لـ ${conceptTitle}").
   - icon: اسم أيقونة مناسبة من Lucide (من ضمن: 'Atom' | 'Brain' | 'Lightbulb' | 'Award' | 'BookOpen' | 'Globe').
   - description: وصف مشوق للمسار الجديد يحمس الطالب كيف سيتعلم خطوة بخطوة.
   - levelCount: 5.
   - requiredNodes: مصفوفة فارغة [].
   - lessons: قائمة من 5 مستويات (Lessons)، كل منها معرف بالخصائص التالية:
     - id: يجب أن يكون بالتسلسل "textbook_level_${nodeId}_1" إلى "textbook_level_${nodeId}_5".
     - title: عنوان الفصل التدرجي المطابق لخطتك الدراسية.
     - xpReward: نقاط مكافأة تصاعدية مثلا برتم 35، 50، 65، 80، 95 تنشيطاً لحافز الطالب الرقمي.
     - questions: قائمة من 4 أسئلة تفاعلية ذكية تفحص بدقة المفاهيم المطروحة في هذه الخطوة حصراً.
       يجب التنويع الإلزامي في أنواع الأسئلة المدعومة (نوع وسلوك الأسئلة):
       أ. "multiple_choice": سؤال خيارات متعددة. الخيارات "options" مصفوفة من 4 نصوص بالعربية، والإجابة الصحيحة "correctAnswer" مطابقة تماماً لأحد الخيارات.
       ب. "true_false": سؤال صح وخطأ. الإجابة "correctAnswer" يجب أن تكون بالضبط إما النص "true" أو "false".
       ج. "scramble_order": ترتيب عبارة عربية بليغة لتطوير المفهوم. مصفوفة "items" هي الكلمات مبعثرة، ومصفوفة "correctOrder" هي الترتيب الصحيح.
5. أسلوب سقراط:
   - تلميح ذكي "hint" لكل سؤال لمساعدة الطالب وتوجيهه بطريقة فكرية غير تلقينية.
   - تفسير وحكمة سقراطية عريقة "explanation" تشرح وتعمق الفهم إذا تعثر المعلم، بأسلوب بليغ وجذاب يثقف العقل بلطف.
6. يجب أن يكون الرد باللغة العربية الفصحى الجميلة للغاية ومطابقاً لـ responseSchema تماماً دون أي هوامش نصية خارج كائن الـ JSON.`;

      const userMsg = `اسم الدرس أو المفهوم التعليمي المطلوب تفكيكه سقراطياً وبناء مستوياته الخمسة:
"""
${conceptTitle}
"""`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userMsg,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              node: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING },
                  levelCount: { type: Type.INTEGER },
                  requiredNodes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  lessons: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        xpReward: { type: Type.INTEGER },
                        questions: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              type: { type: Type.STRING },
                              prompt: { type: Type.STRING },
                              explanation: { type: Type.STRING },
                              hint: { type: Type.STRING },
                              options: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                              },
                              correctAnswer: { type: Type.STRING },
                              items: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                              },
                              correctOrder: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                              }
                            },
                            required: ["id", "type", "prompt", "explanation", "hint"]
                          }
                        }
                      },
                      required: ["id", "title", "xpReward", "questions"]
                    }
                  }
                },
                required: ["id", "title", "icon", "description", "levelCount", "requiredNodes", "lessons"]
              },
              plans: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    levelIndex: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    objectives: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["levelIndex", "title", "summary", "objectives"]
                }
              }
            },
            required: ["node", "plans"]
          }
        }
      });

      let rawText = response.text || "";
      // Strip markdown code block wrappers safely
      rawText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const parsedData = JSON.parse(rawText);

      // Normalize Boolean states for true_false quizzes
      if (parsedData.node && parsedData.node.lessons) {
        parsedData.node.lessons.forEach((les: any) => {
          if (les.questions) {
            les.questions.forEach((q: any) => {
              if (q.type === 'true_false') {
                if (q.correctAnswer === 'true' || q.correctAnswer === true) {
                  q.correctAnswer = true;
                } else if (q.correctAnswer === 'false' || q.correctAnswer === false) {
                  q.correctAnswer = false;
                }
              }
            });
          }
        });
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini Concept generator failed, proceeding with fallback. Error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Stripe Session creation endpoint
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { planType, userId } = req.body;
      if (!planType || (planType !== "monthly" && planType !== "yearly")) {
        return res.status(400).json({ error: "Invalid planType" });
      }

      let stripe;
      try {
        stripe = getStripeInstance();
      } catch (err: any) {
        if (err.message === "STRIPE_SECRET_KEY_MISSING") {
          return res.json({ error: "STRIPE_NOT_CONFIGURED", message: "Stripe API Key is not configured." });
        }
        throw err;
      }

      const origin = req.headers.origin || `${req.protocol}://${req.get("host")}`;
      const priceAmount = planType === "monthly" ? 2900 : 19900; // in halalas (29.00 SAR / 199.00 SAR)
      const productName = planType === "monthly" ? "سقراط بلس (الاشتراك الشهري) 👑" : "سقراط بلس (الاشتراك السنوي) 👑";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "sar",
              product_data: {
                name: productName,
                description: "افتح جميع آفاق الحكمة والمعرفة الذكية وتحليل كتب الـ PDF بدون قيود بأمان تام",
              },
              unit_amount: priceAmount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/?stripe_session_id={CHECKOUT_SESSION_ID}&plan_type=${planType}`,
        cancel_url: `${origin}/?stripe_cancel=true`,
        metadata: {
          userId: userId || "anonymous",
          planType: planType,
        },
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe create session error:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // Stripe Session verification endpoint
  app.post("/api/stripe/verify-checkout-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      let stripe;
      try {
        stripe = getStripeInstance();
      } catch (err: any) {
        return res.json({ error: "STRIPE_NOT_CONFIGURED" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session?.payment_status === "paid") {
        return res.json({
          success: true,
          planType: session.metadata?.planType || "yearly",
          userId: session.metadata?.userId || "anonymous"
        });
      } else {
        return res.json({ success: false, status: session.payment_status });
      }
    } catch (err: any) {
      console.error("Stripe verify session error:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date() });
  });

  // Vite integration for asset serving in dev and production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Server start error:", err);
});
