import React, { useState, useEffect, useRef } from "react";
import { Habit, Task } from "../types";
import { 
  CheckCircle2, 
  Circle, 
  Flame, 
  Plus, 
  Trash2, 
  Award, 
  Zap, 
  Trophy, 
  Sparkles, 
  TrendingUp,
  Clock,
  ShieldCheck,
  RotateCcw,
  Star,
  ChevronRight
} from "lucide-react";

interface HabitTrackerProps {
  tasks?: Task[];
}

const DEFAULT_HABITS: Habit[] = [
  { id: "h1", name: "Lock phone during execution block", emoji: "📵", completed: false, streak: 3 },
  { id: "h2", name: "Close all distracting browser tabs", emoji: "🖥️", completed: false, streak: 5 },
  { id: "h3", name: "Take 5-min breathing break", emoji: "🌬️", completed: false, streak: 2 },
  { id: "h4", name: "Stay hydrated (Drink water)", emoji: "💧", completed: false, streak: 1 },
];

interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletedOnTime: number;
}

export default function HabitTracker({ tasks = [] }: HabitTrackerProps) {
  // --- Habits Setup ---
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem("saver_habits");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return DEFAULT_HABITS;
  });

  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("⚡");

  useEffect(() => {
    localStorage.setItem("saver_habits", JSON.stringify(habits));
  }, [habits]);

  // --- Task Consistency Streaks (Gamified) ---
  const [streakStats, setStreakStats] = useState<StreakStats>(() => {
    const saved = localStorage.getItem("saver_task_streak_stats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.currentStreak === "number") return parsed;
      } catch (e) { /* fallback */ }
    }
    // High-traction starting stats for nice empty-state preview feel
    return {
      currentStreak: 3,
      bestStreak: 5,
      totalCompletedOnTime: 8
    };
  });

  const [streakAlert, setStreakAlert] = useState<{
    message: string;
    type: "success" | "warning" | "level-up" | null;
  }>({ message: "", type: null });

  // Use a ref to track which tasks are already recognized as completed to prevent double-counting or re-runs on mount
  const prevCompletedIdsRef = useRef<string[]>([]);

  // Initialize the ref with already completed tasks on mount
  useEffect(() => {
    prevCompletedIdsRef.current = tasks.filter(t => t.completed).map(t => t.id);
  }, []);

  // Monitor tasks and update the streak on completion
  useEffect(() => {
    const currentCompleted = tasks.filter(t => t.completed);
    const prevCompletedIds = prevCompletedIdsRef.current;

    // Find newly completed tasks
    const newlyCompleted = currentCompleted.filter(t => !prevCompletedIds.includes(t.id));

    if (newlyCompleted.length > 0) {
      let anyOnTime = false;
      let anyOverdue = false;
      let completedTitles: string[] = [];

      setStreakStats(prev => {
        let updatedStreak = prev.currentStreak;
        let updatedBest = prev.bestStreak;
        let updatedTotalOnTime = prev.totalCompletedOnTime;

        newlyCompleted.forEach(task => {
          completedTitles.push(task.title);
          // Check if task is completed within deadline
          const isOverdue = new Date(task.deadline).getTime() < Date.now();
          if (!isOverdue) {
            updatedStreak += 1;
            updatedTotalOnTime += 1;
            anyOnTime = true;
            if (updatedStreak > updatedBest) {
              updatedBest = updatedStreak;
            }
          } else {
            updatedStreak = 0; // Streak broken
            anyOverdue = true;
          }
        });

        const nextStats = {
          currentStreak: updatedStreak,
          bestStreak: updatedBest,
          totalCompletedOnTime: updatedTotalOnTime
        };

        localStorage.setItem("saver_task_streak_stats", JSON.stringify(nextStats));

        // Display beautiful micro-coaching toast notifications
        if (anyOnTime) {
          if (updatedStreak % 5 === 0) {
            setStreakAlert({
              message: `🏆 STREAK LEVEL UP! Hit ${updatedStreak} consecutive on-time solves!`,
              type: "level-up"
            });
          } else {
            setStreakAlert({
              message: `🔥 Completed on time! Streak increased to ${updatedStreak}.`,
              type: "success"
            });
          }
        } else if (anyOverdue) {
          setStreakAlert({
            message: `⚠️ Deadline missed for task. Consistency streak has reset to 0.`,
            type: "warning"
          });
        }

        return nextStats;
      });
    }

    // Always update the ref with current state
    prevCompletedIdsRef.current = currentCompleted.map(t => t.id);
  }, [tasks]);

  // Clean alert after 6 seconds
  useEffect(() => {
    if (streakAlert.message) {
      const timer = setTimeout(() => {
        setStreakAlert({ message: "", type: null });
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [streakAlert.message]);

  const toggleHabit = (id: string) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === id) {
          const nextCompleted = !h.completed;
          return {
            ...h,
            completed: nextCompleted,
            streak: nextCompleted ? h.streak + 1 : Math.max(0, h.streak - 1)
          };
        }
        return h;
      })
    );
  };

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const habit: Habit = {
      id: "h-" + Date.now(),
      name: newHabitName.trim(),
      emoji: newHabitEmoji,
      completed: false,
      streak: 0
    };

    setHabits(prev => [...prev, habit]);
    setNewHabitName("");
    setNewHabitEmoji("⚡");
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const resetStreakStats = () => {
    const resetVal = { currentStreak: 0, bestStreak: Math.max(0, streakStats.bestStreak), totalCompletedOnTime: 0 };
    setStreakStats(resetVal);
    localStorage.setItem("saver_task_streak_stats", JSON.stringify(resetVal));
    setStreakAlert({ message: "Streak counters reset to baseline.", type: "warning" });
  };

  const totalStreakPoints = habits.reduce((acc, h) => acc + h.streak, 0);

  // --- Adaptive Streak Level Styling ---
  const currentStreak = streakStats.currentStreak;
  const bestStreak = streakStats.bestStreak;
  const totalCompletedOnTime = streakStats.totalCompletedOnTime;

  // Determine current Tier & next milestone target
  let tierName = "Deadline Initiate";
  let tierColor = "text-slate-500 bg-slate-50 border-slate-200";
  let themeGradient = "from-slate-50 to-slate-100/50 border-slate-200";
  let flameColor = "text-slate-400";
  let milestoneNext = 3;
  let milestoneMedal = "🥉 Bronze";

  if (currentStreak >= 10) {
    tierName = "GODLIKE DISCIPLINE";
    tierColor = "text-purple-600 bg-purple-50 border-purple-200";
    themeGradient = "from-purple-50/70 via-indigo-50/50 to-blue-50/30 border-purple-200";
    flameColor = "text-purple-600 fill-purple-600 animate-bounce";
    milestoneNext = 20;
    milestoneMedal = "👑 Sovereign";
  } else if (currentStreak >= 5) {
    tierName = "Deadline Assassin";
    tierColor = "text-rose-600 bg-rose-50 border-rose-200";
    themeGradient = "from-rose-50/60 to-orange-50/40 border-rose-200";
    flameColor = "text-rose-500 fill-rose-500 animate-pulse";
    milestoneNext = 10;
    milestoneMedal = "🥇 Gold";
  } else if (currentStreak >= 3) {
    tierName = "Hyper-Focus Operator";
    tierColor = "text-amber-600 bg-amber-50 border-amber-200";
    themeGradient = "from-amber-50/50 to-yellow-50/30 border-amber-200";
    flameColor = "text-amber-500 fill-amber-500";
    milestoneNext = 5;
    milestoneMedal = "🥈 Silver";
  } else if (currentStreak >= 1) {
    tierName = "Tactical Traction";
    tierColor = "text-blue-600 bg-blue-50 border-blue-200";
    themeGradient = "from-blue-50/40 to-slate-50/60 border-blue-100";
    flameColor = "text-blue-500 fill-blue-500";
    milestoneNext = 3;
    milestoneMedal = "🥉 Bronze";
  }

  // Calculate percentage toward next milestone
  const currentMilestoneBase = currentStreak >= 10 ? 10 : currentStreak >= 5 ? 5 : currentStreak >= 3 ? 3 : 0;
  const range = milestoneNext - currentMilestoneBase;
  const progress = Math.min(100, Math.max(0, ((currentStreak - currentMilestoneBase) / range) * 100));

  return (
    <div className="space-y-4">
      {/* 1. Tactical Deadline Consistency Streak Panel */}
      <div className={`bg-gradient-to-br ${themeGradient} border rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-300 relative overflow-hidden`}>
        {/* Subtle grid pattern background accent */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,white)] pointer-events-none opacity-20"></div>

        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              DEADLINE CONSISTENCY
            </h3>
            <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${tierColor}`}>
              {tierName}
            </span>
          </div>

          <button 
            onClick={resetStreakStats}
            title="Reset consistency streak statistics"
            className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Toast alert within card */}
        {streakAlert.message && (
          <div className={`text-[10px] font-bold p-2 rounded-xl border flex items-center gap-2 animate-fade-in ${
            streakAlert.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : streakAlert.type === "warning"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-purple-100 text-purple-900 border-purple-300 animate-bounce"
          }`}>
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 leading-snug">{streakAlert.message}</span>
          </div>
        )}

        {/* Gamified visual indicator */}
        <div className="grid grid-cols-12 gap-3 items-center relative z-10">
          {/* Flame streak count bubble */}
          <div className="col-span-4 flex flex-col items-center justify-center bg-white border border-slate-200/80 rounded-2xl p-3 shadow-inner relative group hover:scale-[1.03] transition-transform duration-200">
            <Flame className={`w-10 h-10 ${flameColor} transition-transform duration-300 group-hover:scale-110`} />
            <div className="absolute -top-1.5 -right-1 bg-blue-600 text-white font-mono font-black text-[9px] px-1.5 py-0.5 rounded-full shadow border border-blue-400">
              STREAK
            </div>
            <span className="text-xl font-black font-mono text-slate-800 mt-1">
              {currentStreak}
            </span>
          </div>

          {/* Core metrics panel */}
          <div className="col-span-8 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/80 border border-slate-200/50 rounded-xl p-2">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Best Streak</span>
                <span className="text-xs font-black font-mono text-slate-700 flex items-center justify-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {bestStreak}
                </span>
              </div>
              <div className="bg-white/80 border border-slate-200/50 rounded-xl p-2">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">On-Time Saves</span>
                <span className="text-xs font-black font-mono text-slate-700 flex items-center justify-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {totalCompletedOnTime}
                </span>
              </div>
            </div>

            {/* Micro Gamification coaching hint */}
            <div className="text-[10px] text-slate-500 font-medium leading-relaxed italic bg-white/40 p-2 rounded-xl border border-slate-200/30">
              {currentStreak === 0 
                ? "💡 Your rescue streak is waiting. Clear your next target on time to activate fire mode!"
                : currentStreak < 3
                ? `⚡ Complete ${milestoneNext - currentStreak} more task${milestoneNext - currentStreak > 1 ? "s" : ""} on time to achieve ${milestoneMedal}!`
                : currentStreak < 5
                ? `🔥 Superb control! Just ${milestoneNext - currentStreak} more to lock in the prestigious ${milestoneMedal} medal.`
                : `👑 Godlike discipline active! Next major milestone at ${milestoneNext} consecutive saves.`}
            </div>
          </div>
        </div>

        {/* Milestone Medal progress indicator */}
        <div className="space-y-1 relative z-10 pt-1">
          <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Level Progress</span>
            <span className="text-slate-600 flex items-center gap-0.5">
              Goal: {milestoneMedal} ({currentStreak}/{milestoneNext})
            </span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-300/30 shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                currentStreak >= 10 
                  ? "bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-500 animate-pulse" 
                  : currentStreak >= 5 
                  ? "bg-gradient-to-r from-rose-500 to-orange-500" 
                  : currentStreak >= 3 
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400" 
                  : "bg-gradient-to-r from-blue-500 to-indigo-500"
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Tactical Habit & Goal Tracker Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500" />
              Tactical Habits
            </h3>
            <p className="text-[10px] text-slate-400">Build secondary daily execution triggers</p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5 text-emerald-700 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
            <span>{totalStreakPoints}pts</span>
          </div>
        </div>

        {/* Habit List */}
        <div className="space-y-2">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition duration-150 ${
                habit.completed
                  ? "bg-slate-50/60 border-slate-100 text-slate-400"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleHabit(habit.id)}
                className="flex items-center gap-2.5 text-left flex-1 font-medium"
              >
                <span className="text-sm">{habit.emoji}</span>
                <span className={habit.completed ? "line-through text-slate-400" : ""}>{habit.name}</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="flex items-center text-[10px] text-amber-600 font-mono font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 shrink-0">
                  🔥 {habit.streak}d
                </span>
                <button
                  type="button"
                  onClick={() => deleteHabit(habit.id)}
                  className="text-slate-300 hover:text-red-500 p-0.5 rounded transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Add Habit Form */}
        <form onSubmit={addHabit} className="flex gap-1.5 pt-2 border-t border-slate-100">
          <select
            value={newHabitEmoji}
            onChange={(e) => setNewHabitEmoji(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-2 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="⚡">⚡</option>
            <option value="📵">📵</option>
            <option value="🖥️">🖥️</option>
            <option value="💧">💧</option>
            <option value="🌬️">🌬️</option>
            <option value="📝">📝</option>
            <option value="🚶">🚶</option>
          </select>
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Add active habit..."
            className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newHabitName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 disabled:text-slate-300 text-white font-bold text-xs p-1.5 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
