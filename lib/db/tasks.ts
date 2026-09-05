import { supabase } from '@/lib/supabase';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus, TaskPriority, TaskCategory } from '@/lib/types';

const TASKS_TABLE = 'tasks';

const mapTaskRow = (data: any): Task => ({
  id: data.id,
  userId: data.user_id,
  title: data.title,
  description: data.description,
  status: data.status,
  priority: data.priority,
  category: data.category,
  dueDate: data.due_date ? new Date(data.due_date) : undefined,
  projectId: data.project_id,
  completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
  orderIndex: data.order_index,
  recurringPattern: data.recurring_pattern,
  timeSpent: data.time_spent,
  tags: data.tags || [],
  sharedWith: data.shared_with || [],
  valueAmount: data.value_amount ? Number(data.value_amount) : undefined,
  savingsGoalId: data.savings_goal_id,
});

export const createTask = async (userId: string, input: CreateTaskInput, id?: string): Promise<Task> => {
  try {
    console.log('[createTask] Starting...', { userId, title: input.title });

    // Validate and format date safely
    let formattedDueDate = null;
    if (input.dueDate) {
      const d = input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate);
      if (!isNaN(d.getTime())) {
        formattedDueDate = d.toISOString().split('T')[0];
      }
    }

    // Sanitize arrays and UUIDs to prevent 400 errors
    const cleanTags = (input.tags || []).filter(tag => typeof tag === 'string' && tag.trim() !== '');
    
    // Ensure projectId is either a valid UUID or null (never an empty string)
    const cleanProjectId = (input.projectId && input.projectId.trim().length === 36) ? input.projectId : null;
    const cleanSavingsGoalId = (input.savingsGoalId && input.savingsGoalId.trim().length === 36) ? input.savingsGoalId : null;

    const newTaskData: any = {
      id: (id && id.length === 36) ? id : undefined,
      user_id: userId,
      title: (input.title || 'Untitled Task').trim(),
      description: input.description || '',
      status: 'pending' as TaskStatus,
      priority: input.priority || 'medium' as TaskPriority,
      category: input.category || 'personal' as TaskCategory,
      due_date: formattedDueDate,
      project_id: cleanProjectId,
      order_index: input.orderIndex || 0,
      recurring_pattern: input.recurringPattern || 'none',
      time_spent: 0,
      tags: cleanTags,
      value_amount: input.valueAmount ? Number(input.valueAmount) : null,
      savings_goal_id: cleanSavingsGoalId,
    };

    console.log('[createTask] Sanitized payload:', newTaskData);

    const { data, error } = await supabase
      .from(TASKS_TABLE)
      .insert([newTaskData])
      .select();

    if (error) {
      // Log error as string to see details in user's screenshot if it fails
      console.error('[createTask] Supabase Error Detail:', JSON.stringify(error));
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Task was inserted but no data was returned.');
    }

    console.log('[createTask] Task created successfully:', data[0].id);
    return mapTaskRow(data[0]);
  } catch (error) {
    console.error('[createTask] Critical Catch Error:', JSON.stringify(error));
    throw error;
  }
};


export const getUserTasks = async (
  userId: string,
  filters?: { status?: TaskStatus[], category?: TaskCategory[], priority?: TaskPriority[] }
): Promise<Task[]> => {
  try {
    let query = supabase
      .from(TASKS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });


    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }
    if (filters?.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapTaskRow);
  } catch (error) {
    console.error('[getUserTasks] Error:', error);
    return [];
  }
};

export const updateTask = async (taskId: string, updates: UpdateTaskInput): Promise<void> => {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Explicitly map allowed fields from UpdateTaskInput to database columns
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.category !== undefined) updateData.category = updates.category;

    if (updates.dueDate !== undefined) {
      if (updates.dueDate) {
        const d = updates.dueDate instanceof Date ? updates.dueDate : new Date(updates.dueDate);
        updateData.due_date = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
      } else {
        updateData.due_date = null;
      }
    }

    if (updates.projectId !== undefined) {
      updateData.project_id = (updates.projectId && updates.projectId.trim().length === 36) ? updates.projectId : null;
    }

    if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;
    if (updates.recurringPattern !== undefined) updateData.recurring_pattern = updates.recurringPattern;
    if (updates.timeSpent !== undefined) updateData.time_spent = updates.timeSpent;
    if (updates.tags !== undefined) {
      updateData.tags = (updates.tags || []).filter(tag => typeof tag === 'string' && tag.trim() !== '');
    }
    if (updates.valueAmount !== undefined) updateData.value_amount = updates.valueAmount ? Number(updates.valueAmount) : null;
    if (updates.savingsGoalId !== undefined) {
      updateData.savings_goal_id = (updates.savingsGoalId && updates.savingsGoalId.trim().length === 36) ? updates.savingsGoalId : null;
    }
    // if (updates.sharedWith !== undefined) updateData.shared_with = updates.sharedWith;

    const { error } = await supabase
      .from(TASKS_TABLE)
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', JSON.stringify(error));
      throw error;
    }
  } catch (error) {
    console.error('Catch update task error:', JSON.stringify(error));
    throw error;
  }
};

export const completeTask = async (taskId: string): Promise<void> => {
  try {
    // 1. Fetch current task to check for recurrence
    const { data: task, error: fetchError } = await supabase
      .from(TASKS_TABLE)
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Mark current task as completed
    await updateTask(taskId, { status: 'completed' });

    // 3. Handle recurrence
    if (task.recurring_pattern && task.recurring_pattern !== 'none') {
      const nextDueDate = new Date(task.due_date || new Date());
      
      if (task.recurring_pattern === 'daily') {
        nextDueDate.setDate(nextDueDate.getDate() + 1);
      } else if (task.recurring_pattern === 'weekly') {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      } else if (task.recurring_pattern === 'monthly') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      // Create the next occurrence
      await createTask(task.user_id, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        dueDate: nextDueDate,
        projectId: task.project_id,
        tags: task.tags,
        recurringPattern: task.recurring_pattern,
        sharedWith: task.shared_with,
      });
    }
  } catch (error) {
    console.error('[completeTask] Error:', error);
    throw error;
  }
};


export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TASKS_TABLE)
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const getTaskStats = async (userId: string) => {
  try {
    const tasks = await getUserTasks(userId);

    const stats = {
      total: tasks.length,
      completed: 0,
      pending: 0,
      inProgress: 0,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    tasks.forEach(task => {
      if (task.status === 'completed') stats.completed++;
      if (task.status === 'pending') stats.pending++;
      if (task.status === 'in-progress') stats.inProgress++;

      stats.byCategory[task.category] = (stats.byCategory[task.category] || 0) + 1;
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      total: 0, completed: 0, pending: 0, inProgress: 0,
      byCategory: {}, byPriority: {}
    };
  }
};
