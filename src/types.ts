export interface Task {
  id: string;
  title: string;
  category: "assignment" | "bill" | "meeting" | "interview" | "commitment" | "other";
  deadline: string; // ISO date or time string
  urgency: "low" | "medium" | "high" | "apocalyptic";
  notes?: string;
  completed: boolean;
  actualDeadline?: string; // Client-side buffer deadline
}

export interface RevisedTask {
  id: string;
  title: string;
  revisedPriority: number; // 1 to 5
  urgencyAnalysis: string;
  suggestedBufferMinutes: number;
}

export interface HourlySlot {
  timeSlot: string;
  actionItem: string;
  focusType: "execution" | "administrative" | "delegation" | "break";
  coachingNudge: string;
  completed?: boolean;
}

export interface ActionTemplate {
  title: string;
  type: "email" | "sms" | "outline" | "checklist";
  content: string;
}

export interface BattlePlan {
  revisedTasks: RevisedTask[];
  hourlyTimeline: HourlySlot[];
  actionableTemplates: ActionTemplate[];
  overallRecommendation: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  tasks: Task[];
  panicLevel: "medium" | "high" | "apocalyptic";
  focusTimeMinutes: number;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  completed: boolean;
  streak: number;
}

export interface LiveNotification {
  id: string;
  type: "warning" | "info" | "success" | "advice";
  title: string;
  message: string;
  timestamp: string;
}

