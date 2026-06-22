import mongoose, { Schema } from 'mongoose';
import { ICarePlan } from '../types';

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Task description cannot exceed 1000 characters'],
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'skipped'],
      default: 'pending',
    },
    reminderDays: {
      type: Number,
      min: 0,
      max: 30,
    },
  },
  { _id: true }
);

const milestoneSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Milestone title cannot exceed 200 characters'],
    },
    targetDate: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'achieved', 'missed'],
      default: 'pending',
    },
  },
  { _id: true }
);

const followUpSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const carePlanSchema = new Schema<ICarePlan>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Care plan title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled'],
      default: 'active',
      index: true,
    },
    tasks: {
      type: [taskSchema],
      default: [],
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    followUps: {
      type: [followUpSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
carePlanSchema.index({ clinicId: 1, status: 1 });
carePlanSchema.index({ clinicId: 1, patientId: 1 });
carePlanSchema.index({ clinicId: 1, doctorId: 1 });
carePlanSchema.index({ status: 1, 'tasks.dueDate': 1 });

// Virtual for progress percentage
carePlanSchema.virtual('progress').get(function () {
  if (this.tasks.length === 0) return 0;
  const completedTasks = this.tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completedTasks / this.tasks.length) * 100);
});

// Virtual for upcoming tasks
carePlanSchema.virtual('upcomingTasks').get(function () {
  const now = new Date();
  return this.tasks.filter(
    (t) => t.status === 'pending' && t.dueDate && new Date(t.dueDate) >= now
  );
});

// Virtual for overdue tasks
carePlanSchema.virtual('overdueTasks').get(function () {
  const now = new Date();
  return this.tasks.filter(
    (t) => t.status === 'pending' && t.dueDate && new Date(t.dueDate) < now
  );
});

// Method to add a task
carePlanSchema.methods.addTask = function (task: {
  title: string;
  description?: string;
  dueDate?: Date;
  reminderDays?: number;
}) {
  this.tasks.push({
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    reminderDays: task.reminderDays,
    status: 'pending',
  });
  return this.save();
};

// Method to complete a task
carePlanSchema.methods.completeTask = function (taskId: mongoose.Types.ObjectId) {
  const task = this.tasks.id(taskId);
  if (task) {
    task.status = 'completed';
    task.completedAt = new Date();
    return this.save();
  }
  throw new Error('Task not found');
};

// Method to add a milestone
carePlanSchema.methods.addMilestone = function (milestone: {
  title: string;
  targetDate: Date;
}) {
  this.milestones.push({
    title: milestone.title,
    targetDate: milestone.targetDate,
    status: 'pending',
  });
  return this.save();
};

// Method to achieve a milestone
carePlanSchema.methods.achieveMilestone = function (milestoneId: mongoose.Types.ObjectId) {
  const milestone = this.milestones.id(milestoneId);
  if (milestone) {
    milestone.status = 'achieved';
    milestone.completedAt = new Date();
    return this.save();
  }
  throw new Error('Milestone not found');
};

// Method to add a follow-up
carePlanSchema.methods.addFollowUp = function (followUp: { date: Date; notes?: string }) {
  this.followUps.push({
    date: followUp.date,
    notes: followUp.notes,
    completed: false,
  });
  return this.save();
};

// Static method to get active care plans for a patient
carePlanSchema.statics.getActivePlansForPatient = function (patientId: mongoose.Types.ObjectId) {
  return this.find({ patientId, status: 'active' })
    .populate('doctorId', 'name specialization')
    .sort({ startDate: -1 });
};

// Static method to get upcoming tasks across all plans
carePlanSchema.statics.getUpcomingTasks = function (clinicId: mongoose.Types.ObjectId, daysAhead: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.aggregate([
    { $match: { clinicId, status: 'active' } },
    { $unwind: '$tasks' },
    {
      $match: {
        'tasks.status': 'pending',
        'tasks.dueDate': { $gte: new Date(), $lte: futureDate },
      },
    },
    {
      $lookup: {
        from: 'patients',
        localField: 'patientId',
        foreignField: '_id',
        as: 'patient',
      },
    },
    { $unwind: '$patient' },
    {
      $project: {
        task: '$tasks',
        patientName: { $concat: ['$patient.firstName', ' ', '$patient.lastName'] },
        patientPhone: '$patient.phone',
        planTitle: '$title',
      },
    },
    { $sort: { 'task.dueDate': 1 } },
  ]);
};

// Static method to get care plan analytics
carePlanSchema.statics.getAnalytics = async function (clinicId: mongoose.Types.ObjectId) {
  const stats = await this.aggregate([
    { $match: { clinicId } },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        totalTasks: [{ $unwind: '$tasks' }, { $count: 'count' }],
        completedTasks: [
          { $unwind: '$tasks' },
          { $match: { 'tasks.status': 'completed' } },
          { $count: 'count' },
        ],
        overdueTasks: [
          { $unwind: '$tasks' },
          { $match: { 'tasks.status': 'pending', 'tasks.dueDate': { $lt: new Date() } } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  return stats[0];
};

export const CarePlan = mongoose.model<ICarePlan>('CarePlan', carePlanSchema);
export default CarePlan;
