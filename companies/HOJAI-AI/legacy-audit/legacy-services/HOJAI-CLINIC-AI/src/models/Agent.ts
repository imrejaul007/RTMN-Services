import mongoose, { Schema } from 'mongoose';
import { IAgentConfig, IAgentConversation, AgentType } from '../types';

const agentConfigSchema = new Schema<IAgentConfig>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'receptionist',
        'doctor_assistant',
        'care_manager',
        'pharmacist',
        'nurse_assistant',
        'dietitian',
        'therapist_assistant',
        'growth_consultant',
      ] as AgentType[],
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
      maxlength: [100, 'Agent name cannot exceed 100 characters'],
    },
    greeting: {
      type: String,
      default: 'Namaste! How can I help you today?',
      maxlength: [500, 'Greeting cannot exceed 500 characters'],
    },
    language: {
      type: String,
      default: 'hi',
      maxlength: [10, 'Language code cannot exceed 10 characters'],
    },
    instructions: {
      type: String,
      required: [true, 'Agent instructions are required'],
      maxlength: [5000, 'Instructions cannot exceed 5000 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
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

// Compound indexes
agentConfigSchema.index({ clinicId: 1, type: 1 }, { unique: true });
agentConfigSchema.index({ clinicId: 1, isActive: 1 });

// Static method to get agent by type
agentConfigSchema.statics.getAgentByType = function (clinicId: mongoose.Types.ObjectId, type: AgentType) {
  return this.findOne({ clinicId, type, isActive: true });
};

// Default instructions for each agent type
export const DEFAULT_AGENT_INSTRUCTIONS: Record<AgentType, string> = {
  receptionist: `You are an AI receptionist for a medical clinic. Your responsibilities include:
- Greeting patients warmly in Hindi/English
- Answering frequently asked questions about the clinic, services, and doctors
- Booking, rescheduling, and cancelling appointments
- Collecting patient information for new registrations
- Providing clinic working hours and location details
- Handling patient complaints and escalating to staff when needed
- Being polite, patient, and professional at all times
- Never provide medical advice or diagnosis`,

  doctor_assistant: `You are an AI assistant for doctors. Your responsibilities include:
- Helping doctors collect patient vitals (temperature, BP, pulse, weight, height)
- Assisting with patient history taking
- Providing clinical decision support based on symptoms
- Helping with referral recommendations
- Managing patient summaries for quick review
- Preparing consultation notes
- Never make final medical decisions - always defer to the doctor`,

  care_manager: `You are an AI care manager. Your responsibilities include:
- Creating and managing patient care plans
- Scheduling and tracking follow-up appointments
- Sending patient reminders for medications and appointments
- Coordinating with other healthcare providers
- Monitoring patient progress and outcomes
- Identifying at-risk patients for early intervention
- Providing health education to patients`,

  pharmacist: `You are an AI pharmacist assistant. Your responsibilities include:
- Checking drug interactions and contraindications
- Providing dosage recommendations
- Suggesting generic alternatives
- Explaining medication side effects
- Checking patient allergy information against prescribed medications
- Ensuring prescription completeness
- Always recommend consulting with the prescribing doctor for any concerns`,

  nurse_assistant: `You are an AI nurse assistant. Your responsibilities include:
- Collecting patient symptoms and chief complaints
- Performing initial triage based on symptom severity
- Recording patient vitals in the system
- Providing home care instructions for minor conditions
- Scheduling appointments for necessary consultations
- Escalating emergency cases immediately to medical staff`,

  dietitian: `You are an AI dietitian assistant. Your responsibilities include:
- Creating personalized diet plans based on patient health conditions
- Calculating macronutrient requirements
- Providing meal planning suggestions
- Checking food allergies and dietary restrictions
- Suggesting healthy eating habits
- Tracking dietary progress
- Coordinating with doctors for medical nutrition therapy`,

  therapist_assistant: `You are an AI therapist assistant. Your responsibilities include:
- Taking session notes during therapy appointments
- Providing mental health screening questionnaires
- Suggesting coping strategies and exercises
- Providing resources for patients between sessions
- Tracking mood and progress over time
- Identifying patients who may need immediate intervention
- Never replace human therapists - always support their work`,

  growth_consultant: `You are an AI business consultant for the clinic. Your responsibilities include:
- Analyzing patient acquisition and retention metrics
- Identifying trends in patient demographics
- Providing marketing recommendations
- Analyzing appointment no-show rates and suggest solutions
- Tracking revenue growth and suggesting improvements
- Benchmarking clinic performance against industry standards
- Generating actionable insights for clinic growth`,
};

// Default greetings for each agent type
export const DEFAULT_AGENT_GREETINGS: Record<AgentType, string> = {
  receptionist: 'Namaste! Welcome to our clinic. How can I help you today?',
  doctor_assistant: 'Hello! I am here to assist you with patient care.',
  care_manager: 'Namaste! I am your care manager assistant.',
  pharmacist: 'Hello! I am here to help with medication queries.',
  nurse_assistant: 'Namaste! How can I assist you today?',
  dietitian: 'Hello! I am here to help with your nutrition needs.',
  therapist_assistant: 'Welcome. I am here to support your mental health journey.',
  growth_consultant: 'Namaste! Here to help grow your practice.',
};

// Message schema for conversations
const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [10000, 'Message content cannot exceed 10000 characters'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const agentConversationSchema = new Schema<IAgentConversation>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    agentType: {
      type: String,
      enum: [
        'receptionist',
        'doctor_assistant',
        'care_manager',
        'pharmacist',
        'nurse_assistant',
        'dietitian',
        'therapist_assistant',
        'growth_consultant',
      ] as AgentType[],
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      sparse: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['whatsapp', 'voice', 'chat', 'api'],
      default: 'api',
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    context: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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
agentConversationSchema.index({ clinicId: 1, sessionId: 1 });
agentConversationSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
agentConversationSchema.index({ sessionId: 1, isActive: 1 });

// Method to add a message
agentConversationSchema.methods.addMessage = function (
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: Record<string, unknown>
) {
  this.messages.push({ role, content, timestamp: new Date(), metadata });
  return this.save();
};

// Static method to get or create session
agentConversationSchema.statics.getOrCreateSession = async function (
  clinicId: mongoose.Types.ObjectId,
  agentType: AgentType,
  sessionId: string,
  patientId?: mongoose.Types.ObjectId
) {
  let conversation = await this.findOne({ sessionId, isActive: true });

  if (!conversation) {
    conversation = await this.create({
      clinicId,
      agentType,
      sessionId,
      patientId,
      messages: [],
      context: {},
    });
  }

  return conversation;
};

// Static method to get recent conversations
agentConversationSchema.statics.getRecentConversations = function (
  clinicId: mongoose.Types.ObjectId,
  limit: number = 20
) {
  return this.find({ clinicId, isActive: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('patientId', 'firstName lastName phone');
};

export const AgentConfig = mongoose.model<IAgentConfig>('AgentConfig', agentConfigSchema);
export const AgentConversation = mongoose.model<IAgentConversation>('AgentConversation', agentConversationSchema);
export default { AgentConfig, AgentConversation };
