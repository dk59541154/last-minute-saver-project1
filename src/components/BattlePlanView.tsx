import React, { useState, useEffect } from "react";
import { BattlePlan, HourlySlot, ActionTemplate } from "../types";
import { 
  Clock, 
  CheckSquare, 
  Zap, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertCircle, 
  FileText,
  Calendar,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface BattlePlanViewProps {
  plan: BattlePlan;
  onVoiceNudge: (text: string) => void;
  voiceLoading: boolean;
  user: any; // User | null
  googleToken: string | null;
  onGoogleSignIn: () => Promise<void>;
}

export default function BattlePlanView({ 
  plan, 
  onVoiceNudge, 
  voiceLoading,
  user,
  googleToken,
  onGoogleSignIn
}: BattlePlanViewProps) {
  const [timeline, setTimeline] = useState<HourlySlot[]>([]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState<number | null>(null);

  // Active Timer State (Pomodoro block for current slot)
  const [timerSeconds, setTimerSeconds] = useState<number>(1500); // 25 mins default
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerInitial, setTimerInitial] = useState<number>(1500);

  // Google Calendar Sync states
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Google Calendar Conflict Detection states
  const [checkingConflicts, setCheckingConflicts] = useState<boolean>(false);
  const [calendarConflicts, setCalendarConflicts] = useState<any[]>([]);

  const checkTodayCalendarConflicts = async () => {
    if (!googleToken) return;
    setCheckingConflicts(true);
    setCalendarConflicts([]);

    if (googleToken === "mock-access-token-123") {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCalendarConflicts([
          {
            title: "Urgent: Team Alignment sync (Decline recommended)",
            start: new Date(Date.now() + 30 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            end: new Date(Date.now() + 60 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            link: "#"
          },
          {
            title: "Quick Sync: Sync status dashboard check-in",
            start: new Date(Date.now() + 120 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            end: new Date(Date.now() + 150 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            link: "#"
          }
        ]);
      } catch (err) {
        console.error("Mock conflict check error:", err);
      } finally {
        setCheckingConflicts(false);
      }
      return;
    }

    try {
      // Fetch today's events (from 00:00 to 23:59)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${googleToken}` }
      });

      if (!response.ok) {
        throw new Error("Could not fetch calendar events.");
      }

      const data = await response.json();
      const events = data.items || [];
      const conflictsList: any[] = [];

      // Check if any event falls in today's active timeslots
      events.forEach((event: any) => {
        const evStartStr = event.start?.dateTime || event.start?.date;
        const evEndStr = event.end?.dateTime || event.end?.date;
        if (!evStartStr || !evEndStr) return;

        const evStart = new Date(evStartStr).getTime();
        const evEnd = new Date(evEndStr).getTime();
        const now = Date.now();

        // Check if event is relevant for today (ending in the future or active today)
        if (evEnd > now) {
          conflictsList.push({
            title: event.summary || "Untitled Event",
            start: new Date(evStartStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            end: new Date(evEndStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            link: event.htmlLink
          });
        }
      });

      setCalendarConflicts(conflictsList);
    } catch (err) {
      console.error("Conflict checking failed:", err);
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Run automatically when Google Calendar is connected
  useEffect(() => {
    if (googleToken && timeline.length > 0) {
      checkTodayCalendarConflicts();
    }
  }, [googleToken, timeline]);


  const pushToGoogleCalendar = async () => {
    if (!googleToken) return;
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    if (googleToken === "mock-access-token-123") {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSyncSuccess(true);
      } catch (err: any) {
        setSyncError(err.message || "Failed mock calendar sync.");
      } finally {
        setSyncing(false);
      }
      return;
    }

    try {
      let currentStart = new Date();

      for (let i = 0; i < timeline.length; i++) {
        const slot = timeline[i];
        
        // Determine duration in minutes
        let durationMinutes = 30; // default
        const tsLower = slot.timeSlot.toLowerCase();
        if (tsLower.includes("20")) durationMinutes = 20;
        else if (tsLower.includes("15")) durationMinutes = 15;
        else if (tsLower.includes("10")) durationMinutes = 10;
        else if (tsLower.includes("5")) durationMinutes = 5;
        else if (tsLower.includes("45")) durationMinutes = 45;
        else if (tsLower.includes("hour") || tsLower.includes("60")) durationMinutes = 60;
        else if (tsLower.includes("1.5") || tsLower.includes("90")) durationMinutes = 90;
        else if (tsLower.includes("2h") || tsLower.includes("120")) durationMinutes = 120;

        const eventStart = new Date(currentStart);
        const eventEnd = new Date(currentStart.getTime() + durationMinutes * 60 * 1000);

        // Advance start time for next event
        currentStart = eventEnd;

        // Create Google Calendar event
        const event = {
          summary: `🛡️ SAVER Focus: ${slot.actionItem}`,
          description: `Coaching Nudge: "${slot.coachingNudge}"\n\nType: ${slot.focusType.toUpperCase()}\nCreated automatically by SAVER Proactive AI.`,
          start: {
            dateTime: eventStart.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          },
          end: {
            dateTime: eventEnd.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 5 },
              { method: "popup", minutes: 15 }
            ]
          },
          colorId: slot.focusType === "execution" ? "11" : slot.focusType === "break" ? "2" : "5"
        };

        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${googleToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(event)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || "Could not schedule event.");
        }
      }

      setSyncSuccess(true);
    } catch (error: any) {
      console.error("Google Calendar sync error:", error);
      setSyncError(error.message || "Failed to schedule some events.");
    } finally {
      setSyncing(false);
    }
  };

  // Sync state if plan changes
  useEffect(() => {
    if (plan && plan.hourlyTimeline) {
      setTimeline(plan.hourlyTimeline.map(slot => ({ ...slot, completed: false })));
      setActiveSlotIdx(0);
      setTimerSeconds(1500);
      setTimerRunning(false);
      setTimerInitial(1500);
    }
  }, [plan]);

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds]);

  const toggleSlotCompleted = (idx: number) => {
    const updated = [...timeline];
    updated[idx].completed = !updated[idx].completed;
    setTimeline(updated);
  };

  const handleCopyTemplate = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateIdx(idx);
    setTimeout(() => setCopiedTemplateIdx(null), 2000);
  };

  const selectActiveSlot = (idx: number) => {
    setActiveSlotIdx(idx);
    const slot = timeline[idx];
    let durationSecs = 1800; // 30 mins default
    if (slot.timeSlot.toLowerCase().includes("20")) durationSecs = 1200;
    else if (slot.timeSlot.toLowerCase().includes("15")) durationSecs = 900;
    else if (slot.timeSlot.toLowerCase().includes("10")) durationSecs = 600;
    else if (slot.timeSlot.toLowerCase().includes("5")) durationSecs = 300;
    else if (slot.timeSlot.toLowerCase().includes("45")) durationSecs = 2700;
    else if (slot.timeSlot.toLowerCase().includes("hour") || slot.timeSlot.toLowerCase().includes("60")) durationSecs = 3600;

    setTimerSeconds(durationSecs);
    setTimerInitial(durationSecs);
    setTimerRunning(false);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getFocusTypeColor = (type: HourlySlot["focusType"]) => {
    switch (type) {
      case "execution":
        return "text-red-600 bg-red-50 border border-red-200";
      case "administrative":
        return "text-blue-600 bg-blue-50 border border-blue-200";
      case "delegation":
        return "text-indigo-600 bg-indigo-50 border border-indigo-200";
      case "break":
        return "text-emerald-600 bg-emerald-50 border border-emerald-200";
      default:
        return "text-slate-500 bg-slate-50 border border-slate-200";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* 1. Tactical Hour-by-Hour Timeline (Left 7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Hour-by-Hour Battle Plan
            </h2>
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
              PROACTIVE PROTOCOL ACTIVE
            </span>
          </div>

          {/* Google Calendar Sync Widget */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Google Calendar Protection Shield
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Real calendar integration. Lock down your day by scheduling these {timeline.length} action blocks as visual timeboxes on your real calendar.
                </p>
              </div>
            </div>

            {user ? (
              <div className="space-y-3 pt-1">
                {syncSuccess ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 leading-normal flex items-start gap-2">
                    <span className="text-emerald-500 text-base">✓</span>
                    <div>
                      <span className="font-bold">Sync Completed successfully!</span> Check your calendar on your phone or desktop. We added pre-event popups to notify you when block limits expire.
                    </div>
                  </div>
                ) : (
                  <>
                    {syncError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 leading-normal flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Sync Error:</span> {syncError}
                        </div>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      disabled={syncing || timeline.length === 0}
                      onClick={pushToGoogleCalendar}
                      className={`w-full py-2.5 px-4 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                        syncing
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500 text-white border-blue-500"
                      }`}
                    >
                      {syncing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Scheduling Focus Blocks...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5" />
                          Schedule {timeline.length} Blocks on Google Calendar
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="w-full py-2.5 px-4 font-bold rounded-lg text-xs bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Connect Google Calendar to Sync
                </button>
              </div>
            )}
          </div>

          {/* Calendar Conflicts Section */}
          {user && (checkingConflicts || calendarConflicts.length > 0) && (
            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                Live Google Calendar Conflict Warnings
              </span>
              {checkingConflicts ? (
                <p className="text-xs text-amber-600 animate-pulse font-medium">Scanning your Google Calendar for today's commitments...</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    We scanned your connected calendar and found <strong>{calendarConflicts.length} event(s)</strong> that might clash with your execution focus today. Make sure to close your email and decline non-critical meetings:
                  </p>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {calendarConflicts.map((conf, cIdx) => (
                      <div key={cIdx} className="bg-white border border-amber-100 p-2 rounded-lg text-[11px] text-amber-900 flex justify-between items-center gap-2">
                        <span className="font-semibold truncate flex-1">{conf.title}</span>
                        <span className="font-mono text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 shrink-0">
                          {conf.start} - {conf.end}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {timeline.map((slot, idx) => {
              const isActive = idx === activeSlotIdx;
              return (
                <div
                  key={idx}
                  onClick={() => selectActiveSlot(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                    isActive
                      ? "bg-slate-50/80 border-blue-500 ring-1 ring-blue-500/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {/* Active Indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-xl"></div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSlotCompleted(idx);
                        }}
                        className="mt-1 text-slate-400 hover:text-emerald-600 transition shrink-0"
                      >
                        <CheckSquare
                          className={`w-5 h-5 ${
                            slot.completed ? "text-emerald-600 fill-emerald-50" : "text-slate-300"
                          }`}
                        />
                      </button>
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
                            {slot.timeSlot}
                          </span>
                          <span className={`text-[10px] capitalize font-bold px-2 py-0.5 rounded ${getFocusTypeColor(slot.focusType)}`}>
                            {slot.focusType}
                          </span>
                        </div>
                        <p className={`text-sm font-semibold text-slate-800 mt-1.5 ${slot.completed ? "line-through text-slate-400" : ""}`}>
                          {slot.actionItem}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1 italic">
                          "{slot.coachingNudge}"
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={voiceLoading}
                      onClick={(e) => {
                        e.stopPropagation();
                        onVoiceNudge(slot.coachingNudge);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1.5 transition shrink-0"
                    >
                      🗣️ Speak Tip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actionable templates */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-indigo-500" />
            AI-Drafted Tactical Templates
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            These copy-pasteable assets are fully drafted to negotiate deadline extensions, outline materials, or execute templates right now.
          </p>

          <div className="space-y-4">
            {plan.actionableTemplates.map((template, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    {template.title}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold">
                    {template.type}
                  </span>
                </div>

                <div className="relative">
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono bg-white p-3.5 rounded-lg border border-slate-200 max-h-48 overflow-y-auto leading-relaxed">
                    {template.content}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopyTemplate(template.content, idx)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-500 transition"
                    title="Copy to clipboard"
                  >
                    {copiedTemplateIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive Focus Block Guard (Right 5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        {/* Active Task Focus Timer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full filter blur-xl"></div>
          
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Active Target Block
            </h2>
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Execution Block
            </span>
          </div>

          {/* Large timer display */}
          <div className="text-center py-6">
            <div className="text-5xl font-mono font-black tracking-widest text-slate-800 bg-slate-50 py-5 rounded-2xl border border-slate-200 shadow-inner max-w-xs mx-auto">
              {formatTimer(timerSeconds)}
            </div>

            {/* Current Active Step */}
            <div className="mt-4 max-w-sm mx-auto">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block">Active Target Objective</span>
              <p className="text-sm font-semibold text-blue-600 mt-1 line-clamp-2">
                {timeline[activeSlotIdx]?.actionItem || "Select a slot on the left"}
              </p>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={() => {
                setTimerSeconds(timerInitial);
                setTimerRunning(false);
              }}
              className="p-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 rounded-xl transition cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all cursor-pointer shadow-sm ${
                timerRunning
                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {timerRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pause Block
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white text-white" /> Start Block Focus
                </>
              )}
            </button>
          </div>

          {/* Rescue Nudge trigger */}
          <button
            onClick={() => {
              const activeSlot = timeline[activeSlotIdx];
              if (activeSlot) {
                onVoiceNudge(activeSlot.coachingNudge);
              } else {
                onVoiceNudge("No slacking allowed! Put down your phone, pick an objective and execution target, and let's win this.");
              }
            }}
            disabled={voiceLoading}
            className="w-full bg-red-50 border border-red-200 hover:border-red-300 text-red-700 font-bold py-3 px-4 rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2"
          >
            🚨 {voiceLoading ? "Generating Audio..." : "Intense Voice Coach Audio Reminder"}
          </button>
        </div>

        {/* Coach Tactics Display */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Tactical Recommendations
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-600 italic leading-relaxed">
              "{plan.overallRecommendation}"
            </p>
          </div>

          {/* Brutal Task Prioritization Summary */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Priority Diagnostic Re-Evaluation</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {plan.revisedTasks.map((t) => (
                <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-700">{t.title}</span>
                    <p className="text-[11px] text-slate-500 leading-normal">{t.urgencyAnalysis}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-mono font-bold border border-red-100">
                      P{t.revisedPriority}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono font-semibold">
                      +{t.suggestedBufferMinutes}m safety
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
