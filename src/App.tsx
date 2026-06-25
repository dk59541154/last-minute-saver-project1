import React, { useState, useEffect } from "react";
import { Task, BattlePlan, LiveNotification } from "./types";
import TaskBoard from "./components/TaskBoard";
import BattlePlanView from "./components/BattlePlanView";
import VoiceAssistant from "./components/VoiceAssistant";
import HabitTracker from "./components/HabitTracker";
import AutonomousAgent from "./components/AutonomousAgent";
import GeminiChatbot from "./components/GeminiChatbot";
import { 
  initAuth, 
  googleSignIn, 
  logoutUser, 
  setAccessToken 
} from "./firebase";
import { User } from "firebase/auth";
import { 
  Sparkles, 
  Clock, 
  Activity, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  Cpu,
  BookmarkCheck,
  Calendar,
  LogOut,
  UserCheck
} from "lucide-react";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [panicLevel, setPanicLevel] = useState<"medium" | "high" | "apocalyptic">("high");
  const [focusTimeMinutes, setFocusTimeMinutes] = useState<number>(120);
  const [plan, setPlan] = useState<BattlePlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // Firebase Google Auth State
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Voice Assistant Controls
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [voiceLoading, setVoiceLoading] = useState<boolean>(false);
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>("");

  // Health and efficiency statistics (simulated from active tasks for minimalist sidebars)
  const [taskVelocity, setTaskVelocity] = useState<string>("0/0");
  const [focusFlow, setFocusFlow] = useState<number>(100);

  // Initialize auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setGoogleToken(token);
        setAuthError(null);
      },
      () => {
        setUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setGoogleToken(res.accessToken);
      }
    } catch (err: any) {
      console.error("Sign-In failed:", err);
      if (err.code === "auth/popup-closed-by-user" || err.message?.includes("popup-closed-by-user") || err.message?.includes("closed by user")) {
        setAuthError("Sign-in popup was closed before completion. If you are using the embedded preview, please open the application in a new tab by clicking the external link icon in the top right to enable Google Calendar integrations.");
      } else {
        setAuthError("Google Sign-In failed: " + (err.message || err));
      }
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setGoogleToken(null);
    } catch (err: any) {
      console.error("Sign-Out failed:", err);
    }
  };

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update real-time metric indicators based on tasks
  useEffect(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    setTaskVelocity(`${completed}/${total}`);
    
    if (total === 0) {
      setFocusFlow(100);
    } else {
      const percentage = Math.round(((total - tasks.filter(t => t.urgency === 'apocalyptic' && !t.completed).length) / total) * 100);
      setFocusFlow(percentage);
    }
  }, [tasks]);

  // Dynamic Context-Aware Reminders
  const [reminders, setReminders] = useState<LiveNotification[]>([]);

  useEffect(() => {
    const alerts: LiveNotification[] = [];
    const incompleteTasks = tasks.filter(t => !t.completed);

    // 1. Apocalyptic urgency alert
    const hasApocalyptic = incompleteTasks.some(t => t.urgency === 'apocalyptic');
    if (hasApocalyptic) {
      const urgentTask = incompleteTasks.find(t => t.urgency === 'apocalyptic')!;
      alerts.push({
        id: "alert-apoc",
        type: "warning",
        title: "☠️ APOCALYPTIC PRIORITY ALERT",
        message: `"${urgentTask.title}" has extreme immediate deadline failure risk. Put down your phone, pick an objective, and start focusing now.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    // 2. High task volume alert
    if (incompleteTasks.length >= 4) {
      alerts.push({
        id: "alert-vol",
        type: "warning",
        title: "⚠️ TASK OVERFLOW SATURATION",
        message: `${incompleteTasks.length} urgent tasks in queue. Run 'Formulate Tactical Battle Plan' to optimize your ${focusTimeMinutes} focus minutes immediately.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    // 3. Focus flow low advice alert
    if (focusFlow < 70) {
      alerts.push({
        id: "alert-flow",
        type: "advice",
        title: "🌬️ BREATHING MARGIN ADVISED",
        message: "Your focus buffer is under strain. Complete active tasks or take a brief breathing break to reclaim clarity.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    // 4. Default proactive info
    if (incompleteTasks.length === 0) {
      alerts.push({
        id: "alert-clean",
        type: "success",
        title: "🛡️ SECURE COGNITIVE SHIELD",
        message: "All tasks completed! All systems clean. Maintain focus hygiene by tracking daily habits or running a crisis scenario.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } else if (alerts.length === 0) {
      alerts.push({
        id: "alert-active",
        type: "info",
        title: "💡 CONTEXT-AWARE REMINDER",
        message: `You have ${incompleteTasks.length} active target objectives. Zero in on the highest priority target first.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    setReminders(alerts);
  }, [tasks, focusTimeMinutes, focusFlow]);

  const handleGeneratePlan = async () => {
    if (tasks.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          panicLevel,
          focusTimeMinutes
        })
      });
      if (!response.ok) {
        throw new Error("Failed to generate plan from server API.");
      }
      const data = await response.json();
      setPlan(data);
      
      // Auto-trigger introductory voice encouragement
      if (voiceEnabled && data.overallRecommendation) {
        speakCoachingTip(data.overallRecommendation);
      }
    } catch (err) {
      console.error(err);
      alert("Error generating tactical battle plan. Please check your GEMINI_API_KEY.");
    } finally {
      setLoading(false);
    }
  };

  const fallbackSpeechSynthesis = (textToSpeak: string) => {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel(); // Clear any existing queues first
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 1.05; // Quick pace for tactical coach feel
        utterance.pitch = 1.0;
        
        utterance.onend = () => {
          setPlayingAudio(null);
          setCurrentSpeechText("");
        };
        utterance.onerror = () => {
          setPlayingAudio(null);
          setCurrentSpeechText("");
        };
        
        window.speechSynthesis.speak(utterance);
        setPlayingAudio({
          pause: () => window.speechSynthesis.cancel()
        } as any);
      } catch (speechErr) {
        console.error("Browser speech synthesis execution failed:", speechErr);
        setPlayingAudio(null);
        setCurrentSpeechText("");
      }
    } else {
      setPlayingAudio(null);
      setCurrentSpeechText("");
    }
  };

  const speakCoachingTip = async (text: string) => {
    if (!voiceEnabled) return;
    
    // Stop any currently playing audio
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
    }

    setVoiceLoading(true);
    setCurrentSpeechText(text);
    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) throw new Error("TTS Failed");
      
      const data = await response.json();
      if (data.audio) {
        const audioUrl = `data:audio/mp3;base64,${data.audio}`;
        const audio = new Audio();
        
        audio.onerror = (e) => {
          console.warn("Audio element failed to load source, falling back to browser speech synthesis:", e);
          fallbackSpeechSynthesis(text);
        };

        audio.src = audioUrl;
        setPlayingAudio(audio);
        audio.play().then(() => {
          audio.onended = () => {
            setPlayingAudio(null);
            setCurrentSpeechText("");
          };
        }).catch((playErr) => {
          console.warn("Audio play was prevented or failed, falling back to browser speech synthesis:", playErr);
          fallbackSpeechSynthesis(text);
        });
      } else {
        throw new Error("No audio in API response");
      }
    } catch (err) {
      console.error("Voice TTS integration failed, falling back to browser speech synthesis:", err);
      fallbackSpeechSynthesis(text);
    } finally {
      setVoiceLoading(false);
    }
  };

  const resetBattlePlan = () => {
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
    }
    setPlan(null);
    setCurrentSpeechText("");
  };

  const handleAddTaskByVoice = (taskData: {
    title: string;
    category: Task["category"];
    urgency: Task["urgency"];
    deadlineHours: number;
    notes?: string;
  }) => {
    const newTask: Task = {
      id: "t-" + Date.now(),
      title: taskData.title,
      category: taskData.category,
      urgency: taskData.urgency,
      deadline: new Date(Date.now() + taskData.deadlineHours * 60 * 60 * 1000).toISOString(),
      notes: taskData.notes,
      completed: false
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleCompleteTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
  };

  const handleRemoveTaskByVoice = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleChangeSettingsByVoice = (settings: {
    panicLevel?: "medium" | "high" | "apocalyptic";
    focusTimeMinutes?: number;
  }) => {
    if (settings.panicLevel) setPanicLevel(settings.panicLevel);
    if (settings.focusTimeMinutes) setFocusTimeMinutes(settings.focusTimeMinutes);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans flex flex-col antialiased">
      {/* Dynamic Header */}
      <header className="h-16 px-6 md:px-8 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
            S
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-800">
            SAVER <span className="text-blue-600 uppercase text-[10px] tracking-widest font-black ml-1">Proactive AI</span>
          </span>
        </div>

        {/* Action Controls & Realtime indicators */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Google Calendar Connect */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono flex items-center gap-1 justify-end">
                  <UserCheck className="w-3 h-3 text-emerald-500" /> Connected
                </span>
                <span className="text-xs text-slate-600 font-semibold max-w-[150px] truncate">{user.email}</span>
              </div>
              <button
                onClick={handleGoogleLogout}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                title="Disconnect Google Calendar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 transition"
                title="Connect real Google Calendar to schedule task blocks automatically"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Connect Calendar</span>
                <span className="inline sm:hidden">Connect</span>
              </button>
              <button
                onClick={() => {
                  setUser({
                    uid: "mock-user-123",
                    email: "demo-user@lastminutelifesaver.ai",
                    displayName: "Demo User",
                    photoURL: "https://lh3.googleusercontent.com/a/default-user"
                  } as any);
                  setGoogleToken("mock-access-token-123");
                  setAuthError(null);
                }}
                className="hidden md:inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                title="Use simulated Demo Mode to test calendar integrations inside the sandbox"
              >
                Demo Mode
              </button>
            </div>
          )}

          {/* Audio toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              voiceEnabled 
                ? "bg-blue-50 text-blue-600 border-blue-200" 
                : "bg-slate-100 text-slate-400 border-slate-200"
            }`}
            title={voiceEnabled ? "Mute energetic voice coach" : "Enable voice coaching feedback"}
          >
            {voiceEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" /> Voice On
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" /> Voice Off
              </>
            )}
          </button>

          {/* Time & Calendar Block */}
          <div className="hidden sm:flex flex-col items-end font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{currentDate || "OCTOBER 24, 2024"}</span>
            <span className="text-sm font-black text-slate-800 tracking-wider">{currentTime || "10:42 AM"}</span>
          </div>
        </div>
      </header>

      {authError && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start gap-3 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div>
              <span className="font-bold block mb-0.5">Google Calendar Connection Note</span>
              <p className="leading-relaxed">{authError}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setUser({
                    uid: "mock-user-123",
                    email: "demo-user@lastminutelifesaver.ai",
                    displayName: "Demo User",
                    photoURL: "https://lh3.googleusercontent.com/a/default-user"
                  } as any);
                  setGoogleToken("mock-access-token-123");
                  setAuthError(null);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition text-xs shrink-0 cursor-pointer"
              >
                Simulate Demo Connection (Skip Auth)
              </button>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setAuthError(null)}
            className="text-amber-500 hover:text-amber-700 font-bold px-2 py-1 rounded hover:bg-amber-100 transition shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        
        {/* Left column / Left Sidebar (Habits & Proactive Stats) */}
        <aside className="w-full lg:w-72 flex flex-col gap-6 shrink-0 order-2 lg:order-1">
          {/* Voice AI Assistant */}
          <VoiceAssistant
            tasks={tasks}
            panicLevel={panicLevel}
            focusTimeMinutes={focusTimeMinutes}
            onAddTaskByVoice={handleAddTaskByVoice}
            onRemoveTaskByVoice={handleRemoveTaskByVoice}
            onGeneratePlan={handleGeneratePlan}
            onChangeSettingsByVoice={handleChangeSettingsByVoice}
            speakCoachingTip={speakCoachingTip}
            voiceEnabled={voiceEnabled}
          />

          {/* Gemini Chatbot - Slayer Procrastination Coach */}
          <GeminiChatbot />

          {/* Context-Aware Reminders Widget */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Context-Aware Alerts</h2>
            <div className="space-y-3">
              {reminders.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                    alert.type === "warning" 
                      ? "bg-red-50/50 border-red-200 text-red-800 animate-pulse"
                      : alert.type === "advice"
                      ? "bg-amber-50/50 border-amber-200 text-amber-800"
                      : alert.type === "success"
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                      : "bg-blue-50/50 border-blue-200 text-blue-800"
                  }`}
                >
                  <div className="flex justify-between items-center font-bold text-[10px] tracking-wide uppercase">
                    <span>{alert.title}</span>
                    <span className="opacity-60 text-[9px] font-mono">{alert.timestamp}</span>
                  </div>
                  <p className="text-slate-600 font-medium">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Status Display */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Live Context</h2>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-700 uppercase">Proactive Protection Active</span>
            </div>
            
            <div className="space-y-2.5 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mental Load</span>
                <span className={`font-semibold ${tasks.some(t => t.urgency === 'apocalyptic') ? 'text-red-600' : 'text-amber-600'}`}>
                  {tasks.length > 3 ? "Apocalyptic" : tasks.length > 0 ? "Elevated" : "Clean Slate"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Available Buffer</span>
                <span className="font-semibold text-slate-700">{focusTimeMinutes} Minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rescue Mode</span>
                <span className="font-semibold text-blue-600 capitalize">{panicLevel} Panic</span>
              </div>
            </div>
          </div>

          {/* Productivity Health Widget */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 space-y-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Productivity Health</h2>
            
            <div className="space-y-4">
              {/* Focus flow indicator */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>STRESS BUFFER</span>
                  <span className="text-blue-600 font-mono">{focusFlow}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                    style={{ width: `${focusFlow}%` }}
                  ></div>
                </div>
              </div>

              {/* Task velocity indicator */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>TASK VELOCITY</span>
                  <span className="text-emerald-600 font-mono">{taskVelocity}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${
                        tasks.length > 0 
                          ? (tasks.filter(t => t.completed).length / tasks.length) * 100 
                          : 100
                      }%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
              <p className="text-[11px] leading-relaxed text-slate-500 italic">
                "We focus on hard scheduling blocks to avoid task paralysis. Do not look at the clock; look at your active target task."
              </p>
              
              {/* Current spoken coaching bubble if playing */}
              {currentSpeechText && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-800 leading-normal font-mono animate-pulse">
                  <span className="font-bold text-blue-700 uppercase block mb-1">🗣️ Coach speaking:</span>
                  "{currentSpeechText}"
                </div>
              )}
            </div>
          </div>

          {/* Goal & Habit Tracker */}
          <HabitTracker tasks={tasks} />

          {/* Autonomous Status */}
          <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center shadow-inner">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              🛡️ Autonomous Buffer Shield: Enabled
            </span>
          </div>
        </aside>

        {/* Center Section: Main Interactive Dashboard */}
        <section className="flex-1 flex flex-col gap-6 order-1 lg:order-2">
          
          {/* Main Visual Title Box */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-light tracking-tight text-slate-800">
                  Your AI <span className="font-semibold text-slate-950">Rescue Companion</span>
                </h1>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                  We don't do passive reminders. We generate aggressive, hour-by-hour action blocks to complete assignments, prepare slides, pay bills, and protect your evening peace.
                </p>
              </div>
              
              {plan && (
                <button
                  onClick={resetBattlePlan}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition duration-150 flex items-center gap-1.5 shrink-0 self-start md:self-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-configure
                </button>
              )}
            </div>
          </div>

          {/* Switch screens depending on whether a plan is generated */}
          {!plan ? (
            <TaskBoard
              tasks={tasks}
              setTasks={setTasks}
              panicLevel={panicLevel}
              setPanicLevel={setPanicLevel}
              focusTimeMinutes={focusTimeMinutes}
              setFocusTimeMinutes={setFocusTimeMinutes}
              onGeneratePlan={handleGeneratePlan}
              loading={loading}
            />
          ) : (
            <div className="space-y-6">
              {/* Back to tasklist notification banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between text-xs text-blue-800">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Your hour-by-hour battle plan is optimized for <strong>{focusTimeMinutes} minutes</strong>. Close extraneous browser tabs now.</span>
                </div>
              </div>

              <BattlePlanView
                plan={plan}
                onVoiceNudge={speakCoachingTip}
                voiceLoading={voiceLoading}
                user={user}
                googleToken={googleToken}
                onGoogleSignIn={handleGoogleSignIn}
              />
            </div>
          )}

          {tasks.length > 0 && (
            <div className="mt-6 animate-[fadeIn_0.3s_ease]">
              <AutonomousAgent
                activeTask={tasks.find(t => !t.completed) || null}
                tasks={tasks}
                panicLevel={panicLevel}
                onCompleteTask={handleCompleteTask}
                speakCoachingTip={speakCoachingTip}
                voiceEnabled={voiceEnabled}
              />
            </div>
          )}

        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400 mt-auto font-mono">
        Last-Minute Life Saver &copy; 2026 &bull; Designed in Clean Minimalism &bull; Powered by Gemini 3.5 Flash &amp; TTS-Preview
      </footer>
    </div>
  );
}
