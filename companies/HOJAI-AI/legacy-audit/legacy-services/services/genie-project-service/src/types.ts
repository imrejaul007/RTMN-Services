/**
 * GENIE Project Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 */

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  tasks: Task[];
  members: ProjectMember[];
  created_at: string;
  updated_at: string;
  due_date?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

export interface ProjectMember {
  user_id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}
