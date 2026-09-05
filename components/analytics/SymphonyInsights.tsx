'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Zap, Clock, Compass, TrendingUp } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { computeSymphonyInsights } from '@/lib/analyticsCorrelation';
import { Task, JournalEntry } from '@/lib/types';

interface SymphonyInsightsProps {
  tasks: Task[];
  journalEntries: JournalEntry[];
  focusSessions?: any[];
}

export function SymphonyInsights({ tasks, journalEntries, focusSessions = [] }: SymphonyInsightsProps) {
  const { insights, scatterData } = useMemo(
    () => computeSymphonyInsights(tasks, journalEntries, focusSessions),
    [tasks, journalEntries, focusSessions]
  );

  return (
    <div className="space-y-8 pt-4">
      {/* Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-2xl border border-indigo-500/30 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight">Symphony Insights Engine</h2>
          </div>
          <p className="text-xs text-indigo-200/80">
            Mathematical correlation analysis bridging emotional well-being, focus sessions, and output.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-indigo-200 backdrop-blur-md flex items-center gap-2">
          <Compass className="h-3.5 w-3.5 text-indigo-400" />
          <span>AI Productivity Synergy</span>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((card, i) => (
          <Card
            key={i}
            className="relative overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md hover:shadow-lg transition-all"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${card.badgeColor}`} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                  {card.category}
                </span>
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <CardTitle className="text-base font-bold">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xl font-extrabold bg-gradient-to-r from-slate-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent">
                {card.highlightText}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {card.detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scatterplot Chart */}
      <Card className="border border-slate-200/80 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Mood Rating vs. Task Completion Correlation
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[320px] w-full">
          {scatterData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
              Log daily mood entries in Journal to view productivity correlation.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="moodScore"
                  name="Mood Rating"
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={(val) => {
                    const labels: Record<number, string> = {
                      1: 'Terrible',
                      2: 'Bad',
                      3: 'Okay',
                      4: 'Good',
                      5: 'Great',
                    };
                    return labels[val] || '';
                  }}
                  tick={{ fontSize: 11, fill: '#888' }}
                />
                <YAxis
                  type="number"
                  dataKey="tasksCompleted"
                  name="Tasks Completed"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#888' }}
                />
                <ZAxis type="number" dataKey="focusMinutes" range={[60, 400]} name="Focus Minutes" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const data = payload[0].payload as typeof scatterData[0];
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-indigo-300">{data.date}</p>
                          <p>Mood: <span className="font-semibold text-amber-400">{data.moodName}</span></p>
                          <p>Tasks Completed: <span className="font-semibold text-emerald-400">{data.tasksCompleted}</span></p>
                          {data.focusMinutes > 0 && (
                            <p>Focus Duration: <span className="font-semibold text-cyan-400">{data.focusMinutes}m</span></p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Days" data={scatterData} fill="#6366f1" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
