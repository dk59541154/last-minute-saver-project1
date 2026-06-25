import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, Volume2, Sparkles, AlertTriangle, AlertCircle } from "lucide-react";
import { Task } from "../types";

// Support both standard and prefixed Web Speech API
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface VoiceAssistantProps {
  tasks: Task[];
  panicLevel: "medium" | "high" | "apocalyptic";
  focusTimeMinutes: number;
  onAddTaskByVoice: (taskData: {
    title: string;
    category: Task["category"];
    urgency: Task["urgency"];
    deadlineHours: number;
    notes?: string;
  }) => void;
  onRemoveTaskByVoice: (taskId: string) => void;
  onGeneratePlan: () => void;
  onChangeSettingsByVoice: (settings: {
    panicLevel?: "medium" | "high" | "apocalyptic";
    focusTimeMinutes?: number;
  }) => void;
  speakCoachingTip: (text: string) => Promise<void>;
  voiceEnabled: boolean;
}

export default function VoiceAssistant({
  tasks,
  panicLevel,
  focusTimeMinutes,
  onAddTaskByVoice,
  onRemoveTaskByVoice,
  onGeneratePlan,
  onChangeSettingsByVoice,
  speakCoachingTip,
  voiceEnabled
}: VoiceAssistantProps) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [recognition, setRecognition] = useState<any | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [manualInput, setManualInput] = useState<string>("");
  const [statusText, setStatusText] = useState<string>("Ready for your vocal commands.");
  const [processing, setProcessing] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Suggested voice commands for quick chips
  const SUGGESTIONS = [
    "Add a bill payment in 2 hours",
    "Change panic level to apocalyptic",
    "Generate my plan",
    "Tell me what to focus on next"
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "en-US";
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setStatusText("Listening... speak your command now.");
        setErrorText(null);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setTranscript(resultText);
        setManualInput(resultText);
        handleSubmitCommand(resultText);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorText("Microphone permission denied. Open app in a new tab or use typing instead.");
        } else {
          setErrorText(`Recognition error: ${event.error}`);
        }
        setIsListening(false);
        setStatusText("Speech failed. Try manual input instead.");
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    } catch (e) {
      setIsSupported(false);
    }
  }, []);

  const startListening = () => {
    if (!recognition) return;
    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
    }
  };

  const stopListening = () => {
    if (!recognition) return;
    recognition.stop();
    setIsListening(false);
  };

  const handleSubmitCommand = async (commandString: string) => {
    if (!commandString.trim()) return;
    setProcessing(true);
    setStatusText("Processing your voice instruction...");
    setErrorText(null);

    try {
      const response = await fetch("/api/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: commandString,
          tasks,
          panicLevel,
          focusTimeMinutes
        })
      });

      if (!response.ok) {
        throw new Error("Voice AI could not process this command.");
      }

      const data = await response.json();
      setStatusText(data.reply);

      // Execute the requested client-side operation
      if (data.action === "ADD_TASK" && data.actionData?.task) {
        onAddTaskByVoice(data.actionData.task);
      } else if (data.action === "REMOVE_TASK" && data.actionData?.taskId) {
        onRemoveTaskByVoice(data.actionData.taskId);
      } else if (data.action === "GENERATE_PLAN") {
        onGeneratePlan();
      } else if (data.action === "CHANGE_SETTINGS" && data.actionData) {
        onChangeSettingsByVoice({
          panicLevel: data.actionData.panicLevel,
          focusTimeMinutes: data.actionData.focusTimeMinutes
        });
      }

      // Proactively speak back the response
      if (voiceEnabled) {
        await speakCoachingTip(data.reply);
      }

      setManualInput("");
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed to process spoken request.");
      setStatusText("Failed to process command.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4 relative overflow-hidden shadow-xl">
      {/* Background radial gradient decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full filter blur-xl"></div>
      
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-200">
          <Sparkles className="w-4 h-4 text-blue-400" />
          Proactive Voice AI Assistant
        </h2>
        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
          Live Agent
        </span>
      </div>

      {/* Voice Status Indicator and Waveform */}
      <div className="flex items-center gap-4 bg-slate-950/80 rounded-xl p-4 border border-slate-800/80">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={processing || !isSupported}
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition duration-200 cursor-pointer ${
            isListening
              ? "bg-red-500 hover:bg-red-600 animate-pulse text-white shadow-lg shadow-red-500/20"
              : processing
              ? "bg-slate-800 text-slate-400 cursor-not-allowed"
              : !isSupported
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:scale-105"
          }`}
          title={isListening ? "Stop Listening" : "Start Spoken Command"}
        >
          {isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 space-y-1 min-w-0">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">
            {isListening ? "Listening Spoken Audio" : processing ? "Parsing Speech Intent" : "Status Indicator"}
          </span>
          <p className="text-xs text-slate-300 font-medium leading-normal line-clamp-2">
            {statusText}
          </p>
        </div>

        {/* Dynamic Waveform Simulation */}
        {isListening && (
          <div className="flex items-end gap-1 shrink-0 h-6">
            <div className="w-1 bg-red-500 rounded-full animate-[pulse_0.4s_infinite_alternate]" style={{ height: "40%" }}></div>
            <div className="w-1 bg-red-400 rounded-full animate-[pulse_0.3s_infinite_alternate_0.1s]" style={{ height: "100%" }}></div>
            <div className="w-1 bg-red-500 rounded-full animate-[pulse_0.5s_infinite_alternate_0.2s]" style={{ height: "60%" }}></div>
            <div className="w-1 bg-red-400 rounded-full animate-[pulse_0.4s_infinite_alternate_0.15s]" style={{ height: "80%" }}></div>
          </div>
        )}
      </div>

      {/* Manual Input Fallback / Text Entry */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitCommand(manualInput);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder={isSupported ? "Speak, or type a tactical command..." : "Type a tactical command..."}
          disabled={processing}
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none transition"
        />
        <button
          type="submit"
          disabled={processing || !manualInput.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white p-2.5 rounded-xl transition cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Suggestions Chips */}
      <div className="space-y-1.5">
        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Suggested Commands</span>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              disabled={processing}
              onClick={() => {
                setManualInput(s);
                handleSubmitCommand(s);
              }}
              className="text-[10px] text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg px-2 py-1 transition cursor-pointer text-left"
            >
              "{s}"
            </button>
          ))}
        </div>
      </div>

      {/* Error Notices */}
      {errorText && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-normal flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>{errorText}</span>
        </div>
      )}
    </div>
  );
}
