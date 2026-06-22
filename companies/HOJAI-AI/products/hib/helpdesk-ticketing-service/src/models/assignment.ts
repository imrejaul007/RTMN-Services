/**
 * Assignment Model - Mongoose schema for ticket assignments
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum AssignmentType {
  DIRECT = 'direct',           // Assigned directly to an agent
  TEAM = 'team',               // Assigned to a team
  ROUND_ROBIN = 'round_robin', // Auto-assigned via round robin
  LOAD_BALANCED = 'load_balanced', // Assigned to agent with lowest load
}

export interface IAssignment extends Document {
  assignmentId: string;
  ticketId: string;
  assignedBy: string;
  assignedTo: string;
  assignedTeam?: string;
  type: AssignmentType;
  reason: string;
  previousAssignee?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    assignmentId: { type: String, required: true, unique: true, index: true },
    ticketId: { type: String, required: true, index: true },
    assignedBy: { type: String, required: true },
    assignedTo: { type: String, required: true },
    assignedTeam: String,
    type: {
      type: String,
      enum: Object.values(AssignmentType),
      default: AssignmentType.DIRECT,
    },
    reason: { type: String, default: '' },
    previousAssignee: String,
    isActive: { type: Boolean, default: true, index: true },
    endedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
assignmentSchema.index({ ticketId: 1, isActive: 1 });
assignmentSchema.index({ assignedTo: 1, isActive: 1 });
assignmentSchema.index({ assignedTeam: 1, isActive: 1 });

export const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);
export default Assignment;
