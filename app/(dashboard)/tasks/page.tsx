'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { createTask, updateTask } from '@/lib/db/tasks';
import { CreateTaskInput } from '@/lib/types';
import { useTasksContext } from '@/components/providers/TasksProvider';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { TaskCard } from '@/components/task/TaskCard';
import { TaskForm } from '@/components/task/TaskForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { KanbanBoard } from '@/components/task/KanbanBoard';
import { EisenhowerMatrix } from '@/components/task/EisenhowerMatrix';
import { CoinCelebration } from '@/components/task/CoinCelebration';
import { useFinanceContext } from '@/components/providers/FinanceProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportExport } from '@/components/task/ImportExport';
import { CalendarGrid } from '@/components/task/CalendarGrid';
import { isSameDay } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

function TasksContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { tasks, loading, error, addOptimisticTask, removeOptimisticTask, optimisticUpdateTask } = useTasksContext();
  const { savingsGoals, setSavingsGoals } = useFinanceContext();

  // State
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState("list");
  const [coinTrigger, setCoinTrigger] = useState(false);
  const [coinAmount, setCoinAmount] = useState<number | undefined>(undefined);

  const searchQuery = searchParams?.get('q')?.toLowerCase() || '';

  const filteredTasks = tasks.filter(task => {
    // Hidden until 2 days before if weekly recurring (except in calendar view)
    if (activeTab !== 'calendar' && task.status === 'pending' && task.recurringPattern === 'weekly' && task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const twoDaysBefore = new Date(dueDate);
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
      twoDaysBefore.setHours(0, 0, 0, 0);

      if (today < twoDaysBefore) return false;
    }

    if (!searchQuery) return true;
    return (
      task.title?.toLowerCase().includes(searchQuery) ||
      task.description?.toLowerCase().includes(searchQuery) ||
      task.category?.toLowerCase().includes(searchQuery) ||
      task.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
    );
  });

  // Check for ?new=true to open modal or ?view=calendar for tab
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsNewTaskOpen(true);
    }
    if (searchParams.get('view') === 'calendar') {
      setActiveTab('calendar');
    }
  }, [searchParams]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error('Error syncing tasks');
    }
  }, [error]);

  const handleCreateTask = (data: any) => {
    if (!user) return;

    // Generate a Firestore-like random ID (20 chars)
    const taskId = crypto.randomUUID();

    const optimisticTask = {
      id: taskId,
      ...data,
      user_id: user.id,
      status: 'pending',
      priority: data.priority || 'medium',
      category: data.category || 'personal',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    // Instant UI feedback
    addOptimisticTask(optimisticTask as any);
    setIsNewTaskOpen(false);
    toast.success('Task created');

    // Background Server Sync (Fire and Forget)
    createTask(user.id, data, taskId).catch((error) => {
      console.error('Task creation background error:', error);
      toast.error('Failed to sync task to server.');
      removeOptimisticTask(taskId);
    });
  };

  const handleEditTask = (data: any) => {
    if (!user || !taskToEdit) return;

    const taskId = taskToEdit.id;

    // 1. Instant UI update
    optimisticUpdateTask(taskId, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      updatedAt: new Date()
    });

    setIsEditTaskOpen(false);
    setTaskToEdit(null);
    toast.success('Task updated');

    // 2. Background Sync
    updateTask(taskId, data).catch((error) => {
      console.error('Update task error:', error);
      toast.error('Failed to sync changes.');
    });
  };

  const openEditModal = (task: any) => {
    // Format date for the HTML input[type="date"]
    let dateStr = '';
    let timeStr = '';

    if (task.dueDate) {
      const d = new Date(task.dueDate);
      dateStr = d.toISOString().split('T')[0];
      timeStr = d.toTimeString().split(':').slice(0, 2).join(':');
    }

    setTaskToEdit({
      ...task,
      dueDate: dateStr,
      dueTime: timeStr
    });
    setIsEditTaskOpen(true);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);

      // 1. Instant UI update
      optimisticUpdateTask(taskId, { status: 'completed', completedAt: new Date() });

      if (task?.valueAmount && task.valueAmount > 0) {
        setCoinAmount(task.valueAmount);
        setCoinTrigger(true);

        if (user) {
          try {
            const { addTransaction, updateSavingsGoal } = await import('@/lib/db/finance');
            await addTransaction(user.id, {
              amount: task.valueAmount,
              type: 'income',
              category: 'Habit Savings',
              description: `Save-by-Doing Reward: ${task.title}`,
              date: new Date()
            });

            if (task.savingsGoalId) {
              const targetGoal = savingsGoals.find(g => g.id === task.savingsGoalId);
              if (targetGoal) {
                const newAmt = (targetGoal.currentAmount || 0) + task.valueAmount;
                await updateSavingsGoal(targetGoal.id, {
                  currentAmount: newAmt,
                  isCompleted: newAmt >= targetGoal.targetAmount
                });
                setSavingsGoals(prev => prev.map(g => g.id === targetGoal.id ? { ...g, currentAmount: newAmt } : g));
              }
            }
          } catch (err) {
            console.error('Failed to log habit reward:', err);
          }
        }
        toast.success(`Task completed! +$${task.valueAmount.toFixed(2)} added to Savings! 🎉`);
      } else {
        toast.success('Task completed!');
      }

      // 2. Background Server Sync
      const { completeTask } = await import('@/lib/db/tasks');
      await completeTask(taskId);
    } catch (error) {
      console.error('Complete task error:', error);
      toast.error('Failed to update task.');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    // Instant UI feedback
    removeOptimisticTask(taskId);

    toast.success('Task deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          addOptimisticTask(taskToDelete);
        }
      },
      duration: 5000,
    });

    // Background Server Sync
    import('@/lib/db/tasks').then(({ deleteTask }) => {
      deleteTask(taskId).catch((error) => {
        console.error('Delete task error:', error);
        toast.error('Failed to delete task.');
        addOptimisticTask(taskToDelete);
      });
    });
  };

  // Calendar specific filter
  const selectedDateTasks = filteredTasks.filter(task =>
    date && task.dueDate && isSameDay(new Date(task.dueDate), date)
  );

  return (
    <div className="space-y-6 p-6 md:p-10 lg:p-14">
      <CoinCelebration trigger={coinTrigger} amount={coinAmount} onComplete={() => setCoinTrigger(false)} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-slate-500">Manage, track and organize your work.</p>
        </div>

        <div className="flex items-center gap-3">
          <ImportExport tasks={tasks} />
          
          <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-blue-500/20">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl font-bold">
                  {activeTab === 'calendar' && date
                    ? `Schedule Task for ${date.toLocaleDateString()}`
                    : 'Create New Task'}
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-4">
                <TaskForm
                  onSubmit={handleCreateTask}
                  isLoading={isSaving}
                  defaultValues={{
                    dueDate: activeTab === 'calendar' && date
                      ? date.toLocaleDateString('en-CA')
                      : undefined
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Task Dialog */}
        <Dialog open={isEditTaskOpen} onOpenChange={setIsEditTaskOpen}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-2xl font-bold">Edit Task</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4">
              {taskToEdit && (
                <TaskForm
                  onSubmit={handleEditTask}
                  isLoading={isSaving}
                  submitLabel="Save Changes"
                  defaultValues={taskToEdit}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-4 mb-6">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="board">Board View</TabsTrigger>
          <TabsTrigger value="eisenhower">Eisenhower Matrix</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        {/* LIST VIEW */}
        <TabsContent value="list" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array(6).fill(0).map((_, i) => <TaskSkeleton key={i} />)
            ) : filteredTasks.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
                <Plus className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm">Create your first task to get started!</p>
              </div>
            ) : (
              filteredTasks
                .map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={() => handleCompleteTask(task.id)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onEdit={() => openEditModal(task)}
                  />
                ))
            )}
          </div>
        </TabsContent>

        {/* BOARD VIEW */}
        <TabsContent value="board">
          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="rounded-xl p-4 min-h-[500px] border bg-slate-50 dark:bg-slate-900/50">
                  <Skeleton className="h-6 w-24 mb-4" />
                  <div className="space-y-4">
                    <TaskSkeleton />
                    <TaskSkeleton />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <KanbanBoard 
              tasks={filteredTasks}
              onComplete={handleCompleteTask}
              onDelete={handleDeleteTask}
              onEdit={openEditModal}
            />
          )}
        </TabsContent>

        {/* EISENHOWER MATRIX VIEW */}
        <TabsContent value="eisenhower">
          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="rounded-xl p-4 min-h-[300px] border bg-slate-50 dark:bg-slate-900/50">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <div className="space-y-4">
                    <TaskSkeleton />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EisenhowerMatrix
              tasks={filteredTasks}
              onComplete={handleCompleteTask}
              onDelete={handleDeleteTask}
              onEdit={openEditModal}
            />
          )}
        </TabsContent>

        {/* CALENDAR VIEW */}
        <TabsContent value="calendar" className="mt-0">
          <CalendarGrid 
            tasks={filteredTasks}
            onDateClick={(d) => {
              setDate(d);
              setIsNewTaskOpen(true);
            }}
            onTaskClick={(task) => openEditModal(task)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-lg" />
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}

function TaskSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
