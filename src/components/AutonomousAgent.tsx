import React, { useState, useEffect, useRef } from "react";
import { Task } from "../types";
import { 
  Terminal, 
  Cpu, 
  Play, 
  Check, 
  Copy, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  Volume2, 
  CheckCircle2,
  FileText
} from "lucide-react";

interface AutonomousAgentProps {
  activeTask: Task | null;
  tasks: Task[];
  panicLevel: "medium" | "high" | "apocalyptic";
  onCompleteTask: (id: string) => void;
  speakCoachingTip: (text: string) => Promise<void>;
  voiceEnabled: boolean;
}

interface StepLog {
  stepName: string;
  durationMinutes: number;
  logs: string[];
}

export default function AutonomousAgent({
  activeTask,
  tasks,
  panicLevel,
  onCompleteTask,
  speakCoachingTip,
  voiceEnabled
}: AutonomousAgentProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [running, setRunning] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [solutionDraft, setSolutionDraft] = useState<string | null>(null);
  const [voiceSummary, setVoiceSummary] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepLog[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Sync selected task with active focus task
  useEffect(() => {
    if (activeTask) {
      setSelectedTaskId(activeTask.id);
    } else if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [activeTask, tasks]);

  // Scroll terminal logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  const currentTask = tasks.find(t => t.id === selectedTaskId);

  const startAutonomousExecution = async () => {
    if (!currentTask) return;
    setRunning(true);
    setTerminalLogs([]);
    setSolutionDraft(null);
    setVoiceSummary(null);
    setCurrentStepIdx(0);
    setError(null);

    // Initial boot logs
    const bootLogs = [
      `[SYS_BOOT] Initializing Autonomous Rescue Agent Core v2.6...`,
      `[SYS_BOOT] Target selection: "${currentTask.title}"`,
      `[SYS_BOOT] Category: ${currentTask.category.toUpperCase()} | Panic level: ${panicLevel.toUpperCase()}`,
      `[SYS_BOOT] Analyzing notes: "${currentTask.notes || 'No procrastination context provided.'}"`,
      `[AGENT] Spin up internal reasoning models...`,
    ];

    // Push boot logs sequentially to simulate action
    for (let i = 0; i < bootLogs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      setTerminalLogs(prev => [...prev, bootLogs[i]]);
    }

    try {
      // Call Gemini API to execute the task autonomously
      const response = await fetch("/api/execute-task-autonomous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: currentTask.title,
          category: currentTask.category,
          notes: currentTask.notes || "",
          panicLevel
        })
      });

      if (!response.ok) {
        throw new Error("Autonomous core offline. Please check your system API key.");
      }

      const data = await response.json();
      const loadedSteps: StepLog[] = data.steps || [];
      setSteps(loadedSteps);

      // Sequentially print logs from each step to simulate live thinking
      for (let sIdx = 0; sIdx < loadedSteps.length; sIdx++) {
        setCurrentStepIdx(sIdx);
        const step = loadedSteps[sIdx];
        
        setTerminalLogs(prev => [
          ...prev, 
          `[STEP ${sIdx + 1}/4] Starting: ${step.stepName} (${step.durationMinutes}m simulation)...`
        ]);

        for (let lIdx = 0; lIdx < step.logs.length; lIdx++) {
          await new Promise(resolve => setTimeout(resolve, 700));
          setTerminalLogs(prev => [...prev, `  ↳ ${step.logs[lIdx]}`]);
        }

        setTerminalLogs(prev => [...prev, `[SUCCESS] Step completed.`]);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setTerminalLogs(prev => [
        ...prev, 
        `[COMPLETE] Task executed autonomously. solutionDraft generated!`,
        `[COACH] Spoken voice summary ready.`
      ]);

      setSolutionDraft(data.solutionDraft);
      setVoiceSummary(data.voiceSummary);

      // Speak back the feedback statement if requested
      if (voiceEnabled && data.voiceSummary) {
        speakCoachingTip(data.voiceSummary);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Execution error in autonomous container.");
      setTerminalLogs(prev => [...prev, `[FATAL] Agent crashed: ${err.message || "Internal error"}`]);
    } finally {
      setRunning(false);
    }
  };

  const copySolutionToClipboard = () => {
    if (!solutionDraft) return;
    navigator.clipboard.writeText(solutionDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-5 relative overflow-hidden shadow-xl">
      {/* Visual Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="space-y-1">
          <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-200">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            Autonomous Task Executor Agent
          </h2>
          <p className="text-[10px] text-slate-400">Forces immediate execution and handles the heavy lifting</p>
        </div>
        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
          Agent Executor
        </span>
      </div>

      {/* Task Selection Menu */}
      <div className="space-y-2">
        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">
          Select Target Task to Autonomously Solve
        </label>
        <div className="flex gap-2">
          <select
            value={selectedTaskId}
            disabled={running}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition"
          >
            {tasks.length === 0 && <option value="">No tasks available in queue</option>}
            {tasks.map(t => (
              <option key={t.id} value={t.id} disabled={t.completed}>
                {t.completed ? "✓ " : ""}{t.title} ({t.category})
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={running || !selectedTaskId || currentTask?.completed}
            onClick={startAutonomousExecution}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition duration-150 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {running ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Working...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                Run Agent
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Agent Monitor console */}
      {(terminalLogs.length > 0 || running) && (
        <div className="space-y-2">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black block flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Live Agent Execution Terminal
          </label>
          
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] h-48 overflow-y-auto leading-relaxed text-emerald-400/90 space-y-1 select-none">
            {terminalLogs.map((log, idx) => (
              <div 
                key={idx} 
                className={`${
                  log.startsWith("[SYS") 
                    ? "text-slate-500" 
                    : log.startsWith("[STEP") 
                    ? "text-blue-400 font-bold" 
                    : log.startsWith("[SUCCESS") 
                    ? "text-emerald-500"
                    : log.startsWith("[FATAL")
                    ? "text-red-500 font-black animate-pulse"
                    : "text-slate-300"
                }`}
              >
                {log}
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-1.5 text-blue-400 font-bold mt-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                <span>Agent thinking in container sandbox...</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Solution Artifact Output Panel */}
      {solutionDraft && (
        <div className="space-y-3 pt-1 animate-[fadeIn_0.3s_ease]">
          <div className="flex justify-between items-center border-t border-slate-800 pt-4">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Execution Deliverables</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copySolutionToClipboard}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700/85 text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Copy solution draft to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy Solution"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentTask) {
                    onCompleteTask(currentTask.id);
                    setSolutionDraft(null);
                    setVoiceSummary(null);
                    setTerminalLogs([]);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-xs px-2.5 py-1.5 rounded-lg text-white font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>Task Completed</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 max-h-56 overflow-y-auto leading-relaxed text-xs text-slate-300 space-y-3 font-sans selection:bg-emerald-500 selection:text-white">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Solved deliverable draft:</p>
            <div className="prose prose-invert prose-xs text-slate-300 max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                {solutionDraft}
              </pre>
            </div>
          </div>

          {/* Voice statement summary */}
          {voiceSummary && (
            <div className="bg-blue-950/35 border border-blue-900/50 p-3.5 rounded-xl flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-blue-400 block font-mono">Agent Voice Note</span>
                <p className="text-xs text-slate-300 italic">"{voiceSummary}"</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 leading-normal flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
