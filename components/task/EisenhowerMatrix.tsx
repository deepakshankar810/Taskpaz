'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskPriority } from '@/lib/types';
import { TaskCard } from './TaskCard';
import { useTasksContext } from '@/components/providers/TasksProvider';
import { updateTask as firestoreUpdateTask } from '@/lib/db/tasks';
import { Flame, Calendar, Users, Trash, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface EisenhowerMatrixProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const QUADRANTS = [
  {
    id: 'urgent',
    title: 'Quadrant 1: DO FIRST',
    subtitle: 'Urgent & Important',
    badge: 'Urgent',
    icon: Flame,
    color: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
    headerBg: 'bg-red-500/20 text-red-700 dark:text-red-300',
  },
  {
    id: 'high',
    title: 'Quadrant 2: DECIDE / SCHEDULE',
    subtitle: 'Important, Not Urgent',
    badge: 'High Priority',
    icon: Calendar,
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    headerBg: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  },
  {
    id: 'medium',
    title: 'Quadrant 3: DELEGATE / QUICK',
    subtitle: 'Urgent, Not Important',
    badge: 'Medium Priority',
    icon: Users,
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    headerBg: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  },
  {
    id: 'low',
    title: 'Quadrant 4: ELIMINATE / BACKLOG',
    subtitle: 'Neither Urgent nor Important',
    badge: 'Low Priority',
    icon: Trash,
    color: 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400',
    headerBg: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
  },
] as const;

export function EisenhowerMatrix({ tasks, onComplete, onDelete, onEdit }: EisenhowerMatrixProps) {
  const [matrixTasks, setMatrixTasks] = useState<Task[]>([]);
  const { optimisticUpdateTask } = useTasksContext();

  useEffect(() => {
    setMatrixTasks(tasks);
  }, [tasks]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const draggedTask = matrixTasks.find((t) => t.id === draggableId);
    if (!draggedTask) return;

    const newPriority = destination.droppableId as TaskPriority;

    // Optimistic UI update
    setMatrixTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, priority: newPriority } : t))
    );

    optimisticUpdateTask(draggableId, { priority: newPriority });

    toast.success(`Priority updated to ${newPriority.toUpperCase()}`);

    try {
      await firestoreUpdateTask(draggableId, { priority: newPriority });
    } catch (error) {
      console.error('Failed to update task priority via Eisenhower matrix:', error);
      toast.error('Failed to sync priority change');
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-4">
        {/* Matrix Header Banner */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <h3 className="font-bold text-sm">Eisenhower Prioritization Matrix</h3>
              <p className="text-xs text-slate-500">
                Drag tasks between quadrants to adjust priorities & optimize your focus.
              </p>
            </div>
          </div>
        </div>

        {/* 2x2 Quadrant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {QUADRANTS.map((quadrant) => {
            const quadrantTasks = matrixTasks.filter(
              (t) => t.priority === quadrant.id && t.status !== 'completed'
            );
            const Icon = quadrant.icon;

            return (
              <div
                key={quadrant.id}
                className={`rounded-2xl border p-5 transition-all shadow-sm ${quadrant.color} min-h-[380px] flex flex-col justify-between`}
              >
                <div>
                  {/* Quadrant Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${quadrant.headerBg}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {quadrant.title}
                        </h4>
                        <p className="text-[11px] opacity-80 font-medium">{quadrant.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
                      {quadrantTasks.length}
                    </span>
                  </div>

                  {/* Droppable Container */}
                  <Droppable droppableId={quadrant.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[260px] p-2 rounded-xl transition-colors ${
                          snapshot.isDraggingOver
                            ? 'bg-indigo-500/10 border-2 border-dashed border-indigo-400'
                            : 'bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50'
                        }`}
                      >
                        {quadrantTasks.length === 0 ? (
                          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
                            <Icon className="h-8 w-8 mb-2 opacity-30" />
                            <p className="text-xs font-medium">No tasks in this quadrant</p>
                            <p className="text-[10px] text-slate-400">
                              Drag tasks here to re-prioritize
                            </p>
                          </div>
                        ) : (
                          quadrantTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.85 : 1,
                                  }}
                                >
                                  <TaskCard
                                    task={task}
                                    onComplete={() => onComplete(task.id)}
                                    onDelete={() => onDelete(task.id)}
                                    onEdit={() => onEdit(task)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
