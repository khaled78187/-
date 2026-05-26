import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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
