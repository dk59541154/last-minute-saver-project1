import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Trash2, ShieldAlert, Zap, Compass, AlertCircle, RefreshCw, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { text: "Overwhelmed. Where do I start?", icon: "🚨" },
  { text: "Give me a 10-min action sprint", icon: "⏱️" },
  { text: "Help me break down a massive task", icon: "🧠" },
  { text: "I have 0 motivation right now", icon: "🔋" }
];

export default function GeminiChatbot() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("saver_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* fallback */ }
    }
    return [
      {
        role: "model",
        text: "I am **Slayer**, your high-velocity Execution Coach. Tell me what is stressing you out, paralyzing your progress, or cluttering your board right now. Let's slice it down into actionable 5-minute victories.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("saver_chat_history", JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Package only the last 15 messages of context to keep the request lightweight and avoid rate limits
      const contextHistory = messages.slice(-15).map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: contextHistory,
          message: userMsg.text
        })
      });

      if (!response.ok) {
        throw new Error("Slayer endpoint timed out. Falling back to reserve coaching state.");
      }

      const data = await response.json();
      
      const modelMsg: Message = {
        role: "model",
        text: data.text || "I am listening. Take a breath and let's tackle your current priority block.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error: any) {
      console.error(error);
      const errorMsg: Message = {
        role: "model",
        text: "🚨 **Slayer Buffer Protection Active**: High demand detected. Take action immediately: pick your absolute smallest item, close all browser tabs except this one, and work for exactly 5 minutes without looking back.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const clearChat = () => {
    const defaultMsg: Message = {
      role: "model",
      text: "Chat database flushed. Slayer execution logs cleared. What focus target are we aiming for next?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([defaultMsg]);
  };

  return (
    <div id="gemini-chatbot" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col h-[400px] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg text-indigo-600">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1">
              SLAYER COACH
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            </h3>
            <p className="text-[10px] text-slate-400">Psychological Stress Unblocker</p>
          </div>
        </div>

        <button
          onClick={clearChat}
          title="Flush chat history"
          className="text-slate-400 hover:text-red-500 hover:bg-slate-50 p-1 rounded-lg transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chat messages stream */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-1 ${
                    isUser
                      ? "bg-slate-800 text-white font-medium rounded-tr-sm"
                      : "bg-slate-100 border border-slate-200 text-slate-700 rounded-tl-sm font-sans"
                  }`}
                >
                  <p className="whitespace-pre-line">
                    {/* Render basic bold formatting manually to support clean chat styles */}
                    {msg.text.split("**").map((chunk, i) => 
                      i % 2 === 1 ? <strong key={i} className="font-extrabold text-indigo-900 bg-indigo-50/50 px-1 rounded">{chunk}</strong> : chunk
                    )}
                  </p>
                  <span className={`text-[8px] block text-right font-mono ${isUser ? "text-slate-400" : "text-slate-400"}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm p-3 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span className="font-bold tracking-wide uppercase text-[9px] text-slate-400">Slayer is thinking...</span>
            </div>
          </motion.div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Suggestion Quick Chips */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-1.5 pb-2 shrink-0 border-t border-slate-100/50 pt-2 bg-white/90 z-10">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt.text)}
              className="text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 transition flex items-center gap-1 cursor-pointer"
            >
              <span>{prompt.icon}</span>
              <span>{prompt.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chat Input form */}
      <form onSubmit={handleFormSubmit} className="flex gap-1.5 pt-2 border-t border-slate-100 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Slayer to unlock focus..."
          disabled={isLoading}
          className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-300 text-white font-bold text-xs p-2 rounded-xl transition flex items-center justify-center cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
