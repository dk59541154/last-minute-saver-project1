import React, { useState, useEffect } from "react";
import { Task, SavedScenario } from "../types";
import { AlertTriangle, Clock, Plus, Trash2, CheckCircle, ShieldAlert, Sparkles } from "lucide-react";

interface TaskBoardProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  panicLevel: "medium" | "high" | "apocalyptic";
  setPanicLevel: (level: "medium" | "high" | "apocalyptic") => void;
  focusTimeMinutes: number;
  setFocusTimeMinutes: (minutes: number) => void;
  onGeneratePlan: () => void;
  loading: boolean;
}

const SCENARIOS: SavedScenario[] = [
  {
    id: "scen-student",
    name: "🎓 College Student Crisis",
    panicLevel: "high",
    focusTimeMinutes: 120,
    tasks: [
      {
        id: "t1",
        title: "Chemistry Lab Report & Data Summary",
        category: "assignment",
        deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        urgency: "high",
        notes: "Missing this means failing the lab component. Still need to write discussion section and plot graph.",
        completed: false
      },
      {
        id: "t2",
        title: "Monthly Electric Utility Bill Payment",
        category: "bill",
        deadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        urgency: "medium",
        notes: "Past due. Avoid power disconnection.",
        completed: false
      }
    ]
  },
  {
    id: "scen-freelance",
    name: "💼 Freelancer Midnight Rush",
    panicLevel: "apocalyptic",
    focusTimeMinutes: 180,
    tasks: [
      {
        id: "t3",
        title: "Client Pitch Deck & Prototype Video Demo",
        category: "commitment",
        deadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        urgency: "apocalyptic",
        notes: "Crucial $5k client. Demo still has unresolved bugs in the database code.",
        completed: false
      },
      {
        id: "t4",
        title: "Submit NDA & Signed Freelance Contract",
        category: "commitment",
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        urgency: "high",
        notes: "Needs electronic signature, scan, and email dispatch to the HR department.",
        completed: false
      }
    ]
  },
  {
    id: "scen-interview",
    name: "🚀 Forgotten Job Interview Prep",
    panicLevel: "high",
    focusTimeMinutes: 90,
    tasks: [
      {
        id: "t5",
        title: "Prepare Technical Presentation Slides",
        category: "interview",
        deadline: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        urgency: "high",
        notes: "Need to prepare 5 slides explaining my previous systems architecture.",
        completed: false
      },
      {
        id: "t6",
        title: "Dry-Run Mock Q&A Practice",
        category: "interview",
        deadline: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(),
        urgency: "medium",
        notes: "Review core system design principles and behavioral stories.",
        completed: false
      }
    ]
  }
];

export default function TaskBoard({
  tasks,
  setTasks,
  panicLevel,
  setPanicLevel,
  focusTimeMinutes,
  setFocusTimeMinutes,
  onGeneratePlan,
  loading
}: TaskBoardProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Task["category"]>("assignment");
  const [newUrgency, setNewUrgency] = useState<Task["urgency"]>("high");
  const [newDeadlineHours, setNewDeadlineHours] = useState<number>(4);
  const [newNotes, setNewNotes] = useState("");

  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const updated: Record<string, string> = {};
      tasks.forEach((t) => {
        const ms = new Date(t.deadline).getTime() - Date.now();
        if (ms <= 0) {
          updated[t.id] = "OVERDUE";
        } else {
          const totalSecs = Math.floor(ms / 1000);
          const hrs = Math.floor(totalSecs / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;
          updated[t.id] = `${hrs > 0 ? `${hrs}h ` : ""}${mins}m ${secs}s`;
        }
      });
      setCountdowns(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  const loadScenario = (scen: SavedScenario) => {
    const rebasedTasks = scen.tasks.map((task, idx) => {
      const baseHours = idx === 0 ? 3 : 6;
      return {
        ...task,
        deadline: new Date(Date.now() + baseHours * 60 * 60 * 1000).toISOString()
      };
    });
    setTasks(rebasedTasks);
    setPanicLevel(scen.panicLevel);
    setFocusTimeMinutes(scen.focusTimeMinutes);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const task: Task = {
      id: "t-" + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      urgency: newUrgency,
      deadline: new Date(Date.now() + newDeadlineHours * 60 * 60 * 1000).toISOString(),
      notes: newNotes.trim() || undefined,
      completed: false
    };

    setTasks([...tasks, task]);
    setNewTitle("");
    setNewNotes("");
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const toggleTaskCompleted = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const getUrgencyBadge = (urgency: Task["urgency"]) => {
    switch (urgency) {
      case "apocalyptic":
        return "bg-red-50 text-red-600 border border-red-200";
      case "high":
        return "bg-amber-50 text-amber-600 border border-amber-200";
      case "medium":
        return "bg-blue-50 text-blue-600 border border-blue-200";
      default:
        return "bg-slate-50 text-slate-500 border border-slate-200";
    }
  };

  const getUrgencyBorder = (urgency: Task["urgency"]) => {
    switch (urgency) {
      case "apocalyptic":
        return "border-l-4 border-l-red-500";
      case "high":
        return "border-l-4 border-l-amber-500";
      case "medium":
        return "border-l-4 border-l-blue-500";
      default:
        return "border-l-4 border-l-slate-300";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Triaging / Presets Section (Left 4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Quick Emergency Presets
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Select an active real-world crisis template to load parameters and live tasks instantly.
          </p>
          <div className="space-y-3">
            {SCENARIOS.map((scen) => (
              <button
                key={scen.id}
                type="button"
                onClick={() => loadScenario(scen)}
                className="w-full text-left p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition duration-150 group text-sm"
              >
                <div className="font-semibold text-slate-700 group-hover:text-blue-600 transition">
                  {scen.name}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {scen.focusTimeMinutes}m block
                  </span>
                  <span className="capitalize text-amber-600 font-medium">
                    🔥 {scen.panicLevel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Active Crisis Setup
          </h2>

          {/* Panic Level Slider / Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Rescue Severity: <span className="text-blue-600 capitalize font-bold">{panicLevel}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["medium", "high", "apocalyptic"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPanicLevel(level)}
                  className={`py-2 px-1 text-center text-xs font-bold rounded-lg border transition ${
                    panicLevel === level
                      ? level === "apocalyptic"
                        ? "bg-red-50 border-red-500 text-red-700"
                        : level === "high"
                        ? "bg-amber-50 border-amber-500 text-amber-700"
                        : "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {level === "apocalyptic" ? "☠️ Panic" : level === "high" ? "🔥 High" : "⏳ Medium"}
                </button>
              ))}
            </div>
          </div>

          {/* Available focus time slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Max Focus Duration
              </label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-mono">
                {focusTimeMinutes} Mins
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="30"
              value={focusTimeMinutes}
              onChange={(e) => setFocusTimeMinutes(Number(e.target.value))}
              className="w-full accent-blue-600 bg-slate-100 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] font-bold font-mono text-slate-400 px-1">
              <span>30m</span>
              <span>1.5h</span>
              <span>3h</span>
              <span>5h</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-500 leading-relaxed space-y-2">
            <div className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Proactive Buffers Included
            </div>
            <p>
              The AI scheduler forces a 15-minute diagnostic margin so you complete the critical components before your actual hard deadline.
            </p>
          </div>
        </div>
      </div>

      {/* Task Creation & Listing Section (Right 8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Create Task Form */}
        <form onSubmit={addTask} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Add Urgent Task / Target
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500">Task Title / Deadline Goal</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Chemistry Lab Report draft, Pay internet bill"
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Hours Remaining</label>
              <select
                value={newDeadlineHours}
                onChange={(e) => setNewDeadlineHours(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-sm rounded-xl px-4 py-3 text-slate-800 focus:outline-none transition"
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours</option>
                <option value={4}>4 Hours</option>
                <option value={6}>6 Hours</option>
                <option value={8}>8 Hours</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as Task["category"])}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-sm rounded-xl px-4 py-3 text-slate-800 focus:outline-none transition capitalize"
              >
                <option value="assignment">🎓 Assignment</option>
                <option value="bill">💳 Bill Payment</option>
                <option value="meeting">🤝 Meeting</option>
                <option value="interview">🚀 Interview Prep</option>
                <option value="commitment">🔒 Core Commitment</option>
                <option value="other">⚙️ Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Severity</label>
              <select
                value={newUrgency}
                onChange={(e) => setNewUrgency(e.target.value as Task["urgency"])}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-sm rounded-xl px-4 py-3 text-slate-800 focus:outline-none transition capitalize"
              >
                <option value="low">⏳ Low (Can wait)</option>
                <option value="medium">⚡ Medium (Should prioritize)</option>
                <option value="high">🔥 High (Immediate impact)</option>
                <option value="apocalyptic">☠️ Apocalyptic (Strict failure risk)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">What is causing you to procrastinate on this? (Optional)</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Explain any details or mental blocks (e.g., 'Stuck on the methodology part', 'No internet access'). AI will address these."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none transition"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-3 rounded-xl transition duration-150 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Task To Queue
            </button>
          </div>
        </form>

        {/* Task List Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Critical Queue ({tasks.length})
            </h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
              Action Required
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">No active tasks in your queue!</p>
              <p className="text-xs text-slate-400 mt-1">Select one of our scenario presets on the left or type an urgent task above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${getUrgencyBorder(task.urgency)} ${
                    task.completed
                      ? "bg-slate-50/50 border-slate-200 text-slate-400"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-3.5 max-w-xl">
                    <button
                      type="button"
                      onClick={() => toggleTaskCompleted(task.id)}
                      className="mt-1 text-slate-400 hover:text-blue-600 transition shrink-0"
                    >
                      <CheckCircle
                        className={`w-5 h-5 ${
                          task.completed ? "text-emerald-600 fill-emerald-50" : "text-slate-300"
                        }`}
                      />
                    </button>
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className={`text-sm font-semibold ${task.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {task.title}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getUrgencyBadge(task.urgency)}`}>
                          {task.urgency}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 capitalize font-medium">
                          {task.category}
                        </span>
                      </div>
                      {task.notes && (
                        <p className={`text-xs ${task.completed ? "text-slate-300" : "text-slate-500"} italic leading-relaxed`}>
                          "{task.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                    <div className="flex flex-col text-left md:text-right font-mono">
                      <span className="text-[10px] uppercase text-slate-400 tracking-wider font-bold">Hard Deadline</span>
                      <span className={`text-xs ${task.completed ? "text-slate-400" : "text-amber-600"} font-bold flex items-center gap-1 mt-0.5`}>
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {countdowns[task.id] || "Loading..."}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* ACTION CALL: Generate Battle Plan */}
              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  disabled={loading || tasks.every(t => t.completed)}
                  onClick={onGeneratePlan}
                  className={`w-full max-w-md py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-md transition-all cursor-pointer ${
                    loading
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.01]"
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${loading ? "animate-spin text-slate-400" : "text-white"}`} />
                  {loading ? "Constructing Proactive Rescue Plan..." : "Formulate Tactical Battle Plan"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
