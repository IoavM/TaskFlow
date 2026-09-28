export interface User {
  id: number;
  email: string;
  phone?: string;
  created_at: string;
}

export interface WorkBlock {
  id: number;
  task_id: number;
  day_name: string;
  start_time?: string;
  end_time?: string;
  block_date?: string;
  completed: boolean;
  notes?: string;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  deadline?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  work_blocks: WorkBlock[];
}

export interface WorkBlockInput {
  day_name: string;
  start_time?: string;
  end_time?: string;
  block_date?: string;
  notes?: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  deadline?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  work_blocks: WorkBlockInput[];
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AIParsedPlan {
  title: string;
  description?: string;
  deadline?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  work_blocks: WorkBlockInput[];
}
