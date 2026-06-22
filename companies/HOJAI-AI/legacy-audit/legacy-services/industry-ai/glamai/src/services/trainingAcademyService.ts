/**
 * Salon Training Academy Service
 *
 * Beauty training platform for:
 * - Stylist certification
 * - Skill tracking
 * - Training modules
 * - Performance assessment
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { logger } from '../../../utils/logger.js';

// Types
export interface TrainingModule {
  moduleId: string;
  name: string;
  category: 'hair' | 'color' | 'skin' | 'nails' | 'makeup' | 'business' | 'safety';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration: number; // minutes
  description: string;
  objectives: string[];
  skills: string[];
  prerequisites: string[];
}

export interface Course {
  courseId: string;
  name: string;
  description: string;
  category: string;
  modules: TrainingModule[];
  totalDuration: number;
  certification: {
    name: string;
    validity: number; // months
    renewalRequired: boolean;
  };
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface TrainingProgress {
  progressId: string;
  employeeId: string;
  courseId: string;
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  attempts: number;
  score?: number;
  completedAt?: Date;
  certificateId?: string;
}

export interface Certification {
  certificationId: string;
  employeeId: string;
  courseId: string;
  courseName: string;
  issuedAt: Date;
  expiresAt: Date;
  score: number;
  status: 'active' | 'expired' | 'renewed';
}

// Mongoose Schemas
const TrainingModuleSchema = new Schema({
  moduleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['hair', 'color', 'skin', 'nails', 'makeup', 'business', 'safety'], required: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], required: true },
  duration: { type: Number, required: true },
  description: { type: String },
  objectives: [String],
  skills: [String],
  prerequisites: [String]
});

const CourseSchema = new Schema({
  courseId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  category: String,
  modules: [{
    moduleId: String,
    name: String,
    duration: Number
  }],
  totalDuration: Number,
  certification: {
    name: String,
    validity: Number,
    renewalRequired: Boolean
  },
  level: String
});

const TrainingProgressSchema = new Schema({
  progressId: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, index: true },
  courseId: { type: String, required: true },
  moduleId: String,
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'failed'], default: 'not_started' },
  progress: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  score: Number,
  completedAt: Date,
  certificateId: String
});

const CertificationSchema = new Schema({
  certificationId: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, index: true },
  courseId: { type: String, required: true },
  courseName: String,
  issuedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  score: Number,
  status: { type: String, enum: ['active', 'expired', 'renewed'], default: 'active' }
});

// Models
let Module: Model<TrainingModule & Document>;
let Course: Model<Course & Document>;
let Progress: Model<TrainingProgress & Document>;
let Certification: Model<Certification & Document>;

// Predefined courses
const COURSES: Course[] = [
  {
    courseId: 'CERT-HAIR-BASIC',
    name: 'Basic Hair Cutting Certification',
    description: 'Learn fundamental hair cutting techniques',
    category: 'hair',
    modules: [],
    totalDuration: 480,
    certification: { name: 'Basic Hair Cutting Certified', validity: 24, renewalRequired: true },
    level: 'beginner'
  },
  {
    courseId: 'CERT-HAIR-ADV',
    name: 'Advanced Hair Styling Certification',
    description: 'Master advanced hair cutting and styling',
    category: 'hair',
    modules: [],
    totalDuration: 960,
    certification: { name: 'Advanced Hair Stylist', validity: 24, renewalRequired: true },
    level: 'advanced'
  },
  {
    courseId: 'CERT-COLOR',
    name: 'Hair Color Certification',
    description: 'Complete hair coloring from basic to advanced techniques',
    category: 'color',
    modules: [],
    totalDuration: 720,
    certification: { name: 'Certified Colorist', validity: 12, renewalRequired: true },
    level: 'intermediate'
  },
  {
    courseId: 'CERT-SKIN',
    name: 'Skincare Specialist Certification',
    description: 'Facial treatments and skincare services',
    category: 'skin',
    modules: [],
    totalDuration: 600,
    certification: { name: 'Skincare Specialist', validity: 24, renewalRequired: true },
    level: 'intermediate'
  },
  {
    courseId: 'CERT-BRIDAL',
    name: 'Bridal Makeup Certification',
    description: 'Professional bridal makeup artistry',
    category: 'makeup',
    modules: [],
    totalDuration: 480,
    certification: { name: 'Bridal Makeup Artist', validity: 12, renewalRequired: true },
    level: 'advanced'
  },
  {
    courseId: 'CERT-NAILS',
    name: 'Nail Art & Manicure Certification',
    description: 'Professional nail services and nail art',
    category: 'nails',
    modules: [],
    totalDuration: 360,
    certification: { name: 'Nail Technician', validity: 24, renewalRequired: true },
    level: 'beginner'
  },
  {
    courseId: 'CERT-SAFETY',
    name: 'Salon Safety & Hygiene Certification',
    description: 'Essential safety and hygiene practices',
    category: 'safety',
    modules: [],
    totalDuration: 120,
    certification: { name: 'Salon Safety Certified', validity: 12, renewalRequired: true },
    level: 'beginner'
  }
];

// Predefined modules
const MODULES: TrainingModule[] = [
  // Hair modules
  {
    moduleId: 'MOD-HAIR-001',
    name: 'Introduction to Hair Structure',
    category: 'hair',
    level: 'beginner',
    duration: 60,
    description: 'Understanding hair types, textures, and conditions',
    objectives: ['Understand hair anatomy', 'Identify hair types', 'Assess hair condition'],
    skills: ['Hair analysis', 'Consultation'],
    prerequisites: []
  },
  {
    moduleId: 'MOD-HAIR-002',
    name: 'Basic Cutting Techniques',
    category: 'hair',
    level: 'beginner',
    duration: 120,
    description: 'Learn fundamental scissor and clipper techniques',
    objectives: ['Master basic cuts', 'Understand face shapes', 'Create layered looks'],
    skills: ['Scissor cutting', 'Clipper cutting', 'Layering'],
    prerequisites: ['MOD-HAIR-001']
  },
  {
    moduleId: 'MOD-HAIR-003',
    name: 'Advanced Styling',
    category: 'hair',
    level: 'advanced',
    duration: 180,
    description: 'Complex styling and updos',
    objectives: ['Create updos', 'Style for events', 'Handle difficult hair'],
    skills: ['Blowdry styling', 'Updo techniques', 'Braiding'],
    prerequisites: ['MOD-HAIR-002']
  },
  // Color modules
  {
    moduleId: 'MOD-COLOR-001',
    name: 'Color Theory Basics',
    category: 'color',
    level: 'beginner',
    duration: 90,
    description: 'Understanding color wheel and formulation',
    objectives: ['Understand color theory', 'Mix colors correctly', 'Achieve desired results'],
    skills: ['Color mixing', 'Developer ratios', 'Application techniques'],
    prerequisites: []
  },
  {
    moduleId: 'MOD-COLOR-002',
    name: 'Balayage Techniques',
    category: 'color',
    level: 'advanced',
    duration: 180,
    description: 'Master the balayage technique',
    objectives: ['Hand-painting techniques', 'Create natural looks', 'Maintain color balance'],
    skills: ['Balayage', 'Hand-painting', 'Toning'],
    prerequisites: ['MOD-COLOR-001']
  },
  // Safety modules
  {
    moduleId: 'MOD-SAFETY-001',
    name: 'Sanitation & Sterilization',
    category: 'safety',
    level: 'beginner',
    duration: 60,
    description: 'Proper sanitation practices',
    objectives: ['Understand cross-contamination', 'Use sterilization equipment', 'Maintain clean workspace'],
    skills: ['Tool sterilization', 'Workspace cleaning', 'Hygiene protocols'],
    prerequisites: []
  },
  {
    moduleId: 'MOD-SAFETY-002',
    name: 'Chemical Safety',
    category: 'safety',
    level: 'beginner',
    duration: 60,
    description: 'Safe handling of salon chemicals',
    objectives: ['Handle chemicals safely', 'Understand MSDS', 'Respond to emergencies'],
    skills: ['Chemical handling', 'Ventilation', 'Emergency response'],
    prerequisites: ['MOD-SAFETY-001']
  }
];

export class TrainingAcademyService {
  async initialize() {
    // Register models
    Module = mongoose.models.TrainingModule || mongoose.model<TrainingModule & Document>('TrainingModule', TrainingModuleSchema);
    Course = mongoose.models.Course || mongoose.model<Course & Document>('Course', CourseSchema);
    Progress = mongoose.models.TrainingProgress || mongoose.model<TrainingProgress & Document>('TrainingProgress', TrainingProgressSchema);
    Certification = mongoose.models.Certification || mongoose.model<Certification & Document>('Certification', CertificationSchema);

    // Seed data
    await this.seedData();

    logger.info('TrainingAcademyService initialized');
  }

  private async seedData() {
    // Seed modules
    for (const mod of MODULES) {
      await Module.findOneAndUpdate({ moduleId: mod.moduleId }, mod, { upsert: true });
    }

    // Seed courses
    for (const course of COURSES) {
      await Course.findOneAndUpdate({ courseId: course.courseId }, course, { upsert: true });
    }
  }

  // Get all courses
  async getCourses(filters?: {
    category?: string;
    level?: string;
  }): Promise<Course[]> {
    const query: any = {};
    if (filters?.category) query.category = filters.category;
    if (filters?.level) query.level = filters.level;

    return Course.find(query);
  }

  // Get course by ID
  async getCourse(courseId: string): Promise<Course | null> {
    return Course.findOne({ courseId });
  }

  // Get modules for a course
  async getCourseModules(courseId: string): Promise<TrainingModule[]> {
    const course = await Course.findOne({ courseId });
    if (!course) return [];

    const moduleIds = course.modules.map(m => m.moduleId);
    return Module.find({ moduleId: { $in: moduleIds } });
  }

  // Get all modules
  async getModules(filters?: {
    category?: string;
    level?: string;
  }): Promise<TrainingModule[]> {
    const query: any = {};
    if (filters?.category) query.category = filters.category;
    if (filters?.level) query.level = filters.level;

    return Module.find(query);
  }

  // Enroll employee in course
  async enrollInCourse(employeeId: string, courseId: string): Promise<TrainingProgress> {
    const progressId = `PROG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const progress = await Progress.create({
      progressId,
      employeeId,
      courseId,
      status: 'not_started',
      progress: 0,
      attempts: 0
    });

    logger.info(`Employee ${employeeId} enrolled in course ${courseId}`);

    return progress;
  }

  // Update module progress
  async updateModuleProgress(
    employeeId: string,
    courseId: string,
    moduleId: string,
    progress: number,
    completed: boolean = false
  ): Promise<TrainingProgress | null> {
    const update: any = {
      moduleId,
      status: completed ? 'completed' : 'in_progress',
      progress: Math.min(100, progress)
    };

    if (completed) {
      update.completedAt = new Date();
    }

    const result = await Progress.findOneAndUpdate(
      { employeeId, courseId, moduleId },
      update,
      { new: true, upsert: true }
    );

    // Check if all modules are complete
    await this.checkCourseCompletion(employeeId, courseId);

    return result;
  }

  // Complete module with score
  async completeModule(
    employeeId: string,
    courseId: string,
    moduleId: string,
    score: number
  ): Promise<{ passed: boolean; certificate?: Certification }> {
    const passingScore = 70;

    const progress = await Progress.findOneAndUpdate(
      { employeeId, courseId, moduleId },
      {
        status: score >= passingScore ? 'completed' : 'failed',
        progress: 100,
        score,
        attempts: 1,
        completedAt: score >= passingScore ? new Date() : undefined
      },
      { new: true }
    );

    if (!progress) {
      return { passed: false };
    }

    if (score >= passingScore) {
      // Check if course is complete
      await this.checkCourseCompletion(employeeId, courseId);

      return { passed: true };
    } else {
      // Increment attempts
      await Progress.findOneAndUpdate(
        { employeeId, courseId, moduleId },
        { attempts: { $inc: 1 } }
      );

      return { passed: false };
    }
  }

  // Check if all modules are complete and issue certificate
  private async checkCourseCompletion(employeeId: string, courseId: string) {
    const course = await Course.findOne({ courseId });
    if (!course) return;

    const moduleIds = course.modules.map(m => m.moduleId);
    const completedModules = await Progress.countDocuments({
      employeeId,
      courseId,
      status: 'completed'
    });

    if (completedModules === moduleIds.length) {
      // All modules complete - issue certificate
      const avgScore = await this.calculateAverageScore(employeeId, courseId);

      const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + course.certification.validity);

      await Certification.create({
        certificationId,
        employeeId,
        courseId,
        courseName: course.name,
        score: avgScore,
        expiresAt
      });

      logger.info(`Certificate ${certificateId} issued to employee ${employeeId}`);
    }
  }

  // Calculate average score
  private async calculateAverageScore(employeeId: string, courseId: string): Promise<number> {
    const scores = await Progress.find({ employeeId, courseId, score: { $exists: true } });
    if (scores.length === 0) return 0;

    const total = scores.reduce((sum, s) => sum + (s.score || 0), 0);
    return Math.round(total / scores.length);
  }

  // Get employee training progress
  async getEmployeeProgress(employeeId: string): Promise<{
    enrolled: TrainingProgress[];
    completed: Certification[];
    inProgress: { courseId: string; courseName: string; progress: number }[];
  }> {
    const enrolled = await Progress.find({ employeeId });
    const completed = await Certification.find({ employeeId, status: 'active' });

    const courses = await Course.find();
    const inProgress = [];

    for (const course of courses) {
      const moduleIds = course.modules.map(m => m.moduleId);
      const completedCount = await Progress.countDocuments({
        employeeId,
        courseId: course.courseId,
        status: 'completed'
      });

      if (completedCount > 0 && completedCount < moduleIds.length) {
        inProgress.push({
          courseId: course.courseId,
          courseName: course.name,
          progress: Math.round((completedCount / moduleIds.length) * 100)
        });
      }
    }

    return { enrolled, completed, inProgress };
  }

  // Get employee's certifications
  async getEmployeeCertifications(employeeId: string): Promise<Certification[]> {
    return Certification.find({ employeeId });
  }

  // Check certification validity
  async checkCertificationValidity(certificationId: string): Promise<{
    valid: boolean;
    expiresAt: Date;
    daysUntilExpiry: number;
    renewalRequired: boolean;
  }> {
    const cert = await Certification.findOne({ certificationId });
    if (!cert) {
      return { valid: false, expiresAt: new Date(), daysUntilExpiry: 0, renewalRequired: false };
    }

    const now = new Date();
    const daysUntilExpiry = Math.ceil((cert.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      valid: cert.expiresAt > now && cert.status === 'active',
      expiresAt: cert.expiresAt,
      daysUntilExpiry,
      renewalRequired: daysUntilExpiry <= 30
    };
  }

  // Get skill profile for employee
  async getSkillProfile(employeeId: string): Promise<{
    skills: Record<string, { level: string; certified: boolean; score?: number }>;
    overallLevel: string;
    recommendations: string[];
  }> {
    const certifications = await Certification.find({ employeeId, status: 'active' });
    const skills: Record<string, { level: string; certified: boolean; score?: number }> = {};

    for (const cert of certifications) {
      const course = await Course.findOne({ courseId: cert.courseId });
      if (course) {
        skills[course.category] = {
          level: course.level,
          certified: true,
          score: cert.score
        };
      }
    }

    // Determine overall level
    let overallLevel = 'beginner';
    if (skills['hair']?.level === 'expert' || skills['color']?.level === 'advanced') {
      overallLevel = 'expert';
    } else if (skills['hair']?.level === 'advanced' || skills['color']?.level === 'intermediate') {
      overallLevel = 'advanced';
    } else if (skills['hair']?.level === 'intermediate') {
      overallLevel = 'intermediate';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (!skills['safety']) {
      recommendations.push('Complete Safety Certification - Required for all stylists');
    }
    if (!skills['color']?.certified) {
      recommendations.push('Color Certification - High demand skill');
    }
    if (skills['hair']?.level === 'beginner') {
      recommendations.push('Advance to Intermediate Hair Cutting');
    }

    return { skills, overallLevel, recommendations };
  }
}

export const trainingAcademyService = new TrainingAcademyService();
