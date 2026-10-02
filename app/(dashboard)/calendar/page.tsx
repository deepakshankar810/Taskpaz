'use client';

import { useState } from 'react';
import { CalendarGrid } from '@/components/task/CalendarGrid';
import { useTasksContext } from '@/components/providers/TasksProvider';
import { TaskForm } from '@/components/task/TaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Task } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/components/providers/AuthProvider';
import { createTask, updateTask } from '@/lib/db/tasks';

export default function CalendarPage() {
  const { user } = useAuth();
  const { tasks, addOptimisticTask, optimisticUpdateTask } = useTasksContext();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
      dueDate: data.dueDate ? new Date(data.dueDate) : selectedDate,
    };
    
    addOptimisticTask(newTask as any);
    setSelectedDate(null);
    await createTask(user.id, data, taskId);
  };

  const handleUpdateTask = async (data: any) => {
    if (selectedTask) {
      optimisticUpdateTask(selectedTask.id, data);
      await updateTask(selectedTask.id, data);
    }
    setSelectedTask(null);
  };

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Calendar</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your schedule and important dates.</p>
      </div>
      
      <CalendarGrid 
        tasks={tasks}
        onDateClick={(date) => setSelectedDate(date)}
        onTaskClick={(task) => setSelectedTask(task)}
      />

      {/* Create Task Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add to {selectedDate ? format(selectedDate, 'PPP') : ''}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <TaskForm 
              defaultValues={{ 
                dueDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined 
              }}
              onSubmit={handleCreateTask}
              submitLabel="Add to Calendar"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Calendar Event</DialogTitle>
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
