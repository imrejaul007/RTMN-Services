/**
 * GENIE Project Service - MongoDB Models
 * Version: 1.0.0 | Date: May 31, 2026
 * Purpose: Mongoose models for project storage
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  ProjectStatus,
  ProjectPriority,
  TaskStatus,
  TaskPriority,
  RecurringType,
} from '../types.js';

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * SubTask Schema
 */
const SubTaskSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
}, { _id: false });

/**
 * Recurring Config Schema
 */
const RecurringConfigSchema = new Schema({
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },
  interval: { type: Number, default: 1 },
  end_date: { type: Date },
}, { _id: false });

/**
 * Project Schema
 */
export interface IProjectDocument extends Document {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  tags: string[];
  start_date?: Date;
  due_date?: Date;
  completed_at?: Date;
  progress: number;
  task_count: number;
  completed_task_count: number;
  owner_id?: string;
  team_members: string[];
  created_at: Date;
  updated_at: Date;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'archived'],
      default: 'active',
      index: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    start_date: { type: Date },
    due_date: { type: Date },
    completed_at: { type: Date },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    task_count: { type: Number, default: 0 },
    completed_task_count: { type: Number, default: 0 },
    owner_id: { type: String },
    team_members: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'projects',
  }
);

// Compound indexes
ProjectSchema.index({ user_id: 1, status: 1 });
ProjectSchema.index({ user_id: 1, priority: 1 });
ProjectSchema.index({ user_id: 1, created_at: -1 });
ProjectSchema.index({ due_date: 1 }, { sparse: true });

/**
 * Task Schema
 */
export interface ITaskDocument extends Document {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  assignee_id?: string;
  due_date?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  subtasks: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  recurring?: {
    type: RecurringType;
    interval: number;
    end_date?: Date;
  };
  dependencies: string[];
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const TaskSchema = new Schema<ITaskDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    project_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 500 },
    description: { type: String, maxlength: 5000 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    assignee_id: { type: String },
    due_date: { type: Date },
    estimated_hours: { type: Number, min: 0 },
    actual_hours: { type: Number, min: 0 },
    subtasks: [SubTaskSchema],
    recurring: RecurringConfigSchema,
    dependencies: { type: [String], default: [] },
    completed_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'tasks',
  }
);

// Compound indexes
TaskSchema.index({ user_id: 1, status: 1 });
TaskSchema.index({ project_id: 1, status: 1 });
TaskSchema.index({ user_id: 1, due_date: 1 });
TaskSchema.index({ assignee_id: 1, status: 1 });

/**
 * Milestone Schema
 */
export interface IMilestoneDocument extends Document {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  due_date: Date;
  completed: boolean;
  completed_at?: Date;
  created_at: Date;
}

const MilestoneSchema = new Schema<IMilestoneDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    project_id: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    due_date: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    completed_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'milestones',
  }
);

MilestoneSchema.index({ project_id: 1, due_date: 1 });

// ============================================================================
// Model Export
// ============================================================================

let ProjectModel: Model<IProjectDocument>;
let TaskModel: Model<ITaskDocument>;
let MilestoneModel: Model<IMilestoneDocument>;

try {
  ProjectModel = mongoose.model<IProjectDocument>('Project');
} catch {
  ProjectModel = mongoose.model<IProjectDocument>('Project', ProjectSchema);
}

try {
  TaskModel = mongoose.model<ITaskDocument>('Task');
} catch {
  TaskModel = mongoose.model<ITaskDocument>('Task', TaskSchema);
}

try {
  MilestoneModel = mongoose.model<IMilestoneDocument>('Milestone');
} catch {
  MilestoneModel = mongoose.model<IMilestoneDocument>('Milestone', MilestoneSchema);
}

export { ProjectModel, TaskModel, MilestoneModel };

export default { ProjectModel, TaskModel, MilestoneModel };
