'use client';

import { useState } from 'react';
import { useTasksContext } from '@/components/providers/TasksProvider';
import { TaskCard } from '@/components/task/TaskCard';
import { TaskForm } from '@/components/task/TaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Clock, CalendarDays } from 'lucide-react';
import { Task } from '@/lib/types';
import { format, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { useAuth } from '@/components/providers/AuthProvider';
import { createTask, updateTask } from '@/lib/db/tasks';

export default function RemindersPage() {
  const { user } = useAuth();
  const { tasks, addOptimisticTask, optimisticUpdateTask, removeOptimisticTask } = useTasksContext();
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const reminders = tasks.filter(t => (t.status === 'pending' || t.status === 'in-progress') && t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const overdue = reminders.filter(t => isPast(new Date(t.dueDate!)) && !isToday(new Date(t.dueDate!)));
  const today = reminders.filter(t => isToday(new Date(t.dueDate!)));
  const upcoming = reminders.filter(t => !isPast(new Date(t.dueDate!)) && !isToday(new Date(t.dueDate!)));

  const handleCreateTask = async (data: any) => {
    if (!user) return;
    const taskId = crypto.randomUUID();
    const newTask = {
      id: taskId,
      ...data,
      user_id: user.id,
      status: 'pending',
      priority: data.priority || 'medium',
      category: data.category || 'personal',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
    };
    
    addOptimisticTask(newTask as any);
    setIsNewTaskOpen(false);
    await createTask(user.id, data, taskId);
  };

  const handleUpdateTask = async (data: any) => {
    if (selectedTask) {
      optimisticUpdateTask(selectedTask.id, data);
      await updateTask(selectedTask.id, data);
    }
    setSelectedTask(null);
  };

  const handleCompleteTask = async (taskId: string) => {
    optimisticUpdateTask(taskId, { status: 'completed' });
    await updateTask(taskId, { status: 'completed' });
  };

  const handleDeleteTask = async (taskId: string) => {
    removeOptimisticTask(taskId);
    // Background Server Sync would normally happen here as in tasks page
    const { deleteTask } = await import('@/lib/db/tasks');
    await deleteTask(taskId);
  };

  const renderSection = (title: string, list: Task[], icon: React.ReactNode, colorClass: string) => (
    list.length > 0 && (
      <div className="space-y-4">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${colorClass}`}>
          {icon}
          {title} <span className="text-sm font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{list.length}</span>
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => handleCompleteTask(task.id)}
              onDelete={() => handleDeleteTask(task.id)}
              onEdit={() => setSelectedTask(task)}
            />
          ))}
        </div>
      </div>
    )
  );

  return (
    <div className="p-6 md:p-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-8 w-8 text-blue-500" /> Reminders
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Track your upcoming deadlines and dates.</p>
        </div>
        <Button onClick={() => setIsNewTaskOpen(true)} className="shadow-lg shadow-blue-500/20">
          <Plus className="mr-2 h-4 w-4" />
          New Reminder
        </Button>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <CalendarDays className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <p className="text-xl font-medium">No active reminders</p>
          <p className="text-sm mt-2">Create a reminder to keep track of important dates!</p>
          <Button onClick={() => setIsNewTaskOpen(true)} variant="outline" className="mt-6">
            Create Reminder
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {renderSection("Overdue", overdue, <Clock className="h-5 w-5" />, "text-red-500")}
          {renderSection("Today", today, <CalendarDays className="h-5 w-5" />, "text-blue-500")}
          {renderSection("Upcoming", upcoming, <CalendarDays className="h-5 w-5" />, "text-slate-700 dark:text-slate-300")}
        </div>
      )}

      {/* Create Reminder Dialog */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Reminder</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <TaskForm 
              onSubmit={handleCreateTask}
              submitLabel="Add Reminder"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Reminder Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedTask && (
              <TaskForm 
                defaultValues={{
                  title: selectedTask.title,
                  description: selectedTask.description,
                  priority: selectedTask.priority,
                  category: selectedTask.category,
                  tags: selectedTask.tags || [],
                  dueDate: selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'yyyy-MM-dd') : undefined,
                  recurringPattern: selectedTask.recurringPattern
                }}
                onSubmit={handleUpdateTask}
                submitLabel="Save Changes"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
