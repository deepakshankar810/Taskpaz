'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { startOfDay, subDays, format, isSameDay, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { toDate } from '@/lib/utils';
import { useTasksContext } from '@/components/providers/TasksProvider';
import { useFinanceContext } from '@/components/providers/FinanceProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { Transaction } from '@/lib/types';

// Dynamically import the charts component with SSR disabled
const AnalyticsCharts = dynamic(() => import('@/components/analytics/AnalyticsCharts'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full flex items-center justify-center text-slate-400">Loading charts...</div>
});

import { useJournal } from '@/components/providers/JournalProvider';

export default function AnalyticsPage() {
  const { tasks, stats } = useTasksContext();
  const { transactions, stats: financeStats } = useFinanceContext();
  const { entries: journalEntries } = useJournal();

  const [currency] = useMemo(() => {
    if (typeof window !== 'undefined') {
      return [localStorage.getItem('finance_currency') || '$', () => { }];
    }
    return ['$', () => { }];
  }, []);

  // Productivity Heatmap Data (Last Year)
  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.status === 'completed' && t.completedAt) {
        const d = format(toDate(t.completedAt) || new Date(), 'yyyy-MM-dd');
        counts[d] = (counts[d] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([date, count]) => ({
      date: new Date(date),
      count
    }));
  }, [tasks]);

  // Mood Correlation Data
  const moodCorrelationData = useMemo(() => {
    return journalEntries.map(entry => {
      const dayTasks = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        return format(toDate(t.completedAt) || new Date(), 'yyyy-MM-dd') === entry.date;
      });
      return {
        date: entry.date,
        mood: entry.mood || 'neutral',
        tasksCompleted: dayTasks.length
      };
    });
  }, [journalEntries, tasks]);

  // Efficiency (Completion Rate)
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Financial Forecasting
  const monthlyTrend = useMemo(() => {
    // Calculate avg monthly income - avg monthly expense over last 6 months
    const now = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(now, i));
    
    const monthlyNet = last6Months.map(month => {
      const monthTrans = transactions.filter(t => isSameMonth(toDate(t.date) || new Date(0), month));
      const income = monthTrans.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = monthTrans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return income - expense;
    });

    return monthlyNet.reduce((a, b) => a + b, 0) / 6;
  }, [transactions]);

  // Task Trend Data (Last 30 Days)
  const taskTrendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => startOfDay(subDays(new Date(), 29 - i)));

    return last30Days.map(date => ({
      name: format(date, 'MMM d'),
      completed: tasks.filter(t => {
        if (t.status !== 'completed') return false;
        const completionDate = toDate(t.completedAt) || toDate(t.updatedAt);
        return completionDate && isSameDay(completionDate, date);
      }).length
    }));
  }, [tasks]);

  // Category Data
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      const cat = t.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // Priority Data
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0, urgent: 0 };
    tasks.forEach(t => {
      const p = t.priority || 'low';
      if (counts[p] !== undefined) counts[p]++;
    });
    return Object.entries(counts).filter(([_, value]) => value > 0).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // Financial Trend (Last 6 Months)
  const financialTrendData = useMemo(() => {
    const last6MonthsArr = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));

    return last6MonthsArr.map(date => {
      const monthlyTransactions = transactions.filter((t: Transaction) => {
        const transDate = toDate(t.date);
        return transDate && isSameMonth(transDate, date);
      });
      const income = monthlyTransactions.filter((t: Transaction) => t.type === 'income').reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
      const expense = monthlyTransactions.filter((t: Transaction) => t.type === 'expense').reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);
      return { name: format(date, 'MMM'), income, expense };
    });
  }, [transactions]);

  // Expense Breakdown Data
  const categoryChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    const details: Record<string, string[]> = {};
    const now = new Date();
    const expenses = transactions.filter((t: Transaction) => t.type === 'expense' && isSameMonth(toDate(t.date) || new Date(0), now));

    expenses.forEach((t: Transaction) => {
      const amount = Number(t.amount);
      categories[t.category] = (categories[t.category] || 0) + amount;
      if (t.description) {
        if (!details[t.category]) details[t.category] = [];
        if (!details[t.category].includes(t.description)) details[t.category].push(t.description);
      }
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      purpose: details[name] ? details[name].slice(0, 2).map(p => p.length > 20 ? p.substring(0, 17) + '...' : p).join(', ') : ''
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const topCategories = categoryChartData.slice(0, 3);

  return (
    <div className="space-y-10 p-6 md:p-10 lg:p-14">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <AnalyticsCharts
        tasks={tasks}
        journalEntries={journalEntries}
        taskTrendData={taskTrendData}
        priorityData={priorityData}
        categoryData={categoryData}
        financialTrendData={financialTrendData}
        categoryChartData={categoryChartData}
        topCategories={topCategories}
        completionRate={completionRate}
        currency={currency}
        heatmapData={heatmapData}
        moodCorrelationData={moodCorrelationData}
        financialForecastProps={{
          currentBalance: financeStats.balance,
          monthlyTrend,
          currency
        }}
      />
    </div>
  );
}
