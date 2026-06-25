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

// Resilient Fallback Generators for when Gemini API experiences high demand or is unavailable (e.g. 503)

function parseVoiceCommandFallback(
  command: string,
  tasks: any[],
  currentPanicLevel: string,
  currentFocusTime: number
): any {
  const cleanCmd = command.toLowerCase().trim();

  // 1. GENERATE PLAN fallback
  if (
    cleanCmd.includes("plan") ||
    cleanCmd.includes("generate") ||
    cleanCmd.includes("formulate") ||
    cleanCmd.includes("re-run")
  ) {
    return {
      reply: "Understood! Formulating your tactical Battle Plan using the resilient local fallback engine. Let's get to work!",
      action: "GENERATE_PLAN"
    };
  }

  // 2. CHANGE SETTINGS fallback
  if (
    cleanCmd.includes("panic") ||
    cleanCmd.includes("level") ||
    cleanCmd.includes("duration") ||
    cleanCmd.includes("minutes") ||
    cleanCmd.includes("focus")
  ) {
    let panicLevel = currentPanicLevel || "high";
    if (cleanCmd.includes("apocalyptic")) {
      panicLevel = "apocalyptic";
    } else if (cleanCmd.includes("medium")) {
      panicLevel = "medium";
    } else if (cleanCmd.includes("high")) {
      panicLevel = "high";
    }

    let focusTimeMinutes = currentFocusTime || 120;
    const matchMin = cleanCmd.match(/(\d+)\s*(minute|minutes|min|mins|hours|hour)/);
    if (matchMin) {
      const val = parseInt(matchMin[1], 10);
      if (cleanCmd.includes("hour")) {
        focusTimeMinutes = val * 60;
      } else {
        focusTimeMinutes = val;
      }
    }

    return {
      reply: `Local controller updated: panic level set to ${panicLevel} and focus duration to ${focusTimeMinutes} minutes.`,
      action: "CHANGE_SETTINGS",
      actionData: {
        panicLevel,
        focusTimeMinutes
      }
    };
  }

  // 3. REMOVE / COMPLETE TASK fallback
  if (
    cleanCmd.includes("remove") ||
    cleanCmd.includes("delete") ||
    cleanCmd.includes("complete") ||
    cleanCmd.includes("done") ||
    cleanCmd.includes("finish")
  ) {
    let matchedTaskId = "";
    let matchedTitle = "";

    for (const t of tasks || []) {
      const titleLower = t.title.toLowerCase();
      if (
        cleanCmd.includes(titleLower) ||
        titleLower.split(" ").some((word: string) => word.length > 3 && cleanCmd.includes(word))
      ) {
        matchedTaskId = t.id;
        matchedTitle = t.title;
        break;
      }
    }

    if (matchedTaskId) {
      return {
        reply: `Got it! marking task "${matchedTitle}" as completed. Great job taking immediate action!`,
        action: "REMOVE_TASK",
        actionData: {
          taskId: matchedTaskId
        }
      };
    }
  }

  // 4. ADD TASK fallback
  if (
    cleanCmd.includes("add") ||
    cleanCmd.includes("new") ||
    cleanCmd.includes("create") ||
    cleanCmd.includes("schedule") ||
    cleanCmd.includes("need to") ||
    cleanCmd.includes("must")
  ) {
    let title = command;
    const removeKeywords = [
      "add task",
      "add assignment",
      "add bill",
      "add meeting",
      "add interview",
      "add commitment",
      "add",
      "new task",
      "create task",
      "schedule task",
      "create a new task to",
      "create a new task",
      "create",
      "need to",
      "must"
    ];
    for (const kw of removeKeywords) {
      if (cleanCmd.startsWith(kw)) {
        title = command.substring(kw.length).trim();
        break;
      }
    }
    title = title.replace(/^[\s,.:;'"\-_]+|[\s,.:;'"\-_]+$/g, "");
    if (!title) {
      title = "New Spoken Task";
    }

    let category = "other";
    if (
      cleanCmd.includes("assignment") ||
      cleanCmd.includes("study") ||
      cleanCmd.includes("homework") ||
      cleanCmd.includes("exam") ||
      cleanCmd.includes("essay") ||
      cleanCmd.includes("school")
    ) {
      category = "assignment";
    } else if (
      cleanCmd.includes("bill") ||
      cleanCmd.includes("pay") ||
      cleanCmd.includes("rent") ||
      cleanCmd.includes("money")
    ) {
      category = "bill";
    } else if (
      cleanCmd.includes("meeting") ||
      cleanCmd.includes("sync") ||
      cleanCmd.includes("discuss") ||
      cleanCmd.includes("call")
    ) {
      category = "meeting";
    } else if (cleanCmd.includes("interview") || cleanCmd.includes("job") || cleanCmd.includes("hr")) {
      category = "interview";
    } else if (
      cleanCmd.includes("commitment") ||
      cleanCmd.includes("promise") ||
      cleanCmd.includes("appointment")
    ) {
      category = "commitment";
    }

    let urgency = "high";
    if (cleanCmd.includes("apocalyptic") || cleanCmd.includes("critical") || cleanCmd.includes("extremely urgent")) {
      urgency = "apocalyptic";
    } else if (cleanCmd.includes("low") || cleanCmd.includes("minor")) {
      urgency = "low";
    } else if (cleanCmd.includes("medium") || cleanCmd.includes("normal")) {
      urgency = "medium";
    }

    return {
      reply: `I've registered a new task: "${title}". Let's crush this immediately!`,
      action: "ADD_TASK",
      actionData: {
        task: {
          title,
          category,
          urgency,
          deadlineHours: 4
        }
      }
    };
  }

  // 5. General encouragement fallback
  return {
    reply: "I'm with you! Keep your focus locked, disable notifications, and let's conquer your task board together.",
    action: "NONE"
  };
}

function generatePlanFallback(tasks: any[], panicLevel: string, focusTimeMinutes: number): any {
  const revisedTasks = tasks.map((t) => {
    let revisedPriority = 3;
    if (t.urgency === "apocalyptic") revisedPriority = 5;
    else if (t.urgency === "high") revisedPriority = 4;
    else if (t.urgency === "medium") revisedPriority = 3;
    else revisedPriority = 2;

    return {
      id: t.id,
      title: t.title,
      revisedPriority,
      urgencyAnalysis: `This "${t.category || "objective"}" is highly critical for your sanity. Execute immediately with 100% focus.`,
      suggestedBufferMinutes: Math.min(20, Math.floor(focusTimeMinutes / tasks.length / 2))
    };
  });

  const timeline: any[] = [];
  const slotDuration = Math.floor((focusTimeMinutes || 120) / Math.max(1, tasks.length));

  tasks.forEach((t, idx) => {
    timeline.push({
      timeSlot: `${idx * slotDuration}m - ${(idx + 1) * slotDuration}m`,
      actionItem: `Focus exclusively on "${t.title}". Turn off phone, close browser tabs, and do not self-correct during drafting.`,
      focusType: "execution",
      coachingNudge: "No excuses. Build momentum. Rapid imperfect execution beats complete stagnation."
    });
  });

  if (timeline.length === 0) {
    timeline.push({
      timeSlot: "Block 1",
      actionItem: "Audit your current commitments, breathe deeply for 5 minutes, and add your first real task.",
      focusType: "break",
      coachingNudge: "Clarity is power. Establish focus habits."
    });
  }

  const templates = tasks.map((t) => {
    return {
      title: `Emergency outline: ${t.title}`,
      type: "outline",
      content: `# Emergency Outline for ${t.title}\n\n- [ ] **Phase 1: Core Research (15% time)**: Write down key facts/rules\n- [ ] **Phase 2: Skeleton Draft (30% time)**: Put headings and write basic structure\n- [ ] **Phase 3: Deep Execution (45% time)**: Write without rereading or self-correction\n- [ ] **Phase 4: Polish & Submit (10% time)**: Spellcheck and submit instantly`
    };
  });

  return {
    revisedTasks,
    hourlyTimeline: timeline,
    actionableTemplates: templates,
    overallRecommendation: "Using our local tactical backup scheduler to bypass network traffic. Lock your phone, close all side tabs, and start working on your highest-priority objective right now!"
  };
}

function executeTaskFallback(taskTitle: string, category: string, notes: string, panicLevel: string): any {
  return {
    steps: [
      {
        stepName: "Heuristic Task Assessment",
        durationMinutes: 5,
        logs: [
          "[SYS] Local fallback analysis initiated.",
          `[SYS] Scanning context for: "${taskTitle}" (${category || "other"})`,
          `[SYS] Notes: "${notes || "None"}"`
        ]
      },
      {
        stepName: "Structure Generation",
        durationMinutes: 10,
        logs: ["[SYS] Mapping out skeleton layout...", "[SYS] Populating boilerplate templates."]
      },
      {
        stepName: "Emergency Deliverable Drafting",
        durationMinutes: 15,
        logs: ["[SYS] Draft written to buffer.", "[SYS] Standard markdown verification completed successfully."]
      },
      {
        stepName: "Coaching Delivery",
        durationMinutes: 2,
        logs: ["[SYS] Completed. Preparing spoken advice."]
      }
    ],
    solutionDraft: `# Resilient Tactical Blueprint: ${taskTitle}\n\n## 1. Quick Start Directive\nDo not hesitate. Procrastination is a response to stress. Break this task down into the following immediate actions:\n\n- **Action A**: Write down the first sentence or first line of code. Don't worry about quality yet.\n- **Action B**: Work for exactly 15 minutes, then evaluate your progress.\n\n## 2. Recommended Deliverable Structure\nHere is a structured template for your "${category || "objective"}":\n- **Introduction/Header**: State the primary intent clearly.\n- **Body/Details**: Flesh out 3 supporting pillars.\n- **Conclusion/Call to Action**: State the next resolution step.\n\n## 3. High-Leverage Script\n*Use this script if you need to ask for a temporary buffer:*\n> "Hi, I am finalizing the draft of ${taskTitle} and expect to deliver it shortly. Thank you for your flexibility!"`,
    voiceSummary: `I've prepared a structural blueprint for your task: "${taskTitle}". Open the deliverable panel and start executing!`
  };
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
    console.warn("Plan Generation: High API demand or unavailable. Using resilient local fallback scheduler.");
    try {
      const { tasks, panicLevel, focusTimeMinutes } = req.body;
      const fallbackPlan = generatePlanFallback(tasks || [], panicLevel, focusTimeMinutes);
      res.json(fallbackPlan);
    } catch (fallbackError: any) {
      console.error("Plan Generation Fatal:", fallbackError?.message || fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate battle plan." });
    }
  }
});

// 2.5. AI Voice Command Processing Route
app.post("/api/voice-command", async (req, res) => {
  try {
    const { command, tasks, panicLevel, focusTimeMinutes } = req.body;
    if (!command || typeof command !== "string") {
      res.status(400).json({ error: "Missing command text" });
      return;
    }

    const client = getGeminiClient();

    const prompt = `
You are the interactive, tough-loving, highly responsive proactive "Last-Minute Voice Assistant".
Your job is to parse the user's spoken command (transcribed from speech) and determine if they want to:
- Add a new urgent task (action: "ADD_TASK")
- Remove an existing task (action: "REMOVE_TASK")
- Re-run or generate their battle plan (action: "GENERATE_PLAN")
- Adjust settings like panic level or focus duration (action: "CHANGE_SETTINGS")
- Or simply ask a general question/need encouragement (action: "NONE")

Context:
- Current panic level: "${panicLevel || 'high'}"
- Focus time minutes: ${focusTimeMinutes || 120}
- Current active tasks queue:
${JSON.stringify(tasks, null, 2)}

Spoken User Command: "${command}"

Determine the most appropriate action, parse the parameters safely, and generate a brief, enthusiastic, energetic spoken feedback 'reply' (maximum 2 sentences) that our coach can speak back. Keep it extremely active and encouraging!
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { 
              type: Type.STRING, 
              description: "A short, energetic, high-intensity feedback message (1-2 sentences) to speak back to the user." 
            },
            action: { 
              type: Type.STRING, 
              enum: ["ADD_TASK", "REMOVE_TASK", "GENERATE_PLAN", "CHANGE_SETTINGS", "NONE"],
              description: "The client-side action that should be triggered based on user speech." 
            },
            actionData: {
              type: Type.OBJECT,
              properties: {
                task: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Descriptive title of the task to be added." },
                    category: { 
                      type: Type.STRING, 
                      enum: ["assignment", "bill", "meeting", "interview", "commitment", "other"],
                      description: "The task's category." 
                    },
                    urgency: { 
                      type: Type.STRING, 
                      enum: ["low", "medium", "high", "apocalyptic"],
                      description: "The urgency of the task." 
                    },
                    deadlineHours: { type: Type.INTEGER, description: "Number of hours until hard deadline, defaulting to 4." },
                    notes: { type: Type.STRING, description: "Optional explanation of the friction or cause of procrastination." }
                  },
                  required: ["title", "category", "urgency", "deadlineHours"]
                },
                panicLevel: { 
                  type: Type.STRING, 
                  enum: ["medium", "high", "apocalyptic"],
                  description: "New requested panic level." 
                },
                focusTimeMinutes: { 
                  type: Type.INTEGER, 
                  description: "New focus duration in minutes." 
                },
                taskId: { 
                  type: Type.STRING, 
                  description: "If user requests to delete/remove a task, try to map it to the matching task's id from the provided queue context." 
                }
              }
            }
          },
          required: ["reply", "action"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    res.json(parsedResponse);
  } catch (error: any) {
    console.warn("Voice Command Parsing: High API demand or unavailable. Using resilient local fallback processor.");
    try {
      const { command, tasks, panicLevel, focusTimeMinutes } = req.body;
      const fallbackResponse = parseVoiceCommandFallback(command, tasks || [], panicLevel, focusTimeMinutes);
      res.json(fallbackResponse);
    } catch (fallbackError: any) {
      console.error("Voice Command Parsing Fatal:", fallbackError?.message || fallbackError);
      res.status(500).json({ error: error.message || "Failed to process voice command." });
    }
  }
});

// 2.8. Autonomous Task Agent Execution Route
app.post("/api/execute-task-autonomous", async (req, res) => {
  try {
    const { taskTitle, category, notes, panicLevel } = req.body;
    if (!taskTitle) {
      res.status(400).json({ error: "Missing taskTitle" });
      return;
    }

    const client = getGeminiClient();

    const prompt = `
You are an advanced Autonomous AI Agent executing a task on behalf of a procrastinating user.
The user is in a state of "${panicLevel || 'high'}" panic. 
Task details:
- Title: "${taskTitle}"
- Category: "${category || 'other'}"
- User's mental block/notes: "${notes || 'No notes provided. Procrastination is high.'}"

Your job is to actually solve or draft a massive headstart for this task autonomously.
Provide:
1. An array of 4 sequential steps you took in your autonomous agent runtime to complete or advance this task.
2. For each step, include a list of 2-3 detailed command line/agent execution 'logs' describing your internal research, compilation, analysis, or generation actions.
3. A complete, high-quality, fully written 'solutionDraft' in Markdown format (including structural headings, template code, pre-written draft emails, or step-by-step technical blueprints) that directly solves the user's mental block. Do not provide a generic placeholder; provide real, customized work.
4. A 1-sentence supportive, high-energy 'voiceSummary' explaining that the agent has finished execution and what the user should do next.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              description: "The autonomous steps executed by the agent.",
              items: {
                type: Type.OBJECT,
                properties: {
                  stepName: { type: Type.STRING, description: "e.g., 'Target Analysis & Schema Setup' or 'Synthesizing Draft Content'" },
                  durationMinutes: { type: Type.INTEGER, description: "Simulated execution minutes" },
                  logs: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Internal command/agent runtime output logs."
                  }
                },
                required: ["stepName", "durationMinutes", "logs"]
              }
            },
            solutionDraft: {
              type: Type.STRING,
              description: "A comprehensive, extremely detailed custom Markdown document that drafts or implements the actual solution for this task."
            },
            voiceSummary: {
              type: Type.STRING,
              description: "A 1-sentence feedback message that can be spoken back to the user."
            }
          },
          required: ["steps", "solutionDraft", "voiceSummary"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.warn("Autonomous Execution Agent: High API demand or unavailable. Using resilient local fallback simulation.");
    try {
      const { taskTitle, category, notes, panicLevel } = req.body;
      const fallbackResult = executeTaskFallback(taskTitle, category, notes, panicLevel);
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error("Autonomous Execution Agent Fatal:", fallbackError?.message || fallbackError);
      res.status(500).json({ error: error.message || "Failed to execute task autonomously." });
    }
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
    console.warn("Voice Generation: Could not generate model voice. Browser speech synthesis fallback is available.", error?.message || error);
    res.status(500).json({ error: error.message || "Failed to generate audio companion." });
  }
});

// 3.5. AI Task Decomposer Fallback Generator
function decomposeTaskFallback(taskTitle: string, category: string, notes: string): any {
  return {
    microSteps: [
      `Open your local draft workspace for: ${taskTitle}`,
      "Write down the main goal or headline in 1 line",
      "Draft 2-3 quick bullet points or outline ideas without filtering",
      "Work uninterrupted for exactly 5 minutes using the countdown",
      "Review the raw draft and celebrate completing the start block!"
    ],
    unblockPhrase: "Action cures fear. Start with the absolute easiest micro-step and let inertia take over!"
  };
}

// 3.6. AI Task Decomposer / Mental Lockbreaker API
app.post("/api/decompose-task", async (req, res) => {
  try {
    const { taskTitle, category, notes } = req.body;
    if (!taskTitle) {
      res.status(400).json({ error: "Missing taskTitle parameter." });
      return;
    }

    const client = getGeminiClient();
    const prompt = `
You are an expert psychological Anti-Procrastination Coach and Execution Specialist.
The user is experiencing high stress and massive procrastination block on this task:
Task: "${taskTitle}"
Category: "${category || 'general'}"
Context/Mental Block: "${notes || 'Overwhelmed by starting.'}"

Your job is to break down this scary task into exactly 4 to 6 incredibly simple, ultra-low-friction "5-Minute Micro-Steps".
Each step must be so small and easy that the user's brain cannot procrastinate on it (e.g. "Create an empty doc and name it", "Write just one sentence, even if it is bad", "Spend 2 minutes outlining 3 bullet points").
Also write a powerful, comforting but urgent 1-sentence "unblockPhrase" that re-frames their stress and gives them tactical courage.

Return the response in JSON format.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            microSteps: {
              type: Type.ARRAY,
              description: "4 to 6 incredibly simple, ultra-low-friction 5-minute micro-steps",
              items: { type: Type.STRING }
            },
            unblockPhrase: {
              type: Type.STRING,
              description: "A comforting but urgent 1-sentence framing/reassurance to break the stress block."
            }
          },
          required: ["microSteps", "unblockPhrase"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.warn("Decompose Task: High API demand or unavailable. Using resilient local fallback decomposer.", error?.message || error);
    try {
      const { taskTitle, category, notes } = req.body;
      const fallbackResult = decomposeTaskFallback(taskTitle || "Active Task", category || "other", notes || "");
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error("Decompose Task Fatal:", fallbackError?.message || fallbackError);
      res.status(500).json({ error: error.message || "Failed to decompose task." });
    }
  }
});

// 3.7. Resilient Procrastination Coach Chat Fallback
function chatFallback(message: string): string {
  const responses = [
    "I hear you! Procrastination is an emotional response to stress, not a lack of willpower. Pick the absolute simplest 5-minute task on your board, and let's conquer that first.",
    "Action creates traction! The fastest way to break a mental block is to write down a messy first draft without any self-criticism.",
    "Let's slice this down together. Select one item, start a 10-minute focus sprint, and celebrate just making a start.",
    "Your mind is seeking safety in delay. Let's cheat that loop by starting the clock and committing to just 3 minutes of work!"
  ];
  const randResponse = responses[Math.floor(Math.random() * responses.length)];
  return `${randResponse} (Note: Slayer Procrastination Fallback is active to protect your velocity).`;
}

// 3.8. Multi-turn Procrastination Coach Chat API
app.post("/api/chat", async (req, res) => {
  try {
    const { history, message } = req.body;
    if (!message) {
      res.status(400).json({ error: "Missing message parameter." });
      return;
    }

    const client = getGeminiClient();
    const contents: any[] = [];
    
    if (Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const systemInstruction = `
You are 'Slayer', an elite psychological Anti-Procrastination Coach and Execution Specialist.
Your sole purpose is to rescue the user from procrastination, stress, task paralysis, and panic.
Speak with a high-energy, direct, highly encouraging, and empathetic tone.
Use clear, actionable bullet points or short paragraphs. Avoid corporate jargon.
Give the user instant, micro-tactical steps they can start in the next 60 seconds. Keep your response supportive, motivating, and punchy.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text || "I am right here with you. Let's attack the next task!" });
  } catch (error: any) {
    console.warn("Gemini Chat API Error (using fallback):", error?.message || error);
    try {
      const { message } = req.body;
      const text = chatFallback(message || "");
      res.json({ text });
    } catch (fallbackError: any) {
      res.status(500).json({ error: "Failed to process chat conversation." });
    }
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
