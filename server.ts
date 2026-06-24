import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize the Gemini Client to avoid crashing if API key is not ready during startup.
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Health API Route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. Generate Tactical Battle Plan Route
app.post("/api/generate-plan", async (req, res) => {
  try {
    const { tasks, panicLevel, focusTimeMinutes } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      res.status(400).json({ error: "Missing or invalid tasks array." });
      return;
    }

    const client = getGeminiClient();

    const prompt = `
You are the absolute ultimate "Last-Minute Rescue Coach." A user has come to you in extreme panic because they are about to miss critical deadlines, fail an assignment, skip an interview, or miss important payments.
Your mission is to provide an intense, highly tactical, Hour-by-Hour Battle Plan, prioritize their tasks brutally (throwing away non-essential clutter), and generate useful copy-pasteable assets (e.g. extension request emails, structural essay outlines, template notifications, script) to save their skin.

Input Context:
- Current panic level specified by user: "${panicLevel || 'high'}"
- Available focus duration: ${focusTimeMinutes || 120} minutes
- Raw tasks and deadlines provided by user:
${JSON.stringify(tasks, null, 2)}

Be realistic, tough-loving, highly encouraging but extremely urgent. Avoid fluffy motivational speeches; focus on tactical momentum. 
Construct your response following the requested JSON schema. Provide clear, complete, fully written templates.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            revisedTasks: {
              type: Type.ARRAY,
              description: "A brutally prioritized re-evaluation of the user's tasks with priority and stress analysis.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  revisedPriority: { type: Type.INTEGER, description: "Priority score from 1 (lowest priority, can defer) to 5 (apocalyptic urgency, must execute immediately)" },
                  urgencyAnalysis: { type: Type.STRING, description: "Brutally honest, direct analysis of what happens if they fail, and why they must do it." },
                  suggestedBufferMinutes: { type: Type.INTEGER, description: "Recommended time buffer to finish early." }
                },
                required: ["id", "title", "revisedPriority", "urgencyAnalysis", "suggestedBufferMinutes"]
              }
            },
            hourlyTimeline: {
              type: Type.ARRAY,
              description: "Tactical block-by-block breakdown of the available focus duration.",
              items: {
                type: Type.OBJECT,
                properties: {
                  timeSlot: { type: Type.STRING, description: "e.g., 'First 20 Mins', '09:00 - 09:30', or 'Block 1'" },
                  actionItem: { type: Type.STRING, description: "High-leverage single execution action (e.g. 'Build essay outline and draft introduction without self-editing')" },
                  focusType: { type: Type.STRING, description: "One of: 'execution', 'administrative', 'delegation', 'break'" },
                  coachingNudge: { type: Type.STRING, description: "Intense, supportive, urgency-focused coaching tip." }
                },
                required: ["timeSlot", "actionItem", "focusType", "coachingNudge"]
              }
            },
            actionableTemplates: {
              type: Type.ARRAY,
              description: "Copy-pasteable custom pre-written template text that helps them complete or handle tasks (e.g., extension requests, scripts, outlines).",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "e.g., 'Polite Extension Request Email' or 'Project Skeleton Outline'" },
                  type: { type: Type.STRING, description: "Must be: 'email', 'sms', 'outline', or 'checklist'" },
                  content: { type: Type.STRING, description: "Complete, copy-pasteable body text custom-tailored to their tasks." }
                },
                required: ["title", "type", "content"]
              }
            },
            overallRecommendation: {
              type: Type.STRING,
              description: "A summary directive in a 'tough-love' coach tone, offering high-impact tips (e.g., locking phone, hiding tabs) to begin immediately."
            }
          },
          required: ["revisedTasks", "hourlyTimeline", "actionableTemplates", "overallRecommendation"]
        }
      }
    });

    const parsedPlan = JSON.parse(response.text || "{}");
    res.json(parsedPlan);
  } catch (error: any) {
    console.error("Plan Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate battle plan." });
  }
});

// 3. AI Voice Coaching TTS API
app.post("/api/generate-voice", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "Missing text parameter" });
      return;
    }

    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Speak with direct energy, friendly authority, and absolute urgency. Speak this short coaching tip clearly: "${text}"` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // kore is energetic and strong
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(500).json({ error: "No audio was generated by the model." });
      return;
    }

    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Voice Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate audio companion." });
  }
});

// 4. Vite Dev Middleware & Static Assets Handler
async function startServer() {
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
