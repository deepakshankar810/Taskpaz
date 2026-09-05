'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Flame, Coffee, BookOpen, Code2, Dumbbell, Music, Pencil, CheckCircle2, Trash2, BarChart3, TrendingUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as timerStore from '@/lib/focusTimerStore';
import { FocusMusicPlayer } from '@/components/focus/FocusMusicPlayer';
import { ZenSoundscapeMixer } from '@/components/focus/ZenSoundscapeMixer';
import { useTasksContext } from '@/components/providers/TasksProvider';
import { WellnessTips } from '@/components/focus/WellnessTips';
import { updateTask } from '@/lib/db/tasks';
import { saveFocusSession, getFocusSessions, deleteFocusSession, FocusSession } from '@/lib/db/focus';
import { useAuth } from '@/components/providers/AuthProvider';
import { useThemeAccent } from '@/components/providers/ThemeAccentProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from 'lucide-react';

const PRESETS = [
  { label: 'Quick Focus', minutes: 15, icon: Flame, color: 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  { label: 'Pomodoro', minutes: 25, icon: Flame, color: 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  { label: 'Deep Work', minutes: 50, icon: Code2, color: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  { label: 'Short Break', minutes: 5, icon: Coffee, color: 'bg-teal-100 text-teal-600 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800' },
  { label: 'Long Break', minutes: 15, icon: Coffee, color: 'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
  { label: 'Reading', minutes: 30, icon: BookOpen, color: 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
  { label: 'Workout', minutes: 45, icon: Dumbbell, color: 'bg-pink-100 text-pink-600 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800' },
  { label: 'Creative', minutes: 60, icon: Music, color: 'bg-yellow-100 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' },
];

const SESSION_LOG_KEY = 'focus_session_log';

interface SessionEntry {
  id: string;
  label: string;
  minutes: number;
  completedAt: string;
  taskId?: string;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

import { BreathingGuide } from '@/components/focus/BreathingGuide';
import { Eye, EyeOff } from 'lucide-react';

export default function FocusPage() {
  const [timerState, setTimerState] = useState(timerStore.getState());
  const [customMinutes, setCustomMinutes] = useState(25);
  const [customLabel, setCustomLabel] = useState('Focus Session');
  const [sessionLog, setSessionLog] = useState<SessionEntry[]>([]);
  const [zenMode, setZenMode] = useState(false);

  const { tasks } = useTasksContext();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('none');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const activeTasks = tasks.filter((t: any) => t.status !== 'completed');
  const selectedTask = tasks.find((t: any) => t.id === selectedTaskId);

  const handleTaskChange = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (taskId !== 'none') {
      const task = tasks.find((t: any) => t.id === taskId);
      if (task) {
        setCustomLabel(task.title);
        if (!timerState.isRunning) {
           timerStore.setTimer(timerState.totalSeconds > 0 ? timerState.totalSeconds : 25 * 60, task.title, 'custom');
        }
      }
    } else {
      setCustomLabel('Focus Session');
      if (!timerState.isRunning) {
         timerStore.setTimer(timerState.totalSeconds > 0 ? timerState.totalSeconds : 25 * 60, 'Focus Session', 'custom');
      }
    }
  };

  const { user } = useAuth();
  const { vibe, setVibe, availableVibes } = useThemeAccent();

  const lastProcessedSession = useRef<string | null>(null);

  // 1. Initial Load of sessions
  useEffect(() => {
    const loadSessions = async () => {
        if (user) {
            const dbSessions = await getFocusSessions(user.id);
            setSessionLog(dbSessions.map(s => ({
                id: s.id,
                label: s.label,
                minutes: s.duration_minutes,
                completedAt: s.completed_at,
                taskId: s.task_id
            })));
        } else {
            const saved = localStorage.getItem(SESSION_LOG_KEY);
            if (saved) setSessionLog(JSON.parse(saved));
        }
    };
    loadSessions();
  }, [user]);

  // 2. Timer Subscription & Saving
  useEffect(() => {
    const unsub = timerStore.subscribe(async (s) => {
      setTimerState(s);
      
      // Reset the processed flag when a new timer starts
      if (s.isRunning) {
        lastProcessedSession.current = null;
      }
      
      // Check for completion
      if (s.timeLeft === 0 && !s.isRunning && s.totalSeconds > 0) {
        // Use a stable key to avoid double-processing the same completion event
        const sessionKey = `completed-${s.label}-${s.totalSeconds}`;
        if (lastProcessedSession.current === sessionKey) return;
        lastProcessedSession.current = sessionKey;

        const minutes = Math.max(1, Math.round(s.totalSeconds / 60));
        
        // 1. Sync to database
        if (user) {
          try {
            console.log('[Focus] Saving session to DB...', { label: s.label, minutes });
            const saved = await saveFocusSession({
              user_id: user.id,
              task_id: selectedTaskId === 'none' ? undefined : selectedTaskId,
              label: s.label,
              duration_minutes: minutes,
            });

            // 2. Update UI with the saved entry
            const entry: SessionEntry = {
              id: saved.id,
              label: saved.label,
              minutes: saved.duration_minutes,
              completedAt: saved.completed_at,
              taskId: saved.task_id,
            };
            setSessionLog((prev: any) => [entry, ...prev].slice(0, 50));

            // Update specific task if linked
            if (selectedTaskId && selectedTaskId !== 'none') {
                const task = tasks.find((t: any) => t.id === selectedTaskId);
                if (task) {
                    const newTimeSpent = (task.timeSpent || 0) + s.totalSeconds;
                    await updateTask(task.id, { timeSpent: newTimeSpent });
                }
            }
          } catch (err) {
            console.error('[Focus] Failed to sync session:', err);
          }
        } else {
            // Fallback for non-logged in users (local storage)
            const entry: SessionEntry = {
                id: Math.random().toString(36).substr(2, 9),
                label: s.label,
                minutes,
                completedAt: new Date().toISOString(),
                taskId: selectedTaskId === 'none' ? undefined : selectedTaskId,
            };
            setSessionLog((prev: any) => {
                const newLog = [entry, ...prev].slice(0, 50);
                localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(newLog));
                return newLog;
            });
        }
      }
    });

    return () => { unsub(); };
  }, [user, tasks, selectedTaskId]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    timerStore.setTimer(preset.minutes * 60, preset.label, 'custom');
    setCustomMinutes(preset.minutes);
    setCustomLabel(preset.label);
  };

  const applyCustom = () => {
    const secs = Math.max(1, customMinutes) * 60;
    timerStore.setTimer(secs, customLabel || 'Focus Session', 'custom');
  };

  const { timeLeft, totalSeconds, isRunning, label } = timerState;
  const isBreak = label.toLowerCase().includes('break');

  
  // Stats calculations
  const totalFocusedAllTime = sessionLog.reduce((acc: any, s: any) => acc + s.minutes, 0);
  
  const isDateSelected = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() && 
           d.getFullYear() === selectedDate.getFullYear();
  };

  const selectedDateFocused = sessionLog
    .filter((s: any) => isDateSelected(s.completedAt!))
    .reduce((acc: any, s: any) => acc + s.minutes, 0);

  const navigateDate = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const isTodaySelected = () => {
    const now = new Date();
    return selectedDate.getDate() === now.getDate() && 
           selectedDate.getMonth() === now.getMonth() && 
           selectedDate.getFullYear() === now.getFullYear();
  };

  const calculateStreak = () => {
    if (sessionLog.length === 0) return 0;
    
    // 1. Get unique sorted dates (newest first)
    const dates = Array.from(new Set(sessionLog.filter((s: any) => s.completedAt).map((s: any) => s.completedAt.split('T')[0]))).sort().reverse();
    
    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If the last session was older than yesterday, streak is 0
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
        return 0;
    }

    // Iterate through dates to find consecutive days
    let current = new Date(dates[0] as string);
    streak = 1;

    for (let i = 1; i < dates.length; i++) {
        const nextDate = new Date(dates[i] as string);
        const diff = Math.round((current.getTime() - nextDate.getTime()) / (1000 * 3600 * 24));
        
        if (diff === 1) {
            streak++;
            current = nextDate;
        } else {
            break;
        }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  const handleDeleteSession = async (id: string) => {
    if (!user) return;
    try {
        await deleteFocusSession(id);
        setSessionLog((prev: any) => prev.filter((s: any) => s.id !== id));
    } catch (err) {
        console.error('Failed to delete session:', err);
    }
  };

  const getTaskTitle = (taskId?: string) => {
    if (!taskId || taskId === 'none') return null;
    return tasks.find((t: any) => t.id === taskId)?.title;
  };

  return (
    <div className={`space-y-6 p-6 md:p-10 lg:p-14 transition-all duration-500 ${zenMode ? 'max-w-4xl mx-auto' : ''}`}>
      {/* Header */}
      {!zenMode && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Focus Mode</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Set your intention, start the timer, get things done.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setZenMode(true)} className="gap-2">
            <EyeOff className="h-4 w-4" /> Zen Mode
          </Button>
        </div>
      )}

      <div className={`grid grid-cols-1 ${zenMode ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 transition-all duration-500`}>
        {/* Left: Timer + Controls */}
        <div className={`${zenMode ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-6`}>

          {/* Main Timer Card */}
          <Card className={`relative overflow-hidden transition-all duration-700 ${zenMode ? 'border-none shadow-none bg-transparent py-20' : ''}`}>
            {zenMode && (
                <div className="absolute top-4 right-4 z-50">
                    <Button variant="ghost" size="icon" onClick={() => setZenMode(false)}>
                        <Eye className="h-5 w-5 text-slate-400" />
                    </Button>
                </div>
            )}

            <CardContent className="flex flex-col items-center gap-4 py-6">
              {/* Task Selector + Editable Label */}
              {!zenMode && (
                <div className="w-full max-w-xs space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest text-center block">Focus Target</Label>
                    <Select value={selectedTaskId} onValueChange={handleTaskChange}>
                        <SelectTrigger className="w-full bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Select a task..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">General Focus</SelectItem>
                            {activeTasks.map((task: any) => (
                                <SelectItem key={task.id} value={task.id}>
                                    {task.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                </div>
              )}

              {zenMode && selectedTask && (
                  <div className="text-center animate-in fade-in slide-in-from-top-2 duration-1000">
                      <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-1">{selectedTask.title}</h2>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Current Mission</p>
                  </div>
              )}



              {/* Timer with integrated breathing guide */}
              <div className="relative flex flex-col items-center">
                <BreathingGuide
                    timeLeft={timeLeft}
                    totalSeconds={totalSeconds}
                    label={label}
                    isRunning={isRunning}
                    isBreak={isBreak}
                    zenMode={zenMode}
                />
              </div>

              {/* Controls */}
              <div className={`flex items-center gap-8 transition-all ${zenMode ? 'scale-110 mt-4' : 'mt-2'}`}>
                {!zenMode && (
                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={timerStore.resetTimer}>
                        <RotateCcw className="h-5 w-5" />
                    </Button>
                )}
                <Button
                  className={`h-16 w-16 rounded-full font-bold shadow-xl transition-all ${
                    isRunning
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-blue-500/20'
                  }`}
                  onClick={() => isRunning ? timerStore.pauseTimer() : timerStore.startTimer()}
                >
                  {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>
                {zenMode ? (
                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full" onClick={timerStore.resetTimer}>
                        <RotateCcw className="h-5 w-5 text-slate-400" />
                    </Button>
                ) : (
                    <div className="w-10" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Custom Timer */}
          {!zenMode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-blue-500" />
                  Set Custom Timer
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Label</Label>
                  <Input
                    value={customLabel}
                    onChange={(e: any) => setCustomLabel(e.target.value)}
                    placeholder="e.g. Deep Work"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Duration (minutes)</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0"
                      onClick={() => setCustomMinutes((m: any) => Math.max(1, m - 5))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={customMinutes}
                      onChange={(e: any) => setCustomMinutes(Number(e.target.value))}
                      min={1}
                      className="text-center h-9"
                    />
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0"
                      onClick={() => setCustomMinutes((m: any) => m + 5)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={applyCustom} className="w-full h-9">Set Timer</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Presets */}
          {!zenMode && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-slate-600 dark:text-slate-300 uppercase tracking-wider">Quick Presets</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={`flex flex-col gap-2 rounded-xl p-4 text-left border transition-all hover:scale-105 active:scale-95 ${preset.color}`}
                  >
                    <preset.icon className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold">{preset.label}</p>
                      <p className="text-xs opacity-70">{preset.minutes}m</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Stats & Session Log */}
        <div className="space-y-6">
          <WellnessTips />
          
          <div className="transition-all duration-700 space-y-6">
            <ZenSoundscapeMixer />
            <FocusMusicPlayer />
          </div>
          
          {/* Stats & Log (Blurred in Zen Mode) */}
          {!zenMode && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
              {/* Date Navigation */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 z-10" onClick={() => navigateDate(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div 
                    className="relative flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                    onClick={(e: any) => {
                        const input = e.currentTarget.querySelector('input');
                        if (input && 'showPicker' in input) input.showPicker();
                    }}
                >
                    <Calendar className="h-3.5 w-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                        {isTodaySelected() ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}
                    </span>
                    <input 
                        type="date" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-none"
                        value={selectedDate.toLocaleDateString('en-CA')}
                        onChange={(e: any) => {
                            if (e.target.value) {
                                const [y, m, d] = e.target.value.split('-').map(Number);
                                setSelectedDate(new Date(y, m - 1, d));
                            }
                        }}
                        max={new Date().toLocaleDateString('en-CA')}
                    />
                </div>

                <Button variant="ghost" size="icon" className="h-8 w-8 z-10" onClick={() => navigateDate(1)} disabled={isTodaySelected()}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Enhanced Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-100 dark:border-blue-900/30">
                    <CardContent className="p-4 pt-6">
                        <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">{isTodaySelected() ? 'Today' : 'This Day'}</span>
                        </div>
                        <div className="text-2xl font-bold">{selectedDateFocused}m</div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase">Daily Focus</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-100 dark:border-orange-900/30">
                    <CardContent className="p-4 pt-6">
                        <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400">
                            <Flame className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">Streak</span>
                        </div>
                        <div className="text-2xl font-bold">{streak}</div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase">Days Active</div>
                    </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        Session Stats
                    </CardTitle>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-4 w-4 text-slate-300" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">Based on your last {sessionLog.length} sessions</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                        <div className="text-4xl font-bold tracking-tight">{totalFocusedAllTime}m</div>
                        <p className="text-slate-500 text-xs mt-1 uppercase font-medium">All-time Focused</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-semibold text-slate-700 dark:text-slate-300">{sessionLog.length}</div>
                        <p className="text-slate-400 text-[10px] uppercase font-medium">Sessions</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">{isTodaySelected() ? 'Daily Goal' : 'Day Achievement'}</span>
                        <span className="text-slate-400">{Math.min(100, Math.round((selectedDateFocused / 120) * 100))}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000"
                            style={{ width: `${Math.min(100, (selectedDateFocused / 120) * 100)}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 text-center italic">Goal: 2 hours per day</p>
                  </div>
                </CardContent>
              </Card>

              {/* Session Log */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        Session Log
                    </CardTitle>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        Recent {sessionLog.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {sessionLog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="h-12 w-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                        <Coffee className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">
                        No sessions yet.<br />
                        <span className="text-xs font-normal">Start your first focus session to see it here!</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {sessionLog
                        .filter(s => isDateSelected(s.completedAt!))
                        .map((entry) => {
                          const taskTitle = getTaskTitle(entry.taskId);
                          
                          const completedDate = entry.completedAt ? new Date(entry.completedAt) : null;
                          const now = new Date();
                          const isActuallyToday = completedDate && 
                                         completedDate.getDate() === now.getDate() && 
                                         completedDate.getMonth() === now.getMonth() && 
                                         completedDate.getFullYear() === now.getFullYear();
                          
                          return (
                            <div key={entry.id} className="group relative flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800/50 transition-all hover:shadow-md hover:shadow-blue-500/5">
                              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${isActuallyToday ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {entry.label}
                                </p>
                                <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                                    {new Date(entry.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                                    <Flame className="h-3 w-3 text-orange-500" />
                                    {entry.minutes}m focus
                                </div>
                                
                                {taskTitle && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-tight">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {taskTitle}
                                    </div>
                                )}
                              </div>
                            </div>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => handleDeleteSession(entry.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {zenMode && (
            <div className="hidden lg:block blur-xl opacity-10 pointer-events-none select-none space-y-4">
                <div className="h-32 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-64 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
