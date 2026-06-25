// Zustand store for wizard state
import { create } from 'zustand';
import type { Question, CompanyBlueprint, CompileJob } from '@/types';

interface WizardState {
  // Interview state
  interviewId: string | null;
  idea: string;
  currentQuestion: Question | null;
  questionIndex: number;
  totalQuestions: number;
  answers: Record<string, any>;
  state: 'idle' | 'active' | 'complete';

  // Blueprint
  blueprint: CompanyBlueprint | null;

  // Compile state
  compileJob: CompileJob | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  followUp: string | null;

  // Actions
  startInterview: (interviewId: string, idea: string, firstQuestion: Question) => void;
  setCurrentQuestion: (question: Question, index: number) => void;
  submitAnswer: (questionId: number, answer: any) => void;
  setBlueprint: (blueprint: CompanyBlueprint) => void;
  setCompileJob: (job: CompileJob) => void;
  updateCompileJob: (updates: Partial<CompileJob>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFollowUp: (message: string | null) => void;
  complete: () => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  // Initial state
  interviewId: null,
  idea: '',
  currentQuestion: null,
  questionIndex: 0,
  totalQuestions: 12,
  answers: {},
  state: 'idle',
  blueprint: null,
  compileJob: null,
  isLoading: false,
  error: null,
  followUp: null,

  // Actions
  startInterview: (interviewId, idea, firstQuestion) =>
    set({
      interviewId,
      idea,
      currentQuestion: firstQuestion,
      questionIndex: 0,
      answers: {},
      state: 'active',
      blueprint: null,
      compileJob: null,
      error: null,
      followUp: null,
    }),

  setCurrentQuestion: (question, index) =>
    set({ currentQuestion: question, questionIndex: index }),

  submitAnswer: (questionId, answer) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
    })),

  setBlueprint: (blueprint) =>
    set({ blueprint, state: 'complete' }),

  setCompileJob: (job) =>
    set({ compileJob: job }),

  updateCompileJob: (updates) =>
    set((state) => ({
      compileJob: state.compileJob ? { ...state.compileJob, ...updates } : null,
    })),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  setFollowUp: (message) =>
    set({ followUp: message }),

  complete: () =>
    set({ state: 'complete' }),

  reset: () =>
    set({
      interviewId: null,
      idea: '',
      currentQuestion: null,
      questionIndex: 0,
      answers: {},
      state: 'idle',
      blueprint: null,
      compileJob: null,
      isLoading: false,
      error: null,
      followUp: null,
    }),
}));
