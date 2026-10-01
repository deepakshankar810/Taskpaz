'use client';

import { Menu, Search, Bell, Check, AlertCircle, Clock, Calendar, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState, useMemo, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTasksContext } from '@/components/providers/TasksProvider';
import { useFinanceContext } from '@/components/providers/FinanceProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { PomodoroTimer } from '@/components/task/PomodoroTimer';
import { NavbarMusicPlayer } from '@/components/focus/NavbarMusicPlayer';

interface TopBarProps {
  onMenuClick: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}

export function TopBar({ onMenuClick, onToggleCollapse, isCollapsed }: TopBarProps) {
  const { user } = useAuth();
  const { tasks } = useTasksContext();
  const { subscriptions, savingsGoals } = useFinanceContext();
  const [readIds, setReadIds] = useState<string[]>([]);
  const [currency, setCurrency] = useState('$');
  const [mounted, setMounted] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '');

  useEffect(() => {
    setSearchQuery(searchParams?.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tasks?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push(`/tasks`);
    }
  };

  // Load read status and currency from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRead = localStorage.getItem('read_notifications');
      if (savedRead) setReadIds(JSON.parse(savedRead));

      const savedCurrency = localStorage.getItem('finance_currency');
      if (savedCurrency) setCurrency(savedCurrency);
      setMounted(true);
    }
  }, []);

  const notifications = useMemo(() => {
    if (!tasks) return [];

    const items: any[] = [];

    // 1. Urgent Tasks (Uncompleted)
    const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');
    urgentTasks.forEach(t => {
      items.push({
        id: `urgent-${t.id}`,
        taskId: t.id,
        title: 'High Priority Alert',
        description: `"${t.title}" is marked as Urgent and is still pending.`,
        date: new Date(t.createdAt),
        time: formatDistanceToNow(new Date(t.createdAt), { addSuffix: true }),
        type: 'urgent',
        read: readIds.includes(`urgent-${t.id}`)
      });
    });

    // 2. Overdue Tasks
    const overdueTasks = tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== 'completed');
    overdueTasks.forEach(t => {
      items.push({
        id: `overdue-${t.id}`,
        taskId: t.id,
        title: 'Task Overdue',
        description: `"${t.title}" was due on ${new Date(t.dueDate!).toLocaleDateString()}.`,
        date: new Date(t.dueDate!),
        time: formatDistanceToNow(new Date(t.dueDate!), { addSuffix: true }),
        type: 'overdue',
        read: readIds.includes(`overdue-${t.id}`)
      });
    });

    // 3. Due Today/Tomorrow
    const upcomingTasks = tasks.filter(t => t.dueDate && (isToday(new Date(t.dueDate)) || isTomorrow(new Date(t.dueDate))) && t.status !== 'completed');
    upcomingTasks.forEach(t => {
      const isDueToday = isToday(new Date(t.dueDate!));
      items.push({
        id: `due-${t.id}`,
        taskId: t.id,
        title: isDueToday ? 'Due Today' : 'Due Tomorrow',
        description: `"${t.title}" is due ${isDueToday ? 'today' : 'tomorrow'}.`,
        date: new Date(t.dueDate!),
        time: formatDistanceToNow(new Date(t.dueDate!), { addSuffix: true }),
        type: 'upcoming',
        read: readIds.includes(`due-${t.id}`)
      });
    });

    // 4. Subscriptions
    subscriptions?.forEach(s => {
      if (!s.active) return;
      const daysLeft = differenceInDays(new Date(s.nextBillingDate), new Date());

      // Due soon (within 3 days)
      if (daysLeft >= 0 && daysLeft <= 3) {
        items.push({
          id: `sub-due-${s.id}-${s.nextBillingDate.toISOString()}`,
          title: 'Subscription Reminder',
          description: `Your ${s.name} subscription (${currency}${s.amount}) is due in ${daysLeft === 0 ? 'today' : daysLeft === 1 ? '1 day' : daysLeft + ' days'}.`,
          date: new Date(s.nextBillingDate),
          time: formatDistanceToNow(new Date(s.nextBillingDate), { addSuffix: true }),
          type: 'recurring',
          read: readIds.includes(`sub-due-${s.id}-${s.nextBillingDate.toISOString()}`)
        });
      }
      // Overdue
      else if (daysLeft < 0) {
        items.push({
          id: `sub-overdue-${s.id}-${s.nextBillingDate.toISOString()}`,
          title: 'Subscription Overdue',
          description: `The billing date for ${s.name} (${currency}${s.amount}) was ${formatDistanceToNow(new Date(s.nextBillingDate), { addSuffix: true })}.`,
          date: new Date(s.nextBillingDate),
          time: formatDistanceToNow(new Date(s.nextBillingDate), { addSuffix: true }),
          type: 'urgent',
          read: readIds.includes(`sub-overdue-${s.id}-${s.nextBillingDate.toISOString()}`)
        });
      }
    });

    // 5. Savings Goals
    savingsGoals?.forEach(g => {
      // Goal Achieved
      if (g.isCompleted) {
        items.push({
          id: `goal-met-${g.id}`,
          title: 'Goal Achieved! 🎉',
          description: `Congratulations! You've reached your target of ${currency}${g.targetAmount} for "${g.name}".`,
          date: g.updatedAt ? new Date(g.updatedAt) : new Date(),
          time: g.updatedAt ? formatDistanceToNow(new Date(g.updatedAt), { addSuffix: true }) : 'Just now',
          type: 'goal',
          read: readIds.includes(`goal-met-${g.id}`)
        });
      }
      // Deadline Approaching (within 3 days)
      else if (g.deadline) {
        const daysLeft = differenceInDays(new Date(g.deadline), new Date());
        if (daysLeft >= 0 && daysLeft <= 3) {
          items.push({
            id: `goal-deadline-${g.id}`,
            title: 'Goal Deadline Near',
            description: `Your deadline for "${g.name}" is in ${daysLeft === 0 ? 'today' : daysLeft === 1 ? '1 day' : daysLeft + ' days'}.`,
            date: new Date(g.deadline),
            time: formatDistanceToNow(new Date(g.deadline), { addSuffix: true }),
            type: 'upcoming',
            read: readIds.includes(`goal-deadline-${g.id}`)
          });
        }
      }
    });

    return items
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 15); // Limit to 15 notifications
  }, [tasks, subscriptions, savingsGoals, readIds, currency]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    const newReadIds = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(newReadIds);
    localStorage.setItem('read_notifications', JSON.stringify(newReadIds));
  };

  const markRead = (id: string) => {
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id];
      setReadIds(newReadIds);
      localStorage.setItem('read_notifications', JSON.stringify(newReadIds));
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 dark:bg-slate-950 md:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex text-slate-500 hover:text-blue-500 transition-colors"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <PanelLeft className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </Button>
        <form onSubmit={handleSearch} className="relative hidden md:block w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 pl-9 dark:bg-slate-900 focus-visible:ring-1"
          />
        </form>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
        {mounted && (
          <div className="flex items-center gap-1 sm:gap-2">
            <PomodoroTimer />
            <div className="hidden md:flex">
              <NavbarMusicPlayer />
            </div>
          </div>
        )}
        {mounted && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative group flex-shrink-0">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-blue-500 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-xl border-slate-200 dark:border-slate-800" align="end">
              <div className="flex items-center justify-between p-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                <h4 className="font-semibold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto text-xs text-blue-500 p-0 hover:bg-transparent hover:underline"
                    onClick={markAllRead}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[350px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Bell className="h-8 w-8 text-slate-200 mb-2" />
                    <p className="text-sm text-slate-500 font-medium">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No new notifications for you.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.type === 'urgent' ? 'bg-red-500' :
                            n.type === 'overdue' ? 'bg-orange-500' :
                              n.type === 'goal' ? 'bg-green-500' :
                                n.type === 'recurring' ? 'bg-purple-500' : 'bg-blue-500'
                            } ${n.read ? 'opacity-20' : 'animate-pulse'}`} />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <h5 className={`text-sm leading-tight ${!n.read ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                                {n.title}
                              </h5>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.time}</span>
                            </div>
                            <p className={`text-xs leading-normal line-clamp-2 ${!n.read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>
                              {n.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}
